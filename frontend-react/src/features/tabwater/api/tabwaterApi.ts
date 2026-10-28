import { api } from '@/shared/api/client'
import type {
  WaterMeter,
  WaterInvoice,
  InvoicePeriod,
  RecordReadingPayload,
  CreateMeterPayload,
  CreatePeriodPayload,
} from '../types'

export const fetchTabwaterMeters = async (params?: { limit?: number; offset?: number }): Promise<WaterMeter[]> =>
  (await api.get<WaterMeter[]>('/v1/tabwater/meters', { params })).data

export const fetchTabwaterInvoices = async (params?: {
  status?: string
  limit?: number
  offset?: number
}): Promise<WaterInvoice[]> =>
  (await api.get<WaterInvoice[]>('/v1/tabwater/invoices', { params })).data

export const fetchTabwaterPeriods = async (): Promise<InvoicePeriod[]> =>
  (await api.get<InvoicePeriod[]>('/v1/tabwater/periods')).data

export const createTabwaterPeriod = async (payload: CreatePeriodPayload): Promise<InvoicePeriod> =>
  (await api.post<InvoicePeriod>('/v1/tabwater/periods', payload)).data

export const createTabwaterMeter = async (payload: CreateMeterPayload): Promise<WaterMeter> =>
  (await api.post<WaterMeter>('/v1/tabwater/meters', payload)).data

export const recordTabwaterReading = async (payload: RecordReadingPayload): Promise<WaterInvoice> =>
  (await api.post<WaterInvoice>('/v1/tabwater/readings', payload)).data

export const payTabwaterInvoice = async (
  invoiceId: number,
  payload?: { payment_method?: string; amount?: number },
): Promise<WaterInvoice> =>
  (await api.post<WaterInvoice>(`/v1/tabwater/invoices/${invoiceId}/pay`, payload ?? {})).data
