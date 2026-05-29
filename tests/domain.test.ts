import { describe, expect, it } from 'vitest'
import {
  buildWhatsAppUrl,
  calculateAdminStats,
  formatCurrency,
  getPaymentState,
  parseCurrencyToCents,
} from '../src/domain'
import type { AppointmentRecord } from '../src/domain'

const baseAppointment: AppointmentRecord = {
  id: 'appt',
  client_id: 'client',
  client_name: 'Cliente Teste',
  client_phone: '(16) 99999-0000',
  service_id: 'service',
  service_name: 'Design',
  scheduled_date: '2026-05-29',
  start_time: '09:00',
  status: 'confirmed',
  charged_amount_cents: 3000,
  received_amount_cents: 0,
  payment_method: 'pix',
  notes: '',
}

describe('domain helpers', () => {
  it('formats and parses Brazilian currency values', () => {
    expect(parseCurrencyToCents('30,00')).toBe(3000)
    expect(parseCurrencyToCents('1.234,56')).toBe(123456)
    expect(formatCurrency(4000).replace(/\s/g, ' ')).toBe('R$ 40,00')
  })

  it('builds WhatsApp URLs with Brazil country code', () => {
    expect(buildWhatsAppUrl('(16) 98875-8633', 'Ola Hellen')).toBe(
      'https://wa.me/5516988758633?text=Ola%20Hellen',
    )
  })

  it('calculates admin stats for the selected day only', () => {
    const appointments: AppointmentRecord[] = [
      { ...baseAppointment, id: 'a', received_amount_cents: 3000 },
      { ...baseAppointment, id: 'b', status: 'no_show', charged_amount_cents: 4000, received_amount_cents: 0 },
      { ...baseAppointment, id: 'c', scheduled_date: '2026-05-30', received_amount_cents: 1000 },
    ]

    expect(calculateAdminStats(appointments, '2026-05-29')).toEqual({
      todayCount: 2,
      receivedCents: 3000,
      pendingCents: 4000,
      noShowCount: 1,
    })
  })

  it('classifies payment status from charged and received values', () => {
    expect(getPaymentState({ charged_amount_cents: 4000, received_amount_cents: 0 })).toBe('pending')
    expect(getPaymentState({ charged_amount_cents: 4000, received_amount_cents: 2000 })).toBe('partial')
    expect(getPaymentState({ charged_amount_cents: 4000, received_amount_cents: 4000 })).toBe('paid')
  })
})
