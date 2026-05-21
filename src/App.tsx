import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import type { Session } from '@supabase/supabase-js'
import {
  ArrowRight,
  CalendarCheck,
  Camera,
  CheckCircle2,
  Clipboard,
  Clock3,
  Filter,
  LockKeyhole,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Plus,
  Save,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserCheck,
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
  active: boolean
  sortOrder: number
}

type ServiceCatalogRow = {
  id: string
  name: string
  duration_minutes: number
  price_cents: number | null
  description: string
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

type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'canceled_by_client' | 'canceled_by_admin' | 'no_show'
type AdminStatusFilter = BookingStatus | 'all'
type NotificationStatus = 'pending' | 'done' | 'skipped'
type AuthMode = 'sign-in' | 'sign-up' | 'forgot-password' | 'reset-password'

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
  policy_text: string
  active: boolean
  updated_at: string
}

type PolicyDraft = {
  cancellationCutoffHours: string
  rescheduleCutoffHours: string
  noShowGraceMinutes: string
  autoConfirmEnabled: boolean
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

const instagramUrl = 'https://www.instagram.com/h.ellenmartins'

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
  pending: 'Aguardando confirmacao',
  confirmed: 'Confirmado',
  completed: 'Concluido',
  canceled_by_client: 'Cancelado pela cliente',
  canceled_by_admin: 'Cancelado pela Hellen',
  no_show: 'Nao compareceu',
}

const statusOptions: BookingStatus[] = [
  'pending',
  'confirmed',
  'completed',
  'canceled_by_client',
  'canceled_by_admin',
  'no_show',
]
const activeBookingStatuses: BookingStatus[] = ['pending', 'confirmed']
const finalBookingStatuses: BookingStatus[] = ['completed', 'canceled_by_client', 'canceled_by_admin', 'no_show']
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

function toDateOnly(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function getTodayDate() {
  return toDateOnly(new Date())
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
  const date = new Date()
  date.setDate(date.getDate() + 1)
  return toDateOnly(getNextBusinessDate(date))
}

function getMonthStart(date: string) {
  const parsed = parseDateOnly(date)
  return toDateOnly(new Date(parsed.getFullYear(), parsed.getMonth(), 1, 12))
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

function mapServiceRow(service: ServiceCatalogRow, index: number): ServiceOption {
  return {
    id: service.id,
    name: service.name,
    durationMinutes: service.duration_minutes,
    priceCents: service.price_cents ?? undefined,
    description: service.description,
    eyebrow: getServiceEyebrow(service.id, index),
    active: service.active,
    sortOrder: service.sort_order,
  }
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
    policyText: policy?.policy_text ?? defaultPolicyText,
  }
}

function isActiveBookingStatus(status: BookingStatus) {
  return activeBookingStatuses.includes(status)
}

function isFinalBookingStatus(status: BookingStatus) {
  return finalBookingStatuses.includes(status)
}

function getAdminStatusOptions(currentStatus: BookingStatus) {
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
  const [customerActionStatus, setCustomerActionStatus] = useState('')
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
  const [bookingRefreshKey, setBookingRefreshKey] = useState(0)
  const [serviceRefreshKey, setServiceRefreshKey] = useState(0)
  const [availabilityRefreshKey, setAvailabilityRefreshKey] = useState(0)
  const [operationalRefreshKey, setOperationalRefreshKey] = useState(0)
  const [adminStatusFilter, setAdminStatusFilter] = useState<AdminStatusFilter>('all')
  const [adminSelectedDate, setAdminSelectedDate] = useState(() => getTodayDate())
  const [bookingSearch, setBookingSearch] = useState('')
  const [calendarMonth, setCalendarMonth] = useState(() => getMonthStart(getInitialDate()))
  const [serviceDrafts, setServiceDrafts] = useState<Record<string, ServiceDraft>>({})
  const [newService, setNewService] = useState<ServiceDraft>(() => createEmptyServiceDraft())
  const [availabilityDraft, setAvailabilityDraft] = useState<AvailabilityDraft>({
    weekday: '1',
    startTime: '08:00',
    endTime: '08:40',
  })
  const [unavailableDraft, setUnavailableDraft] = useState({ date: getTodayDate(), reason: '' })
  const [rescheduleDrafts, setRescheduleDrafts] = useState<Record<string, RescheduleDraft>>({})
  const [cancelReasonDrafts, setCancelReasonDrafts] = useState<Record<string, string>>({})
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({})
  const [savingServiceId, setSavingServiceId] = useState('')
  const [savingAvailabilityId, setSavingAvailabilityId] = useState('')
  const [updatingBookingId, setUpdatingBookingId] = useState('')
  const [updatingQueueId, setUpdatingQueueId] = useState('')

  useEffect(() => {
    function handlePopState() {
      setRoute(window.location.pathname)
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
      .select('id,name,duration_minutes,price_cents,description,active,sort_order')
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
  const isAdminRoute = route === '/admin'
  const bookableServices = services.filter((service) => service.active)
  const selectedService =
    bookableServices.find((service) => service.id === booking.serviceId) ??
    bookableServices[0] ??
    serviceSeeds[0]
  const bookingEmail = session?.user.email ?? ''
  const unavailableDateSet = new Set(unavailableDays.map((day) => day.unavailable_date))
  const activeAvailabilitySlots = availabilitySlots.filter((slot) => slot.active)
  const getAvailabilitySlotsForDate = (date: string) =>
    activeAvailabilitySlots.filter((slot) => slot.weekday === getIsoWeekday(date))
  const selectedDateAvailabilitySlots = getAvailabilitySlotsForDate(booking.preferredDate)
  const bookedSlotSet = new Set(bookedSlots.map((slot) => getSlotKey(slot.startTime, slot.endTime)))
  const selectedSlotKey = booking.preferredTime && booking.preferredEndTime
    ? getSlotKey(booking.preferredTime, booking.preferredEndTime)
    : ''
  const selectedDateIsUnavailable =
    booking.preferredDate < getTodayDate() ||
    unavailableDateSet.has(booking.preferredDate) ||
    !selectedDateAvailabilitySlots.length
  const selectedSlotIsBooked = Boolean(selectedSlotKey && bookedSlotSet.has(selectedSlotKey))
  const availableSlots = selectedDateIsUnavailable
    ? []
    : selectedDateAvailabilitySlots.filter((slot) => !bookedSlotSet.has(getSlotKey(slot.start_time, slot.end_time)))
  const selectedSlotIsAvailable = Boolean(
    selectedSlotKey && availableSlots.some((slot) => getSlotKey(slot.start_time, slot.end_time) === selectedSlotKey),
  )
  const calendarDays = getCalendarDays(calendarMonth)
  const adminSelectedBookings = bookings.filter((item) => item.preferred_date === adminSelectedDate)
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
  const activeBookingCount = bookings.filter((item) => isActiveBookingStatus(item.status)).length
  const upcomingConfirmedCount = bookings.filter(
    (item) => item.status === 'confirmed' && item.preferred_date >= getTodayDate(),
  ).length
  const completedRevenueCents = bookings
    .filter((item) => item.status === 'completed')
    .reduce((total, item) => total + (services.find((service) => service.id === item.service_id)?.priceCents ?? 0), 0)

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
    window.scrollTo({ top: 0, behavior: 'smooth' })
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
    }).select('status').single()

    setIsSubmittingBooking(false)

    if (error) {
      setBookingStatus(
        `Nao foi possivel solicitar o horario: ${getBookingErrorMessage(
          error.message,
          'Esse horario acabou de ser reservado. Escolha outro horario disponivel.',
        )}`,
      )
      return
    }

    const createdStatus = (data?.status ?? 'pending') as BookingStatus

    setBookingStatus(
      createdStatus === 'confirmed'
        ? 'Horario confirmado. A mensagem fica registrada para envio pelo WhatsApp.'
        : 'Horario solicitado. A confirmacao chega por WhatsApp ou email.',
    )
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

    if (!client || !isAdmin || !window.confirm('Excluir este pedido da agenda?')) {
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

    if (draft.preferredDate < getTodayDate() || unavailableDateSet.has(draft.preferredDate)) {
      setBookingActionStatus('Nao e possivel remarcar para data passada ou dia bloqueado.')
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

    if (!window.confirm('Cancelar este horario?')) {
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

    if (!client || !isAdmin || !window.confirm('Remover este horario de atendimento?')) {
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

  async function handlePolicySave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const client = supabase

    if (!client || !isAdmin || !session) {
      return
    }

    const cancellationCutoffHours = Number.parseInt(policyDraft.cancellationCutoffHours, 10)
    const rescheduleCutoffHours = Number.parseInt(policyDraft.rescheduleCutoffHours, 10)
    const noShowGraceMinutes = Number.parseInt(policyDraft.noShowGraceMinutes, 10)

    if (
      !Number.isFinite(cancellationCutoffHours) ||
      !Number.isFinite(rescheduleCutoffHours) ||
      !Number.isFinite(noShowGraceMinutes) ||
      policyDraft.policyText.trim().length < 20
    ) {
      setPolicyActionStatus('Revise os prazos e escreva uma politica com pelo menos 20 caracteres.')
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

  function renderTopbar() {
    return (
      <nav className="topbar" aria-label="Navegacao principal">
        <button type="button" className="brand brand-button" onClick={() => goHome()} aria-label="Hellen Martins Brows">
          <img src={brandLogo} alt="" className="brand-logo" />
          <strong>Hellen Martins Brows</strong>
        </button>
        <div className="nav-links">
          <button type="button" onClick={() => goHome('servicos')}>
            Servicos
          </button>
          {session ? (
            <button type="button" onClick={() => goToPath(isAdmin ? '/admin' : '/cliente')}>
              {isAdmin ? 'Admin' : 'Cliente'}
            </button>
          ) : null}
          <a href={instagramUrl} target="_blank" rel="noreferrer">
            Instagram
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
            Esta area fica separada da tela inicial para manter seus dados, historico e pedidos de
            horario em um espaco reservado.
          </p>
          <div className="contact-stack">
            <span>
              <Camera size={17} aria-hidden="true" /> @h.ellenmartins
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
              <div className="digital-calendar" aria-label="Calendario de disponibilidade">
                <div className="calendar-toolbar">
                  <button type="button" onClick={() => setCalendarMonth(addMonths(calendarMonth, -1))}>
                    Mes anterior
                  </button>
                  <strong>{getMonthLabel(calendarMonth)}</strong>
                  <button type="button" onClick={() => setCalendarMonth(addMonths(calendarMonth, 1))}>
                    Proximo mes
                  </button>
                </div>
                <div className="calendar-weekdays" aria-hidden="true">
                  {weekdayLabels.map((day) => (
                    <span key={day}>{day}</span>
                  ))}
                </div>
                <div className="calendar-grid" role="grid">
                  {calendarDays.map((day) => {
                    const isUnavailable = unavailableDateSet.has(day.date)
                    const isSelected = booking.preferredDate === day.date
                    const dayHasSlots = getAvailabilitySlotsForDate(day.date).length > 0
                    const isDisabled = !day.isCurrentMonth || day.isPast || isUnavailable || !dayHasSlots
                    const dayBookings = isAdmin
                      ? bookings.filter(
                          (item) =>
                            item.preferred_date === day.date && isActiveBookingStatus(item.status),
                        ).length
                      : 0

                    return (
                      <button
                        type="button"
                        key={day.date}
                        className={isSelected ? 'calendar-day selected' : 'calendar-day'}
                        disabled={isDisabled}
                        onClick={() =>
                          setBooking({ ...booking, preferredDate: day.date, preferredTime: '', preferredEndTime: '' })
                        }
                      >
                        <strong>{day.dayNumber}</strong>
                        <span>
                          {day.isPast
                            ? 'Encerrado'
                            : isUnavailable
                              ? 'Bloqueado'
                              : !dayHasSlots
                                ? 'Sem horarios'
                                : dayBookings
                                  ? `${dayBookings} ocupado(s)`
                                  : 'Aberto'}
                        </span>
                      </button>
                    )
                  })}
                </div>
                <p>
                  Data selecionada: <strong>{formatFullDate(booking.preferredDate)}</strong>
                </p>
              </div>
              <div className="slot-picker" aria-label="Horarios disponiveis">
                {selectedDateAvailabilitySlots.length ? (
                  selectedDateAvailabilitySlots.map((slot) => {
                    const slotKey = getSlotKey(slot.start_time, slot.end_time)
                    const isBooked = bookedSlotSet.has(slotKey)
                    const isSelected = selectedSlotKey === slotKey

                    return (
                      <button
                        type="button"
                        key={slot.id}
                        className={isSelected ? 'slot-button selected' : 'slot-button'}
                        disabled={isBooked || selectedDateIsUnavailable}
                        onClick={() =>
                          setBooking({
                            ...booking,
                            preferredTime: timeLabel(slot.start_time),
                            preferredEndTime: timeLabel(slot.end_time),
                          })
                        }
                      >
                        <strong>{formatTimeRange(slot.start_time, slot.end_time)}</strong>
                        <span>{selectedDateIsUnavailable ? 'Indisponivel' : isBooked ? 'Ocupado' : 'Disponivel'}</span>
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
                  !policyAccepted
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
                  const isActionable = isActiveBookingStatus(item.status)
                  const bookingEvents = eventsByBooking[item.id] ?? []

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
                      {isActionable ? (
                        <div className="customer-actions">
                          <div className="reschedule-controls customer-reschedule-controls">
                            <label>
                              Nova data
                              <input
                                type="date"
                                min={getTodayDate()}
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
                                {getAvailabilitySlotsForDate(draft.preferredDate).map((slot) => (
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
                              onClick={() => void handleCustomerCancel(item)}
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

          <div className="admin-reports" aria-label="Relatorios simples">
            <article>
              <span>Agendamentos ativos</span>
              <strong>{activeBookingCount}</strong>
            </article>
            <article>
              <span>Confirmados futuros</span>
              <strong>{upcomingConfirmedCount}</strong>
            </article>
            <article>
              <span>Fila WhatsApp pendente</span>
              <strong>{pendingNotificationCount}</strong>
            </article>
            <article>
              <span>Receita concluida</span>
              <strong>{formatPrice(completedRevenueCents)}</strong>
            </article>
          </div>

          <section className="policy-manager" aria-label="Politica de agendamento">
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

          <div className="admin-ops-grid">
            <section className="admin-agenda-card" aria-label="Agenda do mes">
              <div className="admin-heading compact">
                <div>
                  <p className="eyebrow">Agenda</p>
                  <h2>Calendario operacional.</h2>
                </div>
              </div>
              <div className="digital-calendar compact-calendar">
                <div className="calendar-toolbar">
                  <button type="button" onClick={() => setCalendarMonth(addMonths(calendarMonth, -1))}>
                    Mes anterior
                  </button>
                  <strong>{getMonthLabel(calendarMonth)}</strong>
                  <button type="button" onClick={() => setCalendarMonth(addMonths(calendarMonth, 1))}>
                    Proximo mes
                  </button>
                </div>
                <div className="calendar-weekdays" aria-hidden="true">
                  {weekdayLabels.map((day) => (
                    <span key={day}>{day}</span>
                  ))}
                </div>
                <div className="calendar-grid" role="grid">
                  {calendarDays.map((day) => {
                    const isUnavailable = unavailableDateSet.has(day.date)
                    const dayHasSlots = getAvailabilitySlotsForDate(day.date).length > 0
                    const dayBookings = bookings.filter(
                      (item) => item.preferred_date === day.date && isActiveBookingStatus(item.status),
                    ).length

                    return (
                      <button
                        type="button"
                        key={day.date}
                        className={adminSelectedDate === day.date ? 'calendar-day selected' : 'calendar-day'}
                        disabled={!day.isCurrentMonth || day.isPast}
                        onClick={() => setAdminSelectedDate(day.date)}
                      >
                        <strong>{day.dayNumber}</strong>
                        <span>
                          {day.isPast
                            ? 'Encerrado'
                            : isUnavailable
                              ? 'Bloqueado'
                              : !dayHasSlots
                                ? 'Sem horarios'
                                : dayBookings
                                  ? `${dayBookings} agenda(s)`
                                  : 'Livre'}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
              <div className="selected-day-agenda">
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
                    min={getTodayDate()}
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
                        onClick={() => void handleDeleteAvailabilitySlot(slot.id)}
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

          <section className="client-directory" aria-label="Informacoes de clientes">
            <div className="admin-heading compact">
              <div>
                <p className="eyebrow">Clientes</p>
                <h2>Informacoes e historico rapido.</h2>
              </div>
            </div>
            <div className="client-directory-grid">
              {clientSummaries.length ? (
                clientSummaries.map((client) => (
                  <article key={client.email}>
                    <strong>{client.name}</strong>
                    <span>{client.email}</span>
                    <span>{client.phone}</span>
                    <small>
                      {client.total} atendimento(s) - ultimo: {formatFullDate(client.lastDate)} - {client.lastService}
                    </small>
                    <small className={getStatusTone(client.lastStatus)}>{statusLabels[client.lastStatus]}</small>
                  </article>
                ))
              ) : (
                <p className="empty-state">Clientes aparecem aqui apos o primeiro agendamento.</p>
              )}
            </div>
          </section>

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
                const draftSlots = getAvailabilitySlotsForDate(draft.preferredDate)
                const draftSlotValue =
                  draft.preferredTime && draft.preferredEndTime ? getSlotKey(draft.preferredTime, draft.preferredEndTime) : ''
                const statusChoices = getAdminStatusOptions(item.status)
                const bookingNotes = notesByBooking[item.id] ?? []
                const bookingEvents = eventsByBooking[item.id] ?? []

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
                          min={getTodayDate()}
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
                    <button
                      type="button"
                      className="icon-button danger"
                      disabled={updatingBookingId === item.id}
                      onClick={() => void handleBookingDelete(item.id)}
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

          <section className="notification-queue" aria-label="Fila manual de WhatsApp">
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
        </div>
      </section>
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
                    placeholder="Minimo 6 caracteres"
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
        {renderBookingSection()}
        {session ? renderCustomerSection() : null}
      </main>
    )
  }

  if (isAdminRoute) {
    return (
      <main>
        <section className="page-header-section admin-header-section">
          <div className="hero-noise" aria-hidden="true" />
          {renderTopbar()}
          <div className="page-heading">
            <p className="eyebrow">Painel privado</p>
            <h1>Controle administrativo separado da vitrine e da area da cliente.</h1>
            <p>Gerencie pedidos, status e catalogo com acesso exclusivo.</p>
          </div>
        </section>
        {renderAdminSection()}
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
            <p className="eyebrow">Hellen Martins Beauty</p>
            <h1>Sobrancelhas naturais com medida, tecnica e acabamento fino.</h1>
            <p className="hero-lede">
              Design personalizado para realcar seu olhar com naturalidade, conforto e
              acabamento delicado.
            </p>
            <div className="hero-actions">
              <button
                type="button"
                className="primary-action"
                onClick={() => (session ? goToPath(isAdmin ? '/admin' : '/cliente') : goToAuth('sign-in', 'cliente'))}
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
          <strong>A partir de R$ 10</strong>
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
              <Camera size={17} aria-hidden="true" /> @h.ellenmartins
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
                  min={getTodayDate()}
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

                    return (
                      <button
                        type="button"
                        key={slot.id}
                        className={isSelected ? 'slot-button selected' : 'slot-button'}
                        disabled={isBooked || selectedDateIsUnavailable}
                        onClick={() =>
                          setBooking({
                            ...booking,
                            preferredTime: timeLabel(slot.start_time),
                            preferredEndTime: timeLabel(slot.end_time),
                          })
                        }
                      >
                        <strong>{formatTimeRange(slot.start_time, slot.end_time)}</strong>
                        <span>{selectedDateIsUnavailable ? 'Indisponivel' : isBooked ? 'Ocupado' : 'Disponivel'}</span>
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
                        onClick={() => void handleBookingDelete(item.id)}
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
      </section>
    </main>
  )
}

export default App
