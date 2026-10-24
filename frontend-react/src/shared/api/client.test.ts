import { describe, expect, it, vi } from 'vitest'
import type { AxiosAdapter, InternalAxiosRequestConfig } from 'axios'
import { AxiosError } from 'axios'
import { createApiClient } from './client'

function setup(status: number, token: string | null = 'tok123') {
  const seen: InternalAxiosRequestConfig[] = []
  const adapter: AxiosAdapter = async (config) => {
    seen.push(config)
    const response = { data: {}, status, statusText: '', headers: {}, config }
    if (status >= 400) throw new AxiosError('fail', 'ERR_BAD_REQUEST', config, null, response)
    return response
  }
  const onUnauthorized = vi.fn()
  const client = createApiClient({ baseURL: '/api', getAccessToken: () => token ?? undefined, onUnauthorized })
  client.defaults.adapter = adapter
  return { client, seen, onUnauthorized }
}

describe('api client', () => {
  it('attaches the bearer token and uses baseURL', async () => {
    const { client, seen } = setup(200)
    await client.get('/v1/me')
    expect(seen[0].headers.get('Authorization')).toBe('Bearer tok123')
    expect(seen[0].baseURL).toBe('/api')
  })

  it('sends no Authorization header when signed out', async () => {
    const { client, seen } = setup(200, null)
    await client.get('/v1/me')
    expect(seen[0].headers.get('Authorization')).toBeFalsy()
  })

  it('triggers sign-in once on repeated 401s and still rejects', async () => {
    const { client, onUnauthorized } = setup(401)
    await expect(client.get('/v1/me')).rejects.toBeTruthy()
    await expect(client.get('/v1/organizations')).rejects.toBeTruthy()
    expect(onUnauthorized).toHaveBeenCalledTimes(1)
  })

  it('does not trigger sign-in on 403', async () => {
    const { client, onUnauthorized } = setup(403)
    await expect(client.get('/v1/organizations')).rejects.toBeTruthy()
    expect(onUnauthorized).not.toHaveBeenCalled()
  })
})
