# OTP Kubernetes Manifests (Production)

Production Kubernetes manifests for the OTP application tier (`nginx` gateway, `frontend` React SPA, `backend` Go API) in namespace `otp`.

## Architectural Decisions

1. **External Database Only (No PostgreSQL in K8s)**
   - Production PostgreSQL runs on managed cloud database service (e.g., AWS RDS) or dedicated bare-metal servers outside the cluster.
   - Connection parameters are injected strictly via `ConfigMap` (`otp-config`) and `Secret` (`otp-db` -> `DATABASE_URL`).
   - An optional `ExternalName` Service (`postgres-external` in `backend.yaml`) is documented as an alternative if you want a stable in-cluster DNS alias for the external DB host.

2. **Keycloak Internal vs. External URLs**
   - `KEYCLOAK_ISSUER`: Must match the external browser-facing URL (e.g., `https://auth.otp.example.com/realms/otp`) so the `iss` claim in access tokens validates properly.
   - `KEYCLOAK_JWKS_URL`: The URL used by `backend` pods to fetch public signing keys (`certs`). Can point to an internal service DNS or external URL depending on where Keycloak is hosted.
   - `KEYCLOAK_AUTHORITY`: Used by the `frontend` container entrypoint (`envsubst`) to generate `/config.js` at startup without rebuilding the image per environment.

3. **Gateway & Routing**
   - `ingress.yaml` terminates TLS at the cluster edge and forwards traffic to the `nginx` gateway service.
   - `nginx.yaml` runs `nginxinc/nginx-unprivileged:1.27-alpine` as non-root (`uid=101`) with `readOnlyRootFilesystem: true`.
   - `/api/` routes to `backend:8080` (preserving the `/api` prefix and forwarding `Authorization`, `Host`, `X-Forwarded-*` headers).
   - `/` routes to `frontend:80` (where the frontend Nginx handles `try_files $uri /index.html` SPA fallback).

## Manifest Overview

| File | Resources | Purpose |
|---|---|---|
| `namespace.yaml` | `Namespace/otp` | Dedicated namespace for OTP workloads |
| `configmap.yaml` | `ConfigMap/otp-config` | Non-secret environment configuration (Keycloak URLs, DB host/port/name, CORS, frontend runtime config) |
| `secrets.yaml` | `Secret/otp-db`, `Secret/otp-keycloak` | Placeholder template for sensitive credentials (`DATABASE_URL`, `DB_USER`, `DB_PASSWORD`) |
| `backend.yaml` | `Deployment/backend`, `Service/backend`, `PodDisruptionBudget/backend` | Go/Echo API server (non-root `65532`, read-only rootfs, `/readyz` & `/healthz` probes) |
| `frontend.yaml` | `Deployment/frontend`, `Service/frontend` | React + Vite static SPA with runtime `/config.js` injection |
| `nginx.yaml` | `ConfigMap/nginx-gateway-conf`, `Deployment/nginx`, `Service/nginx` | Reverse proxy gateway routing `/api/` and `/` |
| `ingress.yaml` | `Ingress/otp` | Edge TLS termination and host routing |
| `networkpolicy.yaml` | `NetworkPolicy/*` | Default-deny + explicit allow rules between Ingress, Nginx, Frontend, Backend, DNS, and external DB/IdP |

## Deployment Steps

1. **Create the namespace:**
   ```bash
   kubectl apply -f deploy/k8s/namespace.yaml
   ```

2. **Create production Secrets out-of-band (do NOT commit real secrets to Git):**
   ```bash
   kubectl -n otp create secret generic otp-db \
     --from-literal=DB_USER='otp_app' \
     --from-literal=DB_PASSWORD='<strong-password>' \
     --from-literal=DATABASE_URL='postgres://otp_app:<url-encoded-password>@<rds-endpoint>:5432/otp?sslmode=require'
   ```
   *(Alternatively, use External Secrets Operator, SealedSecrets, or SOPS).*

3. **Configure environment values in `configmap.yaml` and `ingress.yaml`:**
   - Update `KEYCLOAK_ISSUER`, `KEYCLOAK_JWKS_URL`, `KEYCLOAK_AUTHORITY`, `CORS_ALLOWED_ORIGINS`, `DB_HOST`, and image tags (`registry.example.com/otp/...`).

4. **Apply the manifests:**
   ```bash
   kubectl apply -f deploy/k8s/configmap.yaml
   kubectl apply -f deploy/k8s/backend.yaml
   kubectl apply -f deploy/k8s/frontend.yaml
   kubectl apply -f deploy/k8s/nginx.yaml
   kubectl apply -f deploy/k8s/ingress.yaml
   kubectl apply -f deploy/k8s/networkpolicy.yaml
   ```

5. **Validate manifests offline (dry-run):**
   ```bash
   kubectl apply --dry-run=client --validate=false -f deploy/k8s/
   ```
