#!/bin/sh
set -eu

export KEYCLOAK_AUTHORITY="${KEYCLOAK_AUTHORITY:-http://localhost:8081/realms/otp}"
export KEYCLOAK_CLIENT_ID="${KEYCLOAK_CLIENT_ID:-otp-web}"
export API_BASE_URL="${API_BASE_URL:-/api}"

envsubst '${KEYCLOAK_AUTHORITY} ${KEYCLOAK_CLIENT_ID} ${API_BASE_URL}' \
  > /usr/share/nginx/html/config.js <<'EOF'
window.__APP_CONFIG__ = {
  KEYCLOAK_AUTHORITY: '${KEYCLOAK_AUTHORITY}',
  KEYCLOAK_CLIENT_ID: '${KEYCLOAK_CLIENT_ID}',
  API_BASE_URL: '${API_BASE_URL}',
}
EOF
