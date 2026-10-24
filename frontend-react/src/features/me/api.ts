import { api } from '@/shared/api/client'

export interface MeResponse {
  sub: string
  username: string
  roles: string[]
  org_id: number | null
}

export const fetchMe = async (): Promise<MeResponse> => (await api.get<MeResponse>('/v1/me')).data
