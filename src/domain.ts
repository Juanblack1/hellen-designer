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

export type AdminStats = {
  todayCount: number
  receivedCents: number
  pendingCents: number
  noShowCount: number
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
    description: 'Mapeamento e medidas faciais para sobrancelhas harmoniosas e naturais.',
    duration_minutes: 45,
    price_cents: 2000,
    active: true,
    published: true,
    sort_order: 10,
  },
  {
    id: 'design-com-henna',
    name: 'Design com Henna',
    description: 'Define, cobre falhas e destaca pele e pelos com acabamento delicado.',
    duration_minutes: 60,
    price_cents: 3000,
    active: true,
    published: true,
    sort_order: 20,
  },
  {
    id: 'design-com-coloracao',
    name: 'Design com Coloracao',
    description: 'Realce natural com coloracao suave e leve sombreado de fundo.',
    duration_minutes: 70,
    price_cents: 4000,
    active: true,
    published: true,
    sort_order: 30,
  },
  {
    id: 'epilacao-buco',
    name: 'Epilacao de Buco',
    description: 'Remocao dos pelos desde a raiz para acabamento limpo e duradouro.',
    duration_minutes: 20,
    price_cents: 1000,
    active: true,
    published: true,
    sort_order: 40,
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
    notes: 'Prefere desenho natural e confirmacao pelo WhatsApp.',
  },
  {
    id: 'client-julia',
    full_name: 'Julia Martins',
    phone: '(16) 97777-2200',
    notes: 'Gosta de henna mais suave.',
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
    notes: '',
  },
]

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

export function calculateAdminStats(appointments: AppointmentRecord[], today: string): AdminStats {
  const todaysAppointments = appointments.filter((appointment) => appointment.scheduled_date === today)

  return todaysAppointments.reduce<AdminStats>(
    (stats, appointment) => ({
      todayCount: stats.todayCount + 1,
      receivedCents: stats.receivedCents + appointment.received_amount_cents,
      pendingCents:
        stats.pendingCents + Math.max(appointment.charged_amount_cents - appointment.received_amount_cents, 0),
      noShowCount: stats.noShowCount + (appointment.status === 'no_show' ? 1 : 0),
    }),
    {
      todayCount: 0,
      receivedCents: 0,
      pendingCents: 0,
      noShowCount: 0,
    },
  )
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
