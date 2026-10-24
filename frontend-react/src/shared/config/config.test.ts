import { describe, expect, it } from 'vitest'
import { readConfig } from './index'

describe('readConfig', () => {
  it('prefers runtime window config', () => {
    const cfg = readConfig(
      { KEYCLOAK_AUTHORITY: 'https://kc/realms/x', KEYCLOAK_CLIENT_ID: 'web', API_BASE_URL: '/v' },
      { VITE_KEYCLOAK_AUTHORITY: 'ignored' },
    )
    expect(cfg).toEqual({ KEYCLOAK_AUTHORITY: 'https://kc/realms/x', KEYCLOAK_CLIENT_ID: 'web', API_BASE_URL: '/v' })
  })

  it('falls back to VITE_* env when runtime config is missing or blank', () => {
    const cfg = readConfig(
      { KEYCLOAK_AUTHORITY: '  ' },
      { VITE_KEYCLOAK_AUTHORITY: 'http://env/realms/otp', VITE_KEYCLOAK_CLIENT_ID: 'env-client' },
    )
    expect(cfg.KEYCLOAK_AUTHORITY).toBe('http://env/realms/otp')
    expect(cfg.KEYCLOAK_CLIENT_ID).toBe('env-client')
  })

  it('falls back to local defaults', () => {
    expect(readConfig(undefined, {})).toEqual({
      KEYCLOAK_AUTHORITY: 'http://localhost:8081/realms/otp',
      KEYCLOAK_CLIENT_ID: 'otp-web',
      API_BASE_URL: '/api',
    })
  })
})
