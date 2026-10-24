import { describe, expect, it, vi, beforeEach } from 'vitest'
import { AxiosError, type AxiosAdapter, type InternalAxiosRequestConfig } from 'axios'
import { api, configureApiAuth } from './client'
import { fetchMe } from '@/features/me/api'
import { fetchOrganizations } from '@/features/organizations/api'

describe('Frontend API Layer with Mock Adapter (API Mock Tests)', () => {
  const seenRequests: InternalAxiosRequestConfig[] = []
  const onUnauthorized = vi.fn()

  beforeEach(() => {
    seenRequests.length = 0
    onUnauthorized.mockReset()
    configureApiAuth({
      getAccessToken: () => 'mock-access-token-xyz',
      onUnauthorized,
    })
  })

  it('fetchMe() calls GET /v1/me with Authorization Bearer header and returns parsed profile', async () => {
    const mockAdapter: AxiosAdapter = async (config) => {
      seenRequests.push(config)
      return {
        data: {
          sub: '20121f85-a2b2-429d-8d12-d07d156b8857',
          username: 'admin1',
          roles: ['admin'],
          org_id: 1,
        },
        status: 200,
        statusText: 'OK',
        headers: { 'content-type': 'application/json' },
        config,
      }
    }
    api.defaults.adapter = mockAdapter

    const me = await fetchMe()
    expect(me).toEqual({
      sub: '20121f85-a2b2-429d-8d12-d07d156b8857',
      username: 'admin1',
      roles: ['admin'],
      org_id: 1,
    })
    expect(seenRequests).toHaveLength(1)
    expect(seenRequests[0].url).toBe('/v1/me')
    expect(seenRequests[0].method).toBe('get')
    expect(seenRequests[0].headers.get('Authorization')).toBe('Bearer mock-access-token-xyz')
  })

  it('fetchOrganizations() calls GET /v1/organizations with Bearer token and parses organization list', async () => {
    const mockAdapter: AxiosAdapter = async (config) => {
      seenRequests.push(config)
      return {
        data: [
          { id: 1, code: 'HSG1', name: 'ห้องแซง', type_id: 1 },
          { id: 2, code: 'TNG1', name: 'เต่างอย', type_id: 5 },
        ],
        status: 200,
        statusText: 'OK',
        headers: { 'content-type': 'application/json' },
        config,
      }
    }
    api.defaults.adapter = mockAdapter

    const orgs = await fetchOrganizations()
    expect(orgs).toHaveLength(2)
    expect(orgs[0].code).toBe('HSG1')
    expect(orgs[1].code).toBe('TNG1')
    expect(seenRequests[0].url).toBe('/v1/organizations')
    expect(seenRequests[0].headers.get('Authorization')).toBe('Bearer mock-access-token-xyz')
  })

  it('fetchOrganizations() rejects with RFC 7807 Problem Details on 403 Forbidden without triggering onUnauthorized', async () => {
    const mockAdapter: AxiosAdapter = async (config) => {
      const response = {
        data: {
          type: 'about:blank',
          title: 'Forbidden',
          status: 403,
          detail: 'insufficient role',
          instance: '/api/v1/organizations',
        },
        status: 403,
        statusText: 'Forbidden',
        headers: { 'content-type': 'application/problem+json' },
        config,
      }
      throw new AxiosError('Request failed with status code 403', 'ERR_BAD_REQUEST', config, null, response)
    }
    api.defaults.adapter = mockAdapter

    await expect(fetchOrganizations()).rejects.toMatchObject({
      response: {
        status: 403,
        data: {
          title: 'Forbidden',
          detail: 'insufficient role',
        },
      },
    })
    expect(onUnauthorized).not.toHaveBeenCalled()
  })
})
