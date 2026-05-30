import { describe, expect, it } from 'vitest'
import {
  buildAvailabilityShifts,
  buildWhatsAppUrl,
  calculateAdminStats,
  defaultAvailabilityExceptions,
  defaultAvailabilityRules,
  defaultBusinessHours,
  defaultScheduleSettings,
  defaultServices,
  deriveBusinessHoursFromAvailabilityRules,
  formatCurrency,
  getAppointmentEndTime,
  getAvailableSlots,
  getLegacyStockMovementType,
  getLowStockProducts,
  getPaymentState,
  getServiceUsage,
  getStockMovementDelta,
  hasScheduleConflict,
  isSlotInsideAvailability,
  maskBrazilianPhone,
  normalizeStockMovement,
  normalizeStockMovementType,
  parseCurrencyToCents,
} from '../src/domain'
import type { AppointmentRecord, BusinessHour, ClientRecord, ProductItem } from '../src/domain'

const baseAppointment: AppointmentRecord = {
  id: 'appt',
  client_id: 'client',
  client_name: 'Cliente Teste',
  client_phone: '(16) 99999-0000',
  service_id: 'service',
  service_name: 'Design',
  scheduled_date: '2026-05-29',
  start_time: '09:00',
  end_time: '10:00',
  status: 'confirmed',
  charged_amount_cents: 3000,
  received_amount_cents: 0,
  payment_method: 'pix',
  payment_status: 'pending',
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
    expect(getPaymentState({ charged_amount_cents: 4000, received_amount_cents: 0, payment_status: 'canceled' })).toBe(
      'canceled',
    )
  })

  it('excludes canceled payments from received and pending finance totals', () => {
    const stats = calculateAdminStats(
      [{ ...baseAppointment, charged_amount_cents: 5000, received_amount_cents: 5000, payment_status: 'canceled' }],
      '2026-05-29',
    )

    expect(stats.receivedCents).toBe(0)
    expect(stats.pendingCents).toBe(0)
    expect(stats.weekReceivedCents).toBe(0)
    expect(stats.monthReceivedCents).toBe(0)
  })

  it('masks Brazilian phones and blocks occupied, overlapping or unavailable slots', () => {
    const appointments: AppointmentRecord[] = [{ ...baseAppointment, start_time: '09:00' }]

    expect(maskBrazilianPhone('16988758633')).toBe('(16) 98875-8633')
    expect(hasScheduleConflict(appointments, '2026-05-29', '09:00')).toBe(true)
    expect(hasScheduleConflict(appointments, '2026-05-29', '09:30')).toBe(true)
    expect(hasScheduleConflict(appointments, '2026-05-29', '10:00')).toBe(false)
    expect(getAvailableSlots(appointments, '2026-05-29')).not.toContain('09:00')
    expect(getAvailableSlots(appointments, '2026-05-29')).not.toContain('12:00')
  })

  it('uses service duration and availability rules for schedule slots', () => {
    const service = defaultServices.find((item) => item.id === 'design-com-coloracao') ?? defaultServices[0]
    const appointment: AppointmentRecord = {
      ...baseAppointment,
      service_id: service.id,
      service_name: service.name,
      start_time: '14:30',
      end_time: null,
    }

    expect(getAppointmentEndTime(appointment, defaultServices)).toBe('15:40')
    expect(
      isSlotInsideAvailability(
        '2026-05-29',
        '13:30',
        '14:30',
        defaultBusinessHours,
        defaultAvailabilityRules,
        defaultAvailabilityExceptions,
      ),
    ).toBe(true)
    expect(
      getAvailableSlots(
        [appointment],
        '2026-05-29',
        defaultServices,
        defaultBusinessHours,
        defaultAvailabilityRules,
        defaultAvailabilityExceptions,
        defaultScheduleSettings,
        service.duration_minutes,
      ),
    ).not.toContain('14:00')
  })

  it('groups availability rules into editable shifts', () => {
    const shifts = buildAvailabilityShifts([
      { id: 'mon-morning', day_of_week: 1, start_time: '09:00', end_time: '12:00', active: true },
      { id: 'tue-morning', day_of_week: 2, start_time: '09:00', end_time: '12:00', active: true },
      { id: 'sat-short', day_of_week: 6, start_time: '09:00', end_time: '14:00', active: true },
      { id: 'wed-afternoon', day_of_week: 3, start_time: '13:30', end_time: '18:00', active: false, label: 'Tarde' },
      { id: 'thu-afternoon', day_of_week: 4, start_time: '13:30', end_time: '18:00', active: true, label: 'Tarde' },
    ])

    expect(
      shifts.map((shift) => ({
        label: shift.label,
        start_time: shift.start_time,
        end_time: shift.end_time,
        active: shift.active,
        days: shift.days,
      })),
    ).toEqual([
      { label: 'Manha', start_time: '09:00', end_time: '12:00', active: true, days: [1, 2] },
      { label: 'Manha', start_time: '09:00', end_time: '14:00', active: true, days: [6] },
      { label: 'Tarde', start_time: '13:30', end_time: '18:00', active: true, days: [3, 4] },
    ])
  })

  it('derives weekly business hours from active availability shifts', () => {
    const hours: BusinessHour[] = [
      { id: 'sun', day_of_week: 0, is_open: true, start_time: '09:00', end_time: '18:00' },
      { id: 'mon', day_of_week: 1, is_open: false, start_time: '09:00', end_time: '18:00' },
      { id: 'tue', day_of_week: 2, is_open: true, start_time: '09:00', end_time: '18:00' },
    ]

    expect(
      deriveBusinessHoursFromAvailabilityRules(hours, [
        { id: 'mon-morning', day_of_week: 1, start_time: '09:30', end_time: '12:00', active: true, label: 'Manha' },
        { id: 'mon-afternoon', day_of_week: 1, start_time: '13:30', end_time: '17:00', active: true, label: 'Tarde' },
        { id: 'tue-paused', day_of_week: 2, start_time: '09:00', end_time: '18:00', active: false, label: 'Pausado' },
      ]),
    ).toEqual([
      { id: 'sun', day_of_week: 0, is_open: false, start_time: '09:00', end_time: '18:00' },
      { id: 'mon', day_of_week: 1, is_open: true, start_time: '09:30', end_time: '17:00' },
      { id: 'tue', day_of_week: 2, is_open: false, start_time: '09:00', end_time: '18:00' },
    ])
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

  it('normalizes current and legacy stock movement formats', () => {
    expect(normalizeStockMovementType('input')).toBe('in')
    expect(normalizeStockMovementType('manual_adjustment')).toBe('adjustment')
    expect(getLegacyStockMovementType('out')).toBe('output')
    expect(getStockMovementDelta('service_use', 3)).toBe(-3)
    expect(getStockMovementDelta('in', 3)).toBe(3)

    expect(
      normalizeStockMovement({
        id: 'move',
        product_id: 'prod',
        product_name: 'Henna',
        movement_type: 'sale',
        quantity_delta: -2,
        notes: 'Venda',
        created_at: '2026-05-30T12:00:00.000Z',
      }),
    ).toEqual({
      id: 'move',
      product_id: 'prod',
      product_name: 'Henna',
      type: 'sale',
      quantity: 2,
      notes: 'Venda',
      created_at: '2026-05-30T12:00:00.000Z',
    })
  })
})
