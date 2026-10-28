import { api } from '@/shared/api/client'
import type {
  RecycleItem,
  BankAccountSummary,
  RecyclePurchaseTransaction,
  RecycleSubmodulesOverview,
  RecordPurchasePayload,
  WithdrawPayload,
  SetItemPricePayload,
} from '../types'

export const fetchRecycleItems = async (): Promise<RecycleItem[]> =>
  (await api.get<RecycleItem[]>('/v1/recycle/items')).data

export const fetchRecycleAccounts = async (): Promise<BankAccountSummary[]> =>
  (await api.get<BankAccountSummary[]>('/v1/recycle/accounts')).data

export const fetchRecycleSubmodules = async (): Promise<RecycleSubmodulesOverview> =>
  (await api.get<RecycleSubmodulesOverview>('/v1/recycle/submodules')).data

export const recordRecyclePurchase = async (payload: RecordPurchasePayload): Promise<RecyclePurchaseTransaction> =>
  (await api.post<RecyclePurchaseTransaction>('/v1/recycle/purchases', payload)).data

export const withdrawRecycleBalance = async (payload: WithdrawPayload): Promise<BankAccountSummary> =>
  (await api.post<BankAccountSummary>('/v1/recycle/withdrawals', payload)).data

export const setRecycleItemPrice = async (itemId: number, payload: SetItemPricePayload): Promise<RecycleItem> =>
  (await api.post<RecycleItem>(`/v1/recycle/items/${itemId}/price`, payload)).data
