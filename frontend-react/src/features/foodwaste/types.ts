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

export interface WasteLogEntry {
  id: number
  batch_id: number | null
  user_id: number
  weight_kg: number
  moisture: string
  carbon_saved_kg: number
}

export interface CreateBatchPayload {
  user_id: number
  batch_code: string
  start_date?: string
}

export interface CreateWasteLogPayload {
  batch_id?: number
  user_id: number
  weight_kg: number
  moisture: 'dry' | 'good' | 'wet'
}
