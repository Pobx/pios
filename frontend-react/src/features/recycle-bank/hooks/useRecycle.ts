import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchRecycleItems,
  fetchRecycleAccounts,
  fetchRecycleSubmodules,
  recordRecyclePurchase,
  withdrawRecycleBalance,
  setRecycleItemPrice,
} from '../api/recycleApi'
import type { RecordPurchasePayload, WithdrawPayload, SetItemPricePayload } from '../types'

export function useRecycle() {
  const qc = useQueryClient()

  const itemsQuery = useQuery({
    queryKey: ['recycle-items'],
    queryFn: fetchRecycleItems,
  })

  const accountsQuery = useQuery({
    queryKey: ['recycle-accounts'],
    queryFn: fetchRecycleAccounts,
  })

  const submodulesQuery = useQuery({
    queryKey: ['recycle-submodules'],
    queryFn: fetchRecycleSubmodules,
  })

  const purchaseMutation = useMutation({
    mutationFn: (payload: RecordPurchasePayload) => recordRecyclePurchase(payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['recycle-accounts'] })
    },
  })

  const withdrawMutation = useMutation({
    mutationFn: (payload: WithdrawPayload) => withdrawRecycleBalance(payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['recycle-accounts'] })
    },
  })

  const priceMutation = useMutation({
    mutationFn: ({ itemId, payload }: { itemId: number; payload: SetItemPricePayload }) =>
      setRecycleItemPrice(itemId, payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['recycle-items'] })
    },
  })

  return {
    itemsQuery,
    accountsQuery,
    submodulesQuery,
    purchaseMutation,
    withdrawMutation,
    priceMutation,
  }
}
