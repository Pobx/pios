import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  ResidentPage,
  UsersPage,
  InventoryPage,
  FoodWastePage,
  RecycleBankPage,
  TabwaterPage,
} from './ModulesPages'
import * as modApi from './api'

vi.mock('./api', async (importOriginal) => {
  const actual = await importOriginal<typeof modApi>()
  return {
    ...actual,
    fetchUsers: vi.fn(),
    createUser: vi.fn().mockResolvedValue({ id: 999, org_id: 1, username: 'user99', prefix: 'คุณ', firstname: 'ทดสอบ', lastname: '', email: '', phone: '', address: '', zone_id: 1, subzone_id: 1, line_user_id: '', status: 'active' }),
    fetchZones: vi.fn(),
    createZone: vi.fn().mockResolvedValue({ id: 99, org_id: 1, zone_name: 'หมู่ 99', status: 'active', subzones: [] }),
    linkUserLineAccount: vi.fn(),
    fetchResidentOverview: vi.fn(),
    fetchInventoryItems: vi.fn(),
    createInventoryItem: vi.fn(),
    fetchInventoryTransactions: vi.fn(),
    createInventoryTransaction: vi.fn(),
    decideInventoryTransaction: vi.fn(),
    fetchFoodWasteSummary: vi.fn(),
    createCompostBatch: vi.fn(),
    createWasteLog: vi.fn(),
    fetchRecycleItems: vi.fn(),
    setRecycleItemPrice: vi.fn().mockResolvedValue({ id: 1, org_id: 1, code: 'KP-PET-01', name: 'PET', group_id: 1, group_name: 'พลาสติก', status: 'active', price_from_dealer: 12, price_for_member: 9.5, point: 10 }),
    fetchRecycleAccounts: vi.fn().mockResolvedValue([]),
    withdrawRecycleBalance: vi.fn().mockResolvedValue({ id: 1, org_id: 1, user_id: 1, entity_type: 'person', account_no: 'ACC-01', balance: 150, points: 100, status: 'active' }),
    fetchRecycleSubmodules: vi.fn().mockResolvedValue({
      kiosks: [{ id: 1, org_id: 1, name: 'Kiosk-HSG1', lat: 15.8, lng: 104.1, status: 'active', total_waste_count: 42 }],
      welfare_configs: [{ id: 1, org_id: 1, min_months_active: 6, min_total_weight: 50, default_payout_amount: 5000, criteria_description: '' }],
      welfare_payouts: [],
      annual_trash_subscriptions: [],
    }),
    recordRecyclePurchase: vi.fn(),
    fetchTabwaterMeters: vi.fn(),
    createTabwaterMeter: vi.fn().mockResolvedValue({ meter_id: 99, org_id: 1, user_id: 1, meternumber: 'TW-99', submeter_name: 'ทดสอบ', meter_address: '99 หมู่ 1', undertake_zone_id: 1, undertake_subzone_id: 1, status: 'active', owe_count: 0, cutmeter: '0', last_meter_recording: 0 }),
    fetchTabwaterPeriods: vi.fn().mockResolvedValue([{ id: 12, org_id: 1, period_name: '10/2569', start_date: '2026-10-01', end_date: '2026-10-31', status: 'active' }]),
    createTabwaterPeriod: vi.fn().mockResolvedValue({ id: 13, org_id: 1, period_name: '11/2569', start_date: '2026-11-01', end_date: '2026-11-30', status: 'active' }),
    fetchTabwaterInvoices: vi.fn(),
    recordTabwaterReading: vi.fn(),
    payTabwaterInvoice: vi.fn(),
  }
})

function renderWithQC(ui: React.ReactElement) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>)
}

describe('ModulesPages (Unit Tests for Waves 1.5 to 5)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('Wave 1.5 UsersPage renders users and zones', async () => {
    vi.mocked(modApi.fetchUsers).mockResolvedValue([
      {
        id: 101,
        org_id: 1,
        username: 'somchai01',
        prefix: 'นาย',
        firstname: 'สมชาย',
        lastname: 'ใจดี',
        email: 'somchai@otp.local',
        phone: '0812345678',
        address: '123 หมู่ 1',
        zone_id: 1,
        subzone_id: 1,
        line_user_id: 'U1234567890',
        status: 'active',
      },
    ])
    vi.mocked(modApi.fetchZones).mockResolvedValue([
      { id: 1, org_id: 1, zone_name: 'หมู่ที่ 1 บ้านห้องแซง', status: 'active', subzones: [] },
    ])

    renderWithQC(<UsersPage />)
    expect(await screen.findByText('somchai01')).toBeInTheDocument()
    expect(screen.getByText('นายสมชาย ใจดี')).toBeInTheDocument()
    expect(screen.getByText('Linked')).toBeInTheDocument()
    expect(await screen.findByText('หมู่ที่ 1 บ้านห้องแซง')).toBeInTheDocument()
  })

  it('Wave 2 InventoryPage renders items and approval transactions', async () => {
    vi.mocked(modApi.fetchInventoryItems).mockResolvedValue([
      {
        id: 1,
        org_id: 1,
        category_id: 1,
        category_name: 'สารเคมีประปา',
        code: 'INV-CL01',
        name: 'คลอรีนผง 65%',
        unit: 'ถัง',
        min_stock: 5,
        item_type: 'consumable',
        is_chemical: true,
        return_required: false,
      },
    ])
    vi.mocked(modApi.fetchInventoryTransactions).mockResolvedValue([
      {
        id: 10,
        org_id: 1,
        ref_no: 'REQ-2026-001',
        item_id: 1,
        item_name: 'คลอรีนผง 65%',
        requester_id: 2,
        quantity: 3,
        purpose: 'เติมระบบประปาหมู่ 1',
        status: 'approved',
        current_step: 2,
      },
    ])

    renderWithQC(<InventoryPage />)
    expect(await screen.findByText('INV-CL01')).toBeInTheDocument()
    expect(await screen.findByText('REQ-2026-001')).toBeInTheDocument()
  })

  it('Wave 3 FoodWastePage renders carbon saved KPIs and compost batches', async () => {
    vi.mocked(modApi.fetchFoodWasteSummary).mockResolvedValue({
      total_batches: 23,
      total_waste_logs: 23,
      total_weight_kg: 120.5,
      total_carbon_saved_kg: 48.25,
      batches: [{ id: 1, user_id: 10, batch_code: 'BATCH-2026-01', start_date: '2026-01-15', status: 'active' }],
      emission_factors: [{ id: 1, material_name: 'เศษอาหาร', unit: 'kg', ef_value: 2.53, source: 'TGO' }],
    })

    renderWithQC(<FoodWastePage />)
    expect(await screen.findByText('48.25')).toBeInTheDocument()
    expect(screen.getByText('BATCH-2026-01')).toBeInTheDocument()
  })

  it('Wave 4 RecycleBankPage renders recyclable items and prices', async () => {
    vi.mocked(modApi.fetchRecycleItems).mockResolvedValue([
      {
        id: 1,
        org_id: 1,
        code: 'KP-PET-01',
        name: 'ขวดพลาสติกใส PET',
        group_id: 1,
        group_name: 'พลาสติก',
        status: 'active',
        price_from_dealer: 10.0,
        price_for_member: 8.5,
        point: 15,
      },
    ])

    renderWithQC(<RecycleBankPage />)
    expect(await screen.findByText('KP-PET-01')).toBeInTheDocument()
    expect(screen.getByText('ขวดพลาสติกใส PET')).toBeInTheDocument()
    expect(screen.getByText('8.50')).toBeInTheDocument()
  })

  it('Wave 5 TabwaterPage renders water meters and invoices', async () => {
    vi.mocked(modApi.fetchTabwaterMeters).mockResolvedValue([
      {
        meter_id: 1,
        org_id: 1,
        user_id: 101,
        meternumber: 'TW-0001',
        submeter_name: 'สมชาย ใจดี',
        meter_address: '99 หมู่ 1',
        undertake_zone_id: 1,
        undertake_subzone_id: 1,
        status: 'active',
        owe_count: 0,
        cutmeter: '0',
        last_meter_recording: 145,
      },
    ])
    vi.mocked(modApi.fetchTabwaterInvoices).mockResolvedValue([
      {
        id: 501,
        inv_no: 'INV-6901-001',
        org_id: 1,
        meter_id: 1,
        period_id: 12,
        period_name: 'ตุลาคม 2569',
        lastmeter: 130,
        currentmeter: 145,
        water_used: 15,
        paid: 105,
        reserve_meter: 10,
        vat: 8.05,
        totalpaid: 123.05,
        status: 'paid',
      },
    ])

    renderWithQC(<TabwaterPage />)
    expect(await screen.findByText('TW-0001')).toBeInTheDocument()
    expect(await screen.findByText('INV-6901-001')).toBeInTheDocument()
    expect(screen.getByText('123.05')).toBeInTheDocument()

    // Open Printable Official Receipt Modal
    const user = userEvent.setup()
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {})
    await user.click(screen.getByTestId('print-invoice-501'))
    const dialog = screen.getByRole('dialog', { name: /printable water invoice/i })
    expect(within(dialog).getByText(/ใบเสร็จรับเงินค่าน้ำประปา/i)).toBeInTheDocument()
    expect(within(dialog).getByText('123.05 THB')).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: /print now/i }))
    expect(printSpy).toHaveBeenCalledTimes(1)
    await user.click(within(dialog).getByRole('button', { name: /close/i }))
    printSpy.mockRestore()
  })

  it('Wave 1.5 ResidentPage renders resident water meters, invoices, and bank accounts', async () => {
    vi.mocked(modApi.fetchResidentOverview).mockResolvedValue({
      username: 'user1',
      org_id: 1,
      water_meters: [
        {
          meter_id: 1,
          org_id: 1,
          user_id: 1,
          meternumber: '000101',
          submeter_name: '1',
          meter_address: '8',
          undertake_zone_id: 1,
          undertake_subzone_id: 1,
          status: 'active',
          owe_count: 0,
          cutmeter: '0',
          last_meter_recording: 12,
        },
      ],
      invoices: [
        {
          id: 1001,
          inv_no: '01010001',
          org_id: 1,
          meter_id: 1,
          period_id: 1,
          period_name: 'ตุลาคม 2569',
          lastmeter: 0,
          currentmeter: 12,
          water_used: 12,
          paid: 60,
          reserve_meter: 10,
          vat: 4.9,
          totalpaid: 74.9,
          status: 'invoice',
        },
      ],
      bank_accounts: [],
    })

    renderWithQC(<ResidentPage />)
    expect(await screen.findByText('user1')).toBeInTheDocument()
    expect(await screen.findByText('01010001')).toBeInTheDocument()
    expect(screen.getByText('74.90')).toBeInTheDocument()
  })
})
