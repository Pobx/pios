import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AxiosError, type AxiosResponse } from 'axios'
import { MePage } from './MePage'
import * as meApi from './api'

vi.mock('./api', async (importOriginal) => {
  const actual = await importOriginal<typeof meApi>()
  return { ...actual, fetchMe: vi.fn() }
})

function renderMePage() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={qc}>
      <MePage />
    </QueryClientProvider>,
  )
}

describe('MePage (Unit Test)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows loading spinner while fetching profile', () => {
    vi.mocked(meApi.fetchMe).mockReturnValue(new Promise(() => {}))
    renderMePage()
    expect(screen.getByRole('status')).toHaveTextContent(/loading/i)
  })

  it('renders user profile details with org_id and roles', async () => {
    vi.mocked(meApi.fetchMe).mockResolvedValue({
      sub: '20121f85-a2b2-429d-8d12-d07d156b8857',
      username: 'admin1',
      roles: ['admin'],
      org_id: 1,
    })
    renderMePage()
    expect(await screen.findByText('admin1')).toBeInTheDocument()
    expect(screen.getByText('20121f85-a2b2-429d-8d12-d07d156b8857')).toBeInTheDocument()
    expect(screen.getByText('admin')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('renders dash placeholders when roles is empty and org_id is null (super_admin)', async () => {
    vi.mocked(meApi.fetchMe).mockResolvedValue({
      sub: 'sub-super-1',
      username: 'super1',
      roles: [],
      org_id: null,
    })
    renderMePage()
    expect(await screen.findByText('super1')).toBeInTheDocument()
    const dashes = screen.getAllByText('—')
    expect(dashes.length).toBeGreaterThanOrEqual(2)
  })

  it('renders RFC 7807 error message and retries when Retry button is clicked', async () => {
    const err = new AxiosError(
      'Request failed with status code 500',
      'ERR_BAD_RESPONSE',
      undefined,
      undefined,
      {
        data: { title: 'Internal Server Error', detail: 'profile service temporarily unavailable' },
        status: 500,
        statusText: 'Internal Server Error',
        headers: {},
        config: {} as AxiosResponse['config'],
      },
    )
    vi.mocked(meApi.fetchMe)
      .mockRejectedValueOnce(err)
      .mockResolvedValueOnce({
        sub: 'sub-user-1',
        username: 'user1',
        roles: ['user'],
        org_id: 1,
      })

    renderMePage()
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('profile service temporarily unavailable')
    })

    await userEvent.click(screen.getByRole('button', { name: /retry/i }))
    expect(await screen.findByText('user1')).toBeInTheDocument()
    expect(meApi.fetchMe).toHaveBeenCalledTimes(2)
  })
})
