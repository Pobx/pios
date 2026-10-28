export interface UserSummary {
  id: number
  org_id: number | null
  username: string
  prefix: string
  firstname: string
  lastname: string
  email: string
  phone: string
  address: string
  zone_id: number | null
  subzone_id: number | null
  line_user_id: string
  status: string
}

export interface Subzone {
  id: number
  org_id: number | null
  zone_id: number
  subzone_name: string
  status: string
}

export interface Zone {
  id: number
  org_id: number | null
  zone_name: string
  status: string
  subzones: Subzone[]
}

export interface LinkLineRequest {
  line_user_id: string
  verification_mode: 'staff_code' | 'staff_approval' | 'password'
  verification_code: string
}

export interface CreateUserInput {
  username: string
  prefix?: string
  firstname: string
  lastname?: string
  phone?: string
  address?: string
  zone_id?: number
  subzone_id?: number
}

export interface CreateZoneInput {
  zone_name: string
  location?: string
}
