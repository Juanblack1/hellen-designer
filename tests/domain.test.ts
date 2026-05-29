import { describe, expect, it } from 'vitest'
import {
  buildWhatsAppUrl,
  calculateAdminStats,
  formatCurrency,
  getAvailableSlots,
  getLowStockProducts,
  getPaymentState,
  getServiceUsage,
  hasScheduleConflict,
  maskBrazilianPhone,
  parseCurrencyToCents,
} from '../src/domain'
import type { AppointmentRecord, ClientRecord, ProductItem } from '../src/domain'

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

  it('calculates admin stats for schedule, finance and stock', () => {
    const appointments: AppointmentRecord[] = [
      { ...baseAppointment, id: 'a', received_amount_cents: 3000 },
      { ...baseAppointment, id: 'b', status: 'no_show', charged_amount_cents: 4000, received_amount_cents: 0 },
      { ...baseAppointment, id: 'c', scheduled_date: '2026-05-30', received_amount_cents: 1000 },
    ]
    const clients: ClientRecord[] = [{ id: 'client', full_name: 'Cliente Teste', phone: '(16) 99999-0000', notes: '' }]
    const products: ProductItem[] = [
      {
        id: 'henna',
        name: 'Henna',
        category: 'Henna',
        quantity: 1,
        unit_cost_cents: 1000,
        sale_price_cents: 0,
        minimum_quantity: 2,
        notes: '',
      },
    ]

    expect(calculateAdminStats(appointments, '2026-05-29', clients, products)).toEqual({
      todayCount: 2,
      upcomingCount: 2,
      clientCount: 1,
      receivedCents: 3000,
      pendingCents: 6000,
      weekReceivedCents: 4000,
      monthReceivedCents: 4000,
      noShowCount: 1,
      lowStockCount: 1,
    })
  })

  it('classifies payment status from charged and received values', () => {
    expect(getPaymentState({ charged_amount_cents: 4000, received_amount_cents: 0 })).toBe('pending')
    expect(getPaymentState({ charged_amount_cents: 4000, received_amount_cents: 2000 })).toBe('partial')
    expect(getPaymentState({ charged_amount_cents: 4000, received_amount_cents: 4000 })).toBe('paid')
  })

  it('masks Brazilian phones and blocks occupied or unavailable slots', () => {
    const appointments: AppointmentRecord[] = [{ ...baseAppointment, start_time: '09:00' }]

    expect(maskBrazilianPhone('16988758633')).toBe('(16) 98875-8633')
    expect(hasScheduleConflict(appointments, '2026-05-29', '09:00')).toBe(true)
    expect(getAvailableSlots(appointments, '2026-05-29')).not.toContain('09:00')
    expect(getAvailableSlots(appointments, '2026-05-29')).not.toContain('12:00')
  })

  it('summarizes low stock and service usage', () => {
    const products: ProductItem[] = [
      {
        id: 'low',
        name: 'Henna',
        category: 'Henna',
        quantity: 2,
        unit_cost_cents: 1000,
        sale_price_cents: 0,
        minimum_quantity: 3,
        notes: '',
      },
      {
        id: 'ok',
        name: 'Algodao',
        category: 'Consumo',
        quantity: 10,
        unit_cost_cents: 500,
        sale_price_cents: 0,
        minimum_quantity: 3,
        notes: '',
      },
    ]

    expect(getLowStockProducts(products)).toHaveLength(1)
    expect(getServiceUsage([{ ...baseAppointment, received_amount_cents: 3000 }])).toEqual([
      { serviceName: 'Design', count: 1, revenueCents: 3000 },
    ])
  })
})
