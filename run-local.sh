#!/usr/bin/env bash
set -euo pipefail

# ย้ายมายังโฟลเดอร์หลักของโปรเจกต์ otp เสมอไม่ว่าจะรันจากที่ไหน
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

COMPOSE_FILE="deploy/docker-compose.yml"
CMD="${1:-up}"

print_access_info() {
  echo ""
  echo "=============================================================="
  echo "  OTP Municipal Platform พร้อมใช้งานแล้ว!"
  echo "=============================================================="
  echo "  Web Application (Nginx Gateway) : http://localhost"
  echo "  Backend API Health Check        : http://localhost/readyz"
  echo "  Keycloak OIDC Console           : http://localhost:8081"
  echo "--------------------------------------------------------------"
  echo "  บัญชีทดสอบสำหรับเข้าสู่ระบบ (Sign in):"
  echo "    - Super Admin : super1 / super1"
  echo "    - Org Admin   : admin1 / admin1  (อบต.ห้องแซง org_id=1)"
  echo "    - Resident    : user1  / user1   (ลูกบ้าน)"
  echo "=============================================================="
}

case "$CMD" in
  up|start)
    echo "==> [1/3] กำลังสตาร์ท Docker Containers ทั้งหมด..."
    docker compose -f "$COMPOSE_FILE" up -d --build --wait

    echo "==> [2/3] ตรวจสอบตารางฐานข้อมูลใน PostgreSQL..."
    TABLE_COUNT=$(docker exec otp-postgres psql -U otp -d otp -tAc "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE';" || echo "0")
    if [ "${TABLE_COUNT:-0}" -lt 100 ]; then
      echo "    กำลังอัปเดตฐานข้อมูล (Migrations 000001 + 000002)..."
      docker exec -i otp-postgres psql -U otp -d otp < backend-go/db/migrations/000001_baseline.up.sql
      docker exec -i otp-postgres psql -U otp -d otp < backend-go/db/migrations/000002_enable_rls.up.sql
    else
      echo "    ฐานข้อมูลพร้อมใช้งานแล้ว (${TABLE_COUNT} ตาราง)"
    fi

    echo "==> [3/3] ตรวจสอบสถานะ Health Check..."
    curl -fsS http://localhost/readyz >/dev/null && echo "    Backend Readyz : OK (200)"
    curl -fsS http://localhost/ >/dev/null && echo "    Frontend UI    : OK (200)"
    print_access_info
    ;;

  dev)
    echo "==> [Dev Mode] สตาร์ทเฉพาะ PostgreSQL และ Keycloak บน Docker..."
    docker compose -f "$COMPOSE_FILE" up -d --wait postgres keycloak

    trap 'echo "กำลังหยุดการทำงานของเซิร์ฟเวอร์..."; kill 0' INT TERM EXIT

    echo "==> [Dev Mode] กำลังรัน Go Backend บนพอร์ต :8080..."
    (
      cd "$ROOT_DIR/backend-go"
      export APP_ENV=development
      export HTTP_PORT=8080
      export DATABASE_URL="postgres://otp:otp@localhost:5432/otp?sslmode=disable"
      export KEYCLOAK_ISSUER="http://localhost:8081/realms/otp"
      export KEYCLOAK_AUDIENCE="otp-api"
      export KEYCLOAK_JWKS_URL="http://localhost:8081/realms/otp/protocol/openid-connect/certs"
      export CORS_ALLOWED_ORIGINS="http://localhost:5173,http://localhost"
      go run ./cmd/api
    ) &

    echo "==> [Dev Mode] กำลังรัน React Vite Dev Server บนพอร์ต :5173..."
    (
      cd "$ROOT_DIR/frontend-react"
      npm run dev -- --host 0.0.0.0 --port 5173
    ) &

    echo ""
    echo "==> เปิดเบราว์เซอร์ได้ที่: http://localhost:5173 (กด Ctrl+C เพื่อหยุด)"
    wait
    ;;

  down|stop)
    echo "==> กำลังหยุดการทำงานของระบบ Docker Compose..."
    docker compose -f "$COMPOSE_FILE" down
    ;;

  status|ps)
    docker compose -f "$COMPOSE_FILE" ps
    echo ""
    curl -s -o /dev/null -w "Gateway UI (http://localhost/)      : HTTP %{http_code}\n" http://localhost/ || true
    curl -s -o /dev/null -w "API Readyz (http://localhost/readyz): HTTP %{http_code}\n" http://localhost/readyz || true
    ;;

  logs)
    docker compose -f "$COMPOSE_FILE" logs -f
    ;;

  test)
    make test
    ;;

  *)
    echo "วิธีใช้งาน: ./run-local.sh [up|dev|down|status|logs|test]"
    echo "  ./run-local.sh up      - รันระบบทั้งหมดผ่าน Docker Compose (ค่าเริ่มต้น)"
    echo "  ./run-local.sh dev     - รันโหมดนักพัฒนา (DB+Keycloak บน Docker + Go/Vite บนเครื่อง)"
    echo "  ./run-local.sh status  - ตรวจสอบสถานะการทำงานของระบบ"
    echo "  ./run-local.sh logs    - ดู Log การทำงานทั้งหมด"
    echo "  ./run-local.sh down    - ปิดระบบ Docker Compose"
    echo "  ./run-local.sh test    - รันชุดทดสอบทั้ง 4 ระดับ"
    exit 1
    ;;
esac
