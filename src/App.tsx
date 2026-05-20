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
import { isSupabaseConfigured, supabase } from './lib/supabase'
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
  email: string
  phone: string
  serviceId: string
  preferredDate: string
  preferredTime: string
  notes: string
}

type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'done'
type AdminStatusFilter = BookingStatus | 'all'

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

type ServiceDraft = {
  name: string
  durationMinutes: string
  priceCents: string
  description: string
  active: boolean
  sortOrder: string
}

type AuthMode = 'sign-in' | 'sign-up'

const instagramUrl = 'https://www.instagram.com/h.ellenmartins'
const whatsappNumber = import.meta.env.VITE_BOOKING_WHATSAPP ?? ''

const serviceSeeds: ServiceOption[] = [
  {
    id: 'design-estrategico',
    name: 'Design estrategico',
    durationMinutes: 60,
    priceCents: 9500,
    description:
      'Mapeamento facial, limpeza precisa e finalizacao natural para valorizar o olhar sem pesar.',
    eyebrow: 'Sob medida',
    active: true,
    sortOrder: 10,
  },
  {
    id: 'brow-lamination',
    name: 'Brow lamination',
    durationMinutes: 75,
    priceCents: 16000,
    description:
      'Alinhamento dos fios com acabamento editorial para sobrancelhas mais cheias e disciplinadas.',
    eyebrow: 'Lift & glow',
    active: true,
    sortOrder: 20,
  },
  {
    id: 'henna-natural',
    name: 'Henna natural',
    durationMinutes: 70,
    priceCents: 12500,
    description:
      'Preenchimento delicado e personalizado para corrigir falhas mantendo textura realista.',
    eyebrow: 'Preenchimento',
    active: true,
    sortOrder: 30,
  },
  {
    id: 'revitalizacao',
    name: 'Revitalizacao do olhar',
    durationMinutes: 90,
    priceCents: 19000,
    description:
      'Combo de design, nutricao dos fios e finalizacao beauty para eventos ou fotos.',
    eyebrow: 'Experiencia',
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

function buildWhatsAppLink(booking: BookingForm, serviceName: string) {
  if (!whatsappNumber) {
    return ''
  }

  const message = [
    'Oi, quero agendar um atendimento de sobrancelhas.',
    `Nome: ${booking.name}`,
    `Servico: ${serviceName}`,
    `Data: ${booking.preferredDate}`,
    `Horario: ${booking.preferredTime}`,
  ].join('\n')

  return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`
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
  const [services, setServices] = useState<ServiceOption[]>(serviceSeeds)
  const [booking, setBooking] = useState<BookingForm>({
    name: '',
    email: '',
    phone: '',
    serviceId: serviceSeeds[0].id,
    preferredDate: getInitialDate(),
    preferredTime: timeSlots[1],
    notes: '',
  })
  const [session, setSession] = useState<Session | null>(null)
  const [authMode, setAuthMode] = useState<AuthMode>('sign-in')
  const [authForm, setAuthForm] = useState({ email: '', password: '' })
  const [authStatus, setAuthStatus] = useState('')
  const [bookingStatus, setBookingStatus] = useState('')
  const [bookingActionStatus, setBookingActionStatus] = useState('')
  const [serviceActionStatus, setServiceActionStatus] = useState('')
  const [isSubmittingBooking, setIsSubmittingBooking] = useState(false)
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [bookings, setBookings] = useState<BookingRecord[]>([])
  const [bookingRefreshKey, setBookingRefreshKey] = useState(0)
  const [serviceRefreshKey, setServiceRefreshKey] = useState(0)
  const [adminStatusFilter, setAdminStatusFilter] = useState<AdminStatusFilter>('all')
  const [bookingSearch, setBookingSearch] = useState('')
  const [serviceDrafts, setServiceDrafts] = useState<Record<string, ServiceDraft>>({})
  const [newService, setNewService] = useState<ServiceDraft>(() => createEmptyServiceDraft())
  const [savingServiceId, setSavingServiceId] = useState('')
  const [updatingBookingId, setUpdatingBookingId] = useState('')

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
        }
      }
    })

    const { data } = client.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      if (!nextSession) {
        setIsAdmin(false)
        setBookings([])
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

  const bookableServices = services.filter((service) => service.active)
  const selectedService =
    bookableServices.find((service) => service.id === booking.serviceId) ??
    bookableServices[0] ??
    serviceSeeds[0]
  const whatsappLink = buildWhatsAppLink(booking, selectedService.name)
  const bookingEmail = booking.email || session?.user.email || ''
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

  async function handleBookingSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBookingStatus('')
    const client = supabase

    if (!client) {
      setBookingStatus(
        'Supabase ainda nao foi configurado neste ambiente. Use o WhatsApp ou configure as variaveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.',
      )
      return
    }

    if (!bookableServices.length) {
      setBookingStatus('Nenhum servico ativo esta disponivel para agendamento agora.')
      return
    }

    setIsSubmittingBooking(true)

    const { error } = await client.from('bookings').insert({
      user_id: session?.user.id ?? null,
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
      setBookingStatus(`Nao foi possivel salvar o agendamento: ${error.message}`)
      return
    }

    setBookingStatus('Pedido enviado. A confirmacao chega por WhatsApp ou email.')
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
      setAuthStatus('Supabase ainda nao foi configurado neste ambiente.')
      return
    }

    setIsSubmittingAuth(true)
    const credentials = {
      email: authForm.email.trim().toLowerCase(),
      password: authForm.password,
    }
    const { error } =
      authMode === 'sign-in'
        ? await client.auth.signInWithPassword(credentials)
        : await client.auth.signUp(credentials)

    setIsSubmittingAuth(false)

    if (error) {
      setAuthStatus(error.message)
      return
    }

    setAuthStatus(
      authMode === 'sign-in'
        ? 'Login realizado com seguranca.'
        : 'Conta criada. Confira o email se a confirmacao estiver ativa.',
    )
    setAuthForm({ email: '', password: '' })
  }

  async function handleSignOut() {
    const client = supabase

    if (!client) {
      return
    }

    await client.auth.signOut()
    setBookings([])
    setIsAdmin(false)
    setAuthStatus('Sessao encerrada.')
  }

  function focusAuth(mode: AuthMode) {
    setAuthMode(mode)
    setAuthStatus('')
    document.getElementById('cliente')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
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

  return (
    <main>
      <section className="hero-section" id="inicio">
        <div className="hero-noise" aria-hidden="true" />
        <nav className="topbar" aria-label="Navegacao principal">
          <a className="brand" href="#inicio" aria-label="Hellen Martins Brows">
            <span>HM</span>
            <strong>Hellen Martins Brows</strong>
          </a>
          <div className="nav-links">
            <a href="#servicos">Servicos</a>
            <a href="#agenda">Agenda</a>
            <a href="#cliente">Cliente</a>
            <a href={instagramUrl} target="_blank" rel="noreferrer">
              Instagram
            </a>
          </div>
          <div className="header-auth" aria-label="Acesso da cliente">
            {session ? (
              <button type="button" className="header-signin" onClick={() => focusAuth('sign-in')}>
                {isAdmin ? 'Painel admin' : 'Minha agenda'}
              </button>
            ) : (
              <>
                <button type="button" className="header-signin" onClick={() => focusAuth('sign-in')}>
                  Entrar
                </button>
                <button type="button" className="header-signup" onClick={() => focusAuth('sign-up')}>
                  Criar conta
                </button>
              </>
            )}
          </div>
        </nav>

        <div className="hero-grid">
          <div className="hero-copy">
            <p className="eyebrow">Beauty studio para sobrancelhas naturais</p>
            <h1>Design de sobrancelhas com leitura facial e acabamento editorial.</h1>
            <p className="hero-lede">
              Agendamento claro para clientes e painel seguro para a Hellen confirmar pedidos,
              organizar status e ajustar servicos em poucos cliques.
            </p>
            <div className="hero-actions">
              <a className="primary-action" href="#agenda">
                Agendar agora
                <ArrowRight size={18} aria-hidden="true" />
              </a>
            </div>
            <div className="trust-row" aria-label="Diferenciais">
              <span>
                <Sparkles size={16} aria-hidden="true" /> Mapeamento personalizado
              </span>
              <span>
                <ShieldCheck size={16} aria-hidden="true" /> Dados protegidos por RLS
              </span>
            </div>
          </div>

          <div className="hero-visual" aria-label="Ilustracao editorial de sobrancelhas">
            <div className="portrait-frame generated-portrait">
              <img src={browAtelier} alt="Imagem editorial original para Hellen Martins Brows" />
              <div className="appointment-card glass-card">
                <CalendarCheck size={18} aria-hidden="true" />
                <span>Agenda aberta</span>
                <strong>Ter a Sab</strong>
              </div>
            </div>
            <div className="metric-card glass-card">
              <span>Painel seguro</span>
              <strong>Admin</strong>
              <small>Status, clientes e servicos protegidos por perfil</small>
            </div>
          </div>
        </div>
      </section>

      <section className="proof-strip" aria-label="Resumo da experiencia">
        <article>
          <strong>45-90 min</strong>
          <span>Atendimento com tempo real para simetria</span>
        </article>
        <article>
          <strong>Sem copiar formato</strong>
          <span>Desenho guiado pelo rosto e estilo da cliente</span>
        </article>
        <article>
          <strong>Agenda online</strong>
          <span>Cliente acompanha pedidos e admin organiza tudo no Supabase</span>
        </article>
      </section>

      <section className="services-section" id="servicos">
        <div className="section-heading">
          <p className="eyebrow">Menu de atendimento</p>
          <h2>Servicos criados para um olhar limpo, expressivo e moderno.</h2>
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
          <h2>Escolha o servico e envie sua preferencia de horario.</h2>
          <p>
            O pedido entra como pendente. A profissional confirma o melhor horario pelo WhatsApp
            ou email, mantendo a agenda organizada no Supabase.
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
              Email
              <input
                required
                type="email"
                value={bookingEmail}
                onChange={(event) => setBooking({ ...booking, email: event.target.value })}
                placeholder="voce@email.com"
              />
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
          <div className="form-row">
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
            <label>
              Horario
              <select
                value={booking.preferredTime}
                onChange={(event) => setBooking({ ...booking, preferredTime: event.target.value })}
              >
                {timeSlots.map((slot) => (
                  <option key={slot} value={slot}>
                    {slot}
                  </option>
                ))}
              </select>
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
          <div className="form-actions">
            <button type="submit" disabled={isSubmittingBooking || !bookableServices.length}>
              {isSubmittingBooking ? 'Enviando...' : 'Enviar pedido'}
            </button>
            {whatsappLink ? (
              <a href={whatsappLink} target="_blank" rel="noreferrer">
                <MessageCircle size={17} aria-hidden="true" /> WhatsApp
              </a>
            ) : null}
          </div>
          <p className="form-status" role="status" aria-live="polite">
            {bookingStatus ||
              (isSupabaseConfigured
                ? 'Ambiente conectado ao Supabase.'
                : 'Configure as variaveis de ambiente para ativar o banco.')}
          </p>
        </form>
      </section>

      <section className="client-section" id="cliente">
        <div className="client-card">
          <div>
            <p className="eyebrow">Area segura</p>
            <h2>{isAdmin ? 'Painel privado da Hellen.' : 'Seu primeiro acesso sem complicacao.'}</h2>
            <p>
              Crie uma conta ou entre com email e senha para acompanhar seus pedidos. Contas
              marcadas como admin no banco liberam o controle completo da agenda e dos servicos.
            </p>
            <div className="first-steps" aria-label="Como funciona o acesso">
              <span>
                <CheckCircle2 size={16} aria-hidden="true" /> Agende sem precisar criar conta
              </span>
              <span>
                <CheckCircle2 size={16} aria-hidden="true" /> Entre para ver seus pedidos
              </span>
              <span>
                <CheckCircle2 size={16} aria-hidden="true" /> Admin confirma, conclui ou cancela
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
            <form className="auth-form" onSubmit={handleAuthSubmit}>
              <div className="auth-tabs" role="group" aria-label="Modo de acesso">
                <button
                  type="button"
                  className={authMode === 'sign-in' ? 'active' : ''}
                  onClick={() => setAuthMode('sign-in')}
                >
                  Entrar
                </button>
                <button
                  type="button"
                  className={authMode === 'sign-up' ? 'active' : ''}
                  onClick={() => setAuthMode('sign-up')}
                >
                  Criar conta
                </button>
              </div>
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
              <label>
                Senha
                <input
                  required
                  minLength={6}
                  type="password"
                  value={authForm.password}
                  onChange={(event) => setAuthForm({ ...authForm, password: event.target.value })}
                  placeholder="Minimo 6 caracteres"
                />
              </label>
              <button type="submit" disabled={isSubmittingAuth}>
                {isSubmittingAuth
                  ? 'Processando...'
                  : authMode === 'sign-in'
                    ? 'Entrar com seguranca'
                    : 'Criar acesso'}
              </button>
              <p className="form-status" role="status" aria-live="polite">
                {authStatus}
              </p>
            </form>
          )}
        </div>

        {session && isAdmin ? (
          <div className="admin-panel" aria-live="polite">
            <div className="admin-heading">
              <div>
                <p className="eyebrow">Painel admin</p>
                <h2>Agenda completa com filtros e status.</h2>
                <p>
                  Visualize todos os pedidos protegidos por RLS, confirme horarios, finalize
                  atendimentos e pause servicos sem mexer no banco manualmente.
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
              <p className="empty-state">
                Nenhum pedido encontrado para os filtros atuais.
              </p>
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
                    onChange={(event) =>
                      setNewService({ ...newService, priceCents: event.target.value })
                    }
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
                    onChange={(event) =>
                      setNewService({ ...newService, description: event.target.value })
                    }
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
                    <article className={!draft.active ? 'service-editor-card is-paused' : 'service-editor-card'} key={service.id}>
                      <div className="service-editor-head">
                        <strong>{service.id}</strong>
                        <label className="toggle-label">
                          <input
                            type="checkbox"
                            checked={draft.active}
                            onChange={(event) =>
                              updateServiceDraft(service.id, { active: event.target.checked })
                            }
                          />
                          Ativo
                        </label>
                      </div>
                      <div className="service-editor-grid">
                        <label>
                          Nome
                          <input
                            value={draft.name}
                            onChange={(event) =>
                              updateServiceDraft(service.id, { name: event.target.value })
                            }
                          />
                        </label>
                        <label>
                          Preco
                          <input
                            inputMode="decimal"
                            value={draft.priceCents}
                            onChange={(event) =>
                              updateServiceDraft(service.id, { priceCents: event.target.value })
                            }
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
                            onChange={(event) =>
                              updateServiceDraft(service.id, { sortOrder: event.target.value })
                            }
                          />
                        </label>
                        <label className="wide-field">
                          Descricao
                          <textarea
                            rows={2}
                            value={draft.description}
                            onChange={(event) =>
                              updateServiceDraft(service.id, { description: event.target.value })
                            }
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
              <h2>{session ? 'Minha agenda protegida' : 'Entre para visualizar'}</h2>
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
                  ? 'Nenhum agendamento visivel para esta conta ainda. Envie seu primeiro pedido acima e acompanhe o status aqui.'
                  : 'A listagem aparece depois do login e respeita as politicas RLS.'}
              </p>
            )}
          </div>
        )}
      </section>
    </main>
  )
}

export default App
