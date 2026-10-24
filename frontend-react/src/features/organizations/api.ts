import { api } from '@/shared/api/client'

export interface Organization {
  id: number
  code: string
  name: string
  type_id: number
}

export const fetchOrganizations = async (): Promise<Organization[]> =>
  (await api.get<Organization[]>('/v1/organizations')).data
