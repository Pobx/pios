import axios, { AxiosError, type AxiosInstance } from 'axios'
import { getConfig } from '@/shared/config'

export interface ApiClientOptions {
  baseURL: string
  /** Returns the current access token (or undefined when signed out). */
  getAccessToken: () => string | undefined
  /** Called at most once per client when the API answers 401. */
  onUnauthorized: () => void
}

export function createApiClient({ baseURL, getAccessToken, onUnauthorized }: ApiClientOptions): AxiosInstance {
  const client = axios.create({ baseURL, headers: { Accept: 'application/json' } })
  let unauthorizedHandled = false

  client.interceptors.request.use((config) => {
    const token = getAccessToken()
    if (token) config.headers.set('Authorization', `Bearer ${token}`)
    return config
  })

  client.interceptors.response.use(
    (res) => res,
    (error: unknown) => {
      if (error instanceof AxiosError && error.response?.status === 401 && !unauthorizedHandled) {
        unauthorizedHandled = true // sign-in redirect leaves the page; never loop
        onUnauthorized()
      }
      return Promise.reject(error)
    },
  )
  return client
}

// ---- App-wide singleton wired up by AuthProvider ----------------------------
let tokenGetter: () => string | undefined = () => undefined
let unauthorizedHandler: () => void = () => {}

export function configureApiAuth(opts: {
  getAccessToken: () => string | undefined
  onUnauthorized: () => void
}) {
  tokenGetter = opts.getAccessToken
  unauthorizedHandler = opts.onUnauthorized
}

export const api = createApiClient({
  baseURL: getConfig().API_BASE_URL,
  getAccessToken: () => tokenGetter(),
  onUnauthorized: () => unauthorizedHandler(),
})
