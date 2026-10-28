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

export interface CreateInventoryTransactionInput {
  ref_no: string
  item_id: number
  requester_id: number
  quantity: number
  purpose: string
}

export interface DecideTransactionPayload {
  decision: 'APPROVED' | 'REJECTED'
  comment?: string
}
