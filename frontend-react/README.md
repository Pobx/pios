# OTP Frontend (React + TypeScript + Vite)

Single-page application for the OTP platform, built with React 18, TypeScript, Vite, Tailwind CSS, `react-oidc-context` (Keycloak OIDC Authorization Code + PKCE), React Router v6, and TanStack Query.

## Runtime Configuration

The image is built once and configured at container startup without rebuilding:

1. `index.html` loads `/config.js` before the application bundle, populating `window.__APP_CONFIG__`.
2. In containers, `/docker-entrypoint.d/40-runtime-config.sh` uses `envsubst` to generate `/usr/share/nginx/html/config.js` from environment variables.
3. In local Vite dev (`npm run dev`), `public/config.js` provides local defaults and `src/shared/config/index.ts` falls back to `import.meta.env.VITE_*` if runtime values are omitted.

| Key | Default | Description |
|---|---|---|
| `KEYCLOAK_AUTHORITY` | `http://localhost:8081/realms/otp` | External (browser-facing) Keycloak realm issuer URL |
| `KEYCLOAK_CLIENT_ID` | `otp-web` | Public OIDC client ID (Auth Code + PKCE) |
| `API_BASE_URL` | `/api` | Backend API base path/URL |

## Local Development

```bash
npm install
npm run dev      # http://localhost:5173 (proxies /api -> http://localhost:8080)
```

## Testing & Verification

```bash
npm test         # Vitest + React Testing Library
npm run lint     # ESLint
npm run build    # tsc --noEmit && vite build
```

## Container Build

```bash
docker build -t otp-frontend:local .
docker run --rm -p 8080:80 \
  -e KEYCLOAK_AUTHORITY=http://localhost:8081/realms/otp \
  -e KEYCLOAK_CLIENT_ID=otp-web \
  -e API_BASE_URL=/api \
  otp-frontend:local
```
