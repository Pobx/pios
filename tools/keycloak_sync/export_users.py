#!/usr/bin/env python3
"""
Export users and staffs from PostgreSQL (otp) into a Keycloak-compatible
Partial Import JSON file with org_id attributes, realm roles, and one-time
staff linking codes. Also supports live synchronization to Keycloak Admin API.

Usage:
  python3 tools/keycloak_sync/export_users.py --limit 100 --out /tmp/kc_users.json
  python3 tools/keycloak_sync/export_users.py --limit 25 --sync-keycloak
"""
import argparse
import hashlib
import json
import subprocess
import sys
import urllib.error
import urllib.parse
import urllib.request


def run_psql_json(sql: str, container: str = "otp-postgres", db_user: str = "otp", db_name: str = "otp"):
    query = f"SELECT COALESCE(json_agg(t), '[]'::json) FROM ({sql}) t;"
    cmd = [
        "docker", "exec", container,
        "psql", "-U", db_user, "-d", db_name, "-t", "-A", "-c", query,
    ]
    res = subprocess.run(cmd, capture_output=True, text=True, check=True)
    return json.loads(res.stdout.strip() or "[]")


def generate_one_time_staff_code(user_id: int, org_id: int, username: str) -> str:
    digest = hashlib.sha256(f"otp-link:{org_id}:{user_id}:{username}".encode("utf-8")).hexdigest()[:8].upper()
    return f"OTP-{org_id}-{user_id}-{digest}"


def build_keycloak_users(limit: int = 100, default_password: str = "password"):
    sql = f"""
    SELECT u.id,
           COALESCE(u.org_id, 1) AS org_id,
           COALESCE(NULLIF(TRIM(u.username), ''), 'user_' || u.id::text) AS username,
           COALESCE(NULLIF(TRIM(u.firstname), ''), 'Resident') AS firstname,
           COALESCE(NULLIF(TRIM(u.lastname), ''), u.id::text) AS lastname,
           COALESCE(NULLIF(TRIM(u.email), ''), 'user' || u.id::text || '@otp.local') AS email,
           COALESCE(u.line_user_id, '') AS line_user_id,
           CASE WHEN s.user_id IS NOT NULL THEN 'admin' ELSE 'user' END AS primary_role
    FROM users u
    LEFT JOIN (SELECT DISTINCT user_id FROM staffs WHERE deleted = '0') s ON s.user_id = u.id
    WHERE u.status = 'active'
    ORDER BY u.id
    LIMIT {int(limit)}
    """
    rows = run_psql_json(sql)
    kc_users = []
    seen_usernames = set()

    for r in rows:
        uname = r["username"].lower()
        if uname in seen_usernames:
            uname = f"{uname}_{r['id']}"
        seen_usernames.add(uname)

        staff_code = generate_one_time_staff_code(r["id"], r["org_id"], uname)
        attrs = {
            "org_id": [str(r["org_id"])],
            "legacy_user_id": [str(r["id"])],
            "staff_link_code": [staff_code],
        }
        if r["line_user_id"]:
            attrs["line_user_id"] = [r["line_user_id"]]

        kc_users.append({
            "username": uname,
            "enabled": True,
            "emailVerified": True,
            "firstName": r["firstname"],
            "lastName": r["lastname"],
            "email": f"user_{r['id']}@otp.local",
            "realmRoles": [r["primary_role"]],
            "attributes": attrs,
            "credentials": [
                {
                    "type": "password",
                    "value": default_password,
                    "temporary": False,
                }
            ],
        })
    return {"ifResourceExists": "SKIP", "users": kc_users}


def get_admin_token(kc_url: str, admin_user: str, admin_password: str) -> str:
    data = urllib.parse.urlencode({
        "client_id": "admin-cli",
        "grant_type": "password",
        "username": admin_user,
        "password": admin_password,
    }).encode("utf-8")
    req = urllib.request.Request(
        f"{kc_url}/realms/master/protocol/openid-connect/token",
        data=data,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=10) as resp:
        body = json.loads(resp.read().decode("utf-8"))
        return body["access_token"]


def sync_to_keycloak(payload: dict, kc_url: str, realm: str, admin_user: str, admin_password: str):
    token = get_admin_token(kc_url, admin_user, admin_password)
    req = urllib.request.Request(
        f"{kc_url}/admin/realms/{realm}/partialImport",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        result = json.loads(resp.read().decode("utf-8"))
        return result


def main():
    parser = argparse.ArgumentParser(description="Export PostgreSQL OTP users to Keycloak Partial Import JSON")
    parser.add_argument("--limit", type=int, default=50, help="Max users to export (default: 50)")
    parser.add_argument("--out", type=str, default="-", help="Output JSON file path ('-' for stdout)")
    parser.add_argument("--sync-keycloak", action="store_true", help="Import directly into running Keycloak")
    parser.add_argument("--kc-url", type=str, default="http://localhost:8081", help="Keycloak base URL")
    parser.add_argument("--kc-realm", type=str, default="otp", help="Keycloak realm name")
    parser.add_argument("--kc-admin", type=str, default="admin", help="Keycloak admin username")
    parser.add_argument("--kc-password", type=str, default="admin", help="Keycloak admin password")
    args = parser.parse_args()

    payload = build_keycloak_users(limit=args.limit)
    encoded = json.dumps(payload, ensure_ascii=False, indent=2)

    if args.out != "-":
        with open(args.out, "w", encoding="utf-8") as f:
            f.write(encoded + "\n")
        print(f"Exported {len(payload['users'])} users to {args.out}", file=sys.stderr)
    elif not args.sync_keycloak:
        print(encoded)

    if args.sync_keycloak:
        res = sync_to_keycloak(payload, args.kc_url, args.kc_realm, args.kc_admin, args.kc_password)
        print(
            f"Keycloak Partial Import completed: added={res.get('added', 0)}, "
            f"skipped={res.get('skipped', 0)}, overwritten={res.get('overwritten', 0)}",
            file=sys.stderr,
        )


if __name__ == "__main__":
    main()
