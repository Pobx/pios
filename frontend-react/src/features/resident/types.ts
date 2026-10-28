import type { WaterMeter, WaterInvoice } from '@/features/tabwater'
import type { BankAccountSummary } from '@/features/recycle-bank'

export interface ResidentOverview {
  username: string
  org_id: number | null
  water_meters: WaterMeter[]
  invoices: WaterInvoice[]
  bank_accounts: BankAccountSummary[]
}
