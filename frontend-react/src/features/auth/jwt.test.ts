import { describe, expect, it } from 'vitest'
import { decodeJwtPayload, extractOrgId, extractRoles, hasAnyRole } from './jwt'

export function makeJwt(payload: object): string {
  const enc = (o: object) =>
    btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(o))))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')
  return `${enc({ alg: 'none' })}.${enc(payload)}.sig`
}

describe('jwt helpers', () => {
  it('extracts realm roles and org_id from the payload', () => {
    const claims = decodeJwtPayload(
      makeJwt({ preferred_username: 'admin1', realm_access: { roles: ['admin', 'user'] }, org_id: 1 }),
    )
    expect(extractRoles(claims)).toEqual(['admin', 'user'])
    expect(extractOrgId(claims)).toBe(1)
  })

  it('handles unicode payloads', () => {
    expect(decodeJwtPayload(makeJwt({ preferred_username: 'สมชาย' })).preferred_username).toBe('สมชาย')
  })

  it('is defensive about missing/garbage input', () => {
    expect(extractRoles(decodeJwtPayload(undefined))).toEqual([])
    expect(extractRoles(decodeJwtPayload('not-a-jwt'))).toEqual([])
    expect(extractRoles({ realm_access: { roles: 'admin' } })).toEqual([])
    expect(extractOrgId({})).toBeNull()
    expect(extractOrgId({ org_id: 'abc' })).toBeNull()
  })

  it('hasAnyRole', () => {
    expect(hasAnyRole(['user'], ['admin', 'super_admin'])).toBe(false)
    expect(hasAnyRole(['user', 'admin'], ['admin'])).toBe(true)
  })
})
