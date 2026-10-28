import { api } from '@/shared/api/client'
import type { ResidentOverview } from '../types'

export const fetchResidentOverview = async (): Promise<ResidentOverview> =>
  (await api.get<ResidentOverview>('/v1/resident/overview')).data
