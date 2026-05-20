import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import type { Session } from '@supabase/supabase-js'
import {
  ArrowRight,
  CalendarCheck,
  Camera,
  CheckCircle2,
  Clock3,
  Filter,
  LockKeyhole,
  Mail,
  MapPin,
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
  notes: string
}

type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'done'
type AdminStatusFilter = BookingStatus | 'all'
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
  notes: string | null
  status: BookingStatus
  source: string
}

type BookedSlotRow = {
  preferred_time: string
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

const timeSlots = ['09:00', '10:30', '12:00', '14:00', '15:30', '17:00', '18:30']

const statusLabels: Record<BookingStatus, string> = {
  pending: 'Aguardando confirmacao',
  confirmed: 'Confirmado',
  cancelled: 'Cancelado',
  done: 'Concluido',
}

const statusOptions: BookingStatus[] = ['pending', 'confirmed', 'done', 'cancelled']

function getInitialDate() {
  const date = new Date()
  date.setDate(date.getDate() + 1)
  return date.toISOString().slice(0, 10)
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

function getAuthRedirectUrl(mode: AuthMode = 'sign-in') {
  return `${window.location.origin}/auth?mode=${mode}`
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
    preferredTime: timeSlots[1],
    notes: '',
  })
  const [session, setSession] = useState<Session | null>(null)
  const [authMode, setAuthMode] = useState<AuthMode>(() => getInitialAuthMode())
  const [authForm, setAuthForm] = useState({ email: '', password: '' })
  const [authStatus, setAuthStatus] = useState('')
  const [bookingStatus, setBookingStatus] = useState('')
  const [bookingActionStatus, setBookingActionStatus] = useState('')
  const [serviceActionStatus, setServiceActionStatus] = useState('')
  const [isSubmittingBooking, setIsSubmittingBooking] = useState(false)
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [bookings, setBookings] = useState<BookingRecord[]>([])
  const [bookedSlots, setBookedSlots] = useState<string[]>([])
  const [bookingRefreshKey, setBookingRefreshKey] = useState(0)
  const [serviceRefreshKey, setServiceRefreshKey] = useState(0)
  const [adminStatusFilter, setAdminStatusFilter] = useState<AdminStatusFilter>('all')
  const [bookingSearch, setBookingSearch] = useState('')
  const [serviceDrafts, setServiceDrafts] = useState<Record<string, ServiceDraft>>({})
  const [newService, setNewService] = useState<ServiceDraft>(() => createEmptyServiceDraft())
  const [savingServiceId, setSavingServiceId] = useState('')
  const [updatingBookingId, setUpdatingBookingId] = useState('')

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
        }
      }
    })

    const { data } = client.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession)
      if (!nextSession) {
        setIsAdmin(false)
        setBookings([])
        setBookedSlots([])
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
        'id,created_at,updated_at,user_id,client_name,client_email,client_phone,service_id,service_name,preferred_date,preferred_time,notes,status,source',
      )
      .order('preferred_date', { ascending: true })
      .order('preferred_time', { ascending: true })
      .limit(isAdmin ? 100 : 12)
      .then(({ data, error }) => {
        if (!isMounted) {
          return
        }

        if (!error) {
          setBookings((data ?? []) as BookingRecord[])
        }
      })

    return () => {
      isMounted = false
    }
  }, [session, isAdmin, bookingRefreshKey])

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
          ((data ?? []) as BookedSlotRow[]).map((slot) => slot.preferred_time.slice(0, 5)),
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
  const selectedSlotIsBooked = bookedSlots.includes(booking.preferredTime)
  const availableSlots = timeSlots.filter((slot) => !bookedSlots.includes(slot))
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

    if (selectedSlotIsBooked) {
      setBookingStatus('Esse horario ja foi reservado. Escolha outro horario disponivel.')
      return
    }

    setIsSubmittingBooking(true)
    const { error } = await client.from('bookings').insert({
      user_id: session.user.id,
      client_name: booking.name.trim(),
      client_email: bookingEmail.trim().toLowerCase(),
      client_phone: booking.phone.trim(),
      service_id: selectedService.id,
      service_name: selectedService.name,
      preferred_date: booking.preferredDate,
      preferred_time: booking.preferredTime,
      notes: booking.notes.trim() || null,
      source: 'site',
    })

    setIsSubmittingBooking(false)

    if (error) {
      const conflictMessage = error.message.toLowerCase().includes('duplicate')
        ? 'Esse horario acabou de ser reservado. Escolha outro horario disponivel.'
        : `Nao foi possivel solicitar o horario: ${error.message}`
      setBookingStatus(conflictMessage)
      return
    }

    setBookingStatus('Horario solicitado. A confirmacao chega por WhatsApp ou email.')
    setBooking((current) => ({
      ...current,
      name: '',
      phone: '',
      notes: '',
      preferredDate: getInitialDate(),
    }))
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
    setIsAdmin(false)
    setAuthStatus('Sessao encerrada.')
  }

  async function handleBookingStatusChange(bookingId: string, status: BookingStatus) {
    const client = supabase

    if (!client || !isAdmin) {
      return
    }

    setUpdatingBookingId(bookingId)
    setBookingActionStatus('')
    const { error } = await client
      .from('bookings')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', bookingId)
    setUpdatingBookingId('')

    if (error) {
      setBookingActionStatus(`Nao foi possivel atualizar o pedido: ${error.message}`)
      return
    }

    setBookingActionStatus('Status atualizado.')
    setBookings((current) =>
      current.map((item) => (item.id === bookingId ? { ...item, status } : item)),
    )
    setBookingRefreshKey((key) => key + 1)
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
            <button type="button" className="header-signin" onClick={() => goToPath(isAdmin ? '/admin' : '/cliente')}>
              {isAdmin ? 'Painel admin' : 'Minha agenda'}
            </button>
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
              <label>
                Data desejada
                <input
                  required
                  type="date"
                  min={getInitialDate()}
                  value={booking.preferredDate}
                  onChange={(event) => setBooking({ ...booking, preferredDate: event.target.value })}
                />
              </label>
              <div className="slot-picker" aria-label="Horarios disponiveis">
                {timeSlots.map((slot) => {
                  const isBooked = bookedSlots.includes(slot)
                  const isSelected = booking.preferredTime === slot

                  return (
                    <button
                      type="button"
                      key={slot}
                      className={isSelected ? 'slot-button selected' : 'slot-button'}
                      disabled={isBooked}
                      onClick={() => setBooking({ ...booking, preferredTime: slot })}
                    >
                      <strong>{slot}</strong>
                      <span>{isBooked ? 'Ocupado' : 'Disponivel'}</span>
                    </button>
                  )
                })}
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
                  !availableSlots.length
                }
              >
                {isSubmittingBooking ? 'Solicitando...' : 'Solicitar horario'}
              </button>
            </div>
            <p className="form-status" role="status" aria-live="polite">
              {bookingStatus ||
                (availableSlots.length
                  ? 'Voce recebera a confirmacao pelo WhatsApp ou email.'
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
                {customerBookings.map((item) => (
                  <article key={item.id}>
                    <time dateTime={item.preferred_date}>{formatDate(item.preferred_date)}</time>
                    <div>
                      <strong>{item.client_name}</strong>
                      <span>
                        {item.service_name} as {item.preferred_time.slice(0, 5)}
                      </span>
                    </div>
                    <small className={getStatusTone(item.status)}>{statusLabels[item.status]}</small>
                  </article>
                ))}
              </div>
            ) : (
              <p className="empty-state">
                Nenhum agendamento para esta conta ainda. Escolha um horario acima e acompanhe o
                status aqui.
              </p>
            )}
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
                        {item.service_name} as {item.preferred_time.slice(0, 5)}
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
                  min={getInitialDate()}
                  value={booking.preferredDate}
                  onChange={(event) => setBooking({ ...booking, preferredDate: event.target.value })}
                />
              </label>
              <div className="slot-picker" aria-label="Horarios disponiveis">
                {timeSlots.map((slot) => {
                  const isBooked = bookedSlots.includes(slot)
                  const isSelected = booking.preferredTime === slot

                  return (
                    <button
                      type="button"
                      key={slot}
                      className={isSelected ? 'slot-button selected' : 'slot-button'}
                      disabled={isBooked}
                      onClick={() => setBooking({ ...booking, preferredTime: slot })}
                    >
                      <strong>{slot}</strong>
                      <span>{isBooked ? 'Ocupado' : 'Disponivel'}</span>
                    </button>
                  )
                })}
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
                  !availableSlots.length
                }
              >
                {isSubmittingBooking ? 'Solicitando...' : 'Solicitar horario'}
              </button>
            </div>
            <p className="form-status" role="status" aria-live="polite">
              {bookingStatus ||
                (availableSlots.length
                  ? 'Voce recebera a confirmacao pelo WhatsApp ou email.'
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
                          {item.service_name} as {item.preferred_time.slice(0, 5)}
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
                        {item.service_name} as {item.preferred_time.slice(0, 5)}
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
