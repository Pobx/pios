import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AxiosError, type AxiosResponse } from 'axios'
import { OrganizationsPage } from './OrganizationsPage'
import * as orgApi from './api'

vi.mock('./api', async (importOriginal) => {
  const actual = await importOriginal<typeof orgApi>()
  return { ...actual, fetchOrganizations: vi.fn() }
})

function renderPage() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={qc}>
      <OrganizationsPage />
    </QueryClientProvider>,
  )
}

describe('OrganizationsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows loading spinner while fetching', () => {
    vi.mocked(orgApi.fetchOrganizations).mockReturnValue(new Promise(() => {}))
    renderPage()
    expect(screen.getByRole('status')).toHaveTextContent(/loading/i)
  })

  it('renders empty state when API returns no organizations', async () => {
    vi.mocked(orgApi.fetchOrganizations).mockResolvedValue([])
    renderPage()
    expect(await screen.findByText(/no organizations found/i)).toBeInTheDocument()
  })

  it('renders organization rows when API returns data', async () => {
    vi.mocked(orgApi.fetchOrganizations).mockResolvedValue([
      { id: 1, code: 'HSG1', name: 'เทศบาลตำบลห้วยสัก', type_id: 2 },
      { id: 2, code: 'TNG1', name: 'เทศบาลตำบลท่าศาลา', type_id: 2 },
    ])
    renderPage()
    expect(await screen.findByText('HSG1')).toBeInTheDocument()
    expect(screen.getByText('เทศบาลตำบลห้วยสัก')).toBeInTheDocument()
    expect(screen.getByText('TNG1')).toBeInTheDocument()
  })

  it('renders RFC 7807 error message when API fails', async () => {
    const err = new AxiosError(
      'Request failed with status code 403',
      'ERR_BAD_REQUEST',
      undefined,
      undefined,
      {
        data: { title: 'Forbidden', detail: 'Insufficient role for organizations' },
        status: 403,
        statusText: 'Forbidden',
        headers: {},
        config: {} as AxiosResponse['config'],
      },
    )
    vi.mocked(orgApi.fetchOrganizations).mockRejectedValue(err)
    renderPage()
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Insufficient role for organizations')
    })
  })
})
