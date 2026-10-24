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
