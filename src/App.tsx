import { useEffect, useState } from 'react'
import type { FormEvent, KeyboardEvent as ReactKeyboardEvent } from 'react'
import type { Session } from '@supabase/supabase-js'
import {
  ArrowRight,
  BarChart3,
  Boxes,
  CalendarCheck,
  CalendarDays,
  Camera,
  CheckCircle2,
  Clipboard,
  Clock3,
  CreditCard,
  Filter,
  LayoutDashboard,
  LockKeyhole,
  Mail,
  MapPin,
  MessageCircle,
  Package,
  Phone,
  Plus,
  Save,
  Settings,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserCheck,
  Users,
  Wallet,
} from 'lucide-react'
import browAtelier from './assets/hellen-brows-chatgpt-image.png'
import brandLogo from './assets/hellen-martins-logo.svg'
import { supabase } from './lib/supabase'
import './App.css'

type ServiceOption = {
  id: string
  name: string
  durationMinutes: number
  priceCents?: number
  description: string
  eyebrow: string
  imagePath?: string | null
  active: boolean
  sortOrder: number
}

type ServiceCatalogRow = {
  id: string
  name: string
  duration_minutes: number
  price_cents: number | null
  description: string
  image_path: string | null
  active: boolean
  sort_order: number
}

type BookingForm = {
  name: string
  phone: string
  serviceId: string
  preferredDate: string
  preferredTime: string
  preferredEndTime: string
  notes: string
}

type BookingStatus =
  | 'awaiting_deposit'
  | 'pending'
  | 'confirmed'
  | 'completed'
  | 'canceled_by_client'
  | 'canceled_by_admin'
  | 'deposit_expired'
  | 'no_show'
type AdminStatusFilter = BookingStatus | 'all'
type NotificationStatus = 'pending' | 'done' | 'skipped'
type PaymentStatus = 'pending' | 'paid' | 'expired' | 'canceled' | 'failed'
type AuthMode = 'sign-in' | 'sign-up' | 'forgot-password' | 'reset-password'
type CustomerPanelTab = 'booking' | 'agenda'
type AdminPanelTab =
  | 'overview'
  | 'agenda'
  | 'bookings'
  | 'clients'
  | 'whatsapp'
  | 'services'
  | 'payments'
  | 'products'
  | 'reports'
  | 'settings'
type ConfirmDialogState = {
  title: string
  message: string
  confirmLabel: string
  cancelLabel?: string
  tone?: 'default' | 'danger'
  onConfirm: () => void
} | null

const customerPanelTabs = ['booking', 'agenda'] as const satisfies readonly CustomerPanelTab[]
const adminPanelTabs = [
  'overview',
  'agenda',
  'bookings',
  'clients',
  'whatsapp',
  'services',
  'payments',
  'products',
  'reports',
  'settings',
] as const satisfies readonly AdminPanelTab[]

const adminTabPaths: Record<AdminPanelTab, string> = {
  overview: '/admin',
  agenda: '/admin/agenda',
  bookings: '/admin/agendamentos',
  clients: '/admin/clientes',
  whatsapp: '/admin/whatsapp',
  services: '/admin/servicos',
  payments: '/admin/pagamentos',
  products: '/admin/produtos',
  reports: '/admin/relatorios',
  settings: '/admin/configuracoes',
}

const adminRouteTitles: Record<AdminPanelTab, { eyebrow: string; title: string; description: string }> = {
  overview: {
    eyebrow: 'Painel privado',
    title: 'Dashboard operacional da Hellen Martins.',
    description: 'Resumo do dia, pendencias, faturamento e atalhos para operar o estudio.',
  },
  agenda: {
    eyebrow: 'Agenda',
    title: 'Calendario diario, semanal e mensal.',
    description: 'Veja horarios ocupados, bloqueios, remarcacoes e disponibilidade.',
  },
  bookings: {
    eyebrow: 'Agendamentos',
    title: 'Controle completo de horarios e status.',
    description: 'Confirme, remarque, conclua, cancele e registre notas do atendimento.',
  },
  clients: {
    eyebrow: 'Clientes',
    title: 'Fichas, historico e preferencias.',
    description: 'Consulte dados, atendimentos, pagamentos e anotacoes profissionais.',
  },
  whatsapp: {
    eyebrow: 'WhatsApp',
    title: 'Mensagens manuais para confirmar e acompanhar.',
    description: 'Copie textos prontos e abra a conversa da cliente pelo WhatsApp.',
  },
  services: {
    eyebrow: 'Servicos',
    title: 'Catalogo, precos e fotos dos procedimentos.',
    description: 'Mantenha a vitrine atualizada com valores, duracao e disponibilidade.',
  },
  payments: {
    eyebrow: 'Financeiro',
    title: 'Pagamentos por atendimento e periodo.',
    description: 'Registre dinheiro, Pix e cartao com status pago, pendente ou parcial.',
  },
  products: {
    eyebrow: 'Estoque',
    title: 'Produtos usados e vendidos no estudio.',
    description: 'Controle entrada, saida, uso em atendimento, venda e estoque baixo.',
  },
  reports: {
    eyebrow: 'Relatorios',
    title: 'Indicadores simples para decisao diaria.',
    description: 'Acompanhe servicos mais realizados, receita e movimentacao de produtos.',
  },
  settings: {
    eyebrow: 'Configuracoes',
    title: 'Politicas, sinal e canais de contato.',
    description: 'Ajuste prazos, pagamento de sinal, texto exibido e dados da marca.',
  },
}

type BookingRecord = {
  id: string
  created_at: string
  updated_at?: string
  user_id: string | null
  client_name: string
  client_email: string
  client_phone: string
  service_id: string | null
  service_name: string
  preferred_date: string
  preferred_time: string
  preferred_end_time: string
  notes: string | null
  status: BookingStatus
  source: string
  canceled_at?: string | null
  canceled_by?: string | null
  cancellation_reason?: string | null
  confirmed_at?: string | null
  completed_at?: string | null
  no_show_at?: string | null
}

type BookingPolicy = {
  id: string
  cancellation_cutoff_hours: number
  reschedule_cutoff_hours: number
  no_show_grace_minutes: number
  auto_confirm_enabled: boolean
  deposit_required: boolean
  deposit_amount_cents: number
  deposit_checkout_expiration_minutes: number
  policy_text: string
  active: boolean
  updated_at: string
}

type PolicyDraft = {
  cancellationCutoffHours: string
  rescheduleCutoffHours: string
  noShowGraceMinutes: string
  autoConfirmEnabled: boolean
  depositRequired: boolean
  depositAmountCents: string
  depositCheckoutExpirationMinutes: string
  policyText: string
}

type BookingStatusEvent = {
  id: string
  booking_id: string
  from_status: BookingStatus | null
  to_status: BookingStatus
  actor_role: 'client' | 'admin' | 'system'
  reason: string | null
  created_at: string
}

type BookingInternalNote = {
  id: string
  booking_id: string
  note: string
  created_at: string
  updated_at: string
}

type BookingNotificationQueueItem = {
  id: string
  booking_id: string
  type: 'confirmation' | 'reminder' | 'cancellation' | 'follow_up'
  channel: 'manual_whatsapp' | 'manual_email' | 'in_app'
  status: NotificationStatus
  scheduled_for: string
  message_template: string
  done_at: string | null
  created_at: string
}

type BookingPayment = {
  id: string
  booking_id: string
  provider: 'asaas'
  status: PaymentStatus
  amount_cents: number
  checkout_url: string | null
  expires_at: string
  paid_at: string | null
  created_at: string
}

type ClientProfile = {
  id: string
  user_id: string | null
  full_name: string
  email: string
  phone: string
  birth_date: string | null
  preferences: string | null
  professional_notes: string | null
  created_at: string
  updated_at: string
}

type ClientProfileDraft = {
  fullName: string
  phone: string
  birthDate: string
  preferences: string
  professionalNotes: string
}

type BusinessPaymentStatus = 'paid' | 'pending' | 'partial' | 'canceled'
type BusinessPaymentMethod = 'cash' | 'pix' | 'debit_card' | 'credit_card'

type BusinessPayment = {
  id: string
  booking_id: string | null
  client_id: string | null
  service_id: string | null
  client_name: string
  service_name: string
  payment_method: BusinessPaymentMethod
  status: BusinessPaymentStatus
  total_amount_cents: number
  paid_amount_cents: number
  paid_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

type PaymentDraft = {
  bookingId: string
  paymentMethod: BusinessPaymentMethod
  status: BusinessPaymentStatus
  totalAmountCents: string
  paidAmountCents: string
  paidAt: string
  notes: string
}

type ProductRecord = {
  id: string
  name: string
  category: string
  stock_quantity: number
  unit: string
  cost_cents: number | null
  sale_price_cents: number | null
  minimum_stock: number
  notes: string | null
  created_at: string
  updated_at: string
}

type ProductDraft = {
  name: string
  category: string
  stockQuantity: string
  unit: string
  costCents: string
  salePriceCents: string
  minimumStock: string
  notes: string
}

type StockMovementType = 'input' | 'output' | 'service_use' | 'sale' | 'manual_adjustment'

type StockMovement = {
  id: string
  product_id: string
  movement_type: StockMovementType
  quantity_delta: number
  unit_cost_cents: number | null
  sale_price_cents: number | null
  booking_id: string | null
  client_id: string | null
  notes: string | null
  created_at: string
}

type StockMovementDraft = {
  productId: string
  movementType: StockMovementType
  quantityDelta: string
  unitCostCents: string
  salePriceCents: string
  bookingId: string
  notes: string
}

type BookedSlotRow = {
  preferred_time: string
  preferred_end_time: string
}

type BookedSlot = {
  startTime: string
  endTime: string
}

type UnavailableDay = {
  id: string
  unavailable_date: string
  reason: string | null
  created_at: string
}

type AvailabilitySlot = {
  id: string
  weekday: number
  start_time: string
  end_time: string
  active: boolean
  sort_order: number
  created_at: string
}

type RescheduleDraft = {
  preferredDate: string
  preferredTime: string
  preferredEndTime: string
  reason: string
}

type AvailabilityDraft = {
  weekday: string
  startTime: string
  endTime: string
}

type ServiceDraft = {
  name: string
  durationMinutes: string
  priceCents: string
  description: string
  active: boolean
  sortOrder: string
}

const serviceImageBucket = 'service-images'
const maxServiceImageBytes = 2 * 1024 * 1024
const allowedServiceImageTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
const serviceImageExtensions: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
}

const serviceSeeds: ServiceOption[] = [
  {
    id: 'design-reconstrutivo',
    name: 'Design reconstrutivo',
    durationMinutes: 45,
    priceCents: 2000,
    description:
      'Tecnica que modela os fios usando mapeamento e medidas faciais para sobrancelhas harmoniosas e naturais.',
    eyebrow: 'Mapeamento facial',
    active: true,
    sortOrder: 10,
  },
  {
    id: 'design-com-henna',
    name: 'Design com henna',
    durationMinutes: 60,
    priceCents: 3000,
    description:
      'Define, cobre falhas, alonga e da destaque com acabamento delicado para pele e pelos.',
    eyebrow: 'Preenchimento',
    active: true,
    sortOrder: 20,
  },
  {
    id: 'design-com-coloracao',
    name: 'Design com coloracao',
    durationMinutes: 70,
    priceCents: 4000,
    description:
      'Realce natural da sobrancelha com coloracao suave e efeito sombreado de fundo.',
    eyebrow: 'Realce natural',
    active: true,
    sortOrder: 30,
  },
  {
    id: 'epilacao-buco',
    name: 'Epilacao de buco',
    durationMinutes: 20,
    priceCents: 1000,
    description:
      'Tecnica feita na cera, removendo os pelos desde a raiz e oferecendo resultado duradouro.',
    eyebrow: 'Acabamento',
    active: true,
    sortOrder: 40,
  },
]

const statusLabels: Record<BookingStatus, string> = {
  awaiting_deposit: 'Aguardando sinal',
  pending: 'Aguardando confirmacao',
  confirmed: 'Confirmado',
  completed: 'Concluido',
  canceled_by_client: 'Cancelado pela cliente',
  canceled_by_admin: 'Cancelado pela Hellen',
  deposit_expired: 'Sinal expirado',
  no_show: 'Nao compareceu',
}

const statusOptions: BookingStatus[] = [
  'awaiting_deposit',
  'pending',
  'confirmed',
  'completed',
  'canceled_by_client',
  'canceled_by_admin',
  'deposit_expired',
  'no_show',
]
const activeBookingStatuses: BookingStatus[] = ['awaiting_deposit', 'pending', 'confirmed']
const finalBookingStatuses: BookingStatus[] = [
  'completed',
  'canceled_by_client',
  'canceled_by_admin',
  'deposit_expired',
  'no_show',
]
const paymentStatusLabels: Record<PaymentStatus, string> = {
  pending: 'Aguardando pagamento',
  paid: 'Sinal pago',
  expired: 'Sinal expirado',
  canceled: 'Pagamento cancelado',
  failed: 'Falha no pagamento',
}
const businessPaymentStatusLabels: Record<BusinessPaymentStatus, string> = {
  paid: 'Pago',
  pending: 'Pendente',
  partial: 'Parcial',
  canceled: 'Cancelado',
}
const businessPaymentMethodLabels: Record<BusinessPaymentMethod, string> = {
  cash: 'Dinheiro',
  pix: 'Pix',
  debit_card: 'Cartao de debito',
  credit_card: 'Cartao de credito',
}
const stockMovementLabels: Record<StockMovementType, string> = {
  input: 'Entrada de produto',
  output: 'Saida de produto',
  service_use: 'Uso em atendimento',
  sale: 'Venda para cliente',
  manual_adjustment: 'Ajuste manual',
}
const stockMovementToneLabels: Record<StockMovementType, string> = {
  input: 'Entrada',
  output: 'Saida',
  service_use: 'Uso',
  sale: 'Venda',
  manual_adjustment: 'Ajuste',
}
const notificationStatusLabels: Record<NotificationStatus, string> = {
  pending: 'Pendente',
  done: 'Feita',
  skipped: 'Ignorada',
}
const defaultPolicyText =
  'Cancelamentos e remarcacoes devem ser solicitados com antecedencia. Atrasos podem reduzir o tempo de atendimento ou exigir novo agendamento. A confirmacao final pode ser enviada por WhatsApp ou email.'
const weekdayLabels = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom']
const weekdayOptions = [
  { value: 1, label: 'Segunda' },
  { value: 2, label: 'Terca' },
  { value: 3, label: 'Quarta' },
  { value: 4, label: 'Quinta' },
  { value: 5, label: 'Sexta' },
]
const instagramUrl = 'https://www.instagram.com/hellenmartins.designer/'
const instagramHandle = '@hellenmartins.designer'
const bookingWhatsAppNumber = import.meta.env.VITE_BOOKING_WHATSAPP?.trim() || '5516988758633'
const businessTimeZone = 'America/Sao_Paulo'
const businessDateTimeFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: businessTimeZone,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

type BusinessDateTime = {
  date: string
  time: string
}

function getBusinessDateTime(): BusinessDateTime {
  const values: Record<string, string> = {}

  for (const part of businessDateTimeFormatter.formatToParts(new Date())) {
    if (part.type !== 'literal') {
      values[part.type] = part.value
    }
  }

  return {
    date: `${values.year}-${values.month}-${values.day}`,
    time: `${values.hour}:${values.minute}`,
  }
}

function toDateOnly(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function getTodayDate() {
  return getBusinessDateTime().date
}

function parseDateOnly(date: string) {
  return new Date(`${date}T12:00:00`)
}

function isWeekendDate(date: string) {
  const day = parseDateOnly(date).getDay()
  return day === 0 || day === 6
}

function getIsoWeekday(date: string) {
  const day = parseDateOnly(date).getDay()
  return day === 0 ? 7 : day
}

function getWeekdayName(weekday: number) {
  return weekdayOptions.find((option) => option.value === weekday)?.label ?? 'Fim de semana'
}

function getNextBusinessDate(date: Date) {
  const next = new Date(date)

  while (next.getDay() === 0 || next.getDay() === 6) {
    next.setDate(next.getDate() + 1)
  }

  return next
}

function getInitialDate() {
  const date = parseDateOnly(getTodayDate())
  date.setDate(date.getDate() + 1)
  return toDateOnly(getNextBusinessDate(date))
}

function getMonthStart(date: string) {
  const parsed = parseDateOnly(date)
  return toDateOnly(new Date(parsed.getFullYear(), parsed.getMonth(), 1, 12))
}

function getWeekStart(date: string) {
  const parsed = parseDateOnly(date)
  const mondayOffset = (parsed.getDay() + 6) % 7
  parsed.setDate(parsed.getDate() - mondayOffset)
  return toDateOnly(parsed)
}

function addMonths(date: string, amount: number) {
  const parsed = parseDateOnly(date)
  return toDateOnly(new Date(parsed.getFullYear(), parsed.getMonth() + amount, 1, 12))
}

function getMonthEnd(date: string) {
  const parsed = parseDateOnly(date)
  return toDateOnly(new Date(parsed.getFullYear(), parsed.getMonth() + 1, 0, 12))
}

function getMonthLabel(date: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
  }).format(parseDateOnly(date))
}

function getCalendarDays(monthDate: string) {
  const monthStart = parseDateOnly(monthDate)
  const firstDay = new Date(monthStart)
  const mondayOffset = (firstDay.getDay() + 6) % 7
  firstDay.setDate(firstDay.getDate() - mondayOffset)
  const today = getTodayDate()

  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(firstDay)
    day.setDate(firstDay.getDate() + index)
    const date = toDateOnly(day)

    return {
      date,
      dayNumber: day.getDate(),
      isCurrentMonth: day.getMonth() === monthStart.getMonth(),
      isPast: date < today,
      isWeekend: day.getDay() === 0 || day.getDay() === 6,
    }
  })
}

function timeLabel(time: string) {
  return time.slice(0, 5)
}

function getSlotKey(startTime: string, endTime: string) {
  return `${timeLabel(startTime)}-${timeLabel(endTime)}`
}

function formatTimeRange(startTime: string, endTime: string) {
  return `${timeLabel(startTime)} ate ${timeLabel(endTime)}`
}

function getCalendarDayLabel(date: string, status: string, selected: boolean) {
  const selectedText = selected ? 'Selecionado. ' : ''

  return `${selectedText}${formatFullDate(date)}. ${status}.`
}

function handleTabListKeyDown<T extends string>(
  event: ReactKeyboardEvent<HTMLButtonElement>,
  tabs: readonly T[],
  currentTab: T,
  setTab: (tab: T) => void,
  getTabId: (tab: T) => string,
) {
  const currentIndex = Math.max(tabs.indexOf(currentTab), 0)
  let nextIndex: number

  if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
    nextIndex = (currentIndex + 1) % tabs.length
  } else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
    nextIndex = (currentIndex - 1 + tabs.length) % tabs.length
  } else if (event.key === 'Home') {
    nextIndex = 0
  } else if (event.key === 'End') {
    nextIndex = tabs.length - 1
  } else {
    return
  }

  event.preventDefault()
  const nextTab = tabs[nextIndex]
  setTab(nextTab)
  window.requestAnimationFrame(() => document.getElementById(getTabId(nextTab))?.focus())
}

function isSlotInPast(date: string, startTime: string, currentDateTime: BusinessDateTime) {
  return (
    date < currentDateTime.date ||
    (date === currentDateTime.date && timeLabel(startTime) <= currentDateTime.time)
  )
}

function getInitialAuthMode(): AuthMode {
  const mode = new URLSearchParams(window.location.search).get('mode')

  if (
    mode === 'sign-up' ||
    mode === 'forgot-password' ||
    mode === 'reset-password' ||
    mode === 'sign-in'
  ) {
    return mode
  }

  return 'sign-in'
}

function getPaymentReturnMessage() {
  const paymentResult = new URLSearchParams(window.location.search).get('payment')

  switch (paymentResult) {
    case 'success':
      return 'Pagamento recebido. Assim que a confirmacao chegar, sua agenda sera atualizada.'
    case 'cancel':
      return 'Pagamento cancelado. O horario continua aguardando sinal enquanto estiver dentro do prazo.'
    case 'expired':
      return 'O prazo do pagamento terminou. Escolha um novo horario se ainda quiser reservar.'
    default:
      return paymentResult ? 'Voltamos do pagamento. Confira o status atualizado da sua agenda.' : ''
  }
}

function getInitialCustomerPanelTab(): CustomerPanelTab {
  return getPaymentReturnMessage() ? 'agenda' : 'booking'
}

function getSiteOrigin() {
  const configuredUrl = import.meta.env.VITE_PUBLIC_SITE_URL?.trim()

  if (!configuredUrl) {
    return window.location.origin
  }

  try {
    return new URL(configuredUrl).origin
  } catch {
    return window.location.origin
  }
}

function getAuthRedirectUrl(mode: AuthMode = 'sign-in') {
  const redirectUrl = new URL('/auth', getSiteOrigin())
  redirectUrl.searchParams.set('mode', mode)

  return redirectUrl.toString()
}

function getAuthErrorMessage(message: string) {
  const normalized = message.toLowerCase()

  if (normalized.includes('email not confirmed')) {
    return 'Confirme seu email pelo link enviado antes de entrar.'
  }

  if (normalized.includes('invalid login credentials')) {
    return 'Email ou senha incorretos. Confira os dados e tente novamente.'
  }

  if (normalized.includes('user already registered')) {
    return 'Este email ja tem cadastro. Entre na conta ou recupere a senha.'
  }

  return message
}

function getBookingErrorMessage(message: string, conflictMessage: string) {
  const normalized = message.toLowerCase()

  if (normalized.includes('booking_policy_cutoff')) {
    return 'Este horario esta fora do prazo permitido para cancelar ou remarcar. Fale com a Hellen para ajustar manualmente.'
  }

  if (normalized.includes('booking_status_final')) {
    return 'Este agendamento ja esta em status final e nao pode ser alterado.'
  }

  if (normalized.includes('booking_status_transition_invalid')) {
    return 'Essa mudanca de status nao e permitida. Confirme o horario antes de concluir, cancelar ou marcar falta.'
  }

  if (normalized.includes('booking_not_found')) {
    return 'Agendamento nao encontrado para esta conta.'
  }

  if (normalized.includes('booking_auth_required') || normalized.includes('booking_user_mismatch')) {
    return 'Entre novamente na sua conta antes de continuar.'
  }

  if (normalized.includes('booking_email_required')) {
    return 'Nao foi possivel confirmar o email da conta. Saia e entre novamente.'
  }

  if (normalized.includes('booking_service_unavailable')) {
    return 'Este servico nao esta disponivel para agendamento agora.'
  }

  if (normalized.includes('booking_date_in_past')) {
    return 'Nao e possivel marcar ou remarcar para uma data anterior ao dia atual.'
  }

  if (normalized.includes('booking_slot_in_past')) {
    return 'Esse horario ja passou. Escolha outro periodo disponivel.'
  }

  if (normalized.includes('booking_date_unavailable')) {
    return 'Este dia nao esta disponivel para atendimento. Escolha outra data no calendario.'
  }

  if (normalized.includes('booking_slot_unavailable')) {
    return 'Este horario nao esta liberado para atendimento. Escolha um periodo disponivel.'
  }

  if (normalized.includes('duplicate')) {
    return conflictMessage
  }

  return message
}

function getAvailabilityErrorMessage(message: string) {
  const normalized = message.toLowerCase()

  if (normalized.includes('availability_slot_overlap')) {
    return 'Ja existe um horario ativo que cruza com esse periodo.'
  }

  if (normalized.includes('availability_slot_invalid')) {
    return 'O horario final precisa ser maior que o horario inicial.'
  }

  if (normalized.includes('duplicate')) {
    return 'Esse periodo ja existe para este dia da semana.'
  }

  return message
}

function getDepositCheckoutErrorMessage(errorCode?: string) {
  switch (errorCode) {
    case 'auth_required':
    case 'auth_invalid':
      return 'Entre novamente para abrir o pagamento do sinal.'
    case 'booking_not_found':
      return 'Nao encontramos esse agendamento na sua conta.'
    case 'booking_not_waiting_payment':
      return 'Este agendamento nao esta aguardando pagamento de sinal.'
    case 'deposit_not_enabled':
      return 'O sinal nao esta ativo para este horario. Atualize a pagina e confira o status.'
    case 'checkout_creation_in_progress':
      return 'O pagamento ainda esta sendo preparado. Aguarde alguns segundos e tente novamente.'
    case 'payment_create_failed':
    case 'checkout_create_failed':
    case 'checkout_save_failed':
      return 'Nao foi possivel abrir o pagamento do sinal agora. Tente novamente pela sua agenda.'
    case 'request_body_too_large':
    case 'invalid_json':
    case 'booking_required':
      return 'Nao foi possivel identificar o agendamento para pagamento. Atualize a pagina e tente novamente.'
    default:
      return 'Nao foi possivel abrir o pagamento do sinal. Confira sua conexao e tente novamente.'
  }
}

function formatPrice(priceCents?: number) {
  if (priceCents === undefined || priceCents === null) {
    return 'Sob consulta'
  }

  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(priceCents / 100)
}

function formatPriceDraft(priceCents?: number) {
  if (priceCents === undefined || priceCents === null) {
    return ''
  }

  return (priceCents / 100).toFixed(2).replace('.', ',')
}

function parsePriceDraft(value: string) {
  const trimmed = value.trim()

  if (!trimmed) {
    return null
  }

  const normalized = trimmed.replace(/\./g, '').replace(',', '.')
  const parsed = Number(normalized)

  if (!Number.isFinite(parsed) || parsed < 0) {
    return undefined
  }

  return Math.round(parsed * 100)
}

function parseDecimalDraft(value: string) {
  const trimmed = value.trim()

  if (!trimmed) {
    return null
  }

  const parsed = Number(trimmed.replace(/\./g, '').replace(',', '.'))

  if (!Number.isFinite(parsed)) {
    return undefined
  }

  return parsed
}

function formatDecimal(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    maximumFractionDigits: 2,
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
  }).format(value)
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
  }).format(new Date(`${date}T12:00:00`))
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function formatFullDate(date: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${date}T12:00:00`))
}

function getServiceEyebrow(serviceId: string, index: number) {
  return serviceSeeds.find((service) => service.id === serviceId)?.eyebrow ?? `Opcao ${index + 1}`
}

function getAdminTabFromRoute(route: string): AdminPanelTab {
  if (route.startsWith('/admin/agenda')) {
    return 'agenda'
  }

  if (route.startsWith('/admin/agendamentos')) {
    return 'bookings'
  }

  if (route.startsWith('/admin/clientes')) {
    return 'clients'
  }

  if (route.startsWith('/admin/whatsapp')) {
    return 'whatsapp'
  }

  if (route.startsWith('/admin/servicos')) {
    return 'services'
  }

  if (route.startsWith('/admin/pagamentos')) {
    return 'payments'
  }

  if (route.startsWith('/admin/produtos')) {
    return 'products'
  }

  if (route.startsWith('/admin/relatorios')) {
    return 'reports'
  }

  if (route.startsWith('/admin/configuracoes')) {
    return 'settings'
  }

  return 'overview'
}

function getClientRouteEmail(route: string) {
  const prefix = '/admin/clientes/'

  if (!route.startsWith(prefix)) {
    return ''
  }

  return decodeURIComponent(route.slice(prefix.length))
}

function mapServiceRow(service: ServiceCatalogRow, index: number): ServiceOption {
  return {
    id: service.id,
    name: service.name,
    durationMinutes: service.duration_minutes,
    priceCents: service.price_cents ?? undefined,
    description: service.description,
    eyebrow: getServiceEyebrow(service.id, index),
    imagePath: service.image_path,
    active: service.active,
    sortOrder: service.sort_order,
  }
}

function getServiceCoverUrl(service: ServiceOption) {
  if (!service.imagePath || !supabase) {
    return browAtelier
  }

  return supabase.storage.from(serviceImageBucket).getPublicUrl(service.imagePath).data.publicUrl
}

function getServiceImagePath(serviceId: string, file: File) {
  const extension = serviceImageExtensions[file.type]

  return `${serviceId}/${Date.now()}.${extension}`
}

function createServiceDraft(service: ServiceOption): ServiceDraft {
  return {
    name: service.name,
    durationMinutes: String(service.durationMinutes),
    priceCents: formatPriceDraft(service.priceCents),
    description: service.description,
    active: service.active,
    sortOrder: String(service.sortOrder),
  }
}

function createEmptyServiceDraft(): ServiceDraft {
  return {
    name: '',
    durationMinutes: '60',
    priceCents: '',
    description: '',
    active: true,
    sortOrder: '50',
  }
}

function createPolicyDraft(policy?: BookingPolicy | null): PolicyDraft {
  return {
    cancellationCutoffHours: String(policy?.cancellation_cutoff_hours ?? 12),
    rescheduleCutoffHours: String(policy?.reschedule_cutoff_hours ?? 12),
    noShowGraceMinutes: String(policy?.no_show_grace_minutes ?? 15),
    autoConfirmEnabled: Boolean(policy?.auto_confirm_enabled),
    depositRequired: Boolean(policy?.deposit_required),
    depositAmountCents: formatPriceDraft(policy?.deposit_amount_cents ?? 0),
    depositCheckoutExpirationMinutes: String(policy?.deposit_checkout_expiration_minutes ?? 30),
    policyText: policy?.policy_text ?? defaultPolicyText,
  }
}

function createClientProfileDraft(profile?: ClientProfile | null): ClientProfileDraft {
  return {
    fullName: profile?.full_name ?? '',
    phone: profile?.phone ?? '',
    birthDate: profile?.birth_date ?? '',
    preferences: profile?.preferences ?? '',
    professionalNotes: profile?.professional_notes ?? '',
  }
}

function createEmptyPaymentDraft(): PaymentDraft {
  return {
    bookingId: '',
    paymentMethod: 'pix',
    status: 'paid',
    totalAmountCents: '',
    paidAmountCents: '',
    paidAt: getTodayDate(),
    notes: '',
  }
}

function createEmptyProductDraft(): ProductDraft {
  return {
    name: '',
    category: 'Henna e coloracao',
    stockQuantity: '0',
    unit: 'un',
    costCents: '',
    salePriceCents: '',
    minimumStock: '1',
    notes: '',
  }
}

function createEmptyStockMovementDraft(productId = ''): StockMovementDraft {
  return {
    productId,
    movementType: 'input',
    quantityDelta: '1',
    unitCostCents: '',
    salePriceCents: '',
    bookingId: '',
    notes: '',
  }
}

function isActiveBookingStatus(status: BookingStatus) {
  return activeBookingStatuses.includes(status)
}

function isFinalBookingStatus(status: BookingStatus) {
  return finalBookingStatuses.includes(status)
}

function getAdminStatusOptions(currentStatus: BookingStatus) {
  if (currentStatus === 'awaiting_deposit') {
    return ['awaiting_deposit', 'pending', 'confirmed', 'deposit_expired', 'canceled_by_admin'] satisfies BookingStatus[]
  }

  if (currentStatus === 'pending') {
    return ['pending', 'confirmed', 'canceled_by_admin'] satisfies BookingStatus[]
  }

  if (currentStatus === 'confirmed') {
    return ['confirmed', 'pending', 'completed', 'canceled_by_admin', 'no_show'] satisfies BookingStatus[]
  }

  return [currentStatus]
}

function normalizeWhatsAppPhone(phone: string) {
  const digits = phone.replace(/\D/g, '')

  if (!digits) {
    return ''
  }

  return digits.startsWith('55') ? digits : `55${digits}`
}

function getWhatsAppUrl(phone: string, message: string) {
  const normalizedPhone = normalizeWhatsAppPhone(phone)

  if (!normalizedPhone) {
    return ''
  }

  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`
}

function slugifyServiceId(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function getStatusTone(status: BookingStatus) {
  return `status-pill status-${status}`
}

function App() {
  const [route, setRoute] = useState(() => window.location.pathname)
  const [currentBusinessDateTime, setCurrentBusinessDateTime] = useState(() => getBusinessDateTime())
  const [services, setServices] = useState<ServiceOption[]>(serviceSeeds)
  const [booking, setBooking] = useState<BookingForm>({
    name: '',
    phone: '',
    serviceId: serviceSeeds[0].id,
    preferredDate: getInitialDate(),
    preferredTime: '',
    preferredEndTime: '',
    notes: '',
  })
  const [session, setSession] = useState<Session | null>(null)
  const [authMode, setAuthMode] = useState<AuthMode>(() => getInitialAuthMode())
  const [authForm, setAuthForm] = useState({ email: '', password: '' })
  const [authStatus, setAuthStatus] = useState('')
  const [bookingStatus, setBookingStatus] = useState('')
  const [latestConfirmation, setLatestConfirmation] = useState<{
    serviceName: string
    date: string
    startTime: string
    endTime: string
    status: BookingStatus
  } | null>(null)
  const [customerActionStatus, setCustomerActionStatus] = useState(() => getPaymentReturnMessage())
  const [bookingActionStatus, setBookingActionStatus] = useState('')
  const [serviceActionStatus, setServiceActionStatus] = useState('')
  const [availabilityActionStatus, setAvailabilityActionStatus] = useState('')
  const [unavailableActionStatus, setUnavailableActionStatus] = useState('')
  const [policyActionStatus, setPolicyActionStatus] = useState('')
  const [isSubmittingBooking, setIsSubmittingBooking] = useState(false)
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [bookings, setBookings] = useState<BookingRecord[]>([])
  const [bookedSlots, setBookedSlots] = useState<BookedSlot[]>([])
  const [availabilitySlots, setAvailabilitySlots] = useState<AvailabilitySlot[]>([])
  const [unavailableDays, setUnavailableDays] = useState<UnavailableDay[]>([])
  const [bookingPolicy, setBookingPolicy] = useState<BookingPolicy | null>(null)
  const [policyDraft, setPolicyDraft] = useState<PolicyDraft>(() => createPolicyDraft())
  const [policyAccepted, setPolicyAccepted] = useState(false)
  const [statusEvents, setStatusEvents] = useState<BookingStatusEvent[]>([])
  const [internalNotes, setInternalNotes] = useState<BookingInternalNote[]>([])
  const [notificationQueue, setNotificationQueue] = useState<BookingNotificationQueueItem[]>([])
  const [bookingPayments, setBookingPayments] = useState<BookingPayment[]>([])
  const [clientProfiles, setClientProfiles] = useState<ClientProfile[]>([])
  const [businessPayments, setBusinessPayments] = useState<BusinessPayment[]>([])
  const [products, setProducts] = useState<ProductRecord[]>([])
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([])
  const [bookingRefreshKey, setBookingRefreshKey] = useState(0)
  const [serviceRefreshKey, setServiceRefreshKey] = useState(0)
  const [availabilityRefreshKey, setAvailabilityRefreshKey] = useState(0)
  const [operationalRefreshKey, setOperationalRefreshKey] = useState(0)
  const [adminStatusFilter, setAdminStatusFilter] = useState<AdminStatusFilter>('all')
  const [customerPanelTab, setCustomerPanelTab] = useState<CustomerPanelTab>(() => getInitialCustomerPanelTab())
  const [adminPanelTab, setAdminPanelTab] = useState<AdminPanelTab>(() => getAdminTabFromRoute(window.location.pathname))
  const [adminSelectedDate, setAdminSelectedDate] = useState(() => getTodayDate())
  const [bookingSearch, setBookingSearch] = useState('')
  const [calendarMonth, setCalendarMonth] = useState(() => getMonthStart(getInitialDate()))
  const [serviceDrafts, setServiceDrafts] = useState<Record<string, ServiceDraft>>({})
  const [clientProfileDrafts, setClientProfileDrafts] = useState<Record<string, ClientProfileDraft>>({})
  const [newService, setNewService] = useState<ServiceDraft>(() => createEmptyServiceDraft())
  const [newPayment, setNewPayment] = useState<PaymentDraft>(() => createEmptyPaymentDraft())
  const [newProduct, setNewProduct] = useState<ProductDraft>(() => createEmptyProductDraft())
  const [newStockMovement, setNewStockMovement] = useState<StockMovementDraft>(() => createEmptyStockMovementDraft())
  const [availabilityDraft, setAvailabilityDraft] = useState<AvailabilityDraft>({
    weekday: '1',
    startTime: '08:00',
    endTime: '08:40',
  })
  const [unavailableDraft, setUnavailableDraft] = useState({ date: getTodayDate(), reason: '' })
  const [rescheduleDrafts, setRescheduleDrafts] = useState<Record<string, RescheduleDraft>>({})
  const [cancelReasonDrafts, setCancelReasonDrafts] = useState<Record<string, string>>({})
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({})
  const [clientSearch, setClientSearch] = useState('')
  const [paymentSearch, setPaymentSearch] = useState('')
  const [productSearch, setProductSearch] = useState('')
  const [savingServiceId, setSavingServiceId] = useState('')
  const [uploadingServiceImageId, setUploadingServiceImageId] = useState('')
  const [savingAvailabilityId, setSavingAvailabilityId] = useState('')
  const [savingClientEmail, setSavingClientEmail] = useState('')
  const [savingPayment, setSavingPayment] = useState(false)
  const [savingProduct, setSavingProduct] = useState(false)
  const [savingStockMovement, setSavingStockMovement] = useState(false)
  const [updatingBookingId, setUpdatingBookingId] = useState('')
  const [updatingQueueId, setUpdatingQueueId] = useState('')
  const [payingBookingId, setPayingBookingId] = useState('')
  const [clientActionStatus, setClientActionStatus] = useState('')
  const [financeActionStatus, setFinanceActionStatus] = useState('')
  const [productActionStatus, setProductActionStatus] = useState('')
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>(null)

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrentBusinessDateTime(getBusinessDateTime())
    }, 60_000)

    return () => {
      window.clearInterval(timer)
    }
  }, [])

  useEffect(() => {
    function handlePopState() {
      const nextRoute = window.location.pathname
      setRoute(nextRoute)
      if (nextRoute.startsWith('/admin')) {
        setAdminPanelTab(getAdminTabFromRoute(nextRoute))
      }
      setAuthMode(getInitialAuthMode())
      setAuthStatus('')
    }

    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [])

  useEffect(() => {
    const client = supabase

    if (!client) {
      return
    }

    let isMounted = true

    void client.auth.getSession().then(({ data }) => {
      if (isMounted) {
        setSession(data.session)
        if (!data.session) {
          setIsAdmin(false)
          setBookings([])
          setBookedSlots([])
          setAvailabilitySlots([])
          setStatusEvents([])
          setInternalNotes([])
          setNotificationQueue([])
          setBookingPayments([])
          setClientProfiles([])
          setBusinessPayments([])
          setProducts([])
          setStockMovements([])
        }
      }
    })

    const { data } = client.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession)
      if (!nextSession) {
        setIsAdmin(false)
        setBookings([])
        setBookedSlots([])
        setAvailabilitySlots([])
        setStatusEvents([])
        setInternalNotes([])
        setNotificationQueue([])
        setBookingPayments([])
        setClientProfiles([])
        setBusinessPayments([])
        setProducts([])
        setStockMovements([])
      }

      if (event === 'PASSWORD_RECOVERY') {
        window.history.replaceState(null, '', '/auth?mode=reset-password')
        setRoute('/auth')
        setAuthMode('reset-password')
        setAuthStatus('Digite uma nova senha para concluir a recuperacao.')
      }
    })

    return () => {
      isMounted = false
      data.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    const client = supabase

    if (!client || !session) {
      return
    }

    let isMounted = true

    void client
      .from('admin_profiles')
      .select('user_id')
      .eq('user_id', session.user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!isMounted) {
          return
        }

        setIsAdmin(Boolean(data && !error))
      })

    return () => {
      isMounted = false
    }
  }, [session])

  useEffect(() => {
    const client = supabase

    if (!client) {
      return
    }

    let isMounted = true

    void client.rpc('get_active_booking_policy').then(({ data, error }) => {
      if (!isMounted || error || !data) {
        return
      }

      const policy = (Array.isArray(data) ? data[0] : data) as BookingPolicy
      setBookingPolicy(policy)
      setPolicyDraft(createPolicyDraft(policy))
    })

    return () => {
      isMounted = false
    }
  }, [operationalRefreshKey])

  useEffect(() => {
    const client = supabase

    if (!client) {
      return
    }

    let isMounted = true
    let query = client
      .from('service_catalog')
      .select('id,name,duration_minutes,price_cents,description,image_path,active,sort_order')
      .order('sort_order', { ascending: true })

    if (!isAdmin) {
      query = query.eq('active', true)
    }

    void query.then(({ data, error }) => {
      if (!isMounted || error || !data?.length) {
        return
      }

      const mappedServices = (data as ServiceCatalogRow[]).map(mapServiceRow)
      setServices(mappedServices)
      setServiceDrafts((current) => {
        const next = { ...current }

        mappedServices.forEach((service) => {
          next[service.id] = current[service.id] ?? createServiceDraft(service)
        })

        return next
      })
    })

    return () => {
      isMounted = false
    }
  }, [isAdmin, serviceRefreshKey])

  useEffect(() => {
    const client = supabase

    if (!client || !session) {
      return
    }

    let isMounted = true
    void client
      .from('bookings')
      .select(
        'id,created_at,updated_at,user_id,client_name,client_email,client_phone,service_id,service_name,preferred_date,preferred_time,preferred_end_time,notes,status,source,canceled_at,canceled_by,cancellation_reason,confirmed_at,completed_at,no_show_at',
      )
      .order('preferred_date', { ascending: true })
      .order('preferred_time', { ascending: true })
      .limit(isAdmin ? 100 : 12)
      .then(({ data, error }) => {
        if (!isMounted) {
          return
        }

        if (!error) {
          const nextBookings = (data ?? []) as BookingRecord[]
          setBookings(nextBookings)
          setRescheduleDrafts((current) => {
            const next = { ...current }

            nextBookings.forEach((item) => {
              next[item.id] = current[item.id] ?? {
                preferredDate: item.preferred_date,
                preferredTime: timeLabel(item.preferred_time),
                preferredEndTime: timeLabel(item.preferred_end_time),
                reason: '',
              }
            })

            return next
          })
        }
      })

    return () => {
      isMounted = false
    }
  }, [session, isAdmin, bookingRefreshKey])

  useEffect(() => {
    const client = supabase

    if (!client || !session) {
      return
    }

    let isMounted = true

    void client
      .from('booking_status_events')
      .select('id,booking_id,from_status,to_status,actor_role,reason,created_at')
      .order('created_at', { ascending: false })
      .limit(isAdmin ? 300 : 80)
      .then(({ data, error }) => {
        if (!isMounted || error) {
          return
        }

        setStatusEvents((data ?? []) as BookingStatusEvent[])
      })

    void client
      .from('booking_payments')
      .select('id,booking_id,provider,status,amount_cents,checkout_url,expires_at,paid_at,created_at')
      .order('created_at', { ascending: false })
      .limit(isAdmin ? 300 : 30)
      .then(({ data, error }) => {
        if (!isMounted || error) {
          return
        }

        setBookingPayments((data ?? []) as BookingPayment[])
      })

    if (isAdmin) {
      void client
        .from('booking_internal_notes')
        .select('id,booking_id,note,created_at,updated_at')
        .order('created_at', { ascending: false })
        .limit(300)
        .then(({ data, error }) => {
          if (!isMounted || error) {
            return
          }

          setInternalNotes((data ?? []) as BookingInternalNote[])
        })

      void client
        .from('booking_notification_queue')
        .select('id,booking_id,type,channel,status,scheduled_for,message_template,done_at,created_at')
        .order('status', { ascending: false })
        .order('scheduled_for', { ascending: true })
        .limit(120)
        .then(({ data, error }) => {
          if (!isMounted || error) {
            return
          }

          setNotificationQueue((data ?? []) as BookingNotificationQueueItem[])
        })

      void client
        .from('clients')
        .select('id,user_id,full_name,email,phone,birth_date,preferences,professional_notes,created_at,updated_at')
        .order('full_name', { ascending: true })
        .limit(500)
        .then(({ data, error }) => {
          if (!isMounted || error) {
            return
          }

          const profiles = (data ?? []) as ClientProfile[]
          setClientProfiles(profiles)
          setClientProfileDrafts((current) => {
            const next = { ...current }

            profiles.forEach((profile) => {
              next[profile.email] = current[profile.email] ?? createClientProfileDraft(profile)
            })

            return next
          })
        })

      void client
        .from('payments')
        .select(
          'id,booking_id,client_id,service_id,client_name,service_name,payment_method,status,total_amount_cents,paid_amount_cents,paid_at,notes,created_at,updated_at',
        )
        .order('paid_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })
        .limit(500)
        .then(({ data, error }) => {
          if (!isMounted || error) {
            return
          }

          setBusinessPayments((data ?? []) as BusinessPayment[])
        })

      void client
        .from('products')
        .select('id,name,category,stock_quantity,unit,cost_cents,sale_price_cents,minimum_stock,notes,created_at,updated_at')
        .order('name', { ascending: true })
        .limit(500)
        .then(({ data, error }) => {
          if (!isMounted || error) {
            return
          }

          const nextProducts = (data ?? []) as ProductRecord[]
          setProducts(nextProducts)
          setNewStockMovement((current) =>
            current.productId || !nextProducts[0] ? current : { ...current, productId: nextProducts[0].id },
          )
        })

      void client
        .from('stock_movements')
        .select('id,product_id,movement_type,quantity_delta,unit_cost_cents,sale_price_cents,booking_id,client_id,notes,created_at')
        .order('created_at', { ascending: false })
        .limit(500)
        .then(({ data, error }) => {
          if (!isMounted || error) {
            return
          }

          setStockMovements((data ?? []) as StockMovement[])
        })
    }

    return () => {
      isMounted = false
    }
  }, [session, isAdmin, bookingRefreshKey, operationalRefreshKey])

  useEffect(() => {
    const client = supabase

    if (!client || !session) {
      return
    }

    let isMounted = true
    void client
      .from('admin_unavailable_days')
      .select('id,unavailable_date,reason,created_at')
      .gte('unavailable_date', calendarMonth)
      .lte('unavailable_date', getMonthEnd(calendarMonth))
      .order('unavailable_date', { ascending: true })
      .then(({ data, error }) => {
        if (!isMounted || error) {
          return
        }

        setUnavailableDays((data ?? []) as UnavailableDay[])
      })

    return () => {
      isMounted = false
    }
  }, [session, calendarMonth, bookingRefreshKey])

  useEffect(() => {
    const client = supabase

    if (!client || !session) {
      return
    }

    let isMounted = true
    void client
      .from('admin_availability_slots')
      .select('id,weekday,start_time,end_time,active,sort_order,created_at')
      .order('weekday', { ascending: true })
      .order('start_time', { ascending: true })
      .then(({ data, error }) => {
        if (!isMounted || error) {
          return
        }

        setAvailabilitySlots((data ?? []) as AvailabilitySlot[])
      })

    return () => {
      isMounted = false
    }
  }, [session, availabilityRefreshKey])

  useEffect(() => {
    const client = supabase

    if (!client || !session || !booking.preferredDate) {
      return
    }

    let isMounted = true
    void client
      .rpc('get_booked_slots', { slot_date: booking.preferredDate })
      .then(({ data, error }) => {
        if (!isMounted || error) {
          return
        }

        setBookedSlots(
          ((data ?? []) as BookedSlotRow[]).map((slot) => ({
            startTime: timeLabel(slot.preferred_time),
            endTime: timeLabel(slot.preferred_end_time),
          })),
        )
      })

    return () => {
      isMounted = false
    }
  }, [session, booking.preferredDate, bookingRefreshKey])

  const isAuthRoute = route === '/auth'
  const isCustomerRoute = route === '/cliente'
  const isAdminRoute = route === '/admin' || route.startsWith('/admin/')
  const isServicesRoute = route === '/servicos'
  const isBookingRoute = route === '/agendamento'
  const isConfirmationRoute = route === '/confirmacao'
  const selectedClientEmail = getClientRouteEmail(route)
  const bookableServices = services.filter((service) => service.active)
  const selectedService =
    bookableServices.find((service) => service.id === booking.serviceId) ??
    bookableServices[0] ??
    serviceSeeds[0]
  const depositRequired = Boolean(bookingPolicy?.deposit_required && bookingPolicy.deposit_amount_cents > 0)
  const depositAmountCents = bookingPolicy?.deposit_amount_cents ?? 0
  const bookingEmail = session?.user.email ?? ''
  const unavailableDateSet = new Set(unavailableDays.map((day) => day.unavailable_date))
  const activeAvailabilitySlots = availabilitySlots.filter((slot) => slot.active)
  const getAvailabilitySlotsForDate = (date: string) =>
    activeAvailabilitySlots.filter((slot) => slot.weekday === getIsoWeekday(date))
  const selectedDateAvailabilitySlots = getAvailabilitySlotsForDate(booking.preferredDate)
  const selectedDateUpcomingSlots = selectedDateAvailabilitySlots.filter(
    (slot) => !isSlotInPast(booking.preferredDate, slot.start_time, currentBusinessDateTime),
  )
  const bookedSlotSet = new Set(bookedSlots.map((slot) => getSlotKey(slot.startTime, slot.endTime)))
  const selectedSlotKey = booking.preferredTime && booking.preferredEndTime
    ? getSlotKey(booking.preferredTime, booking.preferredEndTime)
    : ''
  const selectedDateIsUnavailable =
    booking.preferredDate < currentBusinessDateTime.date ||
    unavailableDateSet.has(booking.preferredDate) ||
    !selectedDateUpcomingSlots.length
  const selectedSlotIsBooked = Boolean(selectedSlotKey && bookedSlotSet.has(selectedSlotKey))
  const availableSlots = selectedDateIsUnavailable
    ? []
    : selectedDateUpcomingSlots.filter((slot) => !bookedSlotSet.has(getSlotKey(slot.start_time, slot.end_time)))
  const selectedSlotIsAvailable = Boolean(
    selectedSlotKey && availableSlots.some((slot) => getSlotKey(slot.start_time, slot.end_time) === selectedSlotKey),
  )
  const hasBookingContact = booking.name.trim().length >= 2 && booking.phone.replace(/\D/g, '').length >= 8
  const hasSelectedBookableSlot = Boolean(selectedSlotKey && selectedSlotIsAvailable)
  const bookingSubmitLabel = isSubmittingBooking
    ? depositRequired
      ? 'Abrindo pagamento...'
      : 'Solicitando...'
    : !bookableServices.length
      ? 'Agenda pausada'
      : !hasSelectedBookableSlot
        ? 'Escolha um horario'
        : !hasBookingContact
          ? 'Preencha seus dados'
          : !policyAccepted
            ? 'Aceite a politica'
            : depositRequired
              ? 'Pagar sinal e reservar horario'
              : 'Solicitar horario'
  const bookingGuidance = bookingStatus ||
    (!bookableServices.length
      ? 'A agenda esta pausada no momento. Volte mais tarde ou fale com a Hellen pelo Instagram.'
      : selectedDateIsUnavailable
        ? 'Esta data nao tem horarios disponiveis. Escolha outro dia aberto no calendario.'
        : !hasSelectedBookableSlot
          ? 'Escolha um horario marcado como Disponivel para continuar.'
          : !hasBookingContact
            ? 'Preencha seu nome e WhatsApp para a Hellen identificar seu pedido.'
            : !policyAccepted
              ? 'Leia e aceite a politica para confirmar que entendeu as regras de cancelamento e remarcacao.'
              : depositRequired
                ? 'Tudo certo. Confira o resumo e pague o sinal para reservar seu horario.'
                : 'Tudo certo. Confira o resumo e solicite seu horario.')

  useEffect(() => {
    if (!isCustomerRoute) {
      return
    }

    if (!new URLSearchParams(window.location.search).get('payment')) {
      return
    }

    const cleanUrl = new URL(window.location.href)
    cleanUrl.searchParams.delete('payment')
    cleanUrl.searchParams.delete('booking')
    window.history.replaceState(null, '', `${cleanUrl.pathname}${cleanUrl.search}${cleanUrl.hash}`)
  }, [isCustomerRoute])

  useEffect(() => {
    if (!confirmDialog) {
      return
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setConfirmDialog(null)
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [confirmDialog])

  const calendarDays = getCalendarDays(calendarMonth)
  const adminSelectedBookings = bookings.filter((item) => item.preferred_date === adminSelectedDate)
  const todayActiveBookings = bookings.filter(
    (item) => item.preferred_date === currentBusinessDateTime.date && isActiveBookingStatus(item.status),
  )
  const pendingBookingCount = bookings.filter((item) => item.status === 'pending').length
  const clientSummaries = Array.from(
    bookings
      .reduce((clients, item) => {
        const key = item.client_email.toLowerCase()
        const current = clients.get(key)

        if (!current) {
          clients.set(key, {
            email: item.client_email,
            name: item.client_name,
            phone: item.client_phone,
            total: 1,
            lastDate: item.preferred_date,
            lastService: item.service_name,
            lastStatus: item.status,
          })
          return clients
        }

        current.total += 1
        if (item.preferred_date >= current.lastDate) {
          current.name = item.client_name
          current.phone = item.client_phone
          current.lastDate = item.preferred_date
          current.lastService = item.service_name
          current.lastStatus = item.status
        }

        return clients
      }, new Map<string, { email: string; name: string; phone: string; total: number; lastDate: string; lastService: string; lastStatus: BookingStatus }>())
      .values(),
  ).sort((first, second) => second.lastDate.localeCompare(first.lastDate))
  const normalizedBookingSearch = bookingSearch.trim().toLowerCase()
  const adminBookings = bookings.filter((item) => {
    const matchesStatus = adminStatusFilter === 'all' || item.status === adminStatusFilter
    const searchableText = [
      item.client_name,
      item.client_email,
      item.client_phone,
      item.service_name,
      item.notes ?? '',
      item.preferred_date,
    ]
      .join(' ')
      .toLowerCase()

    return matchesStatus && (!normalizedBookingSearch || searchableText.includes(normalizedBookingSearch))
  })
  const customerBookings = session && !isAdmin ? bookings : []
  const bookingStats = statusOptions.map((status) => ({
    status,
    count: bookings.filter((item) => item.status === status).length,
  }))
  const notesByBooking = internalNotes.reduce<Record<string, BookingInternalNote[]>>((notes, note) => {
    notes[note.booking_id] = [...(notes[note.booking_id] ?? []), note]
    return notes
  }, {})
  const eventsByBooking = statusEvents.reduce<Record<string, BookingStatusEvent[]>>((events, event) => {
    events[event.booking_id] = [...(events[event.booking_id] ?? []), event]
    return events
  }, {})
  const pendingNotificationCount = notificationQueue.filter((item) => item.status === 'pending').length
  const paymentsByBooking = bookingPayments.reduce<Record<string, BookingPayment>>((payments, payment) => {
    payments[payment.booking_id] = payments[payment.booking_id] ?? payment
    return payments
  }, {})
  const activeBookingCount = bookings.filter((item) => isActiveBookingStatus(item.status)).length
  const upcomingConfirmedCount = bookings.filter(
    (item) => item.status === 'confirmed' && item.preferred_date >= currentBusinessDateTime.date,
  ).length
  const completedRevenueCents = bookings
    .filter((item) => item.status === 'completed')
    .reduce((total, item) => total + (services.find((service) => service.id === item.service_id)?.priceCents ?? 0), 0)
  const paidBusinessPayments = businessPayments.filter((payment) => payment.status === 'paid')
  const businessRevenueCents = paidBusinessPayments.reduce((total, payment) => total + payment.paid_amount_cents, 0)
  const estimatedRevenueCents = businessRevenueCents || completedRevenueCents
  const todayRevenueCents = paidBusinessPayments
    .filter((payment) => payment.paid_at === currentBusinessDateTime.date)
    .reduce((total, payment) => total + payment.paid_amount_cents, 0)
  const weekStart = getWeekStart(currentBusinessDateTime.date)
  const weekRevenueCents = paidBusinessPayments
    .filter((payment) => payment.paid_at && payment.paid_at >= weekStart)
    .reduce((total, payment) => total + payment.paid_amount_cents, 0)
  const monthRevenueCents = paidBusinessPayments
    .filter((payment) => payment.paid_at?.startsWith(currentBusinessDateTime.date.slice(0, 7)))
    .reduce((total, payment) => total + payment.paid_amount_cents, 0)
  const pendingBusinessPaymentCount =
    businessPayments.filter((payment) => payment.status === 'pending' || payment.status === 'partial').length +
    bookingPayments.filter((payment) => payment.status === 'pending').length
  const lowStockProducts = products.filter((product) => product.stock_quantity <= product.minimum_stock)
  const servicePerformance = Array.from(
    bookings
      .filter((item) => item.status === 'completed' || item.status === 'confirmed')
      .reduce((items, item) => {
        items.set(item.service_name, (items.get(item.service_name) ?? 0) + 1)
        return items
      }, new Map<string, number>())
      .entries(),
  )
    .map(([serviceName, count]) => ({ serviceName, count }))
    .sort((first, second) => second.count - first.count)
  const clientProfilesByEmail = clientProfiles.reduce<Record<string, ClientProfile>>((profiles, profile) => {
    profiles[profile.email.toLowerCase()] = profile
    return profiles
  }, {})
  const clientDirectory = (clientProfiles.length
    ? clientProfiles.map((profile) => {
        const relatedBookings = bookings.filter((item) => item.client_email.toLowerCase() === profile.email.toLowerCase())
        const lastBooking = [...relatedBookings].sort((first, second) =>
          second.preferred_date.localeCompare(first.preferred_date),
        )[0]

        return {
          email: profile.email,
          name: profile.full_name,
          phone: profile.phone,
          total: relatedBookings.length,
          lastDate: lastBooking?.preferred_date ?? profile.updated_at.slice(0, 10),
          lastService: lastBooking?.service_name ?? 'Sem atendimento registrado',
          lastStatus: lastBooking?.status ?? ('pending' as BookingStatus),
          profile,
        }
      })
    : clientSummaries.map((client) => ({
        ...client,
        profile: clientProfilesByEmail[client.email.toLowerCase()] ?? null,
      }))).sort((first, second) => second.lastDate.localeCompare(first.lastDate))
  const filteredClientDirectory = clientDirectory.filter((client) => {
    const query = clientSearch.trim().toLowerCase()

    if (!query) {
      return true
    }

    return [client.name, client.email, client.phone, client.lastService].join(' ').toLowerCase().includes(query)
  })
  const selectedClient = selectedClientEmail
    ? clientDirectory.find((client) => client.email.toLowerCase() === selectedClientEmail.toLowerCase())
    : null
  const selectedClientBookings = selectedClient
    ? bookings.filter((item) => item.client_email.toLowerCase() === selectedClient.email.toLowerCase())
    : []
  const selectedClientPayments = selectedClient
    ? businessPayments.filter((payment) => payment.client_name.toLowerCase() === selectedClient.name.toLowerCase())
    : []
  const filteredBusinessPayments = businessPayments.filter((payment) => {
    const query = paymentSearch.trim().toLowerCase()

    if (!query) {
      return true
    }

    return [
      payment.client_name,
      payment.service_name,
      businessPaymentMethodLabels[payment.payment_method],
      businessPaymentStatusLabels[payment.status],
      payment.notes ?? '',
    ]
      .join(' ')
      .toLowerCase()
      .includes(query)
  })
  const filteredProducts = products.filter((product) => {
    const query = productSearch.trim().toLowerCase()

    if (!query) {
      return true
    }

    return [product.name, product.category, product.notes ?? ''].join(' ').toLowerCase().includes(query)
  })

  function goHome(targetId?: string) {
    window.history.pushState(null, '', targetId ? `/#${targetId}` : '/')
    setRoute('/')
    window.requestAnimationFrame(() => {
      if (targetId) {
        document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        return
      }

      window.scrollTo({ top: 0, behavior: 'smooth' })
    })
  }

  function goToPath(path: string) {
    window.history.pushState(null, '', path)
    setRoute(path)
    if (path.startsWith('/admin')) {
      setAdminPanelTab(getAdminTabFromRoute(path))
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function goToAdminTab(tab: AdminPanelTab) {
    setAdminPanelTab(tab)
    goToPath(adminTabPaths[tab])
  }

  function goToAuth(mode: AuthMode, next?: string) {
    const params = new URLSearchParams({ mode })

    if (next) {
      params.set('next', next)
    }

    window.history.pushState(null, '', `/auth?${params.toString()}`)
    setRoute('/auth')
    setAuthMode(mode)
    setAuthStatus('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function openDepositCheckout(bookingId: string, setStatus: (message: string) => void = setBookingStatus) {
    const client = supabase

    if (!client || !session) {
      setStatus('Entre novamente para abrir o pagamento do sinal.')
      return false
    }

    try {
      setPayingBookingId(bookingId)
      const { data } = await client.auth.getSession()
      const accessToken = data.session?.access_token

      if (!accessToken) {
        setPayingBookingId('')
        setStatus('Entre novamente para abrir o pagamento do sinal.')
        return false
      }

      const response = await fetch('/api/create-deposit-checkout', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ bookingId }),
      })
      const payload = (await response.json().catch(() => ({}))) as { checkoutUrl?: string; error?: string }

      if (!response.ok || !payload.checkoutUrl) {
        setPayingBookingId('')
        setStatus(getDepositCheckoutErrorMessage(payload.error))
        return false
      }

      window.location.assign(payload.checkoutUrl)
      return true
    } catch {
      setPayingBookingId('')
      setStatus('Nao foi possivel abrir o pagamento do sinal. Confira sua conexao e tente novamente.')
      return false
    }
  }

  async function handleBookingSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBookingStatus('')
    const client = supabase

    if (!session) {
      goToAuth('sign-in', 'cliente')
      return
    }

    if (!client) {
      setBookingStatus('A agenda online esta indisponivel no momento. Tente novamente em instantes.')
      return
    }

    if (!bookableServices.length) {
      setBookingStatus('Nenhum servico esta disponivel para agendamento agora.')
      return
    }

    if (selectedDateIsUnavailable) {
      setBookingStatus('Este dia nao esta disponivel para atendimento. Escolha outra data no calendario.')
      return
    }

    if (selectedSlotIsBooked) {
      setBookingStatus('Esse horario ja foi reservado. Escolha outro horario disponivel.')
      return
    }

    if (!selectedSlotIsAvailable) {
      setBookingStatus('Escolha um periodo disponivel para concluir o agendamento.')
      return
    }

    if (!policyAccepted) {
      setBookingStatus('Confirme que leu a politica de cancelamento e remarcacao para solicitar o horario.')
      return
    }

    setIsSubmittingBooking(true)
    const { data, error } = await client.from('bookings').insert({
      user_id: session.user.id,
      client_name: booking.name.trim(),
      client_phone: booking.phone.trim(),
      service_id: selectedService.id,
      preferred_date: booking.preferredDate,
      preferred_time: booking.preferredTime,
      preferred_end_time: booking.preferredEndTime,
      notes: booking.notes.trim() || null,
      source: 'site',
    }).select('id,status').single()

    if (error) {
      setIsSubmittingBooking(false)
      setBookingStatus(
        `Nao foi possivel solicitar o horario: ${getBookingErrorMessage(
          error.message,
          'Esse horario acabou de ser reservado. Escolha outro horario disponivel.',
        )}`,
      )
      return
    }

    const createdStatus = (data?.status ?? 'pending') as BookingStatus

    if (createdStatus === 'awaiting_deposit' && data?.id) {
      setBookingStatus('Horario separado. Vamos abrir o pagamento do sinal para concluir a reserva.')
      const openedCheckout = await openDepositCheckout(data.id)
      setIsSubmittingBooking(false)

      if (!openedCheckout) {
        setBookingRefreshKey((key) => key + 1)
      }

      return
    }

    setIsSubmittingBooking(false)

    setBookingStatus(
      createdStatus === 'confirmed'
        ? 'Horario confirmado. A mensagem fica registrada para envio pelo WhatsApp.'
        : 'Horario solicitado. A confirmacao chega por WhatsApp ou email.',
    )
    setLatestConfirmation({
      serviceName: selectedService.name,
      date: booking.preferredDate,
      startTime: booking.preferredTime,
      endTime: booking.preferredEndTime,
      status: createdStatus,
    })
    const nextDate = getInitialDate()
    setBooking((current) => ({
      ...current,
      name: '',
      phone: '',
      notes: '',
      preferredDate: nextDate,
      preferredTime: '',
      preferredEndTime: '',
    }))
    setPolicyAccepted(false)
    setCalendarMonth(getMonthStart(nextDate))
    setBookingRefreshKey((key) => key + 1)
    goToPath('/confirmacao')
  }

  async function handleAuthSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setAuthStatus('')
    const client = supabase

    if (!client) {
      setAuthStatus('O acesso online esta indisponivel no momento.')
      return
    }

    setIsSubmittingAuth(true)
    const email = authForm.email.trim().toLowerCase()
    const password = authForm.password
    const nextTarget = new URLSearchParams(window.location.search).get('next')

    if (authMode === 'forgot-password') {
      const { error } = await client.auth.resetPasswordForEmail(email, {
        redirectTo: getAuthRedirectUrl('reset-password'),
      })
      setIsSubmittingAuth(false)

      if (error) {
        setAuthStatus(getAuthErrorMessage(error.message))
        return
      }

      setAuthStatus('Enviamos um link para recuperar sua senha. Confira seu email.')
      return
    }

    if (authMode === 'reset-password') {
      const { error } = await client.auth.updateUser({ password })
      setIsSubmittingAuth(false)

      if (error) {
        setAuthStatus(getAuthErrorMessage(error.message))
        return
      }

      setAuthStatus('Senha atualizada com sucesso.')
      setAuthForm({ email: '', password: '' })
      goToPath('/cliente')
      return
    }

    const { error } =
      authMode === 'sign-in'
        ? await client.auth.signInWithPassword({ email, password })
        : await client.auth.signUp({
            email,
            password,
            options: { emailRedirectTo: getAuthRedirectUrl('sign-in') },
          })

    setIsSubmittingAuth(false)

    if (error) {
      setAuthStatus(getAuthErrorMessage(error.message))
      return
    }

    if (authMode === 'sign-up') {
      setAuthStatus('Enviamos um link de confirmacao. Abra seu email para ativar a conta.')
      setAuthForm((current) => ({ ...current, password: '' }))
      return
    }

    setAuthForm({ email: '', password: '' })
    goToPath(nextTarget === 'admin' ? '/admin' : '/cliente')
  }

  async function handleSignOut() {
    const client = supabase

    if (!client) {
      return
    }

    await client.auth.signOut()
    setBookings([])
    setBookedSlots([])
    setAvailabilitySlots([])
    setStatusEvents([])
    setInternalNotes([])
    setNotificationQueue([])
    setBookingPayments([])
    setClientProfiles([])
    setBusinessPayments([])
    setProducts([])
    setStockMovements([])
    setIsAdmin(false)
    setAuthStatus('Sessao encerrada.')
  }

  async function handleBookingStatusChange(bookingId: string, status: BookingStatus) {
    const client = supabase
    const bookingItem = bookings.find((item) => item.id === bookingId)

    if (!client || !isAdmin || !session || !bookingItem) {
      return
    }

    setUpdatingBookingId(bookingId)
    setBookingActionStatus('')
    const now = new Date().toISOString()
    const statusPayload: Partial<BookingRecord> & Record<string, string | null> = {
      status,
      updated_at: now,
    }

    if (status === 'confirmed') {
      statusPayload.confirmed_at = now
    }

    if (status === 'completed') {
      statusPayload.completed_at = now
    }

    if (status === 'canceled_by_admin') {
      statusPayload.canceled_at = now
      statusPayload.canceled_by = session.user.id
    }

    if (status === 'deposit_expired') {
      statusPayload.canceled_at = now
      statusPayload.cancellation_reason = 'Sinal nao pago no prazo.'
    }

    if (status === 'no_show') {
      statusPayload.no_show_at = now
    }

    const { error } = await client
      .from('bookings')
      .update(statusPayload)
      .eq('id', bookingId)
    setUpdatingBookingId('')

    if (error) {
      setBookingActionStatus(
        `Nao foi possivel atualizar o pedido: ${getBookingErrorMessage(error.message, 'Esse horario ja esta ocupado.')}`,
      )
      return
    }

    if (status === 'confirmed' || status === 'canceled_by_admin' || status === 'completed' || status === 'no_show') {
      const notificationType = status === 'completed' || status === 'no_show' ? 'follow_up' : status === 'canceled_by_admin' ? 'cancellation' : 'confirmation'
      const message =
        status === 'confirmed'
          ? `Ola ${bookingItem.client_name}, seu horario para ${bookingItem.service_name} em ${formatFullDate(
              bookingItem.preferred_date,
            )} das ${formatTimeRange(bookingItem.preferred_time, bookingItem.preferred_end_time)} esta confirmado.`
          : status === 'canceled_by_admin'
            ? `Ola ${bookingItem.client_name}, precisamos cancelar seu horario de ${formatFullDate(
                bookingItem.preferred_date,
              )} das ${formatTimeRange(bookingItem.preferred_time, bookingItem.preferred_end_time)}. Fale com a Hellen para remarcar.`
            : status === 'completed'
              ? `Ola ${bookingItem.client_name}, obrigada pelo atendimento de hoje. Se quiser manter o desenho em dia, fale com a Hellen para combinar o proximo horario.`
              : `Ola ${bookingItem.client_name}, sentimos sua ausencia no horario de hoje. Se quiser remarcar, fale com a Hellen.`

      await client.from('booking_notification_queue').insert({
        booking_id: bookingId,
        type: notificationType,
        scheduled_for: now,
        message_template: message,
      })
    }

    setBookingActionStatus('Status atualizado.')
    setBookings((current) =>
      current.map((item) => (item.id === bookingId ? { ...item, ...statusPayload, status } : item)),
    )
    setBookingRefreshKey((key) => key + 1)
    setOperationalRefreshKey((key) => key + 1)
  }

  async function handleBookingDelete(bookingId: string) {
    const client = supabase

    if (!client || !isAdmin) {
      return
    }

    setUpdatingBookingId(bookingId)
    setBookingActionStatus('')
    const { error } = await client.from('bookings').delete().eq('id', bookingId)
    setUpdatingBookingId('')

    if (error) {
      setBookingActionStatus(`Nao foi possivel excluir o pedido: ${error.message}`)
      return
    }

    setBookingActionStatus('Pedido removido.')
    setBookings((current) => current.filter((item) => item.id !== bookingId))
    setBookingRefreshKey((key) => key + 1)
  }

  function requestBookingDelete(item: BookingRecord) {
    if (!isAdmin) {
      return
    }

    setConfirmDialog({
      title: 'Excluir pedido da agenda?',
      message: `Esta acao remove o pedido de ${item.client_name} em ${formatFullDate(item.preferred_date)}. Use apenas para registros criados por engano.`,
      confirmLabel: 'Excluir pedido',
      tone: 'danger',
      onConfirm: () => void handleBookingDelete(item.id),
    })
  }

  function updateRescheduleDraft(bookingId: string, patch: Partial<RescheduleDraft>) {
    setRescheduleDrafts((current) => ({
      ...current,
      [bookingId]: {
        ...(current[bookingId] ?? { preferredDate: getInitialDate(), preferredTime: '', preferredEndTime: '', reason: '' }),
        ...patch,
      },
    }))
  }

  async function handleBookingReschedule(item: BookingRecord) {
    const client = supabase
    const draft = rescheduleDrafts[item.id] ?? {
      preferredDate: item.preferred_date,
      preferredTime: timeLabel(item.preferred_time),
      preferredEndTime: timeLabel(item.preferred_end_time),
      reason: '',
    }

    if (!client || !isAdmin) {
      return
    }

    if (
      draft.preferredDate < currentBusinessDateTime.date ||
      unavailableDateSet.has(draft.preferredDate) ||
      isSlotInPast(draft.preferredDate, draft.preferredTime, currentBusinessDateTime)
    ) {
      setBookingActionStatus('Nao e possivel remarcar para data, horario passado ou dia bloqueado.')
      return
    }

    const draftSlotIsAvailable = getAvailabilitySlotsForDate(draft.preferredDate).some(
      (slot) => getSlotKey(slot.start_time, slot.end_time) === getSlotKey(draft.preferredTime, draft.preferredEndTime),
    )

    if (!draftSlotIsAvailable) {
      setBookingActionStatus('Escolha um periodo liberado nos horarios de atendimento.')
      return
    }

    setUpdatingBookingId(item.id)
    setBookingActionStatus('')
    const { error } = await client
      .from('bookings')
      .update({
        preferred_date: draft.preferredDate,
        preferred_time: draft.preferredTime,
        preferred_end_time: draft.preferredEndTime,
        updated_at: new Date().toISOString(),
      })
      .eq('id', item.id)
    setUpdatingBookingId('')

    if (error) {
      setBookingActionStatus(
        `Nao foi possivel remarcar: ${getBookingErrorMessage(
          error.message,
          'Ja existe um agendamento ativo nesse horario. Escolha outro periodo.',
        )}`,
      )
      return
    }

    setBookingActionStatus('Cliente remarcado com sucesso.')
    setBookings((current) =>
      current.map((bookingItem) =>
        bookingItem.id === item.id
          ? {
              ...bookingItem,
              preferred_date: draft.preferredDate,
              preferred_time: draft.preferredTime,
              preferred_end_time: draft.preferredEndTime,
            }
          : bookingItem,
      ),
    )
    setBookingRefreshKey((key) => key + 1)
  }

  async function handleCustomerCancel(item: BookingRecord) {
    const client = supabase

    if (!client || !session || !isActiveBookingStatus(item.status)) {
      return
    }

    setUpdatingBookingId(item.id)
    setCustomerActionStatus('')
    const { error } = await client.rpc('client_cancel_booking', {
      booking_id: item.id,
      reason: cancelReasonDrafts[item.id]?.trim() || null,
    })
    setUpdatingBookingId('')

    if (error) {
      setCustomerActionStatus(
        `Nao foi possivel cancelar: ${getBookingErrorMessage(error.message, 'Esse horario ja foi reservado.')}`,
      )
      return
    }

    setCustomerActionStatus('Horario cancelado. Se precisar, escolha uma nova data na agenda.')
    setCancelReasonDrafts((current) => ({ ...current, [item.id]: '' }))
    setBookingRefreshKey((key) => key + 1)
    setOperationalRefreshKey((key) => key + 1)
  }

  function requestCustomerCancel(item: BookingRecord) {
    if (!session || !isActiveBookingStatus(item.status)) {
      return
    }

    setConfirmDialog({
      title: 'Cancelar este horario?',
      message: `Voce esta cancelando ${item.service_name} em ${formatFullDate(item.preferred_date)} as ${formatTimeRange(
        item.preferred_time,
        item.preferred_end_time,
      )}.`,
      confirmLabel: 'Cancelar horario',
      tone: 'danger',
      onConfirm: () => void handleCustomerCancel(item),
    })
  }

  async function handleCustomerReschedule(item: BookingRecord) {
    const client = supabase
    const draft = rescheduleDrafts[item.id] ?? {
      preferredDate: item.preferred_date,
      preferredTime: timeLabel(item.preferred_time),
      preferredEndTime: timeLabel(item.preferred_end_time),
      reason: '',
    }

    if (!client || !session || !isActiveBookingStatus(item.status)) {
      return
    }

    if (!draft.preferredDate || !draft.preferredTime || !draft.preferredEndTime) {
      setCustomerActionStatus('Escolha uma nova data e horario para remarcar.')
      return
    }

    if (isSlotInPast(draft.preferredDate, draft.preferredTime, currentBusinessDateTime)) {
      setCustomerActionStatus('Esse horario ja passou. Escolha outro periodo disponivel.')
      return
    }

    setUpdatingBookingId(item.id)
    setCustomerActionStatus('')
    const { error } = await client.rpc('client_reschedule_booking', {
      booking_id: item.id,
      new_date: draft.preferredDate,
      new_start_time: draft.preferredTime,
      new_end_time: draft.preferredEndTime,
      reason: draft.reason.trim() || null,
    })
    setUpdatingBookingId('')

    if (error) {
      setCustomerActionStatus(
        `Nao foi possivel remarcar: ${getBookingErrorMessage(
          error.message,
          'Ja existe um agendamento ativo nesse horario. Escolha outro periodo.',
        )}`,
      )
      return
    }

    setCustomerActionStatus('Remarcacao registrada. Acompanhe o novo status aqui.')
    setBookingRefreshKey((key) => key + 1)
    setOperationalRefreshKey((key) => key + 1)
  }

  async function handleCreateUnavailableDay(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const client = supabase

    if (!client || !isAdmin || !session) {
      return
    }

    if (isWeekendDate(unavailableDraft.date)) {
      setUnavailableActionStatus('Fins de semana ja ficam indisponiveis automaticamente.')
      return
    }

    setUnavailableActionStatus('')
    const { error } = await client.from('admin_unavailable_days').upsert(
      {
        unavailable_date: unavailableDraft.date,
        reason: unavailableDraft.reason.trim() || null,
        created_by: session.user.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'unavailable_date' },
    )

    if (error) {
      setUnavailableActionStatus(`Nao foi possivel bloquear o dia: ${error.message}`)
      return
    }

    setUnavailableActionStatus('Dia bloqueado na agenda.')
    setUnavailableDraft({ date: getTodayDate(), reason: '' })
    setBookingRefreshKey((key) => key + 1)
  }

  async function handleDeleteUnavailableDay(dayId: string) {
    const client = supabase

    if (!client || !isAdmin) {
      return
    }

    setUnavailableActionStatus('')
    const { error } = await client.from('admin_unavailable_days').delete().eq('id', dayId)

    if (error) {
      setUnavailableActionStatus(`Nao foi possivel liberar o dia: ${error.message}`)
      return
    }

    setUnavailableActionStatus('Dia liberado novamente.')
    setBookingRefreshKey((key) => key + 1)
  }

  async function handleCreateAvailabilitySlot(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const client = supabase

    if (!client || !isAdmin || !session) {
      return
    }

    if (availabilityDraft.endTime <= availabilityDraft.startTime) {
      setAvailabilityActionStatus('O horario final precisa ser maior que o horario inicial.')
      return
    }

    setSavingAvailabilityId('new')
    setAvailabilityActionStatus('')
    const { error } = await client.from('admin_availability_slots').insert({
      weekday: Number(availabilityDraft.weekday),
      start_time: availabilityDraft.startTime,
      end_time: availabilityDraft.endTime,
      active: true,
      created_by: session.user.id,
    })
    setSavingAvailabilityId('')

    if (error) {
      setAvailabilityActionStatus(`Nao foi possivel criar o horario: ${getAvailabilityErrorMessage(error.message)}`)
      return
    }

    setAvailabilityActionStatus('Horario liberado para agendamento.')
    setAvailabilityRefreshKey((key) => key + 1)
  }

  async function handleAvailabilitySlotActiveChange(slot: AvailabilitySlot, active: boolean) {
    const client = supabase

    if (!client || !isAdmin) {
      return
    }

    setSavingAvailabilityId(slot.id)
    setAvailabilityActionStatus('')
    const { error } = await client
      .from('admin_availability_slots')
      .update({ active, updated_at: new Date().toISOString() })
      .eq('id', slot.id)
    setSavingAvailabilityId('')

    if (error) {
      setAvailabilityActionStatus(`Nao foi possivel atualizar o horario: ${getAvailabilityErrorMessage(error.message)}`)
      return
    }

    setAvailabilitySlots((current) => current.map((item) => (item.id === slot.id ? { ...item, active } : item)))
    setAvailabilityActionStatus(active ? 'Horario reativado.' : 'Horario pausado.')
    setAvailabilityRefreshKey((key) => key + 1)
  }

  async function handleDeleteAvailabilitySlot(slotId: string) {
    const client = supabase

    if (!client || !isAdmin) {
      return
    }

    setSavingAvailabilityId(slotId)
    setAvailabilityActionStatus('')
    const { error } = await client.from('admin_availability_slots').delete().eq('id', slotId)
    setSavingAvailabilityId('')

    if (error) {
      setAvailabilityActionStatus(`Nao foi possivel remover o horario: ${error.message}`)
      return
    }

    setAvailabilitySlots((current) => current.filter((slot) => slot.id !== slotId))
    setAvailabilityActionStatus('Horario removido da agenda.')
    setAvailabilityRefreshKey((key) => key + 1)
  }

  function requestAvailabilitySlotDelete(slot: AvailabilitySlot) {
    if (!isAdmin) {
      return
    }

    setConfirmDialog({
      title: 'Remover horario de atendimento?',
      message: `O periodo de ${getWeekdayName(slot.weekday)} das ${formatTimeRange(
        slot.start_time,
        slot.end_time,
      )} deixara de aparecer para novas reservas.`,
      confirmLabel: 'Remover horario',
      tone: 'danger',
      onConfirm: () => void handleDeleteAvailabilitySlot(slot.id),
    })
  }

  function updateServiceDraft(serviceId: string, patch: Partial<ServiceDraft>) {
    setServiceDrafts((current) => ({
      ...current,
      [serviceId]: {
        ...(current[serviceId] ?? createEmptyServiceDraft()),
        ...patch,
      },
    }))
  }

  function validateServiceDraft(draft: ServiceDraft) {
    const durationMinutes = Number.parseInt(draft.durationMinutes, 10)
    const sortOrder = Number.parseInt(draft.sortOrder, 10)
    const priceCents = parsePriceDraft(draft.priceCents)

    if (!draft.name.trim() || !draft.description.trim()) {
      return { error: 'Informe nome e descricao do servico.' }
    }

    if (!Number.isFinite(durationMinutes) || durationMinutes < 15 || durationMinutes > 240) {
      return { error: 'A duracao precisa ficar entre 15 e 240 minutos.' }
    }

    if (!Number.isFinite(sortOrder)) {
      return { error: 'A ordem precisa ser um numero.' }
    }

    if (priceCents === undefined) {
      return { error: 'Informe um preco valido, como 95,00, ou deixe em branco.' }
    }

    return {
      payload: {
        name: draft.name.trim(),
        duration_minutes: durationMinutes,
        price_cents: priceCents,
        description: draft.description.trim(),
        active: draft.active,
        sort_order: sortOrder,
      },
    }
  }

  async function handleServiceSave(service: ServiceOption) {
    const client = supabase
    const draft = serviceDrafts[service.id] ?? createServiceDraft(service)

    if (!client || !isAdmin) {
      return
    }

    const validation = validateServiceDraft(draft)

    if (validation.error || !validation.payload) {
      setServiceActionStatus(validation.error ?? 'Revise o servico antes de salvar.')
      return
    }

    setSavingServiceId(service.id)
    setServiceActionStatus('')
    const { error } = await client.from('service_catalog').upsert(
      {
        id: service.id,
        ...validation.payload,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' },
    )
    setSavingServiceId('')

    if (error) {
      setServiceActionStatus(`Nao foi possivel salvar o servico: ${error.message}`)
      return
    }

    setServiceActionStatus('Servico atualizado.')
    setServiceRefreshKey((key) => key + 1)
  }

  async function handleCreateService(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const client = supabase

    if (!client || !isAdmin) {
      return
    }

    const serviceId = slugifyServiceId(newService.name)
    const validation = validateServiceDraft(newService)

    if (!serviceId) {
      setServiceActionStatus('Informe um nome valido para gerar o ID do servico.')
      return
    }

    if (validation.error || !validation.payload) {
      setServiceActionStatus(validation.error ?? 'Revise o novo servico antes de salvar.')
      return
    }

    setSavingServiceId('new')
    setServiceActionStatus('')
    const { error } = await client.from('service_catalog').insert({
      id: serviceId,
      ...validation.payload,
    })
    setSavingServiceId('')

    if (error) {
      setServiceActionStatus(`Nao foi possivel criar o servico: ${error.message}`)
      return
    }

    setServiceActionStatus('Servico criado.')
    setNewService(createEmptyServiceDraft())
    setServiceRefreshKey((key) => key + 1)
  }

  async function handleServiceImageUpload(service: ServiceOption, fileList: FileList | null) {
    const client = supabase
    const file = fileList?.[0]

    if (!file || !client || !isAdmin) {
      return
    }

    if (!allowedServiceImageTypes.has(file.type)) {
      setServiceActionStatus('Envie uma imagem JPG, PNG, WebP ou AVIF.')
      return
    }

    if (file.size > maxServiceImageBytes) {
      setServiceActionStatus('A foto precisa ter ate 2 MB.')
      return
    }

    const imagePath = getServiceImagePath(service.id, file)
    setUploadingServiceImageId(service.id)
    setServiceActionStatus('')

    const { error: uploadError } = await client.storage.from(serviceImageBucket).upload(imagePath, file, {
      cacheControl: '31536000',
      contentType: file.type,
      upsert: false,
    })

    if (uploadError) {
      setUploadingServiceImageId('')
      setServiceActionStatus(`Nao foi possivel enviar a foto: ${uploadError.message}`)
      return
    }

    const { error: updateError } = await client
      .from('service_catalog')
      .update({ image_path: imagePath, updated_at: new Date().toISOString() })
      .eq('id', service.id)

    if (updateError) {
      await client.storage.from(serviceImageBucket).remove([imagePath])
      setUploadingServiceImageId('')
      setServiceActionStatus(`Foto enviada, mas nao foi possivel salvar no servico: ${updateError.message}`)
      return
    }

    if (service.imagePath && service.imagePath !== imagePath) {
      await client.storage.from(serviceImageBucket).remove([service.imagePath])
    }

    setUploadingServiceImageId('')
    setServiceActionStatus('Foto do servico atualizada.')
    setServiceRefreshKey((key) => key + 1)
  }

  async function handleServiceImageRemove(service: ServiceOption) {
    const client = supabase

    if (!client || !isAdmin || !service.imagePath) {
      return
    }

    setUploadingServiceImageId(service.id)
    setServiceActionStatus('')
    const { error } = await client
      .from('service_catalog')
      .update({ image_path: null, updated_at: new Date().toISOString() })
      .eq('id', service.id)

    if (error) {
      setUploadingServiceImageId('')
      setServiceActionStatus(`Nao foi possivel remover a foto: ${error.message}`)
      return
    }

    await client.storage.from(serviceImageBucket).remove([service.imagePath])
    setUploadingServiceImageId('')
    setServiceActionStatus('Foto removida do servico.')
    setServiceRefreshKey((key) => key + 1)
  }

  async function handlePolicySave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const client = supabase

    if (!client || !isAdmin || !session) {
      return
    }

    const cancellationCutoffHours = Number.parseInt(policyDraft.cancellationCutoffHours, 10)
    const rescheduleCutoffHours = Number.parseInt(policyDraft.rescheduleCutoffHours, 10)
    const noShowGraceMinutes = Number.parseInt(policyDraft.noShowGraceMinutes, 10)
    const depositAmountCents = parsePriceDraft(policyDraft.depositAmountCents)
    const depositCheckoutExpirationMinutes = Number.parseInt(policyDraft.depositCheckoutExpirationMinutes, 10)

    if (
      !Number.isFinite(cancellationCutoffHours) ||
      !Number.isFinite(rescheduleCutoffHours) ||
      !Number.isFinite(noShowGraceMinutes) ||
      !Number.isFinite(depositCheckoutExpirationMinutes) ||
      depositCheckoutExpirationMinutes < 10 ||
      depositCheckoutExpirationMinutes > 1440 ||
      depositAmountCents === undefined ||
      (policyDraft.depositRequired && (!depositAmountCents || depositAmountCents <= 0)) ||
      policyDraft.policyText.trim().length < 20
    ) {
      setPolicyActionStatus('Revise prazos, sinal e politica. O sinal ativo precisa ter valor maior que zero.')
      return
    }

    setPolicyActionStatus('')
    const { error } = await client.from('booking_policies').upsert(
      {
        id: bookingPolicy?.id ?? 'default',
        cancellation_cutoff_hours: cancellationCutoffHours,
        reschedule_cutoff_hours: rescheduleCutoffHours,
        no_show_grace_minutes: noShowGraceMinutes,
        auto_confirm_enabled: policyDraft.autoConfirmEnabled,
        deposit_required: policyDraft.depositRequired,
        deposit_amount_cents: depositAmountCents ?? 0,
        deposit_checkout_expiration_minutes: depositCheckoutExpirationMinutes,
        policy_text: policyDraft.policyText.trim(),
        active: true,
        updated_by: session.user.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' },
    )

    if (error) {
      setPolicyActionStatus(`Nao foi possivel salvar a politica: ${error.message}`)
      return
    }

    setPolicyActionStatus('Politica atualizada.')
    setOperationalRefreshKey((key) => key + 1)
  }

  function updateClientProfileDraft(email: string, patch: Partial<ClientProfileDraft>) {
    setClientProfileDrafts((current) => ({
      ...current,
      [email]: {
        ...(current[email] ?? createClientProfileDraft(clientProfilesByEmail[email.toLowerCase()])),
        ...patch,
      },
    }))
  }

  async function handleClientProfileSave(email: string) {
    const client = supabase
    const summary = clientDirectory.find((item) => item.email.toLowerCase() === email.toLowerCase())
    const draft = clientProfileDrafts[email] ?? createClientProfileDraft(summary?.profile ?? null)

    if (!client || !isAdmin || !summary) {
      return
    }

    if (!draft.fullName.trim() || !draft.phone.trim()) {
      setClientActionStatus('Informe nome e WhatsApp para salvar a ficha.')
      return
    }

    const profileBookings = bookings.filter((item) => item.client_email.toLowerCase() === email.toLowerCase())
    setSavingClientEmail(email)
    setClientActionStatus('')
    const { error } = await client.from('clients').upsert(
      {
        user_id: summary.profile?.user_id ?? profileBookings[0]?.user_id ?? null,
        full_name: draft.fullName.trim(),
        email: email.toLowerCase(),
        phone: draft.phone.trim(),
        birth_date: draft.birthDate || null,
        preferences: draft.preferences.trim() || null,
        professional_notes: draft.professionalNotes.trim() || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'email' },
    )
    setSavingClientEmail('')

    if (error) {
      setClientActionStatus(`Nao foi possivel salvar a ficha: ${error.message}`)
      return
    }

    setClientActionStatus('Ficha da cliente salva.')
    setOperationalRefreshKey((key) => key + 1)
  }

  async function handleCreateBusinessPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const client = supabase
    const bookingItem = bookings.find((item) => item.id === newPayment.bookingId)
    const totalAmountCents =
      parsePriceDraft(newPayment.totalAmountCents) ??
      (bookingItem ? services.find((service) => service.id === bookingItem.service_id)?.priceCents ?? null : null)
    const paidAmountCents = parsePriceDraft(newPayment.paidAmountCents)

    if (!client || !isAdmin || !session) {
      return
    }

    if (!bookingItem) {
      setFinanceActionStatus('Escolha um atendimento para registrar o pagamento.')
      return
    }

    if (totalAmountCents === undefined || totalAmountCents === null || paidAmountCents === undefined) {
      setFinanceActionStatus('Informe valores validos, como 30,00.')
      return
    }

    const relatedClient = clientProfilesByEmail[bookingItem.client_email.toLowerCase()]
    setSavingPayment(true)
    setFinanceActionStatus('')
    const { error } = await client.from('payments').insert({
      booking_id: bookingItem.id,
      client_id: relatedClient?.id ?? null,
      service_id: bookingItem.service_id,
      client_name: bookingItem.client_name,
      service_name: bookingItem.service_name,
      payment_method: newPayment.paymentMethod,
      status: newPayment.status,
      total_amount_cents: totalAmountCents,
      paid_amount_cents: paidAmountCents ?? 0,
      paid_at: newPayment.status === 'paid' || newPayment.status === 'partial' ? newPayment.paidAt || getTodayDate() : null,
      notes: newPayment.notes.trim() || null,
      created_by: session.user.id,
    })
    setSavingPayment(false)

    if (error) {
      setFinanceActionStatus(`Nao foi possivel registrar o pagamento: ${error.message}`)
      return
    }

    setFinanceActionStatus('Pagamento registrado.')
    setNewPayment(createEmptyPaymentDraft())
    setOperationalRefreshKey((key) => key + 1)
  }

  async function handleDeleteBusinessPayment(paymentId: string) {
    const client = supabase

    if (!client || !isAdmin) {
      return
    }

    setFinanceActionStatus('')
    const { error } = await client.from('payments').delete().eq('id', paymentId)

    if (error) {
      setFinanceActionStatus(`Nao foi possivel remover o pagamento: ${error.message}`)
      return
    }

    setFinanceActionStatus('Pagamento removido.')
    setBusinessPayments((current) => current.filter((payment) => payment.id !== paymentId))
    setOperationalRefreshKey((key) => key + 1)
  }

  function requestPaymentDelete(payment: BusinessPayment) {
    setConfirmDialog({
      title: 'Remover pagamento?',
      message: `O registro de ${formatPrice(payment.paid_amount_cents)} para ${payment.client_name} sera removido do financeiro.`,
      confirmLabel: 'Remover pagamento',
      tone: 'danger',
      onConfirm: () => void handleDeleteBusinessPayment(payment.id),
    })
  }

  async function handleCreateProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const client = supabase
    const stockQuantity = parseDecimalDraft(newProduct.stockQuantity)
    const minimumStock = parseDecimalDraft(newProduct.minimumStock)
    const costCents = parsePriceDraft(newProduct.costCents)
    const salePriceCents = parsePriceDraft(newProduct.salePriceCents)

    if (!client || !isAdmin || !session) {
      return
    }

    if (!newProduct.name.trim() || !newProduct.category.trim()) {
      setProductActionStatus('Informe nome e categoria do produto.')
      return
    }

    if (
      stockQuantity === undefined ||
      minimumStock === undefined ||
      costCents === undefined ||
      salePriceCents === undefined
    ) {
      setProductActionStatus('Revise estoque, minimo e valores em reais.')
      return
    }

    setSavingProduct(true)
    setProductActionStatus('')
    const { error } = await client.from('products').insert({
      name: newProduct.name.trim(),
      category: newProduct.category.trim(),
      stock_quantity: stockQuantity ?? 0,
      unit: newProduct.unit.trim() || 'un',
      cost_cents: costCents,
      sale_price_cents: salePriceCents,
      minimum_stock: minimumStock ?? 0,
      notes: newProduct.notes.trim() || null,
      created_by: session.user.id,
    })
    setSavingProduct(false)

    if (error) {
      setProductActionStatus(`Nao foi possivel cadastrar o produto: ${error.message}`)
      return
    }

    setProductActionStatus('Produto cadastrado.')
    setNewProduct(createEmptyProductDraft())
    setOperationalRefreshKey((key) => key + 1)
  }

  async function handleCreateStockMovement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const client = supabase
    const product = products.find((item) => item.id === newStockMovement.productId)
    const quantityDelta = parseDecimalDraft(newStockMovement.quantityDelta)
    const unitCostCents = parsePriceDraft(newStockMovement.unitCostCents)
    const salePriceCents = parsePriceDraft(newStockMovement.salePriceCents)
    const relatedBooking = bookings.find((item) => item.id === newStockMovement.bookingId)
    const relatedClient = relatedBooking ? clientProfilesByEmail[relatedBooking.client_email.toLowerCase()] : null

    if (!client || !isAdmin || !session) {
      return
    }

    if (!product || quantityDelta === undefined || quantityDelta === null || quantityDelta === 0) {
      setProductActionStatus('Escolha produto e quantidade para movimentar o estoque.')
      return
    }

    if (unitCostCents === undefined || salePriceCents === undefined) {
      setProductActionStatus('Revise os valores em reais ou deixe em branco.')
      return
    }

    setSavingStockMovement(true)
    setProductActionStatus('')
    const { error } = await client.from('stock_movements').insert({
      product_id: product.id,
      movement_type: newStockMovement.movementType,
      quantity_delta: quantityDelta,
      unit_cost_cents: unitCostCents,
      sale_price_cents: salePriceCents,
      booking_id: relatedBooking?.id ?? null,
      client_id: relatedClient?.id ?? null,
      notes: newStockMovement.notes.trim() || null,
      created_by: session.user.id,
    })
    setSavingStockMovement(false)

    if (error) {
      setProductActionStatus(`Nao foi possivel movimentar o estoque: ${error.message}`)
      return
    }

    setProductActionStatus('Movimentacao registrada.')
    setNewStockMovement(createEmptyStockMovementDraft(product.id))
    setOperationalRefreshKey((key) => key + 1)
  }

  async function handleDeleteProduct(productId: string) {
    const client = supabase

    if (!client || !isAdmin) {
      return
    }

    setProductActionStatus('')
    const { error } = await client.from('products').delete().eq('id', productId)

    if (error) {
      setProductActionStatus(`Nao foi possivel excluir o produto: ${error.message}`)
      return
    }

    setProductActionStatus('Produto removido.')
    setProducts((current) => current.filter((product) => product.id !== productId))
    setOperationalRefreshKey((key) => key + 1)
  }

  function requestProductDelete(product: ProductRecord) {
    setConfirmDialog({
      title: 'Excluir produto do estoque?',
      message: `${product.name} sera removido da lista. Use apenas para cadastro feito por engano.`,
      confirmLabel: 'Excluir produto',
      tone: 'danger',
      onConfirm: () => void handleDeleteProduct(product.id),
    })
  }

  async function handleInternalNoteCreate(event: FormEvent<HTMLFormElement>, bookingId: string) {
    event.preventDefault()
    const client = supabase
    const note = noteDrafts[bookingId]?.trim() ?? ''

    if (!client || !isAdmin || !session || note.length < 2) {
      setBookingActionStatus('Escreva uma nota interna antes de salvar.')
      return
    }

    setUpdatingBookingId(bookingId)
    setBookingActionStatus('')
    const { error } = await client.from('booking_internal_notes').insert({
      booking_id: bookingId,
      admin_user_id: session.user.id,
      note,
    })
    setUpdatingBookingId('')

    if (error) {
      setBookingActionStatus(`Nao foi possivel salvar a nota: ${error.message}`)
      return
    }

    setNoteDrafts((current) => ({ ...current, [bookingId]: '' }))
    setBookingActionStatus('Nota interna salva.')
    setOperationalRefreshKey((key) => key + 1)
  }

  async function handleNotificationStatusChange(item: BookingNotificationQueueItem, status: NotificationStatus) {
    const client = supabase

    if (!client || !isAdmin || !session) {
      return
    }

    setUpdatingQueueId(item.id)
    const now = new Date().toISOString()
    const { error } = await client
      .from('booking_notification_queue')
      .update({
        status,
        done_by: status === 'done' ? session.user.id : null,
        done_at: status === 'done' ? now : null,
        updated_at: now,
      })
      .eq('id', item.id)
    setUpdatingQueueId('')

    if (error) {
      setBookingActionStatus(`Nao foi possivel atualizar a fila: ${error.message}`)
      return
    }

    setNotificationQueue((current) =>
      current.map((queueItem) =>
        queueItem.id === item.id
          ? { ...queueItem, status, done_at: status === 'done' ? now : null }
          : queueItem,
      ),
    )
    setBookingActionStatus('Fila atualizada.')
  }

  async function handleCopyNotification(message: string) {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(message)
      setBookingActionStatus('Mensagem copiada.')
      return
    }

    window.prompt('Copie a mensagem:', message)
  }

  function handleCustomerTabKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>) {
    handleTabListKeyDown(
      event,
      customerPanelTabs,
      customerPanelTab,
      setCustomerPanelTab,
      (tab) => `customer-tab-${tab}`,
    )
  }

  function handleAdminTabKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>) {
    handleTabListKeyDown(
      event,
      adminPanelTabs,
      adminPanelTab,
      goToAdminTab,
      (tab) => `admin-tab-${tab}`,
    )
  }

  function renderTopbar() {
    return (
      <nav className="topbar" aria-label="Navegacao principal">
        <button type="button" className="brand brand-button" onClick={() => goHome()} aria-label="Hellen Martins Brows">
          <img src={brandLogo} alt="" className="brand-logo" />
          <strong>Hellen Martins Brows</strong>
        </button>
        <div className="nav-links">
          <button type="button" onClick={() => goToPath('/servicos')}>
            Servicos
          </button>
          <button type="button" onClick={() => (session ? goToPath('/agendamento') : goToAuth('sign-in', 'cliente'))}>
            Agendamento
          </button>
          {session ? (
            <button type="button" onClick={() => goToPath(isAdmin ? '/admin' : '/cliente')}>
              {isAdmin ? 'Admin' : 'Cliente'}
            </button>
          ) : null}
          <a href={instagramUrl} target="_blank" rel="noreferrer">
            {instagramHandle}
          </a>
        </div>
        <div className="header-auth" aria-label="Acesso da cliente">
          {session ? (
            <>
              <button type="button" className="header-signin" onClick={() => goToPath(isAdmin ? '/admin' : '/cliente')}>
                {isAdmin ? 'Painel admin' : 'Minha agenda'}
              </button>
              <button type="button" className="header-logout" onClick={handleSignOut}>
                Sair
              </button>
            </>
          ) : (
            <>
              <button type="button" className="header-signin" onClick={() => goToAuth('sign-in')}>
                Entrar
              </button>
              <button type="button" className="header-signup" onClick={() => goToAuth('sign-up')}>
                Criar conta
              </button>
            </>
          )}
        </div>
      </nav>
    )
  }

  function renderBookingSection() {
    return (
      <section className="booking-section" id="agenda">
        <div className="booking-intro">
          <p className="eyebrow">Agendamento</p>
          <h2>Escolha uma data e veja os horarios disponiveis.</h2>
          <p>
            Seus dados, historico e pedidos de horario ficam em um espaco reservado, separado da
            vitrine publica.
          </p>
          <div className="contact-stack">
            <span>
              <Camera size={17} aria-hidden="true" /> {instagramHandle}
            </span>
            <span>
              <MapPin size={17} aria-hidden="true" /> Atendimento de segunda a sexta
            </span>
            <span>
              <Mail size={17} aria-hidden="true" /> Confirmacao por email
            </span>
          </div>
        </div>

        {session ? (
          <form className="booking-form" onSubmit={handleBookingSubmit}>
            <div className="booking-flow-card" aria-label="Como funciona o agendamento">
              <div>
                <span>1</span>
                <strong>Escolha o servico</strong>
                <small>Veja preco e duracao antes de marcar.</small>
              </div>
              <div>
                <span>2</span>
                <strong>Escolha data e horario</strong>
                <small>Os dias sem agenda e horarios ocupados ficam bloqueados.</small>
              </div>
              <div>
                <span>3</span>
                <strong>Confirme seus dados</strong>
                <small>A Hellen usa WhatsApp ou email para confirmar.</small>
              </div>
            </div>
            <section className="booking-step-section" aria-labelledby="booking-service-heading">
              <div className="booking-step-heading">
                <span>Passo 1</span>
                <h3 id="booking-service-heading">Escolha o servico.</h3>
                <p>Comece pelo atendimento desejado para conferir valor e tempo estimado.</p>
              </div>
              <div className="service-choice-grid" role="radiogroup" aria-label="Servicos disponiveis">
                {bookableServices.map((service) => {
                  const isSelected = selectedService.id === service.id

                  return (
                    <button
                      type="button"
                      className={isSelected ? 'service-choice-card selected' : 'service-choice-card'}
                      key={service.id}
                      aria-checked={isSelected}
                      role="radio"
                      onClick={() => setBooking({ ...booking, serviceId: service.id })}
                    >
                      <span className="service-card-media">
                        <span className="service-card-fallback" aria-hidden="true">HB</span>
                        <img
                          src={getServiceCoverUrl(service)}
                          alt={`Exemplo visual de ${service.name}`}
                          loading="lazy"
                          onError={(event) => {
                            event.currentTarget.hidden = true
                          }}
                        />
                      </span>
                      <span className="service-choice-copy">
                        <small>{service.eyebrow}</small>
                        <strong>{service.name}</strong>
                        <em>
                          {formatPrice(service.priceCents)} - {service.durationMinutes} min
                        </em>
                        <span>{service.description}</span>
                      </span>
                    </button>
                  )
                })}
              </div>
            </section>
            <section className="booking-step-section" aria-labelledby="booking-slot-heading">
              <div className="booking-step-heading">
                <span>Passo 2</span>
                <h3 id="booking-slot-heading">Escolha data e horario.</h3>
                <p id="booking-calendar-help">Use o calendario para escolher um dia aberto. Depois selecione um horario disponivel.</p>
              </div>
              <div className="calendar-shell">
              <div className="digital-calendar" aria-describedby="booking-calendar-help" aria-label="Calendario de disponibilidade">
                <div className="calendar-toolbar">
                  <button
                    type="button"
                    aria-label={`Mostrar ${getMonthLabel(addMonths(calendarMonth, -1))}`}
                    onClick={() => setCalendarMonth(addMonths(calendarMonth, -1))}
                  >
                    Mes anterior
                  </button>
                  <strong aria-live="polite">{getMonthLabel(calendarMonth)}</strong>
                  <button
                    type="button"
                    aria-label={`Mostrar ${getMonthLabel(addMonths(calendarMonth, 1))}`}
                    onClick={() => setCalendarMonth(addMonths(calendarMonth, 1))}
                  >
                    Proximo mes
                  </button>
                </div>
                <div className="calendar-weekdays" aria-hidden="true">
                  {weekdayLabels.map((day) => (
                    <span key={day}>{day}</span>
                  ))}
                </div>
                <div className="calendar-grid" role="group" aria-label="Dias do mes">
                  {calendarDays.map((day) => {
                    const isUnavailable = unavailableDateSet.has(day.date)
                    const isSelected = booking.preferredDate === day.date
                    const dayHasSlots = getAvailabilitySlotsForDate(day.date).some(
                      (slot) => !isSlotInPast(day.date, slot.start_time, currentBusinessDateTime),
                    )
                    const isClosedByTime = day.date <= currentBusinessDateTime.date && !dayHasSlots
                    const isDisabled = !day.isCurrentMonth || day.isPast || isUnavailable || !dayHasSlots
                    const dayBookings = isAdmin
                      ? bookings.filter(
                          (item) =>
                            item.preferred_date === day.date && isActiveBookingStatus(item.status),
                        ).length
                      : 0

                    const dayStatus = day.isPast
                      ? 'Encerrado'
                      : isClosedByTime
                        ? 'Encerrado'
                        : isUnavailable
                          ? 'Bloqueado'
                          : !dayHasSlots
                            ? 'Sem horarios'
                            : dayBookings
                              ? `${dayBookings} horario(s) ocupado(s)`
                              : 'Aberto'

                    return (
                      <button
                        type="button"
                        key={day.date}
                        className={isSelected ? 'calendar-day selected' : 'calendar-day'}
                        aria-current={day.date === currentBusinessDateTime.date ? 'date' : undefined}
                        aria-label={getCalendarDayLabel(day.date, dayStatus, isSelected)}
                        aria-pressed={isSelected}
                        disabled={isDisabled}
                        onClick={() =>
                          setBooking({ ...booking, preferredDate: day.date, preferredTime: '', preferredEndTime: '' })
                        }
                      >
                        <strong>{day.dayNumber}</strong>
                        <span>
                          {dayStatus}
                        </span>
                      </button>
                    )
                  })}
                </div>
                <p aria-live="polite">
                  Data selecionada: <strong>{formatFullDate(booking.preferredDate)}</strong>
                </p>
              </div>
              <div className="slot-picker" role="radiogroup" aria-label={`Horarios disponiveis em ${formatFullDate(booking.preferredDate)}`}>
                {selectedDateAvailabilitySlots.length ? (
                  selectedDateAvailabilitySlots.map((slot) => {
                    const slotKey = getSlotKey(slot.start_time, slot.end_time)
                    const isBooked = bookedSlotSet.has(slotKey)
                    const isSelected = selectedSlotKey === slotKey
                    const isClosed = isSlotInPast(booking.preferredDate, slot.start_time, currentBusinessDateTime)

                    const slotStatus = isClosed
                      ? 'Encerrado'
                      : selectedDateIsUnavailable
                        ? 'Indisponivel'
                        : isBooked
                          ? 'Ocupado'
                          : 'Disponivel'

                    return (
                      <button
                        type="button"
                        key={slot.id}
                        className={isSelected ? 'slot-button selected' : 'slot-button'}
                        aria-checked={isSelected}
                        aria-label={`${formatTimeRange(slot.start_time, slot.end_time)}. ${slotStatus}.`}
                        disabled={isClosed || isBooked || selectedDateIsUnavailable}
                        role="radio"
                        onClick={() =>
                          setBooking({
                            ...booking,
                            preferredTime: timeLabel(slot.start_time),
                            preferredEndTime: timeLabel(slot.end_time),
                          })
                        }
                      >
                        <strong>{formatTimeRange(slot.start_time, slot.end_time)}</strong>
                        <span>
                          {slotStatus}
                        </span>
                      </button>
                    )
                  })
                ) : (
                  <p className="empty-state">Nenhum horario liberado para este dia.</p>
                )}
              </div>
            </div>
            </section>
            <section className="booking-step-section" aria-labelledby="booking-contact-heading">
              <div className="booking-step-heading">
                <span>Passo 3</span>
                <h3 id="booking-contact-heading">Confirme seus dados.</h3>
                <p>Essas informacoes ficam salvas para acompanhar historico e confirmacoes.</p>
              </div>
              <label>
                Nome completo
                <input
                  required
                  minLength={2}
                  value={booking.name}
                  onChange={(event) => setBooking({ ...booking, name: event.target.value })}
                  placeholder="Como devemos te chamar?"
                />
              </label>
              <div className="form-row">
                <label>
                  Email da conta
                  <input readOnly value={bookingEmail} aria-describedby="booking-email-help" />
                  <small id="booking-email-help">Usado para recuperar acesso e registrar seu historico.</small>
                </label>
                <label>
                  WhatsApp
                  <input
                    required
                    inputMode="tel"
                    value={booking.phone}
                    onChange={(event) => setBooking({ ...booking, phone: event.target.value })}
                    placeholder="(00) 00000-0000"
                  />
                </label>
              </div>
              <label>
                Observacoes
                <textarea
                  rows={4}
                  value={booking.notes}
                  onChange={(event) => setBooking({ ...booking, notes: event.target.value })}
                  placeholder="Conte se e sua primeira vez, se tem alergias ou objetivo especifico."
                />
              </label>
            </section>
            <div className="booking-confirmation-card" aria-label="Resumo do agendamento">
              <div>
                <p className="eyebrow">Resumo</p>
                <strong>{selectedService.name}</strong>
                <span>
                  {formatFullDate(booking.preferredDate)}
                  {booking.preferredTime && booking.preferredEndTime
                    ? `, das ${formatTimeRange(booking.preferredTime, booking.preferredEndTime)}`
                    : ', escolha um horario'}
                </span>
                <small>{formatPrice(selectedService.priceCents)} - {selectedService.durationMinutes} min</small>
                {depositRequired ? (
                  <small className="deposit-summary">
                    Sinal para reservar: <strong>{formatPrice(depositAmountCents)}</strong>. Restante combinado no atendimento.
                  </small>
                ) : null}
                <em>
                  {depositRequired
                    ? 'O horario so fica reservado depois do pagamento do sinal.'
                    : bookingPolicy?.auto_confirm_enabled
                      ? 'Confirmacao automatica ativa.'
                      : 'A Hellen confirma por WhatsApp ou email.'}
                </em>
              </div>
              <label className="policy-check">
                <input
                  type="checkbox"
                  checked={policyAccepted}
                  onChange={(event) => setPolicyAccepted(event.target.checked)}
                />
                <span>
                  Li e aceito a politica de cancelamento e remarcacao.
                  <small>
                    {bookingPolicy?.policy_text ?? defaultPolicyText}
                  </small>
                </span>
              </label>
            </div>
            <div className="form-actions">
              <button
                type="submit"
                disabled={
                  isSubmittingBooking ||
                  !bookableServices.length ||
                  selectedSlotIsBooked ||
                  !selectedSlotIsAvailable ||
                  !availableSlots.length ||
                  !hasBookingContact ||
                  !policyAccepted
                }
              >
                {bookingSubmitLabel}
              </button>
            </div>
            <p className="form-status" role="status" aria-live="polite">
              {bookingGuidance}
            </p>
          </form>
        ) : (
          <div className="booking-gate">
            <LockKeyhole size={28} aria-hidden="true" />
            <h3>Entre para escolher um horario.</h3>
            <p>A agenda com datas e horarios fica disponivel depois do login.</p>
            <div className="form-actions">
              <button type="button" onClick={() => goToAuth('sign-in', 'cliente')}>
                Entrar para agendar
              </button>
            </div>
          </div>
        )}
      </section>
    )
  }

  function renderCustomerSection() {
    return (
      <section className="client-section" id="cliente">
        <div className="client-card">
          <div>
            <p className="eyebrow">Area da cliente</p>
            <h2>Acompanhe seus horarios com tranquilidade.</h2>
            <p>
              Veja seus pedidos, acompanhe confirmacoes e mantenha seus dados organizados para os
              proximos atendimentos.
            </p>
          </div>

          {session ? (
            <div className="session-box">
              <LockKeyhole size={22} aria-hidden="true" />
              <span>Logado como</span>
              <strong>{session.user.email}</strong>
              <small>Acesso de cliente ativo</small>
              <button type="button" onClick={handleSignOut}>
                Sair
              </button>
            </div>
          ) : null}
        </div>

        {session ? (
          <div className="booking-list" aria-live="polite">
            <div className="section-heading compact">
              <p className="eyebrow">Pedidos recentes</p>
              <h2>Minha agenda</h2>
            </div>
            {customerBookings.length ? (
              <div className="booking-items">
                {customerBookings.map((item) => {
                  const draft = rescheduleDrafts[item.id] ?? {
                    preferredDate: item.preferred_date,
                    preferredTime: timeLabel(item.preferred_time),
                    preferredEndTime: timeLabel(item.preferred_end_time),
                    reason: '',
                  }
                  const draftSlotValue =
                    draft.preferredTime && draft.preferredEndTime
                      ? getSlotKey(draft.preferredTime, draft.preferredEndTime)
                      : ''
                  const draftSlots = getAvailabilitySlotsForDate(draft.preferredDate).filter(
                    (slot) => !isSlotInPast(draft.preferredDate, slot.start_time, currentBusinessDateTime),
                  )
                  const canCancelBooking = isActiveBookingStatus(item.status)
                  const canRescheduleBooking = item.status === 'pending' || item.status === 'confirmed'
                  const bookingEvents = eventsByBooking[item.id] ?? []
                  const payment = paymentsByBooking[item.id]

                  return (
                    <article key={item.id} className="customer-booking-card">
                      <time dateTime={item.preferred_date}>{formatDate(item.preferred_date)}</time>
                      <div className="customer-booking-main">
                        <strong>{item.client_name}</strong>
                        <span>
                          {item.service_name} as {formatTimeRange(item.preferred_time, item.preferred_end_time)}
                        </span>
                        {item.cancellation_reason ? <small>Motivo: {item.cancellation_reason}</small> : null}
                      </div>
                      <small className={getStatusTone(item.status)}>{statusLabels[item.status]}</small>
                      {payment ? (
                        <small className={`payment-pill payment-${payment.status}`}>
                          {paymentStatusLabels[payment.status]} - {formatPrice(payment.amount_cents)}
                        </small>
                      ) : null}
                      {item.status === 'awaiting_deposit' ? (
                        <button
                          type="button"
                          className="pay-deposit-button"
                          disabled={payingBookingId === item.id}
                          onClick={() => void openDepositCheckout(item.id, setCustomerActionStatus)}
                        >
                          {payingBookingId === item.id ? 'Abrindo pagamento...' : 'Pagar sinal'}
                        </button>
                      ) : null}
                      {canCancelBooking ? (
                        <div className="customer-actions">
                          {canRescheduleBooking ? (
                            <div className="reschedule-controls customer-reschedule-controls">
                              <label>
                                Nova data
                                <input
                                  type="date"
                                  min={currentBusinessDateTime.date}
                                  value={draft.preferredDate}
                                  onChange={(event) =>
                                    updateRescheduleDraft(item.id, {
                                      preferredDate: event.target.value,
                                      preferredTime: '',
                                      preferredEndTime: '',
                                    })
                                  }
                                />
                              </label>
                              <label>
                                Horario
                                <select
                                  value={draftSlotValue}
                                  onChange={(event) => {
                                    const [preferredTime, preferredEndTime] = event.target.value.split('-')
                                    updateRescheduleDraft(item.id, { preferredTime, preferredEndTime })
                                  }}
                                >
                                  <option value="">Selecione</option>
                                  {draftSlots.map((slot) => (
                                    <option key={slot.id} value={getSlotKey(slot.start_time, slot.end_time)}>
                                      {formatTimeRange(slot.start_time, slot.end_time)}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              <label>
                                Motivo
                                <input
                                  value={draft.reason}
                                  onChange={(event) => updateRescheduleDraft(item.id, { reason: event.target.value })}
                                  placeholder="Opcional"
                                />
                              </label>
                              <button
                                type="button"
                                disabled={updatingBookingId === item.id}
                                onClick={() => void handleCustomerReschedule(item)}
                              >
                                Remarcar
                              </button>
                            </div>
                          ) : null}
                          <div className="cancel-controls">
                            <input
                              value={cancelReasonDrafts[item.id] ?? ''}
                              onChange={(event) =>
                                setCancelReasonDrafts((current) => ({ ...current, [item.id]: event.target.value }))
                              }
                              placeholder="Motivo do cancelamento (opcional)"
                            />
                            <button
                              type="button"
                              className="danger-action"
                              disabled={updatingBookingId === item.id}
                              onClick={() => requestCustomerCancel(item)}
                            >
                              Cancelar horario
                            </button>
                          </div>
                        </div>
                      ) : null}
                      {bookingEvents.length ? (
                        <div className="booking-timeline">
                          {bookingEvents.slice(0, 3).map((event) => (
                            <span key={event.id}>
                              {formatDateTime(event.created_at)} - {event.reason ?? statusLabels[event.to_status]}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </article>
                  )
                })}
              </div>
            ) : (
              <p className="empty-state">
                Nenhum agendamento para esta conta ainda. Escolha um horario acima e acompanhe o
                status aqui.
              </p>
            )}
            <p className="form-status" role="status" aria-live="polite">
              {customerActionStatus}
            </p>
          </div>
        ) : null}
      </section>
    )
  }

  function renderAdminSection() {
    if (!session || !isAdmin) {
      return (
        <section className="client-section private-access-section">
          <div className="booking-gate">
            <LockKeyhole size={28} aria-hidden="true" />
            <h3>Acesso administrativo restrito.</h3>
            <p>Entre com a conta autorizada da Hellen para visualizar o painel.</p>
            <div className="form-actions">
              <button type="button" onClick={() => goToAuth('sign-in', 'admin')}>
                Entrar como admin
              </button>
            </div>
          </div>
        </section>
      )
    }

    return (
      <section className="client-section admin-page-section">
        <div className="admin-panel" aria-live="polite">
          <div className="admin-heading">
            <div>
              <p className="eyebrow">{adminRouteTitles[adminPanelTab].eyebrow}</p>
              <h2>{adminRouteTitles[adminPanelTab].title}</h2>
              <p>{adminRouteTitles[adminPanelTab].description}</p>
            </div>
            <span className="admin-badge">
              <UserCheck size={16} aria-hidden="true" /> Admin ativo
            </span>
          </div>

          <div className="workspace-shell admin-workspace" aria-label="Navegacao do painel admin">
            <aside
              className="workspace-sidebar"
              role="tablist"
              aria-label="Secoes do painel admin"
              aria-orientation="vertical"
            >
              <span role="presentation">Funcionalidades</span>
              {adminPanelTabs.map((tab) => {
                const Icon = {
                  overview: LayoutDashboard,
                  agenda: CalendarDays,
                  bookings: CalendarCheck,
                  clients: Users,
                  whatsapp: MessageCircle,
                  services: Sparkles,
                  payments: Wallet,
                  products: Boxes,
                  reports: BarChart3,
                  settings: Settings,
                }[tab]

                return (
                  <button
                    type="button"
                    id={`admin-tab-${tab}`}
                    role="tab"
                    key={tab}
                    className={adminPanelTab === tab ? 'active' : ''}
                    aria-controls="admin-workspace-panel"
                    aria-selected={adminPanelTab === tab}
                    onKeyDown={handleAdminTabKeyDown}
                    onClick={() => goToAdminTab(tab)}
                  >
                    <Icon size={16} aria-hidden="true" />
                    {adminRouteTitles[tab].eyebrow}
                  </button>
                )
              })}
            </aside>
            <div
              className="workspace-content"
              id="admin-workspace-panel"
              role="tabpanel"
              aria-labelledby={`admin-tab-${adminPanelTab}`}
              tabIndex={0}
            >

          {adminPanelTab === 'overview' ? (
            <>
          <div className="admin-stats" aria-label="Resumo de status">
            {bookingStats.map((item) => (
              <article key={item.status}>
                <span>{statusLabels[item.status]}</span>
                <strong>{item.count}</strong>
              </article>
            ))}
          </div>

          <div className="admin-reports" aria-label="Relatorios simples">
            <article>
              <span>Agendamentos hoje</span>
              <strong>{todayActiveBookings.length}</strong>
            </article>
            <article>
              <span>Clientes cadastradas</span>
              <strong>{clientDirectory.length}</strong>
            </article>
            <article>
              <span>Faturamento do dia</span>
              <strong>{formatPrice(todayRevenueCents)}</strong>
            </article>
            <article>
              <span>Faturamento da semana</span>
              <strong>{formatPrice(weekRevenueCents)}</strong>
            </article>
            <article>
              <span>Faturamento do mes</span>
              <strong>{formatPrice(monthRevenueCents || estimatedRevenueCents)}</strong>
            </article>
            <article>
              <span>Pagamentos pendentes</span>
              <strong>{pendingBusinessPaymentCount}</strong>
            </article>
            <article>
              <span>Estoque baixo</span>
              <strong>{lowStockProducts.length}</strong>
            </article>
            <article>
              <span>Confirmados futuros</span>
              <strong>{upcomingConfirmedCount}</strong>
            </article>
          </div>

          <div className="admin-priority-strip" aria-label="Atalhos operacionais">
            <article>
              <span>Hoje</span>
              <strong>{todayActiveBookings.length}</strong>
              <small>horario(s) ativo(s)</small>
              <button
                type="button"
                onClick={() => {
                  setAdminSelectedDate(currentBusinessDateTime.date)
                  goToAdminTab('agenda')
                }}
              >
                Ver agenda de hoje
              </button>
            </article>
            <article>
              <span>Pedidos para confirmar</span>
              <strong>{pendingBookingCount}</strong>
              <small>aguardando decisao</small>
              <button
                type="button"
                onClick={() => {
                  setAdminStatusFilter('pending')
                  goToAdminTab('bookings')
                }}
              >
                Filtrar pendentes
              </button>
            </article>
            <article>
              <span>WhatsApp manual</span>
              <strong>{pendingNotificationCount}</strong>
              <small>mensagem(ns) na fila</small>
              <button type="button" onClick={() => goToAdminTab('whatsapp')}>
                Abrir fila
              </button>
            </article>
            <article>
              <span>Financeiro</span>
              <strong>{formatPrice(estimatedRevenueCents)}</strong>
              <small>receita registrada</small>
              <button type="button" onClick={() => goToAdminTab('payments')}>
                Registrar pagamento
              </button>
            </article>
            <article>
              <span>Produtos</span>
              <strong>{lowStockProducts.length}</strong>
              <small>item(ns) com estoque baixo</small>
              <button type="button" onClick={() => goToAdminTab('products')}>
                Ver estoque
              </button>
            </article>
          </div>
            </>
          ) : null}

          {adminPanelTab === 'settings' ? (
          <section className="policy-manager" id="admin-politica" aria-label="Politica de agendamento">
            <div className="admin-heading compact">
              <div>
                <p className="eyebrow">Politica</p>
                <h2>Prazos de cancelamento e remarcacao.</h2>
              </div>
            </div>
            <form className="policy-form" onSubmit={handlePolicySave}>
              <label>
                Cancelamento ate
                <input
                  inputMode="numeric"
                  value={policyDraft.cancellationCutoffHours}
                  onChange={(event) => setPolicyDraft({ ...policyDraft, cancellationCutoffHours: event.target.value })}
                />
                <small>horas antes</small>
              </label>
              <label>
                Remarcacao ate
                <input
                  inputMode="numeric"
                  value={policyDraft.rescheduleCutoffHours}
                  onChange={(event) => setPolicyDraft({ ...policyDraft, rescheduleCutoffHours: event.target.value })}
                />
                <small>horas antes</small>
              </label>
              <label>
                Tolerancia falta
                <input
                  inputMode="numeric"
                  value={policyDraft.noShowGraceMinutes}
                  onChange={(event) => setPolicyDraft({ ...policyDraft, noShowGraceMinutes: event.target.value })}
                />
                <small>minutos</small>
              </label>
              <label className="toggle-label policy-toggle">
                <input
                  type="checkbox"
                  checked={policyDraft.autoConfirmEnabled}
                  onChange={(event) => setPolicyDraft({ ...policyDraft, autoConfirmEnabled: event.target.checked })}
                />
                Confirmar novos horarios automaticamente
              </label>
              <label className="toggle-label policy-toggle">
                <input
                  type="checkbox"
                  checked={policyDraft.depositRequired}
                  onChange={(event) => setPolicyDraft({ ...policyDraft, depositRequired: event.target.checked })}
                />
                Cobrar sinal para reservar
              </label>
              <label>
                Valor do sinal
                <input
                  inputMode="decimal"
                  value={policyDraft.depositAmountCents}
                  onChange={(event) => setPolicyDraft({ ...policyDraft, depositAmountCents: event.target.value })}
                  placeholder="20,00"
                />
                <small>valor cobrado no checkout</small>
              </label>
              <label>
                Expira em
                <input
                  inputMode="numeric"
                  value={policyDraft.depositCheckoutExpirationMinutes}
                  onChange={(event) =>
                    setPolicyDraft({ ...policyDraft, depositCheckoutExpirationMinutes: event.target.value })
                  }
                />
                <small>minutos para pagar</small>
              </label>
              <label className="wide-field">
                Texto exibido para cliente
                <textarea
                  rows={3}
                  value={policyDraft.policyText}
                  onChange={(event) => setPolicyDraft({ ...policyDraft, policyText: event.target.value })}
                />
              </label>
              <button type="submit">Salvar politica</button>
            </form>
            <p className="form-status" role="status">
              {policyActionStatus}
            </p>
          </section>
          ) : null}

          {adminPanelTab === 'agenda' ? (
          <div className="admin-ops-grid">
            <section className="admin-agenda-card" id="admin-agenda" aria-label="Agenda do mes">
              <div className="admin-heading compact">
                <div>
                  <p className="eyebrow">Agenda</p>
                  <h2>Calendario operacional.</h2>
                  <p id="admin-calendar-help">Escolha um dia para ver os horarios ativos, bloqueios e clientes marcados.</p>
                </div>
              </div>
              <div className="digital-calendar compact-calendar" aria-describedby="admin-calendar-help" aria-label="Calendario operacional">
                <div className="calendar-toolbar">
                  <button
                    type="button"
                    aria-label={`Mostrar ${getMonthLabel(addMonths(calendarMonth, -1))}`}
                    onClick={() => setCalendarMonth(addMonths(calendarMonth, -1))}
                  >
                    Mes anterior
                  </button>
                  <strong aria-live="polite">{getMonthLabel(calendarMonth)}</strong>
                  <button
                    type="button"
                    aria-label={`Mostrar ${getMonthLabel(addMonths(calendarMonth, 1))}`}
                    onClick={() => setCalendarMonth(addMonths(calendarMonth, 1))}
                  >
                    Proximo mes
                  </button>
                </div>
                <div className="calendar-weekdays" aria-hidden="true">
                  {weekdayLabels.map((day) => (
                    <span key={day}>{day}</span>
                  ))}
                </div>
                <div className="calendar-grid" role="group" aria-label="Dias do mes no painel admin">
                  {calendarDays.map((day) => {
                    const isUnavailable = unavailableDateSet.has(day.date)
                    const isSelected = adminSelectedDate === day.date
                    const dayHasSlots = getAvailabilitySlotsForDate(day.date).length > 0
                    const dayBookings = bookings.filter(
                      (item) => item.preferred_date === day.date && isActiveBookingStatus(item.status),
                    ).length
                    const dayStatus = day.isPast
                      ? 'Encerrado'
                      : isUnavailable
                        ? 'Bloqueado'
                        : !dayHasSlots
                          ? 'Sem horarios'
                          : dayBookings
                            ? `${dayBookings} horario(s) ativo(s)`
                            : 'Livre'

                    return (
                      <button
                        type="button"
                        key={day.date}
                        className={isSelected ? 'calendar-day selected' : 'calendar-day'}
                        aria-current={day.date === currentBusinessDateTime.date ? 'date' : undefined}
                        aria-label={getCalendarDayLabel(day.date, dayStatus, isSelected)}
                        aria-pressed={isSelected}
                        disabled={!day.isCurrentMonth || day.isPast}
                        onClick={() => setAdminSelectedDate(day.date)}
                      >
                        <strong>{day.dayNumber}</strong>
                        <span>
                          {dayStatus}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
              <div className="selected-day-agenda" aria-live="polite">
                <strong>{formatFullDate(adminSelectedDate)}</strong>
                {adminSelectedBookings.length ? (
                  adminSelectedBookings.map((item) => (
                    <span key={item.id}>
                      {formatTimeRange(item.preferred_time, item.preferred_end_time)} - {item.client_name} -{' '}
                      {item.service_name}
                    </span>
                  ))
                ) : (
                  <span>Nenhum cliente marcado neste dia.</span>
                )}
              </div>
            </section>

            <section className="unavailable-card" aria-label="Dias indisponiveis">
              <div className="admin-heading compact">
                <div>
                  <p className="eyebrow">Bloqueios</p>
                  <h2>Dias indisponiveis.</h2>
                </div>
              </div>
              <form className="unavailable-form" onSubmit={handleCreateUnavailableDay}>
                <label>
                  Data
                  <input
                    required
                    type="date"
                    min={currentBusinessDateTime.date}
                    value={unavailableDraft.date}
                    onChange={(event) => setUnavailableDraft({ ...unavailableDraft, date: event.target.value })}
                  />
                </label>
                <label>
                  Motivo
                  <input
                    value={unavailableDraft.reason}
                    onChange={(event) => setUnavailableDraft({ ...unavailableDraft, reason: event.target.value })}
                    placeholder="Ex: curso, viagem, feriado"
                  />
                </label>
                <button type="submit">Bloquear dia</button>
              </form>
              <p className="form-status" role="status">
                {unavailableActionStatus}
              </p>
              <div className="unavailable-list">
                {unavailableDays.length ? (
                  unavailableDays.map((day) => (
                    <article key={day.id}>
                      <span>
                        <strong>{formatFullDate(day.unavailable_date)}</strong>
                        {day.reason ? <small>{day.reason}</small> : <small>Sem motivo informado</small>}
                      </span>
                      <button type="button" onClick={() => void handleDeleteUnavailableDay(day.id)}>
                        Liberar
                      </button>
                    </article>
                  ))
                ) : (
                  <p className="empty-state">Nenhum bloqueio neste mes.</p>
                )}
              </div>
            </section>

            <section className="availability-card" aria-label="Horarios de atendimento">
              <div className="admin-heading compact">
                <div>
                  <p className="eyebrow">Horarios</p>
                  <h2>Periodos liberados.</h2>
                </div>
              </div>
              <form className="availability-form" onSubmit={handleCreateAvailabilitySlot}>
                <label>
                  Dia
                  <select
                    value={availabilityDraft.weekday}
                    onChange={(event) => setAvailabilityDraft({ ...availabilityDraft, weekday: event.target.value })}
                  >
                    {weekdayOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Inicio
                  <input
                    required
                    type="time"
                    value={availabilityDraft.startTime}
                    onChange={(event) => setAvailabilityDraft({ ...availabilityDraft, startTime: event.target.value })}
                  />
                </label>
                <label>
                  Fim
                  <input
                    required
                    type="time"
                    value={availabilityDraft.endTime}
                    onChange={(event) => setAvailabilityDraft({ ...availabilityDraft, endTime: event.target.value })}
                  />
                </label>
                <button type="submit" disabled={savingAvailabilityId === 'new'}>
                  Liberar horario
                </button>
              </form>
              <p className="form-status" role="status">
                {availabilityActionStatus}
              </p>
              <div className="availability-list">
                {availabilitySlots.length ? (
                  availabilitySlots.map((slot) => (
                    <article key={slot.id} className={!slot.active ? 'is-paused' : ''}>
                      <span>
                        <strong>{getWeekdayName(slot.weekday)}</strong>
                        <small>{formatTimeRange(slot.start_time, slot.end_time)}</small>
                      </span>
                      <label className="toggle-label">
                        <input
                          type="checkbox"
                          checked={slot.active}
                          disabled={savingAvailabilityId === slot.id}
                          onChange={(event) => void handleAvailabilitySlotActiveChange(slot, event.target.checked)}
                        />
                        Ativo
                      </label>
                      <button
                        type="button"
                        disabled={savingAvailabilityId === slot.id}
                        onClick={() => requestAvailabilitySlotDelete(slot)}
                      >
                        Remover
                      </button>
                    </article>
                  ))
                ) : (
                  <p className="empty-state">Nenhum horario liberado ainda.</p>
                )}
              </div>
            </section>
          </div>
          ) : null}

          {adminPanelTab === 'clients' ? (
          <section className="client-directory" id="admin-clientes" aria-label="Informacoes de clientes">
            <div className="admin-heading compact">
              <div>
                <p className="eyebrow">Clientes</p>
                <h2>{selectedClient ? 'Ficha completa da cliente.' : 'Informacoes, historico e preferencias.'}</h2>
              </div>
            </div>
            {selectedClient ? (
              <div className="client-detail-grid">
                <article className="client-profile-card">
                  <button type="button" className="text-button" onClick={() => goToAdminTab('clients')}>
                    Voltar para clientes
                  </button>
                  <strong>{selectedClient.name}</strong>
                  <span>{selectedClient.email}</span>
                  <span>{selectedClient.phone}</span>
                  <small>
                    {selectedClient.total} atendimento(s) - ultimo: {formatFullDate(selectedClient.lastDate)}
                  </small>
                </article>

                <form
                  className="client-profile-form"
                  onSubmit={(event) => {
                    event.preventDefault()
                    void handleClientProfileSave(selectedClient.email)
                  }}
                >
                  {(() => {
                    const draft =
                      clientProfileDrafts[selectedClient.email] ??
                      createClientProfileDraft(selectedClient.profile ?? null)

                    return (
                      <>
                        <label>
                          Nome completo
                          <input
                            value={draft.fullName || selectedClient.name}
                            onChange={(event) =>
                              updateClientProfileDraft(selectedClient.email, { fullName: event.target.value })
                            }
                          />
                        </label>
                        <label>
                          WhatsApp
                          <input
                            inputMode="tel"
                            value={draft.phone || selectedClient.phone}
                            onChange={(event) =>
                              updateClientProfileDraft(selectedClient.email, { phone: event.target.value })
                            }
                          />
                        </label>
                        <label>
                          Nascimento (opcional)
                          <input
                            type="date"
                            value={draft.birthDate}
                            onChange={(event) =>
                              updateClientProfileDraft(selectedClient.email, { birthDate: event.target.value })
                            }
                          />
                        </label>
                        <label>
                          Preferencias da cliente
                          <textarea
                            rows={3}
                            value={draft.preferences}
                            onChange={(event) =>
                              updateClientProfileDraft(selectedClient.email, { preferences: event.target.value })
                            }
                            placeholder="Formato preferido, cor, frequencia, estilo de acabamento"
                          />
                        </label>
                        <label>
                          Anotacoes profissionais
                          <textarea
                            rows={4}
                            value={draft.professionalNotes}
                            onChange={(event) =>
                              updateClientProfileDraft(selectedClient.email, { professionalNotes: event.target.value })
                            }
                            placeholder="Sensibilidade, alergias relatadas, henna preferida ou cuidados"
                          />
                        </label>
                        <button type="submit" disabled={savingClientEmail === selectedClient.email}>
                          <Save size={16} aria-hidden="true" /> Salvar ficha
                        </button>
                      </>
                    )
                  })()}
                </form>

                <div className="client-history-panel">
                  <h3>Historico de atendimentos</h3>
                  {selectedClientBookings.length ? (
                    selectedClientBookings.map((item) => (
                      <article key={item.id}>
                        <strong>{item.service_name}</strong>
                        <span>{formatFullDate(item.preferred_date)} - {formatTimeRange(item.preferred_time, item.preferred_end_time)}</span>
                        <small className={getStatusTone(item.status)}>{statusLabels[item.status]}</small>
                      </article>
                    ))
                  ) : (
                    <p className="empty-state">Nenhum atendimento registrado para esta cliente.</p>
                  )}
                </div>

                <div className="client-history-panel">
                  <h3>Historico de pagamentos</h3>
                  {selectedClientPayments.length ? (
                    selectedClientPayments.map((payment) => (
                      <article key={payment.id}>
                        <strong>{formatPrice(payment.paid_amount_cents)}</strong>
                        <span>{payment.service_name} - {businessPaymentMethodLabels[payment.payment_method]}</span>
                        <small>{businessPaymentStatusLabels[payment.status]}</small>
                      </article>
                    ))
                  ) : (
                    <p className="empty-state">Pagamentos aparecem aqui apos o primeiro registro financeiro.</p>
                  )}
                </div>
                <p className="form-status" role="status">{clientActionStatus}</p>
              </div>
            ) : (
              <>
                <div className="admin-controls single-control">
                  <label>
                    Busca
                    <input
                      value={clientSearch}
                      onChange={(event) => setClientSearch(event.target.value)}
                      placeholder="Nome, WhatsApp, email ou servico"
                    />
                  </label>
                </div>
                <div className="client-directory-grid">
                  {filteredClientDirectory.length ? (
                    filteredClientDirectory.map((client) => (
                      <article key={client.email}>
                        <strong>{client.name}</strong>
                        <span>{client.email}</span>
                        <span>{client.phone}</span>
                        <small>
                          {client.total} atendimento(s) - ultimo: {formatFullDate(client.lastDate)} - {client.lastService}
                        </small>
                        <small className={getStatusTone(client.lastStatus)}>{statusLabels[client.lastStatus]}</small>
                        <button type="button" onClick={() => goToPath(`/admin/clientes/${encodeURIComponent(client.email)}`)}>
                          Ver ficha
                        </button>
                      </article>
                    ))
                  ) : (
                    <p className="empty-state">Clientes aparecem aqui apos o primeiro agendamento.</p>
                  )}
                </div>
              </>
            )}
          </section>
          ) : null}

          {adminPanelTab === 'bookings' ? (
            <>
          <div className="admin-controls">
            <label>
              <span>
                <Filter size={15} aria-hidden="true" /> Status
              </span>
              <select
                value={adminStatusFilter}
                onChange={(event) => setAdminStatusFilter(event.target.value as AdminStatusFilter)}
              >
                <option value="all">Todos</option>
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {statusLabels[status]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Busca
              <input
                value={bookingSearch}
                onChange={(event) => setBookingSearch(event.target.value)}
                placeholder="Nome, email, telefone ou servico"
              />
            </label>
          </div>

          <p className="form-status" role="status">
            {bookingActionStatus}
          </p>

          {adminBookings.length ? (
            <div className="admin-booking-list">
              {adminBookings.map((item) => {
                const draft = rescheduleDrafts[item.id] ?? {
                  preferredDate: item.preferred_date,
                  preferredTime: timeLabel(item.preferred_time),
                  preferredEndTime: timeLabel(item.preferred_end_time),
                }
                const draftSlots = getAvailabilitySlotsForDate(draft.preferredDate).filter(
                  (slot) => !isSlotInPast(draft.preferredDate, slot.start_time, currentBusinessDateTime),
                )
                const draftSlotValue =
                  draft.preferredTime && draft.preferredEndTime ? getSlotKey(draft.preferredTime, draft.preferredEndTime) : ''
                const statusChoices = getAdminStatusOptions(item.status)
                const bookingNotes = notesByBooking[item.id] ?? []
                const bookingEvents = eventsByBooking[item.id] ?? []
                const payment = paymentsByBooking[item.id]

                return (
                  <article className="admin-booking-card" key={item.id}>
                  <time dateTime={item.preferred_date}>{formatFullDate(item.preferred_date)}</time>
                  <div className="admin-booking-main">
                    <div>
                      <strong>{item.client_name}</strong>
                      <span>
                        {item.service_name} as {formatTimeRange(item.preferred_time, item.preferred_end_time)}
                      </span>
                    </div>
                    <small className={getStatusTone(item.status)}>{statusLabels[item.status]}</small>
                    {payment ? (
                      <small className={`payment-pill payment-${payment.status}`}>
                        Sinal: {paymentStatusLabels[payment.status]} - {formatPrice(payment.amount_cents)}
                      </small>
                    ) : null}
                  </div>
                  <div className="admin-contact-grid">
                    <span>
                      <Mail size={14} aria-hidden="true" /> {item.client_email}
                    </span>
                    <span>
                      <Phone size={14} aria-hidden="true" /> {item.client_phone}
                    </span>
                    {item.notes ? <p>{item.notes}</p> : <p>Sem observacoes.</p>}
                  </div>
                  <div className="admin-booking-actions">
                    <div className="reschedule-controls">
                      <label>
                        Nova data
                        <input
                          type="date"
                          min={currentBusinessDateTime.date}
                          value={draft.preferredDate}
                          onChange={(event) =>
                            updateRescheduleDraft(item.id, {
                              preferredDate: event.target.value,
                              preferredTime: '',
                              preferredEndTime: '',
                            })
                          }
                        />
                      </label>
                      <label>
                        Horario
                        <select
                          value={draftSlotValue}
                          onChange={(event) => {
                            const [preferredTime, preferredEndTime] = event.target.value.split('-')
                            updateRescheduleDraft(item.id, { preferredTime, preferredEndTime })
                          }}
                        >
                          <option value="">Selecione</option>
                          {draftSlots.map((slot) => (
                            <option key={slot.id} value={getSlotKey(slot.start_time, slot.end_time)}>
                              {formatTimeRange(slot.start_time, slot.end_time)}
                            </option>
                          ))}
                        </select>
                      </label>
                      <button
                        type="button"
                        disabled={updatingBookingId === item.id || isFinalBookingStatus(item.status)}
                        onClick={() => void handleBookingReschedule(item)}
                      >
                        Remarcar
                      </button>
                    </div>
                    <select
                      value={item.status}
                      disabled={updatingBookingId === item.id || isFinalBookingStatus(item.status)}
                      onChange={(event) =>
                        void handleBookingStatusChange(item.id, event.target.value as BookingStatus)
                      }
                    >
                      {statusChoices.map((status) => (
                        <option key={status} value={status}>
                          {statusLabels[status]}
                        </option>
                        ))}
                      </select>
                    <div className="quick-status-actions">
                      {item.status === 'pending' ? (
                        <button
                          type="button"
                          disabled={updatingBookingId === item.id}
                          onClick={() => void handleBookingStatusChange(item.id, 'confirmed')}
                        >
                          Confirmar
                        </button>
                      ) : null}
                      {item.status === 'confirmed' ? (
                        <button
                          type="button"
                          disabled={updatingBookingId === item.id}
                          onClick={() => void handleBookingStatusChange(item.id, 'completed')}
                        >
                          Concluir
                        </button>
                      ) : null}
                      {isActiveBookingStatus(item.status) ? (
                        <button
                          type="button"
                          className="danger-action"
                          disabled={updatingBookingId === item.id}
                          onClick={() => void handleBookingStatusChange(item.id, 'canceled_by_admin')}
                        >
                          Cancelar
                        </button>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      className="icon-button danger"
                      disabled={updatingBookingId === item.id}
                      onClick={() => requestBookingDelete(item)}
                      aria-label={`Excluir pedido de ${item.client_name}`}
                    >
                      <Trash2 size={16} aria-hidden="true" />
                    </button>
                  </div>
                  <div className="admin-booking-ops">
                    <form className="internal-note-form" onSubmit={(event) => void handleInternalNoteCreate(event, item.id)}>
                      <label>
                        Nota interna
                        <input
                          value={noteDrafts[item.id] ?? ''}
                          onChange={(event) =>
                            setNoteDrafts((current) => ({ ...current, [item.id]: event.target.value }))
                          }
                          placeholder="Ex: preferencia de formato, historico, atencao especial"
                        />
                      </label>
                      <button type="submit" disabled={updatingBookingId === item.id}>
                        Salvar nota
                      </button>
                    </form>
                    <div className="booking-notes-list">
                      {bookingNotes.length ? (
                        bookingNotes.slice(0, 3).map((note) => (
                          <span key={note.id}>
                            {formatDateTime(note.created_at)} - {note.note}
                          </span>
                        ))
                      ) : (
                        <span>Sem notas internas.</span>
                      )}
                    </div>
                    <div className="booking-timeline">
                      {bookingEvents.length ? (
                        bookingEvents.slice(0, 4).map((event) => (
                          <span key={event.id}>
                            {formatDateTime(event.created_at)} - {event.reason ?? statusLabels[event.to_status]}
                          </span>
                        ))
                      ) : (
                        <span>Historico ainda nao carregado.</span>
                      )}
                    </div>
                  </div>
                </article>
                )
              })}
            </div>
          ) : (
            <p className="empty-state">Nenhum pedido encontrado para os filtros atuais.</p>
          )}
            </>
          ) : null}

          {adminPanelTab === 'whatsapp' ? (
          <section className="notification-queue" id="admin-whatsapp" aria-label="Fila manual de WhatsApp">
            <div className="admin-heading compact">
              <div>
                <p className="eyebrow">WhatsApp manual</p>
                <h2>Mensagens para copiar e enviar.</h2>
              </div>
            </div>
            <div className="notification-list">
              {notificationQueue.length ? (
                notificationQueue.map((queueItem) => {
                  const relatedBooking = bookings.find((bookingItem) => bookingItem.id === queueItem.booking_id)
                  const whatsappUrl = relatedBooking
                    ? getWhatsAppUrl(relatedBooking.client_phone, queueItem.message_template)
                    : ''

                  return (
                    <article key={queueItem.id} className="notification-card">
                      <div>
                        <span className={queueItem.status === 'pending' ? 'status-pill status-pending' : 'status-pill status-completed'}>
                          {notificationStatusLabels[queueItem.status]}
                        </span>
                        <strong>{relatedBooking?.client_name ?? 'Cliente'}</strong>
                        <small>
                          {queueItem.type} - {formatDateTime(queueItem.scheduled_for)}
                        </small>
                        <p>{queueItem.message_template}</p>
                      </div>
                      <div className="notification-actions">
                        <button type="button" onClick={() => void handleCopyNotification(queueItem.message_template)}>
                          <Clipboard size={15} aria-hidden="true" /> Copiar
                        </button>
                        {whatsappUrl ? (
                          <a href={whatsappUrl} target="_blank" rel="noreferrer">
                            <MessageCircle size={15} aria-hidden="true" /> Abrir WhatsApp
                          </a>
                        ) : null}
                        <select
                          value={queueItem.status}
                          disabled={updatingQueueId === queueItem.id}
                          onChange={(event) =>
                            void handleNotificationStatusChange(queueItem, event.target.value as NotificationStatus)
                          }
                        >
                          {Object.entries(notificationStatusLabels).map(([status, label]) => (
                            <option key={status} value={status}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </article>
                  )
                })
              ) : (
                <p className="empty-state">A fila aparece quando houver agendamentos ou mudancas de status.</p>
              )}
            </div>
          </section>
          ) : null}

          {adminPanelTab === 'payments' ? (
          <section className="finance-manager" id="admin-pagamentos" aria-label="Gestao financeira">
            <div className="admin-heading compact">
              <div>
                <p className="eyebrow">Financeiro</p>
                <h2>Pagamentos por atendimento.</h2>
              </div>
            </div>

            <div className="admin-reports" aria-label="Resumo financeiro por periodo">
              <article>
                <span>Hoje</span>
                <strong>{formatPrice(todayRevenueCents)}</strong>
              </article>
              <article>
                <span>Semana</span>
                <strong>{formatPrice(weekRevenueCents)}</strong>
              </article>
              <article>
                <span>Mes</span>
                <strong>{formatPrice(monthRevenueCents || estimatedRevenueCents)}</strong>
              </article>
              <article>
                <span>Pendentes</span>
                <strong>{pendingBusinessPaymentCount}</strong>
              </article>
            </div>

            <form className="payment-form" onSubmit={handleCreateBusinessPayment}>
              <label>
                Atendimento
                <select
                  value={newPayment.bookingId}
                  onChange={(event) => {
                    const bookingItem = bookings.find((item) => item.id === event.target.value)
                    const servicePrice = bookingItem
                      ? services.find((service) => service.id === bookingItem.service_id)?.priceCents
                      : undefined

                    setNewPayment({
                      ...newPayment,
                      bookingId: event.target.value,
                      totalAmountCents: formatPriceDraft(servicePrice),
                      paidAmountCents: formatPriceDraft(servicePrice),
                    })
                  }}
                >
                  <option value="">Selecione</option>
                  {bookings.map((item) => (
                    <option key={item.id} value={item.id}>
                      {formatFullDate(item.preferred_date)} - {item.client_name} - {item.service_name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Forma
                <select
                  value={newPayment.paymentMethod}
                  onChange={(event) =>
                    setNewPayment({ ...newPayment, paymentMethod: event.target.value as BusinessPaymentMethod })
                  }
                >
                  {Object.entries(businessPaymentMethodLabels).map(([method, label]) => (
                    <option key={method} value={method}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Status
                <select
                  value={newPayment.status}
                  onChange={(event) =>
                    setNewPayment({ ...newPayment, status: event.target.value as BusinessPaymentStatus })
                  }
                >
                  {Object.entries(businessPaymentStatusLabels).map(([status, label]) => (
                    <option key={status} value={status}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Valor total
                <input
                  inputMode="decimal"
                  value={newPayment.totalAmountCents}
                  onChange={(event) => setNewPayment({ ...newPayment, totalAmountCents: event.target.value })}
                  placeholder="30,00"
                />
              </label>
              <label>
                Valor pago
                <input
                  inputMode="decimal"
                  value={newPayment.paidAmountCents}
                  onChange={(event) => setNewPayment({ ...newPayment, paidAmountCents: event.target.value })}
                  placeholder="30,00"
                />
              </label>
              <label>
                Data
                <input
                  type="date"
                  value={newPayment.paidAt}
                  onChange={(event) => setNewPayment({ ...newPayment, paidAt: event.target.value })}
                />
              </label>
              <label className="wide-field">
                Observacoes
                <input
                  value={newPayment.notes}
                  onChange={(event) => setNewPayment({ ...newPayment, notes: event.target.value })}
                  placeholder="Ex: restante pago em Pix"
                />
              </label>
              <button type="submit" disabled={savingPayment}>
                <CreditCard size={16} aria-hidden="true" /> Registrar pagamento
              </button>
            </form>
            <p className="form-status" role="status">{financeActionStatus}</p>

            <div className="admin-controls single-control">
              <label>
                Busca
                <input
                  value={paymentSearch}
                  onChange={(event) => setPaymentSearch(event.target.value)}
                  placeholder="Cliente, servico, forma ou status"
                />
              </label>
            </div>
            <div className="payment-list">
              {filteredBusinessPayments.length ? (
                filteredBusinessPayments.map((payment) => (
                  <article key={payment.id} className="payment-card">
                    <div>
                      <strong>{payment.client_name}</strong>
                      <span>{payment.service_name}</span>
                      <small>
                        {businessPaymentMethodLabels[payment.payment_method]} - {payment.paid_at ? formatFullDate(payment.paid_at) : 'Sem data'}
                      </small>
                    </div>
                    <div>
                      <span className={`payment-pill payment-${payment.status}`}>
                        {businessPaymentStatusLabels[payment.status]}
                      </span>
                      <strong>{formatPrice(payment.paid_amount_cents)} / {formatPrice(payment.total_amount_cents)}</strong>
                    </div>
                    <button
                      type="button"
                      className="icon-button danger"
                      aria-label={`Remover pagamento de ${payment.client_name}`}
                      onClick={() => requestPaymentDelete(payment)}
                    >
                      <Trash2 size={16} aria-hidden="true" />
                    </button>
                  </article>
                ))
              ) : (
                <p className="empty-state">Nenhum pagamento registrado ainda.</p>
              )}
            </div>
          </section>
          ) : null}

          {adminPanelTab === 'products' ? (
          <section className="product-manager" id="admin-produtos" aria-label="Produtos e estoque">
            <div className="admin-heading compact">
              <div>
                <p className="eyebrow">Produtos</p>
                <h2>Estoque e movimentacoes.</h2>
              </div>
            </div>

            <div className="admin-reports" aria-label="Resumo de estoque">
              <article>
                <span>Produtos cadastrados</span>
                <strong>{products.length}</strong>
              </article>
              <article>
                <span>Estoque baixo</span>
                <strong>{lowStockProducts.length}</strong>
              </article>
              <article>
                <span>Movimentacoes</span>
                <strong>{stockMovements.length}</strong>
              </article>
            </div>

            <form className="product-form" onSubmit={handleCreateProduct}>
              <label>
                Produto
                <input
                  value={newProduct.name}
                  onChange={(event) => setNewProduct({ ...newProduct, name: event.target.value })}
                  placeholder="Henna castanho medio"
                />
              </label>
              <label>
                Categoria
                <input
                  value={newProduct.category}
                  onChange={(event) => setNewProduct({ ...newProduct, category: event.target.value })}
                  placeholder="Henna, coloracao, limpeza"
                />
              </label>
              <label>
                Estoque
                <input
                  inputMode="decimal"
                  value={newProduct.stockQuantity}
                  onChange={(event) => setNewProduct({ ...newProduct, stockQuantity: event.target.value })}
                />
              </label>
              <label>
                Unidade
                <input
                  value={newProduct.unit}
                  onChange={(event) => setNewProduct({ ...newProduct, unit: event.target.value })}
                  placeholder="un, g, ml"
                />
              </label>
              <label>
                Custo
                <input
                  inputMode="decimal"
                  value={newProduct.costCents}
                  onChange={(event) => setNewProduct({ ...newProduct, costCents: event.target.value })}
                  placeholder="20,00"
                />
              </label>
              <label>
                Venda
                <input
                  inputMode="decimal"
                  value={newProduct.salePriceCents}
                  onChange={(event) => setNewProduct({ ...newProduct, salePriceCents: event.target.value })}
                  placeholder="35,00"
                />
              </label>
              <label>
                Estoque minimo
                <input
                  inputMode="decimal"
                  value={newProduct.minimumStock}
                  onChange={(event) => setNewProduct({ ...newProduct, minimumStock: event.target.value })}
                />
              </label>
              <label className="wide-field">
                Observacoes
                <input
                  value={newProduct.notes}
                  onChange={(event) => setNewProduct({ ...newProduct, notes: event.target.value })}
                  placeholder="Marca, validade ou fornecedor"
                />
              </label>
              <button type="submit" disabled={savingProduct}>
                <Package size={16} aria-hidden="true" /> Cadastrar produto
              </button>
            </form>

            <form className="stock-form" onSubmit={handleCreateStockMovement}>
              <label>
                Produto
                <select
                  value={newStockMovement.productId}
                  onChange={(event) => setNewStockMovement({ ...newStockMovement, productId: event.target.value })}
                >
                  <option value="">Selecione</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Tipo
                <select
                  value={newStockMovement.movementType}
                  onChange={(event) =>
                    setNewStockMovement({ ...newStockMovement, movementType: event.target.value as StockMovementType })
                  }
                >
                  {Object.entries(stockMovementLabels).map(([type, label]) => (
                    <option key={type} value={type}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Quantidade
                <input
                  inputMode="decimal"
                  value={newStockMovement.quantityDelta}
                  onChange={(event) => setNewStockMovement({ ...newStockMovement, quantityDelta: event.target.value })}
                  placeholder="1"
                />
              </label>
              <label>
                Atendimento
                <select
                  value={newStockMovement.bookingId}
                  onChange={(event) => setNewStockMovement({ ...newStockMovement, bookingId: event.target.value })}
                >
                  <option value="">Sem vinculo</option>
                  {bookings.map((item) => (
                    <option key={item.id} value={item.id}>
                      {formatFullDate(item.preferred_date)} - {item.client_name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="wide-field">
                Observacoes
                <input
                  value={newStockMovement.notes}
                  onChange={(event) => setNewStockMovement({ ...newStockMovement, notes: event.target.value })}
                  placeholder="Ex: uso no atendimento ou reposicao"
                />
              </label>
              <button type="submit" disabled={savingStockMovement || !products.length}>
                Registrar movimentacao
              </button>
            </form>
            <p className="form-status" role="status">{productActionStatus}</p>

            <div className="admin-controls single-control">
              <label>
                Busca
                <input
                  value={productSearch}
                  onChange={(event) => setProductSearch(event.target.value)}
                  placeholder="Produto, categoria ou observacao"
                />
              </label>
            </div>
            <div className="product-grid">
              {filteredProducts.length ? (
                filteredProducts.map((product) => (
                  <article key={product.id} className={product.stock_quantity <= product.minimum_stock ? 'product-card is-low' : 'product-card'}>
                    <div>
                      <strong>{product.name}</strong>
                      <span>{product.category}</span>
                      <small>
                        Estoque: {formatDecimal(product.stock_quantity)} {product.unit} - minimo {formatDecimal(product.minimum_stock)}
                      </small>
                    </div>
                    <div>
                      <span>{formatPrice(product.cost_cents ?? 0)} custo</span>
                      <span>{product.sale_price_cents ? `${formatPrice(product.sale_price_cents)} venda` : 'Sem venda'}</span>
                    </div>
                    <button
                      type="button"
                      className="icon-button danger"
                      aria-label={`Excluir ${product.name}`}
                      onClick={() => requestProductDelete(product)}
                    >
                      <Trash2 size={16} aria-hidden="true" />
                    </button>
                  </article>
                ))
              ) : (
                <p className="empty-state">Nenhum produto cadastrado ainda.</p>
              )}
            </div>

            <div className="stock-movement-list">
              <h3>Ultimas movimentacoes</h3>
              {stockMovements.slice(0, 8).map((movement) => {
                const product = products.find((item) => item.id === movement.product_id)

                return (
                  <article key={movement.id}>
                    <strong>{product?.name ?? 'Produto'}</strong>
                    <span>
                      {stockMovementToneLabels[movement.movement_type]} - {formatDecimal(movement.quantity_delta)}
                    </span>
                    <small>{formatDateTime(movement.created_at)}</small>
                  </article>
                )
              })}
            </div>
          </section>
          ) : null}

          {adminPanelTab === 'reports' ? (
          <section className="report-manager" id="admin-relatorios" aria-label="Relatorios">
            <div className="admin-heading compact">
              <div>
                <p className="eyebrow">Relatorios</p>
                <h2>Visao simples do estudio.</h2>
              </div>
            </div>
            <div className="admin-reports">
              <article>
                <span>Receita registrada</span>
                <strong>{formatPrice(estimatedRevenueCents)}</strong>
              </article>
              <article>
                <span>Atendimentos ativos</span>
                <strong>{activeBookingCount}</strong>
              </article>
              <article>
                <span>Clientes</span>
                <strong>{clientDirectory.length}</strong>
              </article>
              <article>
                <span>Produtos em estoque baixo</span>
                <strong>{lowStockProducts.length}</strong>
              </article>
            </div>
            <div className="report-grid">
              <section>
                <h3>Servicos mais realizados</h3>
                {servicePerformance.length ? (
                  servicePerformance.slice(0, 6).map((item) => (
                    <article key={item.serviceName}>
                      <strong>{item.serviceName}</strong>
                      <span>{item.count} atendimento(s)</span>
                    </article>
                  ))
                ) : (
                  <p className="empty-state">Os servicos aparecem aqui apos confirmacoes ou conclusoes.</p>
                )}
              </section>
              <section>
                <h3>Produtos com estoque baixo</h3>
                {lowStockProducts.length ? (
                  lowStockProducts.map((product) => (
                    <article key={product.id}>
                      <strong>{product.name}</strong>
                      <span>{formatDecimal(product.stock_quantity)} {product.unit} em estoque</span>
                    </article>
                  ))
                ) : (
                  <p className="empty-state">Nenhum produto abaixo do estoque minimo.</p>
                )}
              </section>
            </div>
          </section>
          ) : null}

          {adminPanelTab === 'services' ? (
          <div className="service-manager" id="admin-servicos">
            <div className="admin-heading compact">
              <div>
                <p className="eyebrow">Catalogo</p>
                <h2>Servicos, precos e disponibilidade.</h2>
              </div>
            </div>

            <form className="new-service-form" onSubmit={handleCreateService}>
              <label>
                Novo servico
                <input
                  value={newService.name}
                  onChange={(event) => setNewService({ ...newService, name: event.target.value })}
                  placeholder="Ex: Manutencao mensal"
                />
              </label>
              <label>
                Preco
                <input
                  inputMode="decimal"
                  value={newService.priceCents}
                  onChange={(event) => setNewService({ ...newService, priceCents: event.target.value })}
                  placeholder="95,00"
                />
              </label>
              <label>
                Duracao
                <input
                  inputMode="numeric"
                  value={newService.durationMinutes}
                  onChange={(event) => setNewService({ ...newService, durationMinutes: event.target.value })}
                  placeholder="60"
                />
              </label>
              <label className="wide-field">
                Descricao
                <input
                  value={newService.description}
                  onChange={(event) => setNewService({ ...newService, description: event.target.value })}
                  placeholder="Resumo curto para a vitrine"
                />
              </label>
              <button type="submit" disabled={savingServiceId === 'new'}>
                <Plus size={16} aria-hidden="true" /> Adicionar
              </button>
            </form>

            <p className="form-status" role="status">
              {serviceActionStatus}
            </p>

            <div className="service-editor-list">
              {services.map((service) => {
                const draft = serviceDrafts[service.id] ?? createServiceDraft(service)
                const isUploadingImage = uploadingServiceImageId === service.id
                const imageInputId = `service-image-input-${service.id}`
                const imageHelpId = `service-image-help-${service.id}`
                const imageStatusId = `service-image-status-${service.id}`

                return (
                  <article
                    className={!draft.active ? 'service-editor-card is-paused' : 'service-editor-card'}
                    key={service.id}
                  >
                    <div className="service-editor-head">
                      <strong>{service.id}</strong>
                      <label className="toggle-label">
                        <input
                          type="checkbox"
                          checked={draft.active}
                          onChange={(event) => updateServiceDraft(service.id, { active: event.target.checked })}
                        />
                        Ativo
                      </label>
                    </div>
                    <div className="service-image-admin">
                      <span className="service-image-preview">
                        <span className="service-card-fallback" aria-hidden="true">HB</span>
                        <img
                          src={getServiceCoverUrl(service)}
                          alt={`Foto atual de ${service.name}`}
                          loading="lazy"
                          onError={(event) => {
                            event.currentTarget.hidden = true
                          }}
                        />
                      </span>
                      <div>
                        <strong>Foto do servico</strong>
                        <small id={imageHelpId}>JPG, PNG, WebP ou AVIF ate 2 MB. Prefira foto horizontal, bem iluminada e centralizada.</small>
                        <small id={imageStatusId} className="upload-status" role="status" aria-live="polite">
                          {isUploadingImage
                            ? 'Enviando foto. Aguarde a confirmacao.'
                            : service.imagePath
                              ? 'Foto ativa nos cards da cliente.'
                              : 'Sem foto enviada; o card usa o fallback da marca.'}
                        </small>
                        <div className="service-image-actions">
                          <label className="file-upload-button" htmlFor={imageInputId}>
                            {isUploadingImage ? 'Enviando...' : service.imagePath ? 'Trocar foto' : 'Enviar foto'}
                            <input
                              id={imageInputId}
                              type="file"
                              accept="image/jpeg,image/png,image/webp,image/avif"
                              aria-describedby={`${imageHelpId} ${imageStatusId}`}
                              aria-label={`${service.imagePath ? 'Trocar' : 'Enviar'} foto de ${service.name}`}
                              disabled={isUploadingImage}
                              onChange={(event) => {
                                const input = event.currentTarget
                                void handleServiceImageUpload(service, input.files).finally(() => {
                                  input.value = ''
                                })
                              }}
                            />
                          </label>
                          {service.imagePath ? (
                            <button
                              type="button"
                              className="danger-action"
                              aria-label={`Remover foto de ${service.name}`}
                              disabled={isUploadingImage}
                              onClick={() => void handleServiceImageRemove(service)}
                            >
                              Remover foto
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                    <div className="service-editor-grid">
                      <label>
                        Nome
                        <input
                          value={draft.name}
                          onChange={(event) => updateServiceDraft(service.id, { name: event.target.value })}
                        />
                      </label>
                      <label>
                        Preco
                        <input
                          inputMode="decimal"
                          value={draft.priceCents}
                          onChange={(event) => updateServiceDraft(service.id, { priceCents: event.target.value })}
                        />
                      </label>
                      <label>
                        Minutos
                        <input
                          inputMode="numeric"
                          value={draft.durationMinutes}
                          onChange={(event) => updateServiceDraft(service.id, { durationMinutes: event.target.value })}
                        />
                      </label>
                      <label>
                        Ordem
                        <input
                          inputMode="numeric"
                          value={draft.sortOrder}
                          onChange={(event) => updateServiceDraft(service.id, { sortOrder: event.target.value })}
                        />
                      </label>
                      <label className="wide-field">
                        Descricao
                        <textarea
                          rows={2}
                          value={draft.description}
                          onChange={(event) => updateServiceDraft(service.id, { description: event.target.value })}
                        />
                      </label>
                    </div>
                    <button
                      type="button"
                      className="save-service-button"
                      disabled={savingServiceId === service.id}
                      onClick={() => void handleServiceSave(service)}
                    >
                      <Save size={16} aria-hidden="true" /> Salvar servico
                    </button>
                  </article>
                )
              })}
            </div>
          </div>
          ) : null}
            </div>
          </div>
        </div>
      </section>
    )
  }

  function renderPublicPageHeader(eyebrow: string, title: string, description: string) {
    return (
      <section className="page-header-section public-header-section">
        <div className="hero-noise" aria-hidden="true" />
        {renderTopbar()}
        <div className="page-heading">
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
      </section>
    )
  }

  function renderServicesPage() {
    return (
      <main>
        {renderPublicPageHeader(
          'Servicos',
          'Procedimentos para realcar sua beleza com naturalidade.',
          'Escolha entre design reconstrutivo, henna e coloracao com preco, duracao e descricao clara.',
        )}
        <section className="services-section" id="servicos">
          <div className="section-heading">
            <p className="eyebrow">Menu de atendimento</p>
            <h2>Cada detalhe foi pensado com carinho.</h2>
          </div>
          <div className="service-grid">
            {bookableServices.map((service) => (
              <article className="service-card" key={service.id}>
                <span className="service-card-media">
                  <span className="service-card-fallback" aria-hidden="true">HB</span>
                  <img
                    src={getServiceCoverUrl(service)}
                    alt={`Exemplo visual de ${service.name}`}
                    loading="lazy"
                    onError={(event) => {
                      event.currentTarget.hidden = true
                    }}
                  />
                </span>
                <span>{service.eyebrow}</span>
                <h3>{service.name}</h3>
                <p>{service.description}</p>
                <div>
                  <small>
                    <Clock3 size={15} aria-hidden="true" /> {service.durationMinutes} min
                  </small>
                  <strong>{formatPrice(service.priceCents)}</strong>
                </div>
              </article>
            ))}
          </div>
          <div className="section-cta">
            <button type="button" className="primary-action" onClick={() => (session ? goToPath('/agendamento') : goToAuth('sign-in', 'cliente'))}>
              Agendar horario
              <ArrowRight size={18} aria-hidden="true" />
            </button>
            <a href={instagramUrl} target="_blank" rel="noreferrer" className="secondary-link">
              Ver Instagram
            </a>
          </div>
        </section>
      </main>
    )
  }

  function renderConfirmationPage() {
    const whatsappMessage = latestConfirmation
      ? `Ola Hellen, acabei de solicitar ${latestConfirmation.serviceName} para ${formatFullDate(latestConfirmation.date)} das ${formatTimeRange(latestConfirmation.startTime, latestConfirmation.endTime)}.`
      : 'Ola Hellen, quero confirmar meu horario.'

    return (
      <main>
        {renderPublicPageHeader(
          'Confirmacao',
          'Seu pedido de horario foi registrado.',
          'Acompanhe sua agenda e fale com a Hellen pelo WhatsApp se precisar ajustar algum detalhe.',
        )}
        <section className="confirmation-section">
          <article className="confirmation-card">
            <CheckCircle2 size={34} aria-hidden="true" />
            <p className="eyebrow">Agendamento</p>
            <h2>{latestConfirmation ? statusLabels[latestConfirmation.status] : 'Pedido recebido'}</h2>
            {latestConfirmation ? (
              <p>
                {latestConfirmation.serviceName} em {formatFullDate(latestConfirmation.date)}, das{' '}
                {formatTimeRange(latestConfirmation.startTime, latestConfirmation.endTime)}.
              </p>
            ) : (
              <p>Confira sua area da cliente para ver os horarios e status mais recentes.</p>
            )}
            <div className="form-actions">
              <button type="button" onClick={() => goToPath('/cliente')}>
                Ver minha agenda
              </button>
              <a href={getWhatsAppUrl(bookingWhatsAppNumber, whatsappMessage)} target="_blank" rel="noreferrer">
                <MessageCircle size={16} aria-hidden="true" /> Falar no WhatsApp
              </a>
            </div>
          </article>
        </section>
      </main>
    )
  }

  function renderConfirmDialog() {
    if (!confirmDialog) {
      return null
    }

    return (
      <div className="confirm-backdrop" role="presentation">
        <section
          className={`confirm-dialog ${confirmDialog.tone === 'danger' ? 'danger' : ''}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-dialog-title"
          aria-describedby="confirm-dialog-description"
        >
          <p className="eyebrow">Confirmacao</p>
          <h2 id="confirm-dialog-title">{confirmDialog.title}</h2>
          <p id="confirm-dialog-description">{confirmDialog.message}</p>
          <div className="confirm-dialog-actions">
            <button type="button" className="text-button" autoFocus onClick={() => setConfirmDialog(null)}>
              {confirmDialog.cancelLabel ?? 'Voltar'}
            </button>
            <button
              type="button"
              className={confirmDialog.tone === 'danger' ? 'danger-action' : ''}
              onClick={() => {
                const action = confirmDialog.onConfirm
                setConfirmDialog(null)
                action()
              }}
            >
              {confirmDialog.confirmLabel}
            </button>
          </div>
        </section>
      </div>
    )
  }

  if (isAuthRoute) {
    const isRecovery = authMode === 'forgot-password'
    const isReset = authMode === 'reset-password'
    const authTitle = isReset
      ? 'Crie uma nova senha.'
      : isRecovery
        ? 'Recupere seu acesso.'
        : authMode === 'sign-up'
          ? 'Crie sua conta para agendar.'
          : 'Entre para marcar seu horario.'

    return (
      <main className="auth-page">
        <section className="auth-hero-panel">
          <button type="button" className="brand auth-brand" onClick={() => goHome()}>
            <img src={brandLogo} alt="" className="brand-logo" />
            <strong>Hellen Martins Brows</strong>
          </button>
          <p className="eyebrow">Acesso seguro</p>
          <h1>{authTitle}</h1>
          <p>
            Use seu email para confirmar a conta, recuperar senha e acompanhar seus horarios em
            um espaco reservado.
          </p>
          <div className="auth-benefits">
            <span>
              <CheckCircle2 size={16} aria-hidden="true" /> Confirmacao por email
            </span>
            <span>
              <CheckCircle2 size={16} aria-hidden="true" /> Recuperacao de senha
            </span>
            <span>
              <CheckCircle2 size={16} aria-hidden="true" /> Historico de agendamentos
            </span>
          </div>
        </section>

        <section className="auth-panel" aria-label="Formulario de acesso">
          <div className="auth-tabs" role="group" aria-label="Modo de acesso">
            <button
              type="button"
              className={authMode === 'sign-in' ? 'active' : ''}
              onClick={() => goToAuth('sign-in')}
            >
              Entrar
            </button>
            <button
              type="button"
              className={authMode === 'sign-up' ? 'active' : ''}
              onClick={() => goToAuth('sign-up')}
            >
              Criar conta
            </button>
          </div>

          {session && !isReset ? (
            <div className="auth-connected">
              <UserCheck size={24} aria-hidden="true" />
              <h2>Voce ja esta conectado.</h2>
              <p>{session.user.email}</p>
              <button type="button" onClick={() => goToPath(isAdmin ? '/admin' : '/cliente')}>
                Continuar
              </button>
              <button type="button" className="text-button" onClick={handleSignOut}>
                Sair desta conta
              </button>
            </div>
          ) : (
            <form className="auth-form" onSubmit={handleAuthSubmit}>
              {!isReset ? (
                <label>
                  Email
                  <input
                    required
                    type="email"
                    value={authForm.email}
                    onChange={(event) => setAuthForm({ ...authForm, email: event.target.value })}
                    placeholder="voce@email.com"
                  />
                </label>
              ) : null}

              {!isRecovery ? (
                <label>
                  {isReset ? 'Nova senha' : 'Senha'}
                  <input
                    required
                    minLength={6}
                    type="password"
                    value={authForm.password}
                    onChange={(event) => setAuthForm({ ...authForm, password: event.target.value })}
                    placeholder="No minimo 6 caracteres"
                  />
                </label>
              ) : null}

              <button type="submit" disabled={isSubmittingAuth}>
                {isSubmittingAuth
                  ? 'Processando...'
                  : isReset
                    ? 'Atualizar senha'
                    : isRecovery
                      ? 'Enviar link de recuperacao'
                      : authMode === 'sign-in'
                        ? 'Entrar'
                        : 'Criar conta'}
              </button>

              {authMode === 'sign-in' ? (
                <div className="auth-secondary-actions">
                  <button type="button" className="text-button" onClick={() => goToAuth('forgot-password')}>
                    Esqueci minha senha
                  </button>
                </div>
              ) : null}

              <p className="form-status" role="status" aria-live="polite">
                {authStatus}
              </p>
            </form>
          )}
        </section>
        {renderConfirmDialog()}
      </main>
    )
  }

  if (isCustomerRoute) {
    return (
      <main>
        <section className="page-header-section">
          <div className="hero-noise" aria-hidden="true" />
          {renderTopbar()}
          <div className="page-heading">
            <p className="eyebrow">Area da cliente</p>
            <h1>Agenda, historico e pedidos em uma tela reservada.</h1>
            <p>Entre na sua conta para escolher horarios livres e acompanhar suas confirmacoes.</p>
          </div>
        </section>
        {session ? (
          <section className="workspace-shell customer-workspace" aria-label="Navegacao da area da cliente">
            <aside
              className="workspace-sidebar"
              role="tablist"
              aria-label="Secoes da area da cliente"
              aria-orientation="vertical"
            >
              <span role="presentation">Area da cliente</span>
              <button
                type="button"
                id="customer-tab-booking"
                role="tab"
                className={customerPanelTab === 'booking' ? 'active' : ''}
                aria-controls="customer-workspace-panel"
                aria-selected={customerPanelTab === 'booking'}
                onKeyDown={handleCustomerTabKeyDown}
                onClick={() => setCustomerPanelTab('booking')}
              >
                Agendamento
              </button>
              <button
                type="button"
                id="customer-tab-agenda"
                role="tab"
                className={customerPanelTab === 'agenda' ? 'active' : ''}
                aria-controls="customer-workspace-panel"
                aria-selected={customerPanelTab === 'agenda'}
                onKeyDown={handleCustomerTabKeyDown}
                onClick={() => setCustomerPanelTab('agenda')}
              >
                Minha agenda
              </button>
            </aside>
            <div
              className="workspace-content"
              id="customer-workspace-panel"
              role="tabpanel"
              aria-labelledby={`customer-tab-${customerPanelTab === 'booking' ? 'booking' : 'agenda'}`}
              tabIndex={0}
            >
              {customerPanelTab === 'booking' ? renderBookingSection() : renderCustomerSection()}
            </div>
          </section>
        ) : (
          renderBookingSection()
        )}
        {renderConfirmDialog()}
      </main>
    )
  }

  if (isServicesRoute) {
    return renderServicesPage()
  }

  if (isBookingRoute) {
    return (
      <main>
        {renderPublicPageHeader(
          'Agendamento',
          'Agende seu horario de forma simples e rapida.',
          'Escolha servico, data e horario disponivel. Separe um tempinho para voce.',
        )}
        {renderBookingSection()}
        {renderConfirmDialog()}
      </main>
    )
  }

  if (isConfirmationRoute) {
    return (
      <>
        {renderConfirmationPage()}
        {renderConfirmDialog()}
      </>
    )
  }

  if (isAdminRoute) {
    const heading = adminRouteTitles[adminPanelTab]

    return (
      <main>
        <section className="page-header-section admin-header-section">
          <div className="hero-noise" aria-hidden="true" />
          {renderTopbar()}
          <div className="page-heading">
            <p className="eyebrow">{heading.eyebrow}</p>
            <h1>{heading.title}</h1>
            <p>{heading.description}</p>
          </div>
        </section>
        {renderAdminSection()}
        {renderConfirmDialog()}
      </main>
    )
  }

  return (
    <main className="home-page">
      <section className="hero-section" id="inicio">
        <div className="hero-noise" aria-hidden="true" />
        {renderTopbar()}

        <div className="hero-grid">
          <div className="hero-copy">
            <div className="hero-signature" aria-label="Marca Hellen Martins">
              <img src={brandLogo} alt="" />
              <span>Hellen Martins</span>
            </div>
            <p className="eyebrow">Hellen Martins Designer de Sobrancelhas</p>
            <h1>Sobrancelhas naturais com medida, tecnica e acabamento fino.</h1>
            <p className="hero-lede">
              Design personalizado para realcar seu olhar com naturalidade, conforto e
              acabamento delicado.
            </p>
            <div className="hero-actions">
              <button
                type="button"
                className="primary-action"
                onClick={() => (session ? goToPath(isAdmin ? '/admin' : '/agendamento') : goToAuth('sign-in', 'cliente'))}
              >
                Agendar agora
                <ArrowRight size={18} aria-hidden="true" />
              </button>
            </div>
            <div className="trust-row" aria-label="Diferenciais">
              <span>
                <Sparkles size={16} aria-hidden="true" /> Mapeamento personalizado
              </span>
              <span>
                <ShieldCheck size={16} aria-hidden="true" /> Atendimento reservado
              </span>
            </div>
          </div>

          <div className="hero-visual" aria-label="Ilustracao editorial de sobrancelhas">
            <div className="portrait-frame generated-portrait">
              <img src={browAtelier} alt="Imagem editorial original para Hellen Martins Brows" />
              <div className="appointment-card glass-card">
                <CalendarCheck size={18} aria-hidden="true" />
                <span>Agenda aberta</span>
                <strong>Seg a Sex</strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="proof-strip" aria-label="Resumo da experiencia">
        <article>
          <strong>20-70 min</strong>
          <span>Atendimento com tempo real para simetria</span>
        </article>
        <article>
          <strong>A partir de R$ 20</strong>
          <span>Desenho guiado pelo rosto e estilo da cliente</span>
        </article>
        <article>
          <strong>Seg a Sex</strong>
          <span>Atendimento organizado em dias uteis</span>
        </article>
      </section>

      <section className="services-section" id="servicos">
        <div className="section-heading">
          <p className="eyebrow">Menu de atendimento</p>
          <h2>Tabela de servicos com acabamento natural e duradouro.</h2>
        </div>
        <div className="service-grid">
          {bookableServices.map((service) => (
            <article className="service-card" key={service.id}>
              <span className="service-card-media">
                <span className="service-card-fallback" aria-hidden="true">HB</span>
                <img
                  src={getServiceCoverUrl(service)}
                  alt={`Exemplo visual de ${service.name}`}
                  loading="lazy"
                  onError={(event) => {
                    event.currentTarget.hidden = true
                  }}
                />
              </span>
              <span>{service.eyebrow}</span>
              <h3>{service.name}</h3>
              <p>{service.description}</p>
              <div>
                <small>
                  <Clock3 size={15} aria-hidden="true" /> {service.durationMinutes} min
                </small>
                <strong>{formatPrice(service.priceCents)}</strong>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="booking-section" id="agenda">
        <div className="booking-intro">
          <p className="eyebrow">Agendamento</p>
          <h2>Escolha uma data e veja os horarios disponiveis.</h2>
          <p>
            Para marcar um horario, entre na sua conta. Assim conseguimos evitar conflitos na
            agenda e manter seu atendimento organizado.
          </p>
          <div className="contact-stack">
            <span>
              <Camera size={17} aria-hidden="true" /> {instagramHandle}
            </span>
            <span>
              <MapPin size={17} aria-hidden="true" /> Atendimento sob confirmacao
            </span>
            <span>
              <Mail size={17} aria-hidden="true" /> Confirmacao por email
            </span>
          </div>
        </div>

        {session ? (
          <form className="booking-form" onSubmit={handleBookingSubmit}>
            <label>
              Nome completo
              <input
                required
                minLength={2}
                value={booking.name}
                onChange={(event) => setBooking({ ...booking, name: event.target.value })}
                placeholder="Como devemos te chamar?"
              />
            </label>
            <div className="form-row">
              <label>
                Email da conta
                <input readOnly value={bookingEmail} />
              </label>
              <label>
                WhatsApp
                <input
                  required
                  inputMode="tel"
                  value={booking.phone}
                  onChange={(event) => setBooking({ ...booking, phone: event.target.value })}
                  placeholder="(00) 00000-0000"
                />
              </label>
            </div>
            <label>
              Servico
              <select
                value={selectedService.id}
                onChange={(event) => setBooking({ ...booking, serviceId: event.target.value })}
              >
                {bookableServices.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name} - {formatPrice(service.priceCents)}
                  </option>
                ))}
              </select>
            </label>
            <div className="calendar-shell">
              <label>
                Data desejada
                <input
                  required
                  type="date"
                  min={currentBusinessDateTime.date}
                  value={booking.preferredDate}
                  onChange={(event) =>
                    setBooking({ ...booking, preferredDate: event.target.value, preferredTime: '', preferredEndTime: '' })
                  }
                />
              </label>
              <div className="slot-picker" aria-label="Horarios disponiveis">
                {selectedDateAvailabilitySlots.length ? (
                  selectedDateAvailabilitySlots.map((slot) => {
                    const slotKey = getSlotKey(slot.start_time, slot.end_time)
                    const isBooked = bookedSlotSet.has(slotKey)
                    const isSelected = selectedSlotKey === slotKey
                    const isClosed = isSlotInPast(booking.preferredDate, slot.start_time, currentBusinessDateTime)

                    return (
                      <button
                        type="button"
                        key={slot.id}
                        className={isSelected ? 'slot-button selected' : 'slot-button'}
                        disabled={isClosed || isBooked || selectedDateIsUnavailable}
                        onClick={() =>
                          setBooking({
                            ...booking,
                            preferredTime: timeLabel(slot.start_time),
                            preferredEndTime: timeLabel(slot.end_time),
                          })
                        }
                      >
                        <strong>{formatTimeRange(slot.start_time, slot.end_time)}</strong>
                        <span>
                          {isClosed
                            ? 'Encerrado'
                            : selectedDateIsUnavailable
                              ? 'Indisponivel'
                              : isBooked
                                ? 'Ocupado'
                                : 'Disponivel'}
                        </span>
                      </button>
                    )
                  })
                ) : (
                  <p className="empty-state">Nenhum horario liberado para este dia.</p>
                )}
              </div>
            </div>
            <label>
              Observacoes
              <textarea
                rows={4}
                value={booking.notes}
                onChange={(event) => setBooking({ ...booking, notes: event.target.value })}
                placeholder="Conte se e sua primeira vez, se tem alergias ou objetivo especifico."
              />
            </label>
            <div className="form-actions">
              <button
                type="submit"
                disabled={
                  isSubmittingBooking ||
                  !bookableServices.length ||
                  selectedSlotIsBooked ||
                  !selectedSlotIsAvailable ||
                  !availableSlots.length
                }
              >
                {isSubmittingBooking ? 'Solicitando...' : 'Solicitar horario'}
              </button>
            </div>
            <p className="form-status" role="status" aria-live="polite">
              {bookingStatus ||
                (availableSlots.length
                  ? 'Escolha um periodo e receba a confirmacao pelo WhatsApp ou email.'
                  : 'Nao ha horarios livres nesta data. Escolha outro dia.')}
            </p>
          </form>
        ) : (
          <div className="booking-gate">
            <LockKeyhole size={28} aria-hidden="true" />
            <h3>Entre para escolher um horario.</h3>
            <p>
              A agenda mostra os horarios disponiveis depois do login para evitar marcacoes no
              mesmo periodo.
            </p>
            <div className="form-actions">
              <button type="button" onClick={() => goToAuth('sign-in', 'cliente')}>
                Entrar para agendar
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="client-section" id="cliente">
        <div className="client-card">
          <div>
            <p className="eyebrow">Area da cliente</p>
            <h2>{isAdmin ? 'Painel privado da Hellen.' : 'Acompanhe seus horarios com tranquilidade.'}</h2>
            <p>
              Entre para ver seus pedidos, acompanhar confirmacoes e manter seus dados sempre
              organizados para os proximos atendimentos.
            </p>
            <div className="first-steps" aria-label="Como funciona o acesso">
              <span>
                <CheckCircle2 size={16} aria-hidden="true" /> Entre ou crie sua conta
              </span>
              <span>
                <CheckCircle2 size={16} aria-hidden="true" /> Escolha um horario livre
              </span>
              <span>
                <CheckCircle2 size={16} aria-hidden="true" /> Receba a confirmacao
              </span>
            </div>
          </div>

          {session ? (
            <div className="session-box">
              {isAdmin ? <UserCheck size={22} aria-hidden="true" /> : <LockKeyhole size={22} aria-hidden="true" />}
              <span>{isAdmin ? 'Admin conectado' : 'Logado como'}</span>
              <strong>{session.user.email}</strong>
              <small>{isAdmin ? 'Acesso administrativo ativo' : 'Acesso de cliente ativo'}</small>
              <button type="button" onClick={handleSignOut}>
                Sair
              </button>
            </div>
          ) : (
            <div className="session-box guest-box">
              <LockKeyhole size={22} aria-hidden="true" />
              <span>Acesso da cliente</span>
              <strong>Entre para ver sua agenda</strong>
              <button type="button" onClick={() => goToAuth('sign-in')}>
                Entrar
              </button>
              <button type="button" className="text-button light" onClick={() => goToAuth('sign-up')}>
                Criar conta
              </button>
            </div>
          )}
        </div>

        {session && isAdmin ? (
          <div className="admin-panel" aria-live="polite">
            <div className="admin-heading">
              <div>
                <p className="eyebrow">Painel admin</p>
                <h2>Agenda completa com filtros e status.</h2>
                <p>
                  Visualize todos os pedidos com acesso restrito, confirme horarios, finalize
                  atendimentos e pause servicos sem processos manuais.
                </p>
              </div>
              <span className="admin-badge">
                <UserCheck size={16} aria-hidden="true" /> Admin ativo
              </span>
            </div>

            <div className="admin-stats" aria-label="Resumo de status">
              {bookingStats.map((item) => (
                <article key={item.status}>
                  <span>{statusLabels[item.status]}</span>
                  <strong>{item.count}</strong>
                </article>
              ))}
            </div>

            <div className="admin-controls">
              <label>
                <span>
                  <Filter size={15} aria-hidden="true" /> Status
                </span>
                <select
                  value={adminStatusFilter}
                  onChange={(event) => setAdminStatusFilter(event.target.value as AdminStatusFilter)}
                >
                  <option value="all">Todos</option>
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {statusLabels[status]}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Busca
                <input
                  value={bookingSearch}
                  onChange={(event) => setBookingSearch(event.target.value)}
                  placeholder="Nome, email, telefone ou servico"
                />
              </label>
            </div>

            <p className="form-status" role="status">
              {bookingActionStatus}
            </p>

            {adminBookings.length ? (
              <div className="admin-booking-list">
                {adminBookings.map((item) => (
                  <article className="admin-booking-card" key={item.id}>
                    <time dateTime={item.preferred_date}>{formatFullDate(item.preferred_date)}</time>
                    <div className="admin-booking-main">
                      <div>
                        <strong>{item.client_name}</strong>
                        <span>
                          {item.service_name} as {formatTimeRange(item.preferred_time, item.preferred_end_time)}
                        </span>
                      </div>
                      <small className={getStatusTone(item.status)}>{statusLabels[item.status]}</small>
                    </div>
                    <div className="admin-contact-grid">
                      <span>
                        <Mail size={14} aria-hidden="true" /> {item.client_email}
                      </span>
                      <span>
                        <Phone size={14} aria-hidden="true" /> {item.client_phone}
                      </span>
                      {item.notes ? <p>{item.notes}</p> : <p>Sem observacoes.</p>}
                    </div>
                    <div className="admin-booking-actions">
                      <select
                        value={item.status}
                        disabled={updatingBookingId === item.id}
                        onChange={(event) =>
                          void handleBookingStatusChange(item.id, event.target.value as BookingStatus)
                        }
                      >
                        {statusOptions.map((status) => (
                          <option key={status} value={status}>
                            {statusLabels[status]}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="icon-button danger"
                        disabled={updatingBookingId === item.id}
                        onClick={() => requestBookingDelete(item)}
                        aria-label={`Excluir pedido de ${item.client_name}`}
                      >
                        <Trash2 size={16} aria-hidden="true" />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="empty-state">Nenhum pedido encontrado para os filtros atuais.</p>
            )}

            <div className="service-manager">
              <div className="admin-heading compact">
                <div>
                  <p className="eyebrow">Catalogo</p>
                  <h2>Servicos, precos e disponibilidade.</h2>
                </div>
              </div>

              <form className="new-service-form" onSubmit={handleCreateService}>
                <label>
                  Novo servico
                  <input
                    value={newService.name}
                    onChange={(event) => setNewService({ ...newService, name: event.target.value })}
                    placeholder="Ex: Manutencao mensal"
                  />
                </label>
                <label>
                  Preco
                  <input
                    inputMode="decimal"
                    value={newService.priceCents}
                    onChange={(event) => setNewService({ ...newService, priceCents: event.target.value })}
                    placeholder="95,00"
                  />
                </label>
                <label>
                  Duracao
                  <input
                    inputMode="numeric"
                    value={newService.durationMinutes}
                    onChange={(event) =>
                      setNewService({ ...newService, durationMinutes: event.target.value })
                    }
                    placeholder="60"
                  />
                </label>
                <label className="wide-field">
                  Descricao
                  <input
                    value={newService.description}
                    onChange={(event) => setNewService({ ...newService, description: event.target.value })}
                    placeholder="Resumo curto para a vitrine"
                  />
                </label>
                <button type="submit" disabled={savingServiceId === 'new'}>
                  <Plus size={16} aria-hidden="true" /> Adicionar
                </button>
              </form>

              <p className="form-status" role="status">
                {serviceActionStatus}
              </p>

              <div className="service-editor-list">
                {services.map((service) => {
                  const draft = serviceDrafts[service.id] ?? createServiceDraft(service)

                  return (
                    <article
                      className={!draft.active ? 'service-editor-card is-paused' : 'service-editor-card'}
                      key={service.id}
                    >
                      <div className="service-editor-head">
                        <strong>{service.id}</strong>
                        <label className="toggle-label">
                          <input
                            type="checkbox"
                            checked={draft.active}
                            onChange={(event) => updateServiceDraft(service.id, { active: event.target.checked })}
                          />
                          Ativo
                        </label>
                      </div>
                      <div className="service-editor-grid">
                        <label>
                          Nome
                          <input
                            value={draft.name}
                            onChange={(event) => updateServiceDraft(service.id, { name: event.target.value })}
                          />
                        </label>
                        <label>
                          Preco
                          <input
                            inputMode="decimal"
                            value={draft.priceCents}
                            onChange={(event) => updateServiceDraft(service.id, { priceCents: event.target.value })}
                          />
                        </label>
                        <label>
                          Minutos
                          <input
                            inputMode="numeric"
                            value={draft.durationMinutes}
                            onChange={(event) =>
                              updateServiceDraft(service.id, { durationMinutes: event.target.value })
                            }
                          />
                        </label>
                        <label>
                          Ordem
                          <input
                            inputMode="numeric"
                            value={draft.sortOrder}
                            onChange={(event) => updateServiceDraft(service.id, { sortOrder: event.target.value })}
                          />
                        </label>
                        <label className="wide-field">
                          Descricao
                          <textarea
                            rows={2}
                            value={draft.description}
                            onChange={(event) => updateServiceDraft(service.id, { description: event.target.value })}
                          />
                        </label>
                      </div>
                      <button
                        type="button"
                        className="save-service-button"
                        disabled={savingServiceId === service.id}
                        onClick={() => void handleServiceSave(service)}
                      >
                        <Save size={16} aria-hidden="true" /> Salvar servico
                      </button>
                    </article>
                  )
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="booking-list" aria-live="polite">
            <div className="section-heading compact">
              <p className="eyebrow">Pedidos recentes</p>
              <h2>{session ? 'Minha agenda' : 'Entre para visualizar'}</h2>
            </div>
            {customerBookings.length ? (
              <div className="booking-items">
                {customerBookings.map((item) => (
                  <article key={item.id}>
                    <time dateTime={item.preferred_date}>{formatDate(item.preferred_date)}</time>
                    <div>
                      <strong>{item.client_name}</strong>
                      <span>
                        {item.service_name} as {formatTimeRange(item.preferred_time, item.preferred_end_time)}
                      </span>
                    </div>
                    <small className={getStatusTone(item.status)}>{statusLabels[item.status]}</small>
                  </article>
                ))}
              </div>
            ) : (
              <p className="empty-state">
                {session
                  ? 'Nenhum agendamento para esta conta ainda. Escolha um horario acima e acompanhe o status aqui.'
                  : 'Entre para ver seus proximos horarios e acompanhar confirmacoes.'}
              </p>
            )}
          </div>
        )}
        {renderConfirmDialog()}
      </section>
    </main>
  )
}

export default App
