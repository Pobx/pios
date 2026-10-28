import { api } from '@/shared/api/client'
import type {
  InventoryItem,
  InventoryTransaction,
  CreateInventoryItemInput,
  CreateInventoryTransactionInput,
  DecideTransactionPayload,
} from '../types'

export const fetchInventoryItems = async (): Promise<InventoryItem[]> =>
  (await api.get<InventoryItem[]>('/v1/inventory/items')).data

export const createInventoryItem = async (payload: CreateInventoryItemInput): Promise<InventoryItem> =>
  (await api.post<InventoryItem>('/v1/inventory/items', payload)).data

export const fetchInventoryTransactions = async (): Promise<InventoryTransaction[]> =>
  (await api.get<InventoryTransaction[]>('/v1/inventory/transactions')).data

export const createInventoryTransaction = async (
  payload: CreateInventoryTransactionInput,
): Promise<InventoryTransaction> =>
  (await api.post<InventoryTransaction>('/v1/inventory/transactions', payload)).data

export const decideInventoryTransaction = async (
  txId: number,
  payload: DecideTransactionPayload,
): Promise<InventoryTransaction> =>
  (await api.post<InventoryTransaction>(`/v1/inventory/transactions/${txId}/decision`, payload)).data
