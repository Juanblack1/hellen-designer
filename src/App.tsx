import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import {
  ArrowRight,
  CalendarCheck,
  Camera,
  Clock3,
  LockKeyhole,
  Mail,
  MapPin,
  MessageCircle,
  ShieldCheck,
  Sparkles,
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

type BookingSummary = {
  id: string
  client_name: string
  service_name: string
  preferred_date: string
  preferred_time: string
  status: 'pending' | 'confirmed' | 'cancelled' | 'done'
}

type AuthMode = 'sign-in' | 'sign-up'

const instagramUrl = 'https://www.instagram.com/h.ellenmartins'
const styleReferenceUrl = 'https://www.instagram.com/micheleserigatti/'
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
  },
  {
    id: 'brow-lamination',
    name: 'Brow lamination',
    durationMinutes: 75,
    priceCents: 16000,
    description:
      'Alinhamento dos fios com acabamento editorial para sobrancelhas mais cheias e disciplinadas.',
    eyebrow: 'Lift & glow',
  },
  {
    id: 'henna-natural',
    name: 'Henna natural',
    durationMinutes: 70,
    priceCents: 12500,
    description:
      'Preenchimento delicado e personalizado para corrigir falhas mantendo textura realista.',
    eyebrow: 'Preenchimento',
  },
  {
    id: 'revitalizacao',
    name: 'Revitalizacao do olhar',
    durationMinutes: 90,
    priceCents: 19000,
    description:
      'Combo de design, nutricao dos fios e finalizacao beauty para eventos ou fotos.',
    eyebrow: 'Experiencia',
  },
]

const timeSlots = ['09:00', '10:30', '12:00', '14:00', '15:30', '17:00', '18:30']

const statusLabels: Record<BookingSummary['status'], string> = {
  pending: 'Aguardando confirmacao',
  confirmed: 'Confirmado',
  cancelled: 'Cancelado',
  done: 'Concluido',
}

function getInitialDate() {
  const date = new Date()
  date.setDate(date.getDate() + 1)
  return date.toISOString().slice(0, 10)
}

function formatPrice(priceCents?: number) {
  if (!priceCents) {
    return 'Sob consulta'
  }

  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(priceCents / 100)
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
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
  const [isSubmittingBooking, setIsSubmittingBooking] = useState(false)
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false)
  const [bookings, setBookings] = useState<BookingSummary[]>([])
  const [bookingRefreshKey, setBookingRefreshKey] = useState(0)

  useEffect(() => {
    const client = supabase

    if (!client) {
      return
    }

    let isMounted = true

    void client.auth.getSession().then(({ data }) => {
      if (isMounted) {
        setSession(data.session)
      }
    })

    const { data } = client.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
    })

    return () => {
      isMounted = false
      data.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    const client = supabase

    if (!client) {
      return
    }

    let isMounted = true

    void client
      .from('service_catalog')
      .select('id,name,duration_minutes,price_cents,description')
      .eq('active', true)
      .order('sort_order', { ascending: true })
      .then(({ data, error }) => {
        if (!isMounted || error || !data?.length) {
          return
        }

        setServices(
          data.map((service, index) => ({
            id: service.id,
            name: service.name,
            durationMinutes: service.duration_minutes,
            priceCents: service.price_cents ?? undefined,
            description: service.description,
            eyebrow: serviceSeeds[index % serviceSeeds.length].eyebrow,
          })),
        )
      })

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    const client = supabase

    if (!client || !session) {
      return
    }

    let isMounted = true

    void client
      .from('bookings')
      .select('id,client_name,service_name,preferred_date,preferred_time,status')
      .order('preferred_date', { ascending: true })
      .order('preferred_time', { ascending: true })
      .limit(12)
      .then(({ data, error }) => {
        if (isMounted && !error) {
          setBookings((data ?? []) as BookingSummary[])
        }
      })

    return () => {
      isMounted = false
    }
  }, [session, bookingRefreshKey])

  const selectedService =
    services.find((service) => service.id === booking.serviceId) ?? services[0]
  const whatsappLink = buildWhatsAppLink(booking, selectedService.name)
  const bookingEmail = booking.email || session?.user.email || ''
  const visibleBookings = session ? bookings : []

  async function handleBookingSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBookingStatus('')
    const client = supabase

    if (!client) {
      setBookingStatus(
        'Supabase ainda nao foi configurado neste ambiente. Use o WhatsApp ou configure as variaveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.',
      )
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

  async function handleAuthSubmit(event: React.FormEvent<HTMLFormElement>) {
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
    setAuthStatus('Sessao encerrada.')
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
        </nav>

        <div className="hero-grid">
          <div className="hero-copy">
            <p className="eyebrow">Beauty studio para sobrancelhas naturais</p>
            <h1>Design de sobrancelhas com leitura facial e acabamento editorial.</h1>
            <p className="hero-lede">
              Um site de agendamento para transformar interesse do Instagram em horarios
              organizados, com visual sofisticado e atendimento humano.
            </p>
            <div className="hero-actions">
              <a className="primary-action" href="#agenda">
                Agendar agora
                <ArrowRight size={18} aria-hidden="true" />
              </a>
              <a className="ghost-action" href={styleReferenceUrl} target="_blank" rel="noreferrer">
                Referencia visual
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
              <span>Tratamento assinatura</span>
              <strong>Brow Glow</strong>
              <small>Design + finalizacao + plano de crescimento</small>
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
          <span>Lead salvo no Supabase e protegido por politicas</span>
        </article>
      </section>

      <section className="services-section" id="servicos">
        <div className="section-heading">
          <p className="eyebrow">Menu de atendimento</p>
          <h2>Servicos criados para um olhar limpo, expressivo e moderno.</h2>
        </div>
        <div className="service-grid">
          {services.map((service) => (
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
            O pedido entra como pendente. A profissional confirma o melhor horario pelo
            WhatsApp ou email, mantendo a agenda organizada no Supabase.
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
              value={booking.serviceId}
              onChange={(event) => setBooking({ ...booking, serviceId: event.target.value })}
            >
              {services.map((service) => (
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
            <button type="submit" disabled={isSubmittingBooking}>
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
            <h2>Acompanhe os pedidos com login Supabase.</h2>
            <p>
              Clientes autenticadas veem seus proprios agendamentos. Uma conta marcada como
              admin no banco consegue visualizar todos os pedidos para operar a agenda.
            </p>
          </div>

          {session ? (
            <div className="session-box">
              <LockKeyhole size={22} aria-hidden="true" />
              <span>Logado como</span>
              <strong>{session.user.email}</strong>
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

        <div className="booking-list" aria-live="polite">
          <div className="section-heading compact">
            <p className="eyebrow">Pedidos recentes</p>
            <h2>{session ? 'Agenda protegida' : 'Entre para visualizar'}</h2>
          </div>
          {visibleBookings.length ? (
            <div className="booking-items">
              {visibleBookings.map((item) => (
                <article key={item.id}>
                  <time dateTime={item.preferred_date}>{formatDate(item.preferred_date)}</time>
                  <div>
                    <strong>{item.client_name}</strong>
                    <span>
                      {item.service_name} as {item.preferred_time.slice(0, 5)}
                    </span>
                  </div>
                  <small>{statusLabels[item.status]}</small>
                </article>
              ))}
            </div>
          ) : (
            <p className="empty-state">
              {session
                ? 'Nenhum agendamento visivel para esta conta ainda.'
                : 'A listagem aparece depois do login e respeita as politicas RLS.'}
            </p>
          )}
        </div>
      </section>
    </main>
  )
}

export default App
