export interface WaterMeter {
  meter_id: number
  org_id: number
  user_id: number
  meternumber: string
  submeter_name: string
  meter_address: string
  undertake_zone_id: number | null
  undertake_subzone_id: number | null
  last_meter_recording: number
  status: string
}

export interface WaterInvoice {
  id: number
  org_id: number
  meter_id: number
  period_id: number
  period_name?: string
  inv_no: string
  lastmeter: number
  currentmeter: number
  water_used: number
  paid: number
  reserve_meter: number
  vat: number
  totalpaid: number
  status: string
}

export interface InvoicePeriod {
  id: number
  org_id: number
  period_name: string
  start_date: string
  end_date: string
  status: string
}

export interface RecordReadingPayload {
  inv_no: string
  meter_id: number
  period_id: number
  current_meter: number
  reserve_fee?: number
  vat_percent?: number
}

export interface CreateMeterPayload {
  user_id: number
  meternumber: string
  submeter_name: string
  meter_address?: string
  undertake_zone_id?: number
  undertake_subzone_id?: number
  initial_reading?: number
}

export interface CreatePeriodPayload {
  period_name: string
  start_date?: string
  end_date?: string
}
