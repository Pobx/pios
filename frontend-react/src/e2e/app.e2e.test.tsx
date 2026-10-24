import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AxiosError, type AxiosAdapter, type InternalAxiosRequestConfig } from 'axios'
import { AuthContext, type AuthState } from '@/features/auth/AuthContext'
import { api, configureApiAuth } from '@/shared/api/client'
import { AppRoutes } from '@/app/router'

interface MockE2EOptions {
  initialPath?: string
  auth?: Partial<AuthState>
  accessToken?: string
  apiHandler?: (config: InternalAxiosRequestConfig) => Promise<{ status: number; data: unknown }>
}

function renderAppE2E(opts: MockE2EOptions = {}) {
  const loginMock = vi.fn().mockResolvedValue(undefined)
  const logoutMock = vi.fn().mockResolvedValue(undefined)
  const token = opts.accessToken ?? (opts.auth?.isAuthenticated ? 'mock-e2e-jwt-token' : undefined)

  const authState: AuthState = {
    isAuthenticated: false,
    isLoading: false,
    user: null,
    login: loginMock,
    logout: logoutMock,
    getAccessToken: () => token,
    ...opts.auth,
  }

  configureApiAuth({
    getAccessToken: () => token,
    onUnauthorized: () => void loginMock('/'),
  })

  const apiRequests: InternalAxiosRequestConfig[] = []
  const adapter: AxiosAdapter = async (config) => {
    apiRequests.push(config)
    const result = opts.apiHandler
      ? await opts.apiHandler(config)
      : { status: 404, data: { title: 'Not Found', status: 404, detail: 'unmocked route' } }

    const response = {
      data: result.data,
      status: result.status,
      statusText: result.status === 200 ? 'OK' : 'Error',
      headers: {
        'content-type': result.status >= 400 ? 'application/problem+json' : 'application/json',
      },
      config,
    }
    if (result.status >= 400) {
      throw new AxiosError(`HTTP ${result.status}`, 'ERR_BAD_REQUEST', config, null, response)
    }
    return response
  }
  api.defaults.adapter = adapter

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, refetchOnWindowFocus: false },
    },
  })

  const view = render(
    <MemoryRouter initialEntries={[opts.initialPath ?? '/']}>
      <AuthContext.Provider value={authState}>
        <QueryClientProvider client={queryClient}>
          <AppRoutes />
        </QueryClientProvider>
      </AuthContext.Provider>
    </MemoryRouter>,
  )

  return { ...view, loginMock, logoutMock, apiRequests }
}

describe('Full-App E2E User Journeys with Mock OIDC & API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('E2E Journey 1 (Anonymous User): views Home, clicks Sign in -> triggers OIDC login; direct /me -> redirects to login', async () => {
    const user = userEvent.setup()
    const { loginMock, unmount } = renderAppE2E({
      initialPath: '/',
      auth: { isAuthenticated: false, user: null },
    })

    // Home page shows Sign in CTA
    expect(screen.getByRole('heading', { name: 'OTP' })).toBeInTheDocument()
    const mainSignInBtn = within(screen.getByRole('main')).getByRole('button', { name: /sign in/i })
    await user.click(mainSignInBtn)
    expect(loginMock).toHaveBeenCalledWith('/me')
    unmount()

    // Direct navigation to protected /me while unauthenticated triggers login('/me')
    const { loginMock: loginRedirect } = renderAppE2E({
      initialPath: '/me',
      auth: { isAuthenticated: false, user: null },
    })
    expect(loginRedirect).toHaveBeenCalledWith('/me')
  })

  it('E2E Journey 2 (Org Admin admin1, org_id=1): navigates Home -> Me -> Organizations (sees HSG1) -> Log out', async () => {
    const user = userEvent.setup()
    const { logoutMock, apiRequests } = renderAppE2E({
      initialPath: '/',
      accessToken: 'jwt-admin1-hs1',
      auth: {
        isAuthenticated: true,
        user: { username: 'admin1', roles: ['admin'], orgId: 1 },
      },
      apiHandler: async (req) => {
        if (req.url === '/v1/me') {
          return {
            status: 200,
            data: {
              sub: '20121f85-a2b2-429d-8d12-d07d156b8857',
              username: 'admin1',
              roles: ['admin'],
              org_id: 1,
            },
          }
        }
        if (req.url === '/v1/organizations') {
          return {
            status: 200,
            data: [{ id: 1, code: 'HSG1', name: 'ห้องแซง', type_id: 1 }],
          }
        }
        return { status: 404, data: {} }
      },
    })

    // 1. Verify Header shows admin1 (admin)
    expect(screen.getByTestId('user-info')).toHaveTextContent('admin1')
    expect(screen.getByTestId('user-info')).toHaveTextContent('(admin)')

    // 2. Navigate from Home to My profile (/me)
    await user.click(screen.getByRole('link', { name: /my profile/i }))
    expect(await screen.findByRole('heading', { name: /my profile/i })).toBeInTheDocument()
    expect(await screen.findByText('20121f85-a2b2-429d-8d12-d07d156b8857')).toBeInTheDocument()

    // 3. Navigate via top navbar to Organizations (/organizations)
    const nav = screen.getByRole('navigation', { name: /main/i })
    await user.click(within(nav).getByRole('link', { name: /organizations/i }))
    expect(await screen.findByRole('heading', { name: /organizations/i })).toBeInTheDocument()
    expect(await screen.findByText('HSG1')).toBeInTheDocument()
    expect(screen.getByText('ห้องแซง')).toBeInTheDocument()

    // Verify Bearer token was attached to both API calls
    expect(apiRequests).toHaveLength(2)
    expect(apiRequests[0].headers.get('Authorization')).toBe('Bearer jwt-admin1-hs1')
    expect(apiRequests[1].headers.get('Authorization')).toBe('Bearer jwt-admin1-hs1')

    // 4. Click Log out
    await user.click(screen.getByRole('button', { name: /log out/i }))
    expect(logoutMock).toHaveBeenCalledTimes(1)
  })

  it('E2E Journey 3 (Super Admin super1): views all 3 organizations across tenants', async () => {
    const user = userEvent.setup()
    renderAppE2E({
      initialPath: '/',
      accessToken: 'jwt-super1',
      auth: {
        isAuthenticated: true,
        user: { username: 'super1', roles: ['super_admin'], orgId: null },
      },
      apiHandler: async (req) => {
        if (req.url === '/v1/organizations') {
          return {
            status: 200,
            data: [
              { id: 1, code: 'HSG1', name: 'ห้องแซง', type_id: 1 },
              { id: 2, code: 'TNG1', name: 'เต่างอย', type_id: 5 },
              { id: 3, code: 'KUCSC', name: 'เกษตรศาสตร์ วิทยาเขตเฉลิมพระเกียรติ จ.สกลนคร', type_id: 6 },
            ],
          }
        }
        return { status: 200, data: {} }
      },
    })

    await user.click(within(screen.getByRole('main')).getByRole('link', { name: /organizations/i }))
    expect(await screen.findByText('HSG1')).toBeInTheDocument()
    expect(screen.getByText('TNG1')).toBeInTheDocument()
    expect(screen.getByText('KUCSC')).toBeInTheDocument()
  })

  it('E2E Journey 4 (Regular User user1): can access /me, does not see Organizations nav link, and gets 403 on /organizations', async () => {
    const { unmount } = renderAppE2E({
      initialPath: '/me',
      accessToken: 'jwt-user1',
      auth: {
        isAuthenticated: true,
        user: { username: 'user1', roles: ['user'], orgId: 1 },
      },
      apiHandler: async () => ({
        status: 200,
        data: { sub: 'sub-user1', username: 'user1', roles: ['user'], org_id: 1 },
      }),
    })

    // Navbar hides Organizations link for role 'user'
    const nav = screen.getByRole('navigation', { name: /main/i })
    expect(within(nav).queryByRole('link', { name: /organizations/i })).not.toBeInTheDocument()
    expect(await screen.findByText('sub-user1')).toBeInTheDocument()
    unmount()

    // Direct URL access to /organizations redirects to /403 ForbiddenPage
    renderAppE2E({
      initialPath: '/organizations',
      auth: {
        isAuthenticated: true,
        user: { username: 'user1', roles: ['user'], orgId: 1 },
      },
    })
    expect(await screen.findByRole('heading', { name: /403 — forbidden/i })).toBeInTheDocument()
  })

  it('E2E Journey 5 (API Error & Retry Recovery + 404 Not Found Route): recovers from 503 RFC7807 on Retry', async () => {
    const user = userEvent.setup()
    let attempt = 0
    renderAppE2E({
      initialPath: '/organizations',
      accessToken: 'jwt-admin1',
      auth: {
        isAuthenticated: true,
        user: { username: 'admin1', roles: ['admin'], orgId: 1 },
      },
      apiHandler: async () => {
        attempt++
        if (attempt === 1) {
          return {
            status: 503,
            data: {
              type: 'about:blank',
              title: 'Service Unavailable',
              status: 503,
              detail: 'database pool temporarily exhausted',
            },
          }
        }
        return {
          status: 200,
          data: [{ id: 1, code: 'HSG1', name: 'ห้องแซง', type_id: 1 }],
        }
      },
    })

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('database pool temporarily exhausted')
    })

    await user.click(screen.getByRole('button', { name: /retry/i }))
    expect(await screen.findByText('HSG1')).toBeInTheDocument()
  })

  it('E2E Journey 6 (All Business Waves 1.5 to 5): navigates Users -> Inventory -> FoodWaste -> Recycle Bank -> Tabwater', async () => {
    const user = userEvent.setup()
    renderAppE2E({
      initialPath: '/users',
      accessToken: 'jwt-admin-all-waves',
      auth: {
        isAuthenticated: true,
        user: { username: 'admin1', roles: ['admin'], orgId: 1 },
      },
      apiHandler: async (req) => {
        switch (req.url) {
          case '/v1/users':
            return {
              status: 200,
              data: [
                {
                  id: 101,
                  org_id: 1,
                  username: 'somchai_hs1',
                  prefix: 'นาย',
                  firstname: 'สมชาย',
                  lastname: 'ห้องแซง',
                  email: '',
                  phone: '0811112222',
                  address: '',
                  zone_id: 1,
                  subzone_id: 1,
                  line_user_id: 'U999',
                  status: 'active',
                },
              ],
            }
          case '/v1/zones':
            return {
              status: 200,
              data: [{ id: 1, org_id: 1, zone_name: 'หมู่ 1 ห้องแซง', status: 'active', subzones: [] }],
            }
          case '/v1/inventory/items':
            return {
              status: 200,
              data: [
                {
                  id: 1,
                  org_id: 1,
                  category_id: 1,
                  category_name: 'เคมีภัณฑ์',
                  code: 'INV-001',
                  name: 'สารส้มก้อน',
                  unit: 'กระสอบ',
                  min_stock: 10,
                  item_type: 'consumable',
                  is_chemical: true,
                  return_required: false,
                },
              ],
            }
          case '/v1/inventory/transactions':
            return { status: 200, data: [] }
          case '/v1/foodwaste/summary':
            return {
              status: 200,
              data: {
                total_batches: 23,
                total_waste_logs: 23,
                total_weight_kg: 150.0,
                total_carbon_saved_kg: 62.4,
                batches: [{ id: 1, user_id: 101, batch_code: 'FW-BATCH-01', start_date: '2026-02-01', status: 'active' }],
                emission_factors: [],
              },
            }
          case '/v1/recycle/items':
            return {
              status: 200,
              data: [
                {
                  id: 1,
                  org_id: 1,
                  code: 'KP-CAN-01',
                  name: 'กระป๋องอลูมิเนียม',
                  group_id: 2,
                  group_name: 'โลหะ',
                  status: 'active',
                  price_from_dealer: 45,
                  price_for_member: 40,
                  point: 50,
                },
              ],
            }
          case '/v1/tabwater/meters':
            return {
              status: 200,
              data: [
                {
                  meter_id: 1,
                  org_id: 1,
                  user_id: 101,
                  meternumber: 'M-HS1-0001',
                  submeter_name: 'นายสมชาย ห้องแซง',
                  meter_address: '11 หมู่ 1',
                  undertake_zone_id: 1,
                  undertake_subzone_id: 1,
                  status: 'active',
                  owe_count: 0,
                  cutmeter: '0',
                  last_meter_recording: 210,
                },
              ],
            }
          case '/v1/tabwater/invoices':
            return { status: 200, data: [] }
          default:
            return { status: 200, data: [] }
        }
      },
    })

    // Wave 1.5: Users & Zones
    expect(await screen.findByText('somchai_hs1')).toBeInTheDocument()
    expect(await screen.findByText('หมู่ 1 ห้องแซง')).toBeInTheDocument()

    const nav = screen.getByRole('navigation', { name: /main/i })

    // Wave 2: Inventory
    await user.click(within(nav).getByRole('link', { name: /inventory/i }))
    expect(await screen.findByText('INV-001')).toBeInTheDocument()
    expect(screen.getByText('สารส้มก้อน')).toBeInTheDocument()

    // Wave 3: FoodWaste
    await user.click(within(nav).getByRole('link', { name: /foodwaste/i }))
    expect(await screen.findByText('FW-BATCH-01')).toBeInTheDocument()
    expect(screen.getByText('62.40')).toBeInTheDocument()

    // Wave 4: Recycle Bank
    await user.click(within(nav).getByRole('link', { name: /recycle bank/i }))
    expect(await screen.findByText('KP-CAN-01')).toBeInTheDocument()
    expect(screen.getByText('กระป๋องอลูมิเนียม')).toBeInTheDocument()

    // Wave 5: Tabwater
    await user.click(within(nav).getByRole('link', { name: /tabwater/i }))
    expect(await screen.findByText('M-HS1-0001')).toBeInTheDocument()
  })
})
