import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchUsers, fetchZones, createUser, createZone, linkUserLineAccount } from '../api/usersApi'
import type { CreateUserInput, CreateZoneInput, LinkLineRequest } from '../types'

export function useUsers() {
  const qc = useQueryClient()

  const usersQuery = useQuery({
    queryKey: ['users'],
    queryFn: () => fetchUsers({ limit: 50, offset: 0 }),
  })

  const zonesQuery = useQuery({
    queryKey: ['zones'],
    queryFn: fetchZones,
  })

  const createUserMutation = useMutation({
    mutationFn: (payload: CreateUserInput) => createUser(payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['users'] })
    },
  })

  const createZoneMutation = useMutation({
    mutationFn: (payload: CreateZoneInput) => createZone(payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['zones'] })
    },
  })

  const linkLineMutation = useMutation({
    mutationFn: ({ userId, payload }: { userId: number; payload: LinkLineRequest }) =>
      linkUserLineAccount(userId, payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['users'] })
    },
  })

  return {
    usersQuery,
    zonesQuery,
    createUserMutation,
    createZoneMutation,
    linkLineMutation,
  }
}
