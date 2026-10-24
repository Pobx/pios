export interface AppConfig {
  KEYCLOAK_AUTHORITY: string
  KEYCLOAK_CLIENT_ID: string
  API_BASE_URL: string
}

declare global {
  interface Window {
    __APP_CONFIG__?: Partial<AppConfig>
  }
}

type EnvLike = Partial<Record<string, string | undefined>>

const DEFAULTS: AppConfig = {
  KEYCLOAK_AUTHORITY: 'http://localhost:8081/realms/otp',
  KEYCLOAK_CLIENT_ID: 'otp-web',
  API_BASE_URL: '/api',
}

const pick = (runtime: string | undefined, env: string | undefined, fallback: string) =>
  [runtime, env].find((v) => typeof v === 'string' && v.trim() !== '') ?? fallback

/**
 * Resolution order per key: window.__APP_CONFIG__ (runtime /config.js)
 * → import.meta.env.VITE_* → built-in local default. Empty strings are ignored.
 */
export function readConfig(
  runtime: Partial<AppConfig> | undefined = typeof window === 'undefined' ? undefined : window.__APP_CONFIG__,
  env: EnvLike = import.meta.env as EnvLike,
): AppConfig {
  return {
    KEYCLOAK_AUTHORITY: pick(runtime?.KEYCLOAK_AUTHORITY, env.VITE_KEYCLOAK_AUTHORITY, DEFAULTS.KEYCLOAK_AUTHORITY),
    KEYCLOAK_CLIENT_ID: pick(runtime?.KEYCLOAK_CLIENT_ID, env.VITE_KEYCLOAK_CLIENT_ID, DEFAULTS.KEYCLOAK_CLIENT_ID),
    API_BASE_URL: pick(runtime?.API_BASE_URL, env.VITE_API_BASE_URL, DEFAULTS.API_BASE_URL),
  }
}

export const getConfig = (): AppConfig => readConfig()
