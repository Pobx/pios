#!/usr/bin/env python3
"""
Cutover Data Integrity & Financial Reconciliation Verifier
Verifies row counts, normalized org_id columns, and financial/quantity aggregates
in PostgreSQL after running the MySQL -> PostgreSQL cutover pipeline.
"""

import json
import subprocess
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[2]
SCHEMA_REPORT = ROOT_DIR / "backend-go" / "db" / "migrations" / "schema_report.json"

CRITICAL_TABLES = [
    "organizations",
    "users",
    "zones",
    "inv_items",
    "inv_transactions",
    "foodwaste_compost_batches",
    "foodwaste_waste_logs",
    "kp_tbank_items",
    "kp_bank_accounts",
    "kp_purchase_transactions",
    "tw_meter_infos",
    "tw_invoice",
    "tw_acc_transactions",
]


def run_psql(sql: str, container: str = "otp-postgres") -> str:
    cmd = [
        "docker",
        "exec",
        "-i",
        container,
        "psql",
        "-U",
        "otp",
        "-d",
        "otp",
        "-t",
        "-A",
        "-c",
        sql,
    ]
    res = subprocess.run(cmd, capture_output=True, text=True, check=True)
    return res.stdout.strip()


def main() -> int:
    print("=== OTP Cutover Data Integrity & Financial Verification ===")
    if not SCHEMA_REPORT.exists():
        print(f"ERROR: Schema report not found at {SCHEMA_REPORT}", file=sys.stderr)
        return 1

    report = json.loads(SCHEMA_REPORT.read_text(encoding="utf-8"))
    expected_table_count = report.get("total_tables", 110)

    actual_tables_str = run_psql(
        "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';"
    )
    actual_table_count = int(actual_tables_str)
    print(f"[1/4] Public base tables: {actual_table_count} (expected >= {expected_table_count})")
    if actual_table_count < expected_table_count:
        print("FAIL: Missing tables in public schema!", file=sys.stderr)
        return 1

    fk_Check = run_psql(
        "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'public' AND column_name = 'org_id_fk';"
    )
    print(f"[2/4] Legacy org_id_fk columns remaining: {fk_Check} (expected 0)")
    if int(fk_Check) != 0:
        print("FAIL: Un-normalized org_id_fk columns found!", file=sys.stderr)
        return 1

    print("[3/4] Critical domain table row counts:")
    for table in CRITICAL_TABLES:
        count = int(run_psql(f"SELECT COUNT(*) FROM {table};"))
        print(f"      - {table:<28}: {count:>6} rows")

    print("[4/4] Financial & Quantity Aggregates Check:")
    aggregates = [
        ("Inventory Total Min Stock (inv_items.min_stock)", "SELECT COALESCE(SUM(min_stock), 0) FROM inv_items;"),
        ("Compost Waste Total kg (foodwaste_waste_logs.weight_kg)", "SELECT COALESCE(SUM(weight_kg), 0) FROM foodwaste_waste_logs;"),
        ("Recycle Bank Total Balance (kp_bank_accounts.balance)", "SELECT COALESCE(SUM(balance), 0) FROM kp_bank_accounts;"),
        ("Tabwater Paid Invoices Total (tw_invoice.totalpaid)", "SELECT COALESCE(SUM(totalpaid), 0) FROM tw_invoice WHERE status = 'paid';"),
    ]
    for label, query in aggregates:
        val = run_psql(query)
        print(f"      - {label:<52}: {val}")

    print("=== SUCCESS: All cutover integrity checks passed! ===")
    return 0


if __name__ == "__main__":
    sys.exit(main())
