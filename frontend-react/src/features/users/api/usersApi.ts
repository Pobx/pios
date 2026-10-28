import { api } from '@/shared/api/client'
import type { UserSummary, Zone, LinkLineRequest, CreateUserInput, CreateZoneInput } from '../types'

export const fetchUsers = async (params?: { q?: string; limit?: number; offset?: number }): Promise<UserSummary[]> =>
  (await api.get<UserSummary[]>('/v1/users', { params })).data

export const fetchZones = async (): Promise<Zone[]> =>
  (await api.get<Zone[]>('/v1/zones')).data

export const createUser = async (payload: CreateUserInput): Promise<UserSummary> =>
  (await api.post<UserSummary>('/v1/users', payload)).data

export const createZone = async (payload: CreateZoneInput): Promise<Zone> =>
  (await api.post<Zone>('/v1/zones', payload)).data

export const linkUserLineAccount = async (userId: number, payload: LinkLineRequest): Promise<UserSummary> =>
  (await api.post<UserSummary>(`/v1/users/${userId}/link-line`, payload)).data
