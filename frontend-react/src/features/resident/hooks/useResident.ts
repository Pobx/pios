import { useQuery } from '@tanstack/react-query'
import { fetchResidentOverview } from '../api/residentApi'

export function useResident() {
  const residentQuery = useQuery({
    queryKey: ['resident-overview'],
    queryFn: fetchResidentOverview,
  })

  return {
    residentQuery,
  }
}
