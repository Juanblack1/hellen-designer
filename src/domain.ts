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

export type PaymentMethod = 'pix' | 'cash' | 'debit_card' | 'credit_card'

export type AppointmentRecord = {
  id: string
  client_id: string | null
  client_name: string
  client_phone: string
  service_id: string | null
  service_name: string
  scheduled_date: string
  start_time: string
  status: AppointmentStatus
  charged_amount_cents: number
  received_amount_cents: number
  payment_method: PaymentMethod
  notes: string
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
  bio: 'Atendimento com hora marcada para realcar a beleza natural das sobrancelhas com desenho personalizado, henna, coloracao e acabamento delicado.',
  phone: '(16) 98875-8633',
  whatsapp_number: '5516988758633',
  instagram_handle: '@hellenmartins.designer',
  instagram_url: 'https://www.instagram.com/hellenmartins.designer/',
  address: 'Atendimento por agendamento',
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
    status: 'confirmed',
    charged_amount_cents: 3000,
    received_amount_cents: 3000,
    payment_method: 'pix',
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
    status: 'scheduled',
    charged_amount_cents: 4000,
    received_amount_cents: 0,
    payment_method: 'pix',
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
    status: 'confirmed',
    charged_amount_cents: 3000,
    received_amount_cents: 1500,
    payment_method: 'cash',
    notes: 'Pagamento parcial combinado.',
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

export function minutesFromTime(time: string) {
  const [hour = '0', minute = '0'] = time.split(':')
  return Number.parseInt(hour, 10) * 60 + Number.parseInt(minute, 10)
}

export function buildTimeSlots(start: string, end: string, stepMinutes: number) {
  const slots: string[] = []
  for (let cursor = minutesFromTime(start); cursor <= minutesFromTime(end); cursor += stepMinutes) {
    const hour = Math.floor(cursor / 60)
    const minute = cursor % 60
    slots.push(`${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`)
  }
  return slots
}

export function isTimeInBlock(time: string, block: { start: string; end: string }) {
  const minute = minutesFromTime(time)
  return minute >= minutesFromTime(block.start) && minute < minutesFromTime(block.end)
}

export function isUnavailableTime(time: string) {
  return defaultUnavailableBlocks.some((block) => isTimeInBlock(time, block))
}

export function hasScheduleConflict(appointments: AppointmentRecord[], date: string, time: string, ignoreId?: string) {
  return appointments.some(
    (appointment) =>
      appointment.id !== ignoreId &&
      appointment.scheduled_date === date &&
      appointment.start_time === time &&
      appointment.status !== 'canceled' &&
      appointment.status !== 'no_show',
  )
}

export function getAvailableSlots(appointments: AppointmentRecord[], date: string) {
  return buildTimeSlots('08:00', '18:00', 30).filter(
    (slot) => !isUnavailableTime(slot) && !hasScheduleConflict(appointments, date, slot),
  )
}

function getWeekBounds(today: string) {
  const date = new Date(`${today}T12:00:00`)
  const day = date.getDay()
  const offset = day === 0 ? -6 : 1 - day
  const start = addDays(today, offset)
  const end = addDays(start, 6)
  return { start, end }
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

export function getPaymentState(appointment: Pick<AppointmentRecord, 'charged_amount_cents' | 'received_amount_cents'>) {
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
