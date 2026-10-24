import { api } from '@/shared/api/client'

// ---- Wave 1.5: Identity, Users, Zones & LINE Linking ------------------------

export interface UserSummary {
  id: number
  org_id: number | null
  username: string
  prefix: string
  firstname: string
  lastname: string
  email: string
  phone: string
  address: string
  zone_id: number | null
  subzone_id: number | null
  line_user_id: string
  status: string
}

export interface Subzone {
  id: number
  org_id: number | null
  zone_id: number
  subzone_name: string
  status: string
}

export interface Zone {
  id: number
  org_id: number | null
  zone_name: string
  status: string
  subzones: Subzone[]
}

export interface LinkLineRequest {
  line_user_id: string
  verification_mode: 'staff_code' | 'staff_approval' | 'password'
  verification_code: string
}

export const fetchUsers = async (params?: { q?: string; limit?: number; offset?: number }): Promise<UserSummary[]> =>
  (await api.get<UserSummary[]>('/v1/users', { params })).data

export const fetchZones = async (): Promise<Zone[]> =>
  (await api.get<Zone[]>('/v1/zones')).data

export const linkUserLineAccount = async (userId: number, payload: LinkLineRequest): Promise<UserSummary> =>
  (await api.post<UserSummary>(`/v1/users/${userId}/link-line`, payload)).data

// ---- Wave 2: Inventory Module -----------------------------------------------

export interface InventoryItem {
  id: number
  org_id: number
  category_id: number
  category_name: string
  code: string
  name: string
  unit: string
  min_stock: number
  item_type: string
  is_chemical: boolean
  return_required: boolean
}

export interface InventoryTransaction {
  id: number
  org_id: number
  ref_no: string
  item_id: number
  item_name: string
  requester_id: number
  quantity: number
  purpose: string
  status: string
  current_step: number
}

export const fetchInventoryItems = async (): Promise<InventoryItem[]> =>
  (await api.get<InventoryItem[]>('/v1/inventory/items')).data

export const fetchInventoryTransactions = async (): Promise<InventoryTransaction[]> =>
  (await api.get<InventoryTransaction[]>('/v1/inventory/transactions')).data

// ---- Wave 3: FoodWaste & Carbon Emission Module -----------------------------

export interface CompostBatch {
  id: number
  user_id: number
  batch_code: string
  status: string
  start_date: string
  closed_date?: string
}

export interface EmissionFactor {
  id: number
  material_name: string
  unit: string
  ef_value: number
  source: string
}

export interface FoodWasteSummary {
  total_batches: number
  total_waste_logs: number
  total_weight_kg: number
  total_carbon_saved_kg: number
  batches: CompostBatch[]
  emission_factors: EmissionFactor[]
}

export const fetchFoodWasteSummary = async (): Promise<FoodWasteSummary> =>
  (await api.get<FoodWasteSummary>('/v1/foodwaste/summary')).data

// ---- Wave 4: KeptKaya / Recycle Bank Module ---------------------------------

export interface RecycleItem {
  id: number
  org_id: number
  code: string
  name: string
  group_id: number
  group_name: string
  status: string
  price_from_dealer: number
  price_for_member: number
  point: number
}

export const fetchRecycleItems = async (): Promise<RecycleItem[]> =>
  (await api.get<RecycleItem[]>('/v1/recycle/items')).data

// ---- Wave 5: Tabwater Module ------------------------------------------------

export interface WaterMeter {
  meter_id: number
  org_id: number
  user_id: number
  meternumber: string
  submeter_name: string
  meter_address: string
  undertake_zone_id: number
  undertake_subzone_id: number
  status: string
  owe_count: number
  cutmeter: string
  last_meter_recording: number
}

export interface WaterInvoice {
  id: number
  inv_no: string
  org_id: number
  meter_id: number
  period_id: number
  period_name: string
  lastmeter: number
  currentmeter: number
  water_used: number
  paid: number
  reserve_meter: number
  vat: number
  totalpaid: number
  status: string
}

export const fetchTabwaterMeters = async (params?: { limit?: number; offset?: number }): Promise<WaterMeter[]> =>
  (await api.get<WaterMeter[]>('/v1/tabwater/meters', { params })).data

export const fetchTabwaterInvoices = async (params?: { status?: string; limit?: number; offset?: number }): Promise<WaterInvoice[]> =>
  (await api.get<WaterInvoice[]>('/v1/tabwater/invoices', { params })).data

// ---- Write / Mutation & Resident Portal APIs (Waves 1.5 to 5) ---------------

export interface BankAccountSummary {
  id: number
  org_id: number
  user_id: number
  entity_type: string
  account_no: string
  balance: number
  points: number
  status: string
}

export interface ResidentOverview {
  username: string
  org_id: number | null
  water_meters: WaterMeter[]
  invoices: WaterInvoice[]
  bank_accounts: BankAccountSummary[]
}

export const fetchResidentOverview = async (): Promise<ResidentOverview> =>
  (await api.get<ResidentOverview>('/v1/resident/overview')).data

export interface CreateInventoryItemInput {
  category_id?: number
  code: string
  name: string
  unit: string
  min_stock: number
  item_type?: string
  is_chemical?: boolean
  return_required?: boolean
}

export const createInventoryItem = async (payload: CreateInventoryItemInput): Promise<InventoryItem> =>
  (await api.post<InventoryItem>('/v1/inventory/items', payload)).data

export interface CreateInventoryTransactionInput {
  ref_no: string
  item_id: number
  requester_id: number
  quantity: number
  purpose: string
}

export const createInventoryTransaction = async (payload: CreateInventoryTransactionInput): Promise<InventoryTransaction> =>
  (await api.post<InventoryTransaction>('/v1/inventory/transactions', payload)).data

export const decideInventoryTransaction = async (
  txId: number,
  payload: { decision: 'APPROVED' | 'REJECTED'; comment?: string },
): Promise<InventoryTransaction> =>
  (await api.post<InventoryTransaction>(`/v1/inventory/transactions/${txId}/decision`, payload)).data

export const createCompostBatch = async (payload: {
  user_id: number
  batch_code: string
  start_date?: string
}): Promise<CompostBatch> =>
  (await api.post<CompostBatch>('/v1/foodwaste/batches', payload)).data

export interface WasteLogEntry {
  id: number
  batch_id: number | null
  user_id: number
  weight_kg: number
  moisture: string
  carbon_saved_kg: number
}

export const createWasteLog = async (payload: {
  batch_id?: number
  user_id: number
  weight_kg: number
  moisture: 'dry' | 'good' | 'wet'
}): Promise<WasteLogEntry> =>
  (await api.post<WasteLogEntry>('/v1/foodwaste/logs', payload)).data

export const fetchRecycleAccounts = async (): Promise<BankAccountSummary[]> =>
  (await api.get<BankAccountSummary[]>('/v1/recycle/accounts')).data

export interface RecyclePurchaseTransaction {
  id: number
  org_id: number
  trans_no: string
  user_id: number
  total_weight: number
  total_amount: number
  total_points: number
  status: string
}

export const recordRecyclePurchase = async (payload: {
  trans_no: string
  user_id: number
  total_weight: number
  total_amount: number
  total_points: number
}): Promise<RecyclePurchaseTransaction> =>
  (await api.post<RecyclePurchaseTransaction>('/v1/recycle/purchases', payload)).data

export const recordTabwaterReading = async (payload: {
  inv_no: string
  meter_id: number
  period_id: number
  current_meter: number
  reserve_fee?: number
  vat_percent?: number
}): Promise<WaterInvoice> =>
  (await api.post<WaterInvoice>('/v1/tabwater/readings', payload)).data

export const payTabwaterInvoice = async (invoiceId: number, cashierId = 1): Promise<WaterInvoice> =>
  (await api.post<WaterInvoice>(`/v1/tabwater/invoices/${invoiceId}/pay`, { cashier_id: cashierId })).data

// ---- Wave 4 & 6 Submodules: Kiosk/IoT, Welfare Fund & Annual Trash ----------

export interface KioskSummary {
  id: number
  org_id: number
  name: string
  lat: number
  lng: number
  status: string
  total_waste_count: number
}

export interface WelfareConfig {
  id: number
  org_id: number
  min_months_active: number
  min_total_weight: number
  default_payout_amount: number
  criteria_description: string
}

export interface WelfarePayout {
  id: number
  org_id: number
  deceased_name: string
  beneficiary_name: string
  amount: number
  status: string
}

export interface AnnualTrashSubscription {
  id: number
  fiscal_year: string
  user_id: number
  annual_fee: number
  month_fee: number
  total_paid_amt: number
  status: string
}

export interface RecycleSubmodulesOverview {
  kiosks: KioskSummary[]
  welfare_configs: WelfareConfig[]
  welfare_payouts: WelfarePayout[]
  annual_trash_subscriptions: AnnualTrashSubscription[]
}

export const fetchRecycleSubmodules = async (): Promise<RecycleSubmodulesOverview> =>
  (await api.get<RecycleSubmodulesOverview>('/v1/recycle/submodules')).data

// ---- CSV Export Helper (UTF-8 with BOM for Excel) ---------------------------

export function exportRowsToCsv(filename: string, headers: string[], rows: (string | number)[][]): string {
  const escapeCell = (val: string | number) => {
    const s = String(val ?? '')
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s
  }
  const csvContent =
    '\uFEFF' +
    [headers.map(escapeCell).join(','), ...rows.map((r) => r.map(escapeCell).join(','))].join('\r\n')

  if (typeof window !== 'undefined' && typeof URL.createObjectURL === 'function') {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', filename)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }
  return csvContent
}
