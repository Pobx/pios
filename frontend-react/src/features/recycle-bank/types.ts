export interface RecycleItem {
  id: number
  org_id: number
  group_id: number
  group_name: string
  code: string
  name: string
  price_from_dealer: number
  price_for_member: number
  point: number
  unit_name: string
  status: string
}

export interface BankAccountSummary {
  id: number
  org_id: number
  user_id: number
  account_no: string
  balance: number
  points: number
  status: string
}

export interface RecycleAccount {
  id: number
  org_id: number
  user_id: number
  account_no: string
  balance: number
  points: number
  status: string
}

export interface RecyclePurchaseItem {
  item_id: number
  weight: number
  price_per_unit: number
  amount: number
  points: number
}

export interface RecyclePurchaseTransaction {
  id: number
  org_id: number
  trans_no: string
  user_id: number
  total_weight: number
  total_amount: number
  total_points: number
}

export interface KioskSummary {
  id: number
  org_id: number
  name: string
  kiosk_code: string
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

export interface RecordPurchasePayload {
  trans_no: string
  user_id: number
  total_weight: number
  total_amount: number
  total_points: number
  items?: RecyclePurchaseItem[]
}

export interface WithdrawPayload {
  account_id: number
  amount: number
  payout_method?: 'cash' | 'transfer'
  note?: string
}

export interface SetItemPricePayload {
  price_from_dealer: number
  price_for_member: number
  point: number
}
