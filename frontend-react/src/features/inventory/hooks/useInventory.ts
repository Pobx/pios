import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchInventoryItems,
  fetchInventoryTransactions,
  createInventoryItem,
  createInventoryTransaction,
  decideInventoryTransaction,
} from '../api/inventoryApi'
import type {
  CreateInventoryItemInput,
  CreateInventoryTransactionInput,
  DecideTransactionPayload,
} from '../types'

export function useInventory() {
  const qc = useQueryClient()

  const itemsQuery = useQuery({
    queryKey: ['inventory-items'],
    queryFn: fetchInventoryItems,
  })

  const transactionsQuery = useQuery({
    queryKey: ['inventory-txs'],
    queryFn: fetchInventoryTransactions,
  })

  const createItemMutation = useMutation({
    mutationFn: (payload: CreateInventoryItemInput) => createInventoryItem(payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['inventory-items'] })
    },
  })

  const createTransactionMutation = useMutation({
    mutationFn: (payload: CreateInventoryTransactionInput) => createInventoryTransaction(payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['inventory-txs'] })
    },
  })

  const decideMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: DecideTransactionPayload }) =>
      decideInventoryTransaction(id, payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['inventory-txs'] })
    },
  })

  return {
    itemsQuery,
    transactionsQuery,
    createItemMutation,
    createTransactionMutation,
    decideMutation,
  }
}
