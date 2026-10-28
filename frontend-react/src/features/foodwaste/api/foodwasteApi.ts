import { api } from '@/shared/api/client'
import type { FoodWasteSummary, CompostBatch, WasteLogEntry, CreateBatchPayload, CreateWasteLogPayload } from '../types'

export const fetchFoodWasteSummary = async (): Promise<FoodWasteSummary> =>
  (await api.get<FoodWasteSummary>('/v1/foodwaste/summary')).data

export const createCompostBatch = async (payload: CreateBatchPayload): Promise<CompostBatch> =>
  (await api.post<CompostBatch>('/v1/foodwaste/batches', payload)).data

export const createWasteLog = async (payload: CreateWasteLogPayload): Promise<WasteLogEntry> =>
  (await api.post<WasteLogEntry>('/v1/foodwaste/logs', payload)).data
