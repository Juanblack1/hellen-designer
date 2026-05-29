export type BusinessProfile = {
  id: string
  brand_name: string
  subtitle: string
  bio: string
  phone: string
  whatsapp_number: string
  instagram_handle: string
  instagram_url: string
  address: string
  published: boolean
}

export type ServiceItem = {
  id: string
  name: string
  description: string
  duration_minutes: number
  price_cents: number
  active: boolean
  published: boolean
  sort_order: number
}

export type GalleryItem = {
  id: string
  title: string
  image_path: string
  alt_text: string
  published: boolean
  sort_order: number
}

export type ClientRecord = {
  id: string
  full_name: string
  phone: string
  birth_date?: string | null
  notes: string
}

export type AppointmentStatus = 'scheduled' | 'confirmed' | 'completed' | 'no_show' | 'canceled'

export type PaymentMethod = 'pix' | 'cash' | 'debit_card' | 'credit_card' | 'transfer' | 'other'
export type PaymentStatus = 'pending' | 'partial' | 'paid' | 'canceled'

export type AppointmentRecord = {
  id: string
  client_id: string | null
  client_name: string
  client_phone: string
  service_id: string | null
  service_name: string
  scheduled_date: string
  start_time: string
  end_time?: string | null
  status: AppointmentStatus
  charged_amount_cents: number
  received_amount_cents: number
  payment_method: PaymentMethod
  payment_status?: PaymentStatus | null
  payment_canceled_reason?: string | null
  notes: string
}

export type PaymentTransaction = {
  id: string
  appointment_id: string
  amount_cents: number
  method: PaymentMethod
  paid_at: string
  notes: string
  created_at: string
}

export type ProductItem = {
  id: string
  name: string
  category: string
  quantity: number
  unit_cost_cents: number
  sale_price_cents: number
  minimum_quantity: number
  updated_at?: string | null
  notes: string
}

export type StockMovementType = 'in' | 'out' | 'service_use' | 'sale' | 'adjustment'

export type StockMovement = {
  id: string
  product_id: string
  product_name: string
  type: StockMovementType
  quantity: number
  notes: string
  created_at: string
}

export type BusinessHour = {
  id: string
  day_of_week: number
  is_open: boolean
  start_time: string
  end_time: string
}

export type AvailabilityRule = {
  id: string
  day_of_week: number
  start_time: string
  end_time: string
  active: boolean
}

export type AvailabilityExceptionType = 'blocked' | 'custom_available' | 'holiday' | 'vacation'

export type AvailabilityException = {
  id: string
  date: string
  type: AvailabilityExceptionType
  start_time: string | null
  end_time: string | null
  reason: string
}

export type ScheduleSettings = {
  slot_interval_minutes: 15 | 30 | 60
  buffer_between_services_minutes: number
  minimum_notice_hours: number
  max_days_ahead: number
  allow_same_day_booking: boolean
  allow_manual_outside_availability: boolean
}

export type AdminStats = {
  todayCount: number
  upcomingCount: number
  clientCount: number
  receivedCents: number
  pendingCents: number
  weekReceivedCents: number
  monthReceivedCents: number
  noShowCount: number
  lowStockCount: number
}

export type ServiceUsage = {
  serviceName: string
  count: number
  revenueCents: number
}

export const defaultProfile: BusinessProfile = {
  id: 'default',
  brand_name: 'Hellen Martins',
  subtitle: 'Designer de Sobrancelhas',
  bio: 'Design de sobrancelhas para realcar a beleza natural com desenho personalizado, henna, coloracao e acabamento delicado.',
  phone: '(16) 98875-8633',
  whatsapp_number: '5516988758633',
  instagram_handle: '@hellenmartins.designer',
  instagram_url: 'https://www.instagram.com/hellenmartins.designer/',
  address: 'Atendimento com horario combinado pelo WhatsApp',
  published: true,
}

export const defaultServices: ServiceItem[] = [
  {
    id: 'design-reconstrutivo',
    name: 'Design Reconstrutivo',
    description: 'Tecnica que modela os fios usando mapeamento e medidas faciais, deixando as sobrancelhas harmoniosas e naturais.',
    duration_minutes: 45,
    price_cents: 2000,
    active: true,
    published: true,
    sort_order: 10,
  },
  {
    id: 'design-com-henna',
    name: 'Design com Henna',
    description: 'Define, cobre falhas, alonga visualmente e da destaque tingindo pele e pelos.',
    duration_minutes: 60,
    price_cents: 3000,
    active: true,
    published: true,
    sort_order: 20,
  },
  {
    id: 'design-com-coloracao',
    name: 'Design com Coloracao',
    description: 'Define a sobrancelha de forma natural, tingindo principalmente os pelos com leve sombreado de fundo.',
    duration_minutes: 70,
    price_cents: 4000,
    active: true,
    published: true,
    sort_order: 30,
  },
]

export const defaultGallery: GalleryItem[] = [
  {
    id: 'logo-hm',
    title: 'Logo Hellen Martins',
    image_path: 'brandLogo',
    alt_text: 'Logo Hellen Martins Designer de Sobrancelhas',
    published: true,
    sort_order: 10,
  },
  {
    id: 'brand-banner',
    title: 'Arte da marca',
    image_path: 'brandBanner',
    alt_text: 'Arte preta e dourada com monograma HM',
    published: true,
    sort_order: 20,
  },
  {
    id: 'care-card',
    title: 'Cada detalhe com carinho',
    image_path: 'careCard',
    alt_text: 'Arte de agradecimento da Hellen Martins',
    published: true,
    sort_order: 30,
  },
  {
    id: 'portrait',
    title: 'Resultado natural',
    image_path: 'portrait',
    alt_text: 'Retrato beauty com sobrancelhas naturais',
    published: true,
    sort_order: 40,
  },
]

export const defaultClients: ClientRecord[] = [
  {
    id: 'client-ana',
    full_name: 'Ana Clara',
    phone: '(16) 98888-1100',
    birth_date: '1998-05-12',
    notes: 'Prefere desenho natural. Confirmar sempre pelo WhatsApp.',
  },
  {
    id: 'client-julia',
    full_name: 'Julia Martins',
    phone: '(16) 97777-2200',
    birth_date: null,
    notes: 'Gosta de henna suave e acabamento mais limpo no inicio da sobrancelha.',
  },
  {
    id: 'client-adriana',
    full_name: 'Adriana Santos',
    phone: '(16) 96666-3300',
    birth_date: null,
    notes: 'Relatou sensibilidade. Evitar produto com perfume forte.',
  },
]

export const defaultAppointments: AppointmentRecord[] = [
  {
    id: 'appt-1',
    client_id: 'client-ana',
    client_name: 'Ana Clara',
    client_phone: '(16) 98888-1100',
    service_id: 'design-com-henna',
    service_name: 'Design com Henna',
    scheduled_date: new Date().toISOString().slice(0, 10),
    start_time: '09:00',
    end_time: '10:00',
    status: 'confirmed',
    charged_amount_cents: 3000,
    received_amount_cents: 3000,
    payment_method: 'pix',
    payment_status: 'paid',
    notes: 'Primeira cliente do dia.',
  },
  {
    id: 'appt-2',
    client_id: 'client-julia',
    client_name: 'Julia Martins',
    client_phone: '(16) 97777-2200',
    service_id: 'design-com-coloracao',
    service_name: 'Design com Coloracao',
    scheduled_date: new Date().toISOString().slice(0, 10),
    start_time: '14:30',
    end_time: '15:40',
    status: 'scheduled',
    charged_amount_cents: 4000,
    received_amount_cents: 0,
    payment_method: 'pix',
    payment_status: 'pending',
    notes: 'Enviar confirmacao pela manha.',
  },
  {
    id: 'appt-3',
    client_id: 'client-adriana',
    client_name: 'Adriana Santos',
    client_phone: '(16) 96666-3300',
    service_id: 'design-com-henna',
    service_name: 'Design com Henna',
    scheduled_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    start_time: '16:00',
    end_time: '17:00',
    status: 'confirmed',
    charged_amount_cents: 3000,
    received_amount_cents: 1500,
    payment_method: 'cash',
    payment_status: 'partial',
    notes: 'Pagamento parcial combinado.',
  },
]

export const defaultPaymentTransactions: PaymentTransaction[] = [
  {
    id: 'txn-1',
    appointment_id: 'appt-1',
    amount_cents: 3000,
    method: 'pix',
    paid_at: new Date().toISOString(),
    notes: 'Pagamento integral.',
    created_at: new Date().toISOString(),
  },
  {
    id: 'txn-2',
    appointment_id: 'appt-3',
    amount_cents: 1500,
    method: 'cash',
    paid_at: new Date().toISOString(),
    notes: 'Sinal registrado.',
    created_at: new Date().toISOString(),
  },
]

export const defaultProducts: ProductItem[] = [
  {
    id: 'henna-castanho',
    name: 'Henna castanho medio',
    category: 'Henna',
    quantity: 2,
    unit_cost_cents: 1800,
    sale_price_cents: 0,
    minimum_quantity: 3,
    updated_at: new Date().toISOString(),
    notes: 'Repor antes do fim de semana.',
  },
  {
    id: 'algodao',
    name: 'Algodao',
    category: 'Consumo',
    quantity: 6,
    unit_cost_cents: 700,
    sale_price_cents: 0,
    minimum_quantity: 4,
    updated_at: new Date().toISOString(),
    notes: '',
  },
  {
    id: 'pinca-dourada',
    name: 'Pinca dourada',
    category: 'Instrumento',
    quantity: 1,
    unit_cost_cents: 3500,
    sale_price_cents: 0,
    minimum_quantity: 2,
    updated_at: new Date().toISOString(),
    notes: 'Separar uma reserva para atendimentos.',
  },
]

export const defaultStockMovements: StockMovement[] = [
  {
    id: 'movement-1',
    product_id: 'henna-castanho',
    product_name: 'Henna castanho medio',
    type: 'service_use',
    quantity: 1,
    notes: 'Uso em atendimento com henna.',
    created_at: new Date().toISOString(),
  },
]

export const defaultUnavailableBlocks = [
  { id: 'lunch', label: 'Almoco / indisponivel', start: '12:00', end: '13:30' },
  { id: 'closing', label: 'Fechamento', start: '19:00', end: '20:00' },
]

export const defaultBusinessHours: BusinessHour[] = [
  { id: 'sun', day_of_week: 0, is_open: false, start_time: '09:00', end_time: '18:00' },
  { id: 'mon', day_of_week: 1, is_open: false, start_time: '09:00', end_time: '18:00' },
  { id: 'tue', day_of_week: 2, is_open: true, start_time: '09:00', end_time: '18:00' },
  { id: 'wed', day_of_week: 3, is_open: true, start_time: '09:00', end_time: '18:00' },
  { id: 'thu', day_of_week: 4, is_open: true, start_time: '09:00', end_time: '18:00' },
  { id: 'fri', day_of_week: 5, is_open: true, start_time: '09:00', end_time: '18:00' },
  { id: 'sat', day_of_week: 6, is_open: true, start_time: '09:00', end_time: '14:00' },
]

export const defaultAvailabilityRules: AvailabilityRule[] = [
  { id: 'tue-morning', day_of_week: 2, start_time: '09:00', end_time: '12:00', active: true },
  { id: 'tue-afternoon', day_of_week: 2, start_time: '13:30', end_time: '18:00', active: true },
  { id: 'wed-morning', day_of_week: 3, start_time: '09:00', end_time: '12:00', active: true },
  { id: 'wed-afternoon', day_of_week: 3, start_time: '14:00', end_time: '18:00', active: true },
  { id: 'thu-morning', day_of_week: 4, start_time: '09:00', end_time: '12:00', active: true },
  { id: 'thu-afternoon', day_of_week: 4, start_time: '13:30', end_time: '18:00', active: true },
  { id: 'fri-morning', day_of_week: 5, start_time: '09:00', end_time: '12:00', active: true },
  { id: 'fri-afternoon', day_of_week: 5, start_time: '13:30', end_time: '18:00', active: true },
  { id: 'sat-short', day_of_week: 6, start_time: '09:00', end_time: '14:00', active: true },
]

export const defaultAvailabilityExceptions: AvailabilityException[] = [
  {
    id: 'today-lunch',
    date: new Date().toISOString().slice(0, 10),
    type: 'blocked',
    start_time: '12:00',
    end_time: '13:30',
    reason: 'Almoco',
  },
]

export const defaultScheduleSettings: ScheduleSettings = {
  slot_interval_minutes: 30,
  buffer_between_services_minutes: 0,
  minimum_notice_hours: 0,
  max_days_ahead: 60,
  allow_same_day_booking: true,
  allow_manual_outside_availability: false,
}

export const timelineSlots = buildTimeSlots('08:00', '20:00', 30)

export function normalizeDigits(value: string) {
  return value.replace(/\D/g, '')
}

export function buildWhatsAppUrl(phone: string, message: string) {
  const digits = normalizeDigits(phone)
  const normalized = digits.startsWith('55') ? digits : `55${digits}`
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`
}

export function formatCurrency(cents: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(cents / 100)
}

export function parseCurrencyToCents(value: string) {
  const cleaned = value.trim().replace(/\./g, '').replace(',', '.')
  const parsed = Number.parseFloat(cleaned)

  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0
  }

  return Math.round(parsed * 100)
}

export function centsToInputValue(cents: number) {
  return (cents / 100).toFixed(2).replace('.', ',')
}

export function sortByOrder<T extends { sort_order: number }>(items: T[]) {
  return [...items].sort((a, b) => a.sort_order - b.sort_order)
}

export function maskBrazilianPhone(value: string) {
  const digits = normalizeDigits(value).slice(0, 11)

  if (digits.length <= 2) {
    return digits
  }

  if (digits.length <= 6) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  }

  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  }

  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
}

export function addDays(dateIso: string, days: number) {
  const date = new Date(`${dateIso}T12:00:00`)
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

export function formatDateLong(dateIso: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(`${dateIso}T12:00:00`))
}

export function formatDateShort(dateIso: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  }).format(new Date(`${dateIso}T12:00:00`))
}

export function getDayOfWeek(dateIso: string) {
  return new Date(`${dateIso}T12:00:00`).getDay()
}

export function minutesFromTime(time: string) {
  const [hour = '0', minute = '0'] = time.split(':')
  return Number.parseInt(hour, 10) * 60 + Number.parseInt(minute, 10)
}

export function timeFromMinutes(totalMinutes: number) {
  const normalized = Math.max(0, totalMinutes)
  const hour = Math.floor(normalized / 60)
  const minute = normalized % 60
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
}

export function addMinutesToTime(time: string, minutes: number) {
  return timeFromMinutes(minutesFromTime(time) + minutes)
}

export function buildTimeSlots(start: string, end: string, stepMinutes: number) {
  const slots: string[] = []
  for (let cursor = minutesFromTime(start); cursor <= minutesFromTime(end); cursor += stepMinutes) {
    slots.push(timeFromMinutes(cursor))
  }
  return slots
}

export function isTimeInBlock(time: string, block: { start: string; end: string }) {
  const minute = minutesFromTime(time)
  return minute >= minutesFromTime(block.start) && minute < minutesFromTime(block.end)
}

export function rangesOverlap(start: string, end: string, otherStart: string, otherEnd: string) {
  return minutesFromTime(start) < minutesFromTime(otherEnd) && minutesFromTime(end) > minutesFromTime(otherStart)
}

export function rangeFitsInside(start: string, end: string, rangeStart: string, rangeEnd: string) {
  return minutesFromTime(start) >= minutesFromTime(rangeStart) && minutesFromTime(end) <= minutesFromTime(rangeEnd)
}

export function isUnavailableTime(time: string) {
  return defaultUnavailableBlocks.some((block) => isTimeInBlock(time, block))
}

export function getServiceForAppointment(appointment: AppointmentRecord, services: ServiceItem[] = defaultServices) {
  return services.find((service) => service.id === appointment.service_id) ?? services.find((service) => service.name === appointment.service_name)
}

export function getAppointmentDurationMinutes(appointment: AppointmentRecord, services: ServiceItem[] = defaultServices) {
  return getServiceForAppointment(appointment, services)?.duration_minutes ?? 60
}

export function getAppointmentEndTime(appointment: AppointmentRecord, services: ServiceItem[] = defaultServices) {
  return appointment.end_time ?? addMinutesToTime(appointment.start_time, getAppointmentDurationMinutes(appointment, services))
}

export function hasScheduleConflict(
  appointments: AppointmentRecord[],
  date: string,
  time: string,
  ignoreId?: string,
  services: ServiceItem[] = defaultServices,
  durationMinutes = 60,
  bufferMinutes = 0,
) {
  const targetEnd = addMinutesToTime(time, durationMinutes + bufferMinutes)

  return appointments.some(
    (appointment) => {
      if (
        appointment.id === ignoreId ||
        appointment.scheduled_date !== date ||
        appointment.status === 'canceled' ||
        appointment.status === 'no_show'
      ) {
        return false
      }

      const appointmentEnd = addMinutesToTime(
        getAppointmentEndTime(appointment, services),
        bufferMinutes,
      )

      return rangesOverlap(time, targetEnd, appointment.start_time, appointmentEnd)
    },
  )
}

export function getBusinessHourForDate(date: string, businessHours: BusinessHour[] = defaultBusinessHours) {
  return businessHours.find((hour) => hour.day_of_week === getDayOfWeek(date))
}

export function getAvailabilityRulesForDate(date: string, rules: AvailabilityRule[] = defaultAvailabilityRules) {
  const dayOfWeek = getDayOfWeek(date)
  return rules.filter((rule) => rule.day_of_week === dayOfWeek && rule.active)
}

export function getBlockingExceptions(date: string, exceptions: AvailabilityException[] = defaultAvailabilityExceptions) {
  return exceptions.filter((exception) => exception.date === date && exception.type !== 'custom_available')
}

export function isSlotBlockedByException(
  date: string,
  start: string,
  end: string,
  exceptions: AvailabilityException[] = defaultAvailabilityExceptions,
) {
  return getBlockingExceptions(date, exceptions).some((exception) => {
    if (exception.type === 'holiday' || exception.type === 'vacation' || !exception.start_time || !exception.end_time) {
      return true
    }

    return rangesOverlap(start, end, exception.start_time, exception.end_time)
  })
}

export function isSlotInsideAvailability(
  date: string,
  start: string,
  end: string,
  businessHours: BusinessHour[] = defaultBusinessHours,
  rules: AvailabilityRule[] = defaultAvailabilityRules,
  exceptions: AvailabilityException[] = defaultAvailabilityExceptions,
) {
  const businessHour = getBusinessHourForDate(date, businessHours)
  if (!businessHour?.is_open || !rangeFitsInside(start, end, businessHour.start_time, businessHour.end_time)) {
    return false
  }

  if (isSlotBlockedByException(date, start, end, exceptions)) {
    return false
  }

  const customRules = exceptions.filter((exception) => exception.date === date && exception.type === 'custom_available')
  if (customRules.length) {
    return customRules.some(
      (exception) =>
        exception.start_time &&
        exception.end_time &&
        rangeFitsInside(start, end, exception.start_time, exception.end_time),
    )
  }

  return getAvailabilityRulesForDate(date, rules).some((rule) => rangeFitsInside(start, end, rule.start_time, rule.end_time))
}

export function buildAgendaSlotsForDate(
  date: string,
  businessHours: BusinessHour[] = defaultBusinessHours,
  settings: ScheduleSettings = defaultScheduleSettings,
) {
  const businessHour = getBusinessHourForDate(date, businessHours)
  if (!businessHour?.is_open) {
    return buildTimeSlots('08:00', '18:00', settings.slot_interval_minutes)
  }

  return buildTimeSlots(businessHour.start_time, businessHour.end_time, settings.slot_interval_minutes)
}

export function getAvailableSlots(
  appointments: AppointmentRecord[],
  date: string,
  services: ServiceItem[] = defaultServices,
  businessHours: BusinessHour[] = defaultBusinessHours,
  availabilityRules: AvailabilityRule[] = defaultAvailabilityRules,
  exceptions: AvailabilityException[] = defaultAvailabilityExceptions,
  settings: ScheduleSettings = defaultScheduleSettings,
  durationMinutes = 60,
) {
  return buildAgendaSlotsForDate(date, businessHours, settings).filter((slot) => {
    const end = addMinutesToTime(slot, durationMinutes)
    return (
      isSlotInsideAvailability(date, slot, end, businessHours, availabilityRules, exceptions) &&
      !hasScheduleConflict(
        appointments,
        date,
        slot,
        undefined,
        services,
        durationMinutes,
        settings.buffer_between_services_minutes,
      )
    )
  })
}

function getWeekBounds(today: string) {
  const date = new Date(`${today}T12:00:00`)
  const day = date.getDay()
  const offset = day === 0 ? -6 : 1 - day
  const start = addDays(today, offset)
  const end = addDays(start, 6)
  return { start, end }
}

export function getWeekDates(dateIso: string) {
  const { start } = getWeekBounds(dateIso)
  return Array.from({ length: 7 }, (_, index) => addDays(start, index))
}

export function calculateAdminStats(
  appointments: AppointmentRecord[],
  today: string,
  clients: ClientRecord[] = [],
  products: ProductItem[] = [],
): AdminStats {
  const todaysAppointments = appointments.filter((appointment) => appointment.scheduled_date === today)
  const { start, end } = getWeekBounds(today)
  const month = today.slice(0, 7)
  const activeAppointments = appointments.filter((appointment) => appointment.status !== 'canceled')

  return {
    todayCount: todaysAppointments.length,
    upcomingCount: appointments.filter(
      (appointment) =>
        appointment.scheduled_date >= today &&
        appointment.status !== 'canceled' &&
        appointment.status !== 'completed' &&
        appointment.status !== 'no_show',
    ).length,
    clientCount: clients.length,
    receivedCents: todaysAppointments.reduce((sum, appointment) => sum + appointment.received_amount_cents, 0),
    pendingCents: activeAppointments.reduce(
      (sum, appointment) => sum + Math.max(appointment.charged_amount_cents - appointment.received_amount_cents, 0),
      0,
    ),
    weekReceivedCents: activeAppointments
      .filter((appointment) => appointment.scheduled_date >= start && appointment.scheduled_date <= end)
      .reduce((sum, appointment) => sum + appointment.received_amount_cents, 0),
    monthReceivedCents: activeAppointments
      .filter((appointment) => appointment.scheduled_date.startsWith(month))
      .reduce((sum, appointment) => sum + appointment.received_amount_cents, 0),
    noShowCount: activeAppointments.filter((appointment) => appointment.status === 'no_show').length,
    lowStockCount: getLowStockProducts(products).length,
  }
}

export function getPaymentState(
  appointment: Pick<AppointmentRecord, 'charged_amount_cents' | 'received_amount_cents'> & {
    payment_status?: PaymentStatus | null
  },
) {
  if (appointment.payment_status === 'canceled') {
    return 'canceled'
  }

  if (appointment.received_amount_cents <= 0) {
    return 'pending'
  }

  if (appointment.received_amount_cents < appointment.charged_amount_cents) {
    return 'partial'
  }

  return 'paid'
}

export function getLowStockProducts(products: ProductItem[]) {
  return products.filter((product) => product.quantity <= product.minimum_quantity)
}

export function getServiceUsage(appointments: AppointmentRecord[]) {
  const map = new Map<string, ServiceUsage>()

  appointments
    .filter((appointment) => appointment.status !== 'canceled')
    .forEach((appointment) => {
      const current = map.get(appointment.service_name) ?? {
        serviceName: appointment.service_name,
        count: 0,
        revenueCents: 0,
      }
      map.set(appointment.service_name, {
        ...current,
        count: current.count + 1,
        revenueCents: current.revenueCents + appointment.received_amount_cents,
      })
    })

  return [...map.values()].sort((a, b) => b.count - a.count || b.revenueCents - a.revenueCents)
}
