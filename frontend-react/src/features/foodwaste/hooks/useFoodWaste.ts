import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchFoodWasteSummary, createCompostBatch, createWasteLog } from '../api/foodwasteApi'
import type { CreateBatchPayload, CreateWasteLogPayload } from '../types'

export function useFoodWaste() {
  const qc = useQueryClient()

  const summaryQuery = useQuery({
    queryKey: ['foodwaste-summary'],
    queryFn: fetchFoodWasteSummary,
  })

  const createBatchMutation = useMutation({
    mutationFn: (payload: CreateBatchPayload) => createCompostBatch(payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['foodwaste-summary'] })
    },
  })

  const createWasteLogMutation = useMutation({
    mutationFn: (payload: CreateWasteLogPayload) => createWasteLog(payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['foodwaste-summary'] })
    },
  })

  return {
    summaryQuery,
    createBatchMutation,
    createWasteLogMutation,
  }
}
