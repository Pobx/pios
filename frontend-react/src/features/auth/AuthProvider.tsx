import { useCallback, useEffect, useMemo, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthProvider as OidcProvider, useAuth as useOidc, type AuthProviderProps } from 'react-oidc-context'
import { WebStorageStateStore } from 'oidc-client-ts'
import { getConfig } from '@/shared/config'
import { configureApiAuth } from '@/shared/api/client'
import { AuthContext, type AuthState, type AuthUser } from './AuthContext'
import { decodeJwtPayload, extractOrgId, extractRoles } from './jwt'

function Bridge({ children }: { children: ReactNode }) {
  const oidc = useOidc()
  const accessToken = oidc.user?.access_token

  const user = useMemo<AuthUser | null>(() => {
    if (!oidc.user) return null
    const claims = decodeJwtPayload(oidc.user.access_token)
    return {
      username: claims.preferred_username ?? oidc.user.profile.preferred_username ?? oidc.user.profile.sub,
      roles: extractRoles(claims),
      orgId: extractOrgId(claims),
    }
  }, [oidc.user])

  const login = useCallback(
    (returnTo?: string) => oidc.signinRedirect({ state: { returnTo: returnTo ?? window.location.pathname } }),
    [oidc],
  )
  const logout = useCallback(
    () => oidc.signoutRedirect({ post_logout_redirect_uri: window.location.origin }),
    [oidc],
  )

  // Always read the freshest token (silent renew replaces the user object).
  const getAccessToken = useCallback(() => accessToken, [accessToken])

  useEffect(() => {
    configureApiAuth({
      getAccessToken,
      onUnauthorized: () => void login(),
    })
  }, [getAccessToken, login])

  const value = useMemo<AuthState>(
    () => ({
      isAuthenticated: oidc.isAuthenticated,
      isLoading: oidc.isLoading,
      error: oidc.error,
      user,
      login,
      logout,
      getAccessToken,
    }),
    [oidc.isAuthenticated, oidc.isLoading, oidc.error, user, login, logout, getAccessToken],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

/** Auth Code + PKCE via Keycloak; must be rendered inside the Router. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const oidcConfig = useMemo<AuthProviderProps>(() => {
    const cfg = getConfig()
    return {
      authority: cfg.KEYCLOAK_AUTHORITY,
      client_id: cfg.KEYCLOAK_CLIENT_ID,
      redirect_uri: window.location.origin,
      post_logout_redirect_uri: window.location.origin,
      response_type: 'code', // PKCE (S256) is applied by oidc-client-ts
      scope: 'openid profile',
      automaticSilentRenew: true, // refresh_token grant
      userStore: new WebStorageStateStore({ store: window.sessionStorage }),
      // Clean ?code&state & ?session_state from the URL and return to the original page.
      onSigninCallback: (user) => {
        const returnTo = (user?.state as { returnTo?: string } | undefined)?.returnTo
        navigate(returnTo && returnTo.startsWith('/') ? returnTo : '/', { replace: true })
      },
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <OidcProvider {...oidcConfig}>
    <Bridge>{children}</Bridge>
  </OidcProvider>
}
