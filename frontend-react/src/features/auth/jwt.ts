export interface TokenClaims {
  sub?: string
  preferred_username?: string
  realm_access?: { roles?: unknown }
  org_id?: unknown
}

/** Decode a JWT payload (no signature verification; the API is the authority). */
export function decodeJwtPayload(token: string | undefined | null): TokenClaims {
  if (!token) return {}
  const part = token.split('.')[1]
  if (!part) return {}
  try {
    const b64 = part.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(part.length / 4) * 4, '=')
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
    return JSON.parse(new TextDecoder().decode(bytes)) as TokenClaims
  } catch {
    return {}
  }
}

export function extractRoles(claims: TokenClaims): string[] {
  const roles = claims.realm_access?.roles
  return Array.isArray(roles) ? roles.filter((r): r is string => typeof r === 'string') : []
}

export function extractOrgId(claims: TokenClaims): number | null {
  const v = claims.org_id
  if (v === undefined || v === null || v === '') return null
  const n = Number(v)
  return Number.isInteger(n) ? n : null
}

export function hasAnyRole(userRoles: readonly string[], required: readonly string[]): boolean {
  return required.some((r) => userRoles.includes(r))
}
