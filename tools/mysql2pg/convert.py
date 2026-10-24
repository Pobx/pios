#!/usr/bin/env python3
"""MySQL/MariaDB (phpMyAdmin) dump  ->  PostgreSQL baseline DDL.

Reads the *structure* of a phpMyAdmin dump (CREATE TABLE + ALTER TABLE blocks) and
emits PostgreSQL DDL following the mapping rules in docs/design/01-postgres-schema.md.

Usage:
    convert.py DUMP.sql OUT_DIR

Outputs (golang-migrate naming):
    OUT_DIR/000001_baseline.up.sql      tables, PK/UNIQUE, indexes, FKs, comments, triggers
    OUT_DIR/000001_baseline.down.sql    drops everything
    OUT_DIR/schema_report.json          machine readable summary (tables, enums, floats, ...)

The converter never reads row data (see load_data.py for that).
"""
from __future__ import annotations

import hashlib
import json
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path

# --------------------------------------------------------------------------- config

# PostgreSQL reserved words that need quoting when used as identifiers.
RESERVED = {
    "all", "analyse", "analyze", "and", "any", "array", "as", "asc", "asymmetric", "both", "case",
    "cast", "check", "collate", "column", "constraint", "create", "current_catalog", "current_date",
    "current_role", "current_time", "current_timestamp", "current_user", "default", "deferrable",
    "desc", "distinct", "do", "else", "end", "except", "false", "fetch", "for", "foreign", "from",
    "grant", "group", "having", "in", "initially", "intersect", "into", "lateral", "leading",
    "limit", "localtime", "localtimestamp", "not", "null", "offset", "on", "only", "or", "order",
    "placing", "primary", "references", "returning", "select", "session_user", "some", "symmetric",
    "table", "then", "to", "trailing", "true", "union", "unique", "user", "using", "variadic",
    "when", "where", "window", "with",
}

# Per column overrides: (table, column) -> PostgreSQL type. Fill in after reviewing report.
TYPE_OVERRIDES: dict[tuple[str, str], str] = {}

# Tables that are platform/reference data (NOT owned by a tenant organisation).
GLOBAL_TABLES = {
    "organizations", "organization_types", "provinces", "districts", "tambons",
    "migrations", "failed_jobs", "password_resets", "personal_access_tokens",
    "permissions", "roles", "role_has_permissions", "model_has_permissions", "model_has_roles",
    "system_modules", "emission_factors", "issue_types",
}

FLOAT_DEFAULT = "NUMERIC(18,4)"  # MySQL FLOAT (4-byte, inexact) -> exact decimal; review in report

# --------------------------------------------------------------------------- model


@dataclass
class Column:
    name: str
    raw_type: str
    base: str
    args: str
    unsigned: bool
    nullable: bool
    default: str | None
    on_update_now: bool
    comment: str | None
    auto_increment: bool = False
    enum_values: list[str] = field(default_factory=list)


@dataclass
class Table:
    name: str
    columns: list[Column] = field(default_factory=list)
    primary_key: list[str] = field(default_factory=list)
    uniques: list[tuple[str, list[str]]] = field(default_factory=list)
    indexes: list[tuple[str, list[str]]] = field(default_factory=list)
    fks: list[dict] = field(default_factory=list)

    def col(self, name: str) -> Column | None:
        return next((c for c in self.columns if c.name == name), None)


# --------------------------------------------------------------------------- parsing


def scan_quoted(s: str, i: int) -> int:
    """s[i] is a single quote; return index just after the closing quote (handles \\x and '')."""
    assert s[i] == "'"
    i += 1
    while i < len(s):
        ch = s[i]
        if ch == "\\":
            i += 2
            continue
        if ch == "'":
            if i + 1 < len(s) and s[i + 1] == "'":
                i += 2
                continue
            return i + 1
        i += 1
    raise ValueError("unterminated string")


def split_top_level(s: str, sep: str = ",") -> list[str]:
    parts, depth, cur, i = [], 0, [], 0
    while i < len(s):
        ch = s[i]
        if ch == "'":
            j = scan_quoted(s, i)
            cur.append(s[i:j])
            i = j
            continue
        if ch == "(":
            depth += 1
        elif ch == ")":
            depth -= 1
        if ch == sep and depth == 0:
            parts.append("".join(cur).strip())
            cur = []
        else:
            cur.append(ch)
        i += 1
    if "".join(cur).strip():
        parts.append("".join(cur).strip())
    return parts


def unquote_mysql(lit: str) -> str:
    body = lit[1:-1]
    out, i = [], 0
    esc = {"n": "\n", "r": "\r", "t": "\t", "0": "\0", "b": "\b", "Z": "\x1a"}
    while i < len(body):
        ch = body[i]
        if ch == "\\" and i + 1 < len(body):
            nxt = body[i + 1]
            out.append(esc.get(nxt, nxt))
            i += 2
        elif ch == "'" and i + 1 < len(body) and body[i + 1] == "'":
            out.append("'")
            i += 2
        else:
            out.append(ch)
            i += 1
    return "".join(out)


COL_RE = re.compile(r"^`(?P<name>[^`]+)`\s+(?P<rest>.+)$", re.S)


def parse_type(rest: str) -> tuple[str, str, str, str]:
    """returns (raw_type, base, args, remainder)"""
    m = re.match(r"([a-zA-Z]+)", rest)
    base = m.group(1).lower()
    i = m.end()
    args = ""
    if i < len(rest) and rest[i] == "(":
        depth, j = 0, i
        while j < len(rest):
            if rest[j] == "'":
                j = scan_quoted(rest, j)
                continue
            if rest[j] == "(":
                depth += 1
            elif rest[j] == ")":
                depth -= 1
                if depth == 0:
                    break
            j += 1
        args = rest[i + 1 : j]
        i = j + 1
    raw = rest[:i]
    return raw, base, args, rest[i:]


def parse_column(line: str) -> Column:
    m = COL_RE.match(line)
    name, rest = m.group("name"), m.group("rest")
    raw, base, args, tail = parse_type(rest)
    unsigned = bool(re.match(r"\s*unsigned", tail, re.I))
    tail_l = tail
    nullable = "NOT NULL" not in tail_l.upper()
    default = None
    dm = re.search(r"\bDEFAULT\s+('(?:[^'\\]|\\.|'')*'|[^\s,]+(?:\(\))?)", tail_l, re.I)
    if dm:
        default = dm.group(1)
        if default.upper() == "NULL":
            default = None
    on_update = bool(re.search(r"ON UPDATE current_timestamp", tail_l, re.I))
    cm = re.search(r"\bCOMMENT\s+('(?:[^'\\]|\\.|'')*')", tail_l, re.I)
    comment = unquote_mysql(cm.group(1)) if cm else None
    enum_values = []
    if base in ("enum", "set"):
        for part in split_top_level(args):
            enum_values.append(unquote_mysql(part))
    return Column(name, raw, base, args, unsigned, nullable, default, on_update, comment, False, enum_values)


def parse_dump(text: str) -> dict[str, Table]:
    tables: dict[str, Table] = {}
    for m in re.finditer(r"CREATE TABLE `([^`]+)` \((.*?)\n\) ENGINE=", text, re.S):
        t = Table(m.group(1))
        for line in m.group(2).split("\n"):
            line = line.strip().rstrip(",")
            if line.startswith("`"):
                t.columns.append(parse_column(line))
        tables[t.name] = t

    for m in re.finditer(r"ALTER TABLE `([^`]+)`\n(.*?);\n", text, re.S):
        tname, body = m.group(1), m.group(2)
        t = tables.get(tname)
        if not t:
            continue
        # statements begin with two spaces + keyword; split at top-level commas
        for part in split_top_level(body):
            p = part.strip()
            if p.startswith("ADD PRIMARY KEY"):
                t.primary_key = cols_of(p)
            elif p.startswith("ADD UNIQUE KEY"):
                t.uniques.append((idx_name(p), cols_of(p)))
            elif p.startswith("ADD KEY"):
                t.indexes.append((idx_name(p), cols_of(p)))
            elif p.startswith("ADD CONSTRAINT"):
                fk = re.match(
                    r"ADD CONSTRAINT `([^`]+)` FOREIGN KEY \(([^)]*)\) REFERENCES `([^`]+)` \(([^)]*)\)"
                    r"(?: ON DELETE (CASCADE|SET NULL|RESTRICT|NO ACTION))?"
                    r"(?: ON UPDATE (CASCADE|SET NULL|RESTRICT|NO ACTION))?",
                    p,
                )
                if fk:
                    t.fks.append(
                        {
                            "name": fk.group(1),
                            "cols": names(fk.group(2)),
                            "ref_table": fk.group(3),
                            "ref_cols": names(fk.group(4)),
                            "on_delete": fk.group(5),
                            "on_update": fk.group(6),
                        }
                    )
            elif p.startswith("MODIFY"):
                mm = re.match(r"MODIFY `([^`]+)`", p)
                if mm and "AUTO_INCREMENT" in p:
                    c = t.col(mm.group(1))
                    if c:
                        c.auto_increment = True
    return tables


def names(s: str) -> list[str]:
    return [re.sub(r"\(\d+\)$", "", x.strip().strip("`")) for x in s.split(",") if x.strip()]


def cols_of(p: str) -> list[str]:
    inner = p[p.index("(") + 1 : p.rindex(")")]
    return [re.sub(r"`\(\d+\)$", "`", x.strip()).strip("`") for x in inner.split(",")]


def idx_name(p: str) -> str:
    return re.search(r"KEY `([^`]+)`", p).group(1)


# --------------------------------------------------------------------------- emit


def q(ident: str) -> str:
    return f'"{ident}"' if ident in RESERVED or not re.fullmatch(r"[a-z_][a-z0-9_]*", ident) else ident


def short(name: str, limit: int = 63) -> str:
    if len(name) <= limit:
        return name
    h = hashlib.sha1(name.encode()).hexdigest()[:8]
    return f"{name[: limit - 9]}_{h}"


def pg_type(table: str, c: Column) -> str:
    if (table, c.name) in TYPE_OVERRIDES:
        return TYPE_OVERRIDES[(table, c.name)]
    b = c.base
    if b == "tinyint":
        return "BOOLEAN" if c.args.strip() == "1" else "SMALLINT"
    if b == "smallint":
        return "INTEGER" if c.unsigned else "SMALLINT"
    if b in ("int", "integer", "mediumint"):
        return "BIGINT" if c.unsigned else "INTEGER"
    if b == "bigint":
        return "BIGINT"
    if b in ("decimal", "numeric"):
        return f"NUMERIC({c.args})"
    if b == "float":
        return FLOAT_DEFAULT
    if b in ("double", "real"):
        return "DOUBLE PRECISION"
    if b == "varchar":
        return f"VARCHAR({c.args})"
    if b == "char":
        return f"CHAR({c.args})"
    if b in ("text", "longtext", "mediumtext", "tinytext"):
        return "TEXT"
    if b == "timestamp":
        return "TIMESTAMPTZ"  # app timezone is UTC (config/app.php) -> safe
    if b == "datetime":
        return "TIMESTAMP"
    if b == "date":
        return "DATE"
    if b == "time":
        return "TIME"
    if b == "year":
        return "SMALLINT"
    if b == "json":
        return "JSONB"
    if b == "enum":
        return "TEXT"  # + CHECK
    if b in ("blob", "longblob", "mediumblob", "tinyblob", "binary", "varbinary"):
        return "BYTEA"
    raise ValueError(f"unmapped type {c.raw_type} in {table}.{c.name}")


def pg_default(c: Column, ptype: str) -> str | None:
    d = c.default
    if d is None:
        return None
    dl = d.lower()
    if dl in ("current_timestamp()", "current_timestamp", "now()"):
        return "now()"
    if ptype == "BOOLEAN":
        return "TRUE" if d.strip("'") in ("1", "true") else "FALSE"
    if d.startswith("'"):
        return "'" + unquote_mysql(d).replace("'", "''") + "'"
    return d


def out_col_name(table: str, c: Column) -> str:
    # tenancy: unify org_id_fk -> org_id
    return "org_id" if c.name == "org_id_fk" else c.name


def emit(tables: dict[str, Table]) -> tuple[str, str, dict]:
    up: list[str] = []
    down: list[str] = []
    report = {"tables": len(tables), "enums": [], "floats": [], "booleans": [], "on_update_triggers": [],
              "renamed_org_id": [], "tables_with_org_id": [], "tables_without_org_id": [], "fks": 0,
              "unsigned_widened": 0, "no_primary_key": []}

    up.append("-- GENERATED by tools/mysql2pg/convert.py from the production dump. Do not edit by hand;\n"
              "-- change the converter/overrides and regenerate. Rules: docs/design/01-postgres-schema.md\n")
    up.append("CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$\n"
              "BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;\n")

    ordered = sorted(tables)
    for tn in ordered:
        t = tables[tn]
        lines = []
        for c in t.columns:
            ptype = pg_type(tn, c)
            cn = out_col_name(tn, c)
            if c.name == "org_id_fk":
                report["renamed_org_id"].append(tn)
            if c.base == "float":
                report["floats"].append(f"{tn}.{c.name}")
            if ptype == "BOOLEAN":
                report["booleans"].append(f"{tn}.{c.name}")
            if c.unsigned and c.base in ("int", "integer", "mediumint", "smallint"):
                report["unsigned_widened"] += 1
            if c.base == "enum":
                report["enums"].append({"col": f"{tn}.{c.name}", "values": c.enum_values})
            col = f"  {q(cn)} {ptype}"
            if c.auto_increment:
                col += " GENERATED BY DEFAULT AS IDENTITY"
            if not c.nullable:
                col += " NOT NULL"
            d = pg_default(c, ptype)
            if d is not None and not c.auto_increment:
                col += f" DEFAULT {d}"
            lines.append(col)
        cons = []
        if t.primary_key:
            cons.append(f"  PRIMARY KEY ({', '.join(q(out_name(tn, x, t)) for x in t.primary_key)})")
        else:
            report["no_primary_key"].append(tn)
        for uname, ucols in t.uniques:
            cons.append(f"  CONSTRAINT {q(short(uname))} UNIQUE ({', '.join(q(out_name(tn, x, t)) for x in ucols)})")
        for c in t.columns:
            if c.base == "enum":
                vals = ", ".join("'" + v.replace("'", "''") + "'" for v in c.enum_values)
                cons.append(f"  CONSTRAINT {q(short(f'{tn}_{c.name}_check'))} CHECK ({q(out_col_name(tn, c))} IN ({vals}))")
        up.append(f"CREATE TABLE {q(tn)} (\n" + ",\n".join(lines + cons) + "\n);\n")
        down.append(f"DROP TABLE IF EXISTS {q(tn)} CASCADE;")

        has_org = any(c.name in ("org_id", "org_id_fk") for c in t.columns)
        (report["tables_with_org_id"] if has_org else report["tables_without_org_id"]).append(tn)

    used_idx: set[str] = set()
    for tn in ordered:
        t = tables[tn]
        for iname, icols in t.indexes:
            n = short(iname)
            if n in used_idx:
                n = short(f"{tn}_{iname}")
            used_idx.add(n)
            up.append(f"CREATE INDEX {q(n)} ON {q(tn)} ({', '.join(q(out_name(tn, x, t)) for x in icols)});")
    up.append("")

    # MySQL/InnoDB lets a FK reference a *prefix* of a composite key (e.g. tambons PK is (id, district_id)
    # but FKs point at tambons(id)). PostgreSQL requires the referenced columns to be unique, so
    # synthesise a UNIQUE constraint (the data load verifies it really is unique).
    report["synthesized_unique"] = []
    synthesized: set[tuple[str, tuple[str, ...]]] = set()
    for tn in ordered:
        for fk in tables[tn].fks:
            rt = tables.get(fk["ref_table"])
            if rt is None:
                continue
            rcols = tuple(fk["ref_cols"])
            known = {tuple(rt.primary_key)} | {tuple(u[1]) for u in rt.uniques}
            if rcols not in known and (fk["ref_table"], rcols) not in synthesized:
                synthesized.add((fk["ref_table"], rcols))
                cname = short(f"{fk['ref_table']}_{'_'.join(rcols)}_key")
                up.append(f"ALTER TABLE {q(fk['ref_table'])} ADD CONSTRAINT {q(cname)} UNIQUE "
                          f"({', '.join(q(out_name(fk['ref_table'], x, rt)) for x in rcols)});")
                report["synthesized_unique"].append(f"{fk['ref_table']}({', '.join(rcols)})")

    for tn in ordered:
        t = tables[tn]
        for fk in t.fks:
            report["fks"] += 1
            stmt = (f"ALTER TABLE {q(tn)} ADD CONSTRAINT {q(short(fk['name']))} FOREIGN KEY "
                    f"({', '.join(q(out_name(tn, x, t)) for x in fk['cols'])}) REFERENCES {q(fk['ref_table'])} "
                    f"({', '.join(q(out_name(fk['ref_table'], x, tables.get(fk['ref_table']))) for x in fk['ref_cols'])})")
            if fk["on_delete"]:
                stmt += f" ON DELETE {fk['on_delete']}"
            if fk["on_update"]:
                stmt += f" ON UPDATE {fk['on_update']}"
            up.append(stmt + ";")
    up.append("")

    for tn in ordered:
        t = tables[tn]
        for c in t.columns:
            if c.comment:
                esc = c.comment.replace("'", "''")
                up.append(f"COMMENT ON COLUMN {q(tn)}.{q(out_col_name(tn, c))} IS '{esc}';")
            if c.on_update_now:
                report["on_update_triggers"].append(f"{tn}.{c.name}")
        if any(c.on_update_now and c.name == "updated_at" for c in t.columns):
            up.append(f"CREATE TRIGGER {short(tn + '_set_updated_at')} BEFORE UPDATE ON {q(tn)} "
                      f"FOR EACH ROW EXECUTE FUNCTION set_updated_at();")
    up.append("")

    down.append("DROP FUNCTION IF EXISTS set_updated_at();")
    return "\n".join(up) + "\n", "\n".join(reversed(down)) + "\n", report


def out_name(tn: str, col: str, t: Table | None) -> str:
    return "org_id" if col == "org_id_fk" else col


def main() -> None:
    dump, out = Path(sys.argv[1]), Path(sys.argv[2])
    out.mkdir(parents=True, exist_ok=True)
    tables = parse_dump(dump.read_text(encoding="utf-8", errors="ignore"))
    up, down, report = emit(tables)
    (out / "000001_baseline.up.sql").write_text(up, encoding="utf-8")
    (out / "000001_baseline.down.sql").write_text(down, encoding="utf-8")
    (out / "schema_report.json").write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"tables={report['tables']} fks={report['fks']} enums={len(report['enums'])} "
          f"floats={len(report['floats'])} bools={len(report['booleans'])} "
          f"with_org_id={len(report['tables_with_org_id'])} without_org_id={len(report['tables_without_org_id'])} "
          f"no_pk={report['no_primary_key']}")


if __name__ == "__main__":
    main()
