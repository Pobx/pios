import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchTabwaterMeters,
  fetchTabwaterInvoices,
  fetchTabwaterPeriods,
  createTabwaterPeriod,
  createTabwaterMeter,
  recordTabwaterReading,
  payTabwaterInvoice,
} from '../api/tabwaterApi'
import type { RecordReadingPayload, CreateMeterPayload, CreatePeriodPayload } from '../types'

export function useTabwater() {
  const qc = useQueryClient()

  const metersQuery = useQuery({
    queryKey: ['tabwater-meters'],
    queryFn: () => fetchTabwaterMeters({ limit: 50, offset: 0 }),
  })

  const invoicesQuery = useQuery({
    queryKey: ['tabwater-invoices'],
    queryFn: () => fetchTabwaterInvoices({ limit: 50, offset: 0 }),
  })

  const periodsQuery = useQuery({
    queryKey: ['tabwater-periods'],
    queryFn: fetchTabwaterPeriods,
  })

  const readingMutation = useMutation({
    mutationFn: (payload: RecordReadingPayload) => recordTabwaterReading(payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['tabwater-meters'] })
      void qc.invalidateQueries({ queryKey: ['tabwater-invoices'] })
    },
  })

  const createPeriodMutation = useMutation({
    mutationFn: (payload: CreatePeriodPayload) => createTabwaterPeriod(payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['tabwater-periods'] })
    },
  })

  const createMeterMutation = useMutation({
    mutationFn: (payload: CreateMeterPayload) => createTabwaterMeter(payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['tabwater-meters'] })
    },
  })

  const payInvoiceMutation = useMutation({
    mutationFn: (invoiceId: number) => payTabwaterInvoice(invoiceId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['tabwater-invoices'] })
    },
  })

  return {
    metersQuery,
    invoicesQuery,
    periodsQuery,
    readingMutation,
    createPeriodMutation,
    createMeterMutation,
    payInvoiceMutation,
  }
}
