# OTP Infrastructure & Deployment (`deploy/`)

This directory contains the local development stack (Docker Compose) and production deployment manifests (Kubernetes) for the migrated OTP platform:
- **Gateway**: Nginx reverse proxy (`:80`)
- **Frontend**: React + Vite + Tailwind SPA
- **Backend**: Go + Echo API (Hexagonal Architecture)
- **Identity Provider**: Keycloak 26 (OIDC/OAuth2, realm `otp`)
- **Database**: PostgreSQL 16 (Docker Compose for local dev; external RDS/Bare Metal for production K8s)

## Directory Structure

```text
deploy/
├── .env.example                 # Local environment variables template
├── Makefile                     # Helper targets for Compose, Keycloak checks, and K8s dry-run
├── README.md                    # This guide
├── docker-compose.yml           # Full local stack (postgres, keycloak, backend, frontend, nginx)
├── keycloak/
│   └── realm-otp.json           # Auto-imported OIDC realm, clients, roles, mappers, and dev users
├── nginx/
│   ├── default.conf             # Local Docker Compose gateway config
│   └── default.k8s.conf         # Reference Kubernetes gateway config (embedded in k8s/nginx.yaml)
├── postgres/
│   └── init/
│       └── 01-create-databases.sh # Creates additional `keycloak` database on first boot
└── k8s/                         # Production Kubernetes manifests (no in-cluster DB)
    ├── README.md
    ├── namespace.yaml
    ├── configmap.yaml
    ├── secrets.yaml
    ├── backend.yaml
    ├── frontend.yaml
    ├── nginx.yaml
    ├── ingress.yaml
    └── networkpolicy.yaml
```

## Service Ports (Local Docker Compose)

| Service | Container | Host Binding | Purpose |
|---|---|---|---|
| `nginx` | `nginx:80` | `http://localhost:80` | Main entrypoint (`/` -> frontend, `/api/` -> backend) |
| `frontend` | `frontend:80` | *(internal only)* | Serves React SPA build & runtime `/config.js` |
| `backend` | `backend:8080` | `127.0.0.1:8080` | Go API (`/healthz`, `/readyz`, `/api/v1/*`) |
| `keycloak` | `keycloak:8080` | `http://localhost:8081` | OIDC provider (`http://localhost:8081/realms/otp`) |
| `postgres` | `postgres:5432` | `127.0.0.1:5432` | Local PostgreSQL (`otp` and `keycloak` databases) |

## Keycloak Realm (`otp`) Summary

- **Browser / External Issuer (`iss`)**: `http://localhost:8081/realms/otp`
- **Backend Internal JWKS URL**: `http://keycloak:8080/realms/otp/protocol/openid-connect/certs`
- **Clients**:
  - `otp-web`: Public SPA client, Authorization Code + PKCE (`S256`), redirects `http://localhost/*` and `http://localhost:5173/*`
  - `otp-api`: Bearer-only resource server (`aud` = `otp-api`)
  - `otp-cli-test`: Dev-only public client with Direct Access Grants enabled for CLI token smoke testing
- **Dev Users**:
  - `admin1` / `admin1` (role: `admin`, `org_id`: `1`)
  - `user1` / `user1` (role: `user`, `org_id`: `1`)
  - `super1` / `super1` (role: `super_admin`, no `org_id`)

## Quick Start

```bash
# Validate compose configuration
make config

# Start full local stack
make up

# Start only Postgres + Keycloak
make up-infra

# Validate Kubernetes manifests (client dry-run)
make k8s-validate
```
