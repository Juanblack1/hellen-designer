import { useEffect, useMemo, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import type { Session } from '@supabase/supabase-js'
import {
  CalendarDays,
  Camera,
  CheckCircle2,
  Clock3,
  Eye,
  EyeOff,
  LogOut,
  MessageCircle,
  Phone,
  Plus,
  Save,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserRound,
  Wallet,
  XCircle,
} from 'lucide-react'
import brandBanner from './assets/hellen-brand-banner.svg'
import portraitImage from './assets/hellen-brows-chatgpt-image.png'
import careCardImage from './assets/hellen-care-card.svg'
import brandLogo from './assets/hellen-martins-logo.svg'
import {
  buildWhatsAppUrl,
  calculateAdminStats,
  centsToInputValue,
  defaultAppointments,
  defaultClients,
  defaultGallery,
  defaultProfile,
  defaultServices,
  formatCurrency,
  getPaymentState,
  parseCurrencyToCents,
  sortByOrder,
} from './domain'
import type {
  AppointmentRecord,
  AppointmentStatus,
  BusinessProfile,
  ClientRecord,
  GalleryItem,
  PaymentMethod,
  ServiceItem,
} from './domain'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import './App.css'

type AdminTab = 'today' | 'agenda' | 'clients' | 'finance' | 'landing' | 'services' | 'photos'

type AppointmentDraft = {
  clientName: string
  clientPhone: string
  serviceId: string
  scheduledDate: string
  startTime: string
  status: AppointmentStatus
  chargedAmount: string
  receivedAmount: string
  paymentMethod: PaymentMethod
  notes: string
}

type AuthDraft = {
  email: string
  password: string
}

type ServiceDraft = {
  name: string
  description: string
  durationMinutes: string
  price: string
  published: boolean
}

type GalleryDraft = {
  title: string
  imageUrl: string
  altText: string
  file: File | null
}

const todayIso = () => new Date().toISOString().slice(0, 10)

const adminTabs: Array<{ id: AdminTab; label: string }> = [
  { id: 'today', label: 'Hoje' },
  { id: 'agenda', label: 'Agenda' },
  { id: 'clients', label: 'Clientes' },
  { id: 'finance', label: 'Financeiro' },
  { id: 'landing', label: 'Landing' },
  { id: 'services', label: 'Servicos' },
  { id: 'photos', label: 'Fotos' },
]

const statusLabels: Record<AppointmentStatus, string> = {
  scheduled: 'Marcado',
  confirmed: 'Confirmado',
  completed: 'Concluido',
  no_show: 'Nao compareceu',
  canceled: 'Cancelado',
}

const paymentMethodLabels: Record<PaymentMethod, string> = {
  pix: 'Pix',
  cash: 'Dinheiro',
  debit_card: 'Debito',
  credit_card: 'Credito',
}

const assetMap: Record<string, string> = {
  brandBanner,
  brandLogo,
  careCard: careCardImage,
  portrait: portraitImage,
}

function newAppointmentDraft(services: ServiceItem[]): AppointmentDraft {
  const firstService = services[0] ?? defaultServices[0]

  return {
    clientName: '',
    clientPhone: '',
    serviceId: firstService.id,
    scheduledDate: todayIso(),
    startTime: '09:00',
    status: 'scheduled',
    chargedAmount: centsToInputValue(firstService.price_cents),
    receivedAmount: '0,00',
    paymentMethod: 'pix',
    notes: '',
  }
}

function resolveImageUrl(path: string) {
  if (assetMap[path]) {
    return assetMap[path]
  }

  if (path.startsWith('http') || path.startsWith('data:') || path.startsWith('/')) {
    return path
  }

  if (supabase) {
    return supabase.storage.from('landing-media').getPublicUrl(path).data.publicUrl
  }

  return brandBanner
}

function getServiceMessage(service: ServiceItem) {
  return `Ola Hellen, quero saber sobre ${service.name} (${formatCurrency(service.price_cents)}).`
}

function getGeneralMessage() {
  return 'Ola Hellen, vim pelo Instagram/site e quero agendar um horario.'
}

function App() {
  const [route, setRoute] = useState(() => window.location.pathname)
  const [session, setSession] = useState<Session | null>(null)
  const [authDraft, setAuthDraft] = useState<AuthDraft>({ email: '', password: '' })
  const [authStatus, setAuthStatus] = useState('')
  const [isAdmin, setIsAdmin] = useState(!isSupabaseConfigured)
  const [isAuthLoading, setIsAuthLoading] = useState(isSupabaseConfigured)

  const [profile, setProfile] = useState<BusinessProfile>(defaultProfile)
  const [services, setServices] = useState<ServiceItem[]>(defaultServices)
  const [gallery, setGallery] = useState<GalleryItem[]>(defaultGallery)
  const [clients, setClients] = useState<ClientRecord[]>(defaultClients)
  const [appointments, setAppointments] = useState<AppointmentRecord[]>(defaultAppointments)
  const [dataStatus, setDataStatus] = useState('')

  const [activeTab, setActiveTab] = useState<AdminTab>('today')
  const [searchTerm, setSearchTerm] = useState('')
  const [appointmentDraft, setAppointmentDraft] = useState<AppointmentDraft>(() => newAppointmentDraft(defaultServices))
  const [newService, setNewService] = useState<ServiceDraft>({
    name: '',
    description: '',
    durationMinutes: '45',
    price: '0,00',
    published: true,
  })
  const [galleryDraft, setGalleryDraft] = useState<GalleryDraft>({
    title: '',
    imageUrl: '',
    altText: '',
    file: null,
  })
  const [selectedAppointmentId, setSelectedAppointmentId] = useState(defaultAppointments[0]?.id ?? '')
  const [isSaving, setIsSaving] = useState(false)

  const isAdminRoute = route.startsWith('/admin') || route === '/auth'
  const publishedServices = useMemo(
    () => sortByOrder(services.filter((service) => service.active && service.published)),
    [services],
  )
  const publishedGallery = useMemo(
    () => sortByOrder(gallery.filter((item) => item.published)),
    [gallery],
  )
  const sortedAppointments = useMemo(
    () =>
      [...appointments].sort((a, b) =>
        `${a.scheduled_date} ${a.start_time}`.localeCompare(`${b.scheduled_date} ${b.start_time}`),
      ),
    [appointments],
  )
  const todaysAppointments = useMemo(
    () => sortedAppointments.filter((appointment) => appointment.scheduled_date === todayIso()),
    [sortedAppointments],
  )
  const stats = useMemo(() => calculateAdminStats(appointments, todayIso()), [appointments])
  const selectedAppointment = appointments.find((appointment) => appointment.id === selectedAppointmentId) ?? appointments[0]
  const selectedClient = selectedAppointment
    ? clients.find((client) => client.id === selectedAppointment.client_id || client.phone === selectedAppointment.client_phone)
    : null
  const filteredClients = clients.filter((client) => {
    const search = searchTerm.toLowerCase()
    return client.full_name.toLowerCase().includes(search) || client.phone.includes(search)
  })

  function goToPath(path: string) {
    window.history.pushState(null, '', path)
    setRoute(path)
    window.scrollTo({ top: 0 })
  }

  async function loadPublicData() {
    if (!supabase) {
      return
    }

    const [profileResult, serviceResult, galleryResult] = await Promise.all([
      supabase.from('business_profile').select('*').eq('id', 'default').maybeSingle(),
      supabase
        .from('services')
        .select('*')
        .eq('active', true)
        .eq('published', true)
        .order('sort_order', { ascending: true }),
      supabase.from('gallery_items').select('*').eq('published', true).order('sort_order', { ascending: true }),
    ])

    if (profileResult.data) {
      setProfile(profileResult.data as BusinessProfile)
    }

    if (serviceResult.data?.length) {
      setServices(serviceResult.data as ServiceItem[])
      setAppointmentDraft(newAppointmentDraft(serviceResult.data as ServiceItem[]))
    }

    if (galleryResult.data?.length) {
      setGallery(galleryResult.data as GalleryItem[])
    }

    if (profileResult.error || serviceResult.error || galleryResult.error) {
      setDataStatus('Nao foi possivel carregar tudo do Supabase. Mantive conteudo padrao.')
    }
  }

  async function checkAdminAccess(currentSession: Session) {
    if (!supabase) {
      return
    }

    const { data, error } = await supabase
      .from('admin_profiles')
      .select('user_id,role')
      .eq('user_id', currentSession.user.id)
      .maybeSingle()

    setIsAdmin(Boolean(data) && !error)
  }

  async function loadAdminData() {
    if (!supabase) {
      return
    }

    const [profileResult, serviceResult, galleryResult, clientResult, appointmentResult] = await Promise.all([
      supabase.from('business_profile').select('*').eq('id', 'default').maybeSingle(),
      supabase.from('services').select('*').order('sort_order', { ascending: true }),
      supabase.from('gallery_items').select('*').order('sort_order', { ascending: true }),
      supabase.from('clients').select('*').order('full_name', { ascending: true }),
      supabase.from('appointments').select('*').order('scheduled_date', { ascending: true }),
    ])

    if (profileResult.data) {
      setProfile(profileResult.data as BusinessProfile)
    }

    if (serviceResult.data) {
      setServices(serviceResult.data as ServiceItem[])
    }

    if (galleryResult.data) {
      setGallery(galleryResult.data as GalleryItem[])
    }

    if (clientResult.data) {
      setClients(clientResult.data as ClientRecord[])
    }

    if (appointmentResult.data) {
      setAppointments(appointmentResult.data as AppointmentRecord[])
      setSelectedAppointmentId((appointmentResult.data[0] as AppointmentRecord | undefined)?.id ?? '')
    }

    if (
      profileResult.error ||
      serviceResult.error ||
      galleryResult.error ||
      clientResult.error ||
      appointmentResult.error
    ) {
      setDataStatus('Alguns dados do admin nao carregaram. Confira schema e permissoes.')
    }
  }

  useEffect(() => {
    const handlePopState = () => setRoute(window.location.pathname)
    window.addEventListener('popstate', handlePopState)

    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  useEffect(() => {
    if (!supabase) {
      return undefined
    }

    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setIsAuthLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession))

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    const loadTimer = window.setTimeout(() => {
      void loadPublicData()
    }, 0)

    return () => window.clearTimeout(loadTimer)
  }, [])

  useEffect(() => {
    if (!supabase || !session) {
      return
    }

    const accessTimer = window.setTimeout(() => {
      void checkAdminAccess(session)
    }, 0)

    return () => window.clearTimeout(accessTimer)
  }, [session])

  useEffect(() => {
    if (isAdminRoute && isAdmin) {
      const adminTimer = window.setTimeout(() => {
        void loadAdminData()
      }, 0)

      return () => window.clearTimeout(adminTimer)
    }

    return undefined
  }, [isAdminRoute, isAdmin])

  useEffect(() => {
    if (isAdminRoute || route === '/') {
      return undefined
    }

    const redirectTimer = window.setTimeout(() => {
      window.history.replaceState(null, '', '/')
      setRoute('/')
    }, 0)

    return () => window.clearTimeout(redirectTimer)
  }, [isAdminRoute, route])

  async function handleSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setAuthStatus('')

    if (!supabase) {
      setIsAdmin(true)
      setAuthStatus('Modo demo local ativo.')
      return
    }

    setIsSaving(true)
    const { error } = await supabase.auth.signInWithPassword(authDraft)
    setIsSaving(false)

    if (error) {
      setAuthStatus('Nao foi possivel entrar. Confira email e senha.')
      return
    }

    setAuthStatus('Login realizado.')
  }

  async function handleSignOut() {
    if (supabase) {
      await supabase.auth.signOut()
    }

    setSession(null)
    setIsAdmin(false)
    goToPath('/')
  }

  async function handleSaveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSaving(true)

    if (supabase) {
      const { error } = await supabase.from('business_profile').upsert(profile)

      if (error) {
        setDataStatus('Nao foi possivel salvar os dados da landing.')
        setIsSaving(false)
        return
      }
    }

    setDataStatus('Dados da landing salvos.')
    setIsSaving(false)
  }

  async function handleCreateAppointment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSaving(true)

    const service = services.find((item) => item.id === appointmentDraft.serviceId) ?? services[0]
    const existingClient = clients.find((client) => client.phone === appointmentDraft.clientPhone.trim())
    let nextClient = existingClient

    if (!nextClient) {
      nextClient = {
        id: crypto.randomUUID(),
        full_name: appointmentDraft.clientName.trim(),
        phone: appointmentDraft.clientPhone.trim(),
        notes: '',
      }

      if (supabase) {
        const { data, error } = await supabase.from('clients').insert(nextClient).select('*').single()

        if (error) {
          setDataStatus('Nao foi possivel cadastrar a cliente.')
          setIsSaving(false)
          return
        }

        nextClient = data as ClientRecord
      }

      if (!nextClient) {
        setDataStatus('Nao foi possivel cadastrar a cliente.')
        setIsSaving(false)
        return
      }

      const createdClient = nextClient
      setClients((current) => [...current, createdClient])
    }

    if (!nextClient) {
      setDataStatus('Nao foi possivel identificar a cliente.')
      setIsSaving(false)
      return
    }

    const nextAppointment: AppointmentRecord = {
      id: crypto.randomUUID(),
      client_id: nextClient.id,
      client_name: appointmentDraft.clientName.trim(),
      client_phone: appointmentDraft.clientPhone.trim(),
      service_id: service?.id ?? null,
      service_name: service?.name ?? 'Atendimento',
      scheduled_date: appointmentDraft.scheduledDate,
      start_time: appointmentDraft.startTime,
      status: appointmentDraft.status,
      charged_amount_cents: parseCurrencyToCents(appointmentDraft.chargedAmount),
      received_amount_cents: parseCurrencyToCents(appointmentDraft.receivedAmount),
      payment_method: appointmentDraft.paymentMethod,
      notes: appointmentDraft.notes.trim(),
    }

    if (supabase) {
      const { error } = await supabase.from('appointments').insert(nextAppointment)

      if (error) {
        setDataStatus('Nao foi possivel criar o horario.')
        setIsSaving(false)
        return
      }
    }

    setAppointments((current) => [...current, nextAppointment])
    setSelectedAppointmentId(nextAppointment.id)
    setAppointmentDraft(newAppointmentDraft(services))
    setDataStatus('Horario criado.')
    setIsSaving(false)
  }

  async function updateAppointment(id: string, patch: Partial<AppointmentRecord>) {
    setAppointments((current) =>
      current.map((appointment) => (appointment.id === id ? { ...appointment, ...patch } : appointment)),
    )

    if (supabase) {
      const { error } = await supabase.from('appointments').update(patch).eq('id', id)

      if (error) {
        setDataStatus('Nao foi possivel atualizar o horario.')
        await loadAdminData()
        return
      }
    }

    setDataStatus('Horario atualizado.')
  }

  async function deleteAppointment(id: string) {
    setAppointments((current) => current.filter((appointment) => appointment.id !== id))

    if (supabase) {
      const { error } = await supabase.from('appointments').delete().eq('id', id)

      if (error) {
        setDataStatus('Nao foi possivel excluir o horario.')
        await loadAdminData()
        return
      }
    }

    setDataStatus('Horario removido.')
  }

  async function handleCreateService(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const service: ServiceItem = {
      id: crypto.randomUUID(),
      name: newService.name.trim(),
      description: newService.description.trim(),
      duration_minutes: Number.parseInt(newService.durationMinutes, 10) || 45,
      price_cents: parseCurrencyToCents(newService.price),
      active: true,
      published: newService.published,
      sort_order: services.length * 10 + 10,
    }

    if (supabase) {
      const { error } = await supabase.from('services').insert(service)

      if (error) {
        setDataStatus('Nao foi possivel criar o servico.')
        return
      }
    }

    setServices((current) => sortByOrder([...current, service]))
    setNewService({ name: '', description: '', durationMinutes: '45', price: '0,00', published: true })
    setDataStatus('Servico criado.')
  }

  async function updateService(service: ServiceItem, patch: Partial<ServiceItem>) {
    const updatedService = { ...service, ...patch }
    setServices((current) => current.map((item) => (item.id === service.id ? updatedService : item)))

    if (supabase) {
      const { error } = await supabase.from('services').update(patch).eq('id', service.id)

      if (error) {
        setDataStatus('Nao foi possivel salvar o servico.')
        await loadAdminData()
        return
      }
    }

    setDataStatus('Servico salvo.')
  }

  async function handleCreateGalleryItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSaving(true)

    let imagePath = galleryDraft.imageUrl.trim()

    if (galleryDraft.file && supabase) {
      const extension = galleryDraft.file.name.split('.').pop() ?? 'jpg'
      const storagePath = `${Date.now()}-${crypto.randomUUID()}.${extension}`
      const { error } = await supabase.storage.from('landing-media').upload(storagePath, galleryDraft.file, {
        cacheControl: '3600',
        upsert: false,
      })

      if (error) {
        setDataStatus('Nao foi possivel enviar a foto.')
        setIsSaving(false)
        return
      }

      imagePath = storagePath
    }

    const nextItem: GalleryItem = {
      id: crypto.randomUUID(),
      title: galleryDraft.title.trim(),
      image_path: imagePath || 'brandBanner',
      alt_text: galleryDraft.altText.trim() || galleryDraft.title.trim(),
      published: true,
      sort_order: gallery.length * 10 + 10,
    }

    if (supabase) {
      const { error } = await supabase.from('gallery_items').insert(nextItem)

      if (error) {
        setDataStatus('Nao foi possivel publicar a foto.')
        setIsSaving(false)
        return
      }
    }

    setGallery((current) => sortByOrder([...current, nextItem]))
    setGalleryDraft({ title: '', imageUrl: '', altText: '', file: null })
    setDataStatus('Foto publicada.')
    setIsSaving(false)
  }

  async function updateGalleryItem(item: GalleryItem, patch: Partial<GalleryItem>) {
    const updatedItem = { ...item, ...patch }
    setGallery((current) => current.map((galleryItem) => (galleryItem.id === item.id ? updatedItem : galleryItem)))

    if (supabase) {
      const { error } = await supabase.from('gallery_items').update(patch).eq('id', item.id)

      if (error) {
        setDataStatus('Nao foi possivel atualizar a foto.')
        await loadAdminData()
        return
      }
    }

    setDataStatus('Foto atualizada.')
  }

  async function deleteGalleryItem(id: string) {
    setGallery((current) => current.filter((item) => item.id !== id))

    if (supabase) {
      const { error } = await supabase.from('gallery_items').delete().eq('id', id)

      if (error) {
        setDataStatus('Nao foi possivel excluir a foto.')
        await loadAdminData()
        return
      }
    }

    setDataStatus('Foto removida.')
  }

  function handleGalleryFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null
    setGalleryDraft((current) => ({ ...current, file }))
  }

  if (isAdminRoute) {
    return renderAdmin()
  }

  return renderLanding()

  function renderLanding() {
    return (
      <main className="site-shell">
        <header className="landing-nav">
          <button className="brand-link" type="button" onClick={() => goToPath('/')}>
            <img src={brandLogo} alt="" />
            <span>
              <strong>Hellen Designer</strong>
              <small>Designer de Sobrancelhas</small>
            </span>
          </button>
          <nav aria-label="Navegacao principal">
            <a href="#servicos">Servicos</a>
            <a href="#galeria">Galeria</a>
            <a href={profile.instagram_url} target="_blank" rel="noreferrer">
              Instagram
            </a>
            <a href={buildWhatsAppUrl(profile.whatsapp_number, getGeneralMessage())} target="_blank" rel="noreferrer">
              WhatsApp
            </a>
          </nav>
          <button className="ghost-action nav-admin" type="button" onClick={() => goToPath('/admin')}>
            Admin
          </button>
        </header>

        <section className="hero-band" aria-label="Hellen Martins Designer">
          <div className="hero-copy">
            <p className="eyebrow">Hellen Martins</p>
            <h1>{profile.brand_name}</h1>
            <p className="hero-subtitle">{profile.subtitle}</p>
            <p className="hero-text">{profile.bio}</p>
            <div className="hero-actions">
              <a
                className="primary-action"
                href={buildWhatsAppUrl(profile.whatsapp_number, getGeneralMessage())}
                target="_blank"
                rel="noreferrer"
              >
                <MessageCircle size={18} aria-hidden="true" /> Chamar no WhatsApp
              </a>
              <a className="ghost-action" href="#servicos">
                Ver servicos
              </a>
            </div>
            <div className="contact-row" aria-label="Canais de contato">
              <span>
                <Phone size={16} aria-hidden="true" /> {profile.phone}
              </span>
              <span>
                <Camera size={16} aria-hidden="true" /> {profile.instagram_handle}
              </span>
            </div>
          </div>

          <div className="hero-media" aria-label="Imagem de marca">
            <img src={portraitImage} alt="Retrato beauty representando o trabalho de sobrancelhas da Hellen" />
            <div className="floating-note top">
              <Sparkles size={17} aria-hidden="true" />
              <span>Desenho personalizado</span>
            </div>
            <div className="floating-note bottom">
              <Clock3 size={17} aria-hidden="true" />
              <span>Horario combinado pelo WhatsApp</span>
            </div>
          </div>
        </section>

        <section className="proof-strip" aria-label="Diferenciais">
          <article>
            <strong>4</strong>
            <span>opcoes principais de atendimento</span>
          </article>
          <article>
            <strong>HM</strong>
            <span>identidade visual preta e dourada</span>
          </article>
          <article>
            <strong>Zap</strong>
            <span>agenda combinada direto com a Hellen</span>
          </article>
        </section>

        <section className="service-band" id="servicos">
          <div className="section-heading">
            <p className="eyebrow">Servicos e precos</p>
            <h2>Escolha o procedimento e chame a Hellen.</h2>
          </div>
          <div className="service-list">
            {publishedServices.map((service) => (
              <article className="service-item" key={service.id}>
                <div>
                  <span>{service.duration_minutes} min</span>
                  <h3>{service.name}</h3>
                  <p>{service.description}</p>
                </div>
                <div className="price-area">
                  <strong>{formatCurrency(service.price_cents)}</strong>
                  <a
                    href={buildWhatsAppUrl(profile.whatsapp_number, getServiceMessage(service))}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Pedir no WhatsApp
                  </a>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="gallery-band" id="galeria">
          <div className="section-heading">
            <p className="eyebrow">Galeria</p>
            <h2>Fotos e artes publicadas pela Hellen.</h2>
          </div>
          {publishedGallery.length ? (
            <div className="gallery-grid">
              {publishedGallery.map((item) => (
                <figure key={item.id}>
                  <img src={resolveImageUrl(item.image_path)} alt={item.alt_text} />
                  <figcaption>{item.title}</figcaption>
                </figure>
              ))}
            </div>
          ) : (
            <p className="empty-state">A galeria ainda nao tem fotos publicadas.</p>
          )}
        </section>

        <section className="contact-band" id="contato">
          <div>
            <p className="eyebrow">Agende agora</p>
            <h2>Separe um tempinho para voce.</h2>
            <p>{profile.address}. Para horarios, duvidas e envio de referencias, fale direto pelo WhatsApp.</p>
          </div>
          <a
            className="primary-action"
            href={buildWhatsAppUrl(profile.whatsapp_number, getGeneralMessage())}
            target="_blank"
            rel="noreferrer"
          >
            <MessageCircle size={18} aria-hidden="true" /> Chamar no WhatsApp
          </a>
        </section>

        <footer className="site-footer">
          <span>Hellen Designer</span>
          <a href={profile.instagram_url} target="_blank" rel="noreferrer">
            {profile.instagram_handle}
          </a>
          <button type="button" onClick={() => goToPath('/admin')}>
            Admin
          </button>
        </footer>

        {dataStatus ? <p className="toast-status">{dataStatus}</p> : null}
      </main>
    )
  }

  function renderAdmin() {
    if (isAuthLoading) {
      return (
        <main className="admin-auth-page">
          <div className="auth-card">
            <ShieldCheck size={28} aria-hidden="true" />
            <h1>Carregando acesso.</h1>
            <p>Verificando sessao administrativa.</p>
          </div>
        </main>
      )
    }

    if (isSupabaseConfigured && (!session || !isAdmin)) {
      return (
        <main className="admin-auth-page">
          <form className="auth-card" onSubmit={handleSignIn}>
            <button className="brand-link auth-brand" type="button" onClick={() => goToPath('/')}>
              <img src={brandLogo} alt="" />
              <span>
                <strong>Hellen Designer</strong>
                <small>Painel privado</small>
              </span>
            </button>
            <div>
              <p className="eyebrow">Acesso admin</p>
              <h1>Entre para organizar agenda, clientes e landing.</h1>
            </div>
            <label>
              Email
              <input
                required
                type="email"
                value={authDraft.email}
                onChange={(event) => setAuthDraft({ ...authDraft, email: event.target.value })}
              />
            </label>
            <label>
              Senha
              <input
                required
                minLength={6}
                type="password"
                value={authDraft.password}
                onChange={(event) => setAuthDraft({ ...authDraft, password: event.target.value })}
              />
            </label>
            <button className="primary-action" type="submit" disabled={isSaving}>
              {isSaving ? 'Entrando...' : 'Entrar no admin'}
            </button>
            <button className="ghost-action" type="button" onClick={() => goToPath('/')}>
              Voltar para landing
            </button>
            <p className="form-status" role="status">
              {authStatus || (!isAdmin && session ? 'Seu usuario nao esta em admin_profiles.' : '')}
            </p>
          </form>
        </main>
      )
    }

    return (
      <main className="admin-shell">
        <aside className="admin-sidebar">
          <button className="brand-link" type="button" onClick={() => goToPath('/')}>
            <img src={brandLogo} alt="" />
            <span>
              <strong>Hellen Designer</strong>
              <small>Admin privado</small>
            </span>
          </button>
          <nav aria-label="Secoes do admin">
            {adminTabs.map((tab) => (
              <button
                key={tab.id}
                className={activeTab === tab.id ? 'active' : ''}
                type="button"
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </nav>
          <button className="ghost-action sidebar-exit" type="button" onClick={handleSignOut}>
            <LogOut size={16} aria-hidden="true" /> Sair
          </button>
        </aside>

        <section className="admin-main">
          <header className="admin-topbar">
            <div>
              <p className="eyebrow">Painel privado</p>
              <h1>{adminTabs.find((tab) => tab.id === activeTab)?.label ?? 'Hoje'}</h1>
            </div>
            <label className="admin-search">
              <Search size={16} aria-hidden="true" />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Buscar cliente"
              />
            </label>
            <button className="primary-action" type="button" onClick={() => setActiveTab('agenda')}>
              <Plus size={17} aria-hidden="true" /> Novo horario
            </button>
          </header>

          {dataStatus ? <p className="form-status top-status">{dataStatus}</p> : null}

          {(activeTab === 'today' || activeTab === 'agenda' || activeTab === 'finance') && renderOverview()}
          {activeTab === 'clients' && renderClients()}
          {activeTab === 'landing' && renderLandingEditor()}
          {activeTab === 'services' && renderServicesEditor()}
          {activeTab === 'photos' && renderGalleryEditor()}
        </section>
      </main>
    )
  }

  function renderOverview() {
    return (
      <div className="admin-grid">
        <section className="metric-grid" aria-label="Resumo do dia">
          <article>
            <CalendarDays size={19} aria-hidden="true" />
            <span>Clientes hoje</span>
            <strong>{stats.todayCount}</strong>
          </article>
          <article>
            <Wallet size={19} aria-hidden="true" />
            <span>Recebido</span>
            <strong>{formatCurrency(stats.receivedCents)}</strong>
          </article>
          <article>
            <Clock3 size={19} aria-hidden="true" />
            <span>Pendente</span>
            <strong>{formatCurrency(stats.pendingCents)}</strong>
          </article>
          <article>
            <XCircle size={19} aria-hidden="true" />
            <span>Faltas</span>
            <strong>{stats.noShowCount}</strong>
          </article>
        </section>

        <section className="panel agenda-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Agenda</p>
              <h2>{activeTab === 'agenda' ? 'Todos os horarios' : 'Hoje'}</h2>
            </div>
            <span>{todaysAppointments.length} no dia</span>
          </div>

          <form className="appointment-form" onSubmit={handleCreateAppointment}>
            <label>
              Cliente
              <input
                required
                value={appointmentDraft.clientName}
                onChange={(event) => setAppointmentDraft({ ...appointmentDraft, clientName: event.target.value })}
                placeholder="Nome da cliente"
              />
            </label>
            <label>
              WhatsApp
              <input
                required
                value={appointmentDraft.clientPhone}
                onChange={(event) => setAppointmentDraft({ ...appointmentDraft, clientPhone: event.target.value })}
                placeholder="(16) 99999-9999"
              />
            </label>
            <label>
              Servico
              <select
                value={appointmentDraft.serviceId}
                onChange={(event) => {
                  const service = services.find((item) => item.id === event.target.value)
                  setAppointmentDraft({
                    ...appointmentDraft,
                    serviceId: event.target.value,
                    chargedAmount: centsToInputValue(service?.price_cents ?? 0),
                  })
                }}
              >
                {services.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Data
              <input
                required
                type="date"
                value={appointmentDraft.scheduledDate}
                onChange={(event) => setAppointmentDraft({ ...appointmentDraft, scheduledDate: event.target.value })}
              />
            </label>
            <label>
              Hora
              <input
                required
                type="time"
                value={appointmentDraft.startTime}
                onChange={(event) => setAppointmentDraft({ ...appointmentDraft, startTime: event.target.value })}
              />
            </label>
            <label>
              Cobrado
              <input
                inputMode="decimal"
                value={appointmentDraft.chargedAmount}
                onChange={(event) => setAppointmentDraft({ ...appointmentDraft, chargedAmount: event.target.value })}
              />
            </label>
            <label>
              Recebido
              <input
                inputMode="decimal"
                value={appointmentDraft.receivedAmount}
                onChange={(event) => setAppointmentDraft({ ...appointmentDraft, receivedAmount: event.target.value })}
              />
            </label>
            <label>
              Metodo
              <select
                value={appointmentDraft.paymentMethod}
                onChange={(event) =>
                  setAppointmentDraft({ ...appointmentDraft, paymentMethod: event.target.value as PaymentMethod })
                }
              >
                {Object.entries(paymentMethodLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="wide-field">
              Observacoes
              <input
                value={appointmentDraft.notes}
                onChange={(event) => setAppointmentDraft({ ...appointmentDraft, notes: event.target.value })}
                placeholder="Ex: primeira vez, preferencia, alergia"
              />
            </label>
            <button className="primary-action" type="submit" disabled={isSaving}>
              <Plus size={16} aria-hidden="true" /> Criar horario
            </button>
          </form>

          <div className="agenda-list">
            {(activeTab === 'today' ? todaysAppointments : sortedAppointments).map((appointment) =>
              renderAppointmentRow(appointment),
            )}
            {(activeTab === 'today' ? todaysAppointments : sortedAppointments).length === 0 ? (
              <p className="empty-state">Nenhum horario cadastrado. Use Novo horario para organizar a agenda.</p>
            ) : null}
          </div>
        </section>

        <aside className="panel detail-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Cliente</p>
              <h2>{selectedAppointment?.client_name ?? 'Selecione um horario'}</h2>
            </div>
          </div>
          {selectedAppointment ? (
            <>
              <div className="client-summary">
                <UserRound size={22} aria-hidden="true" />
                <span>{selectedAppointment.client_phone}</span>
                <a
                  href={buildWhatsAppUrl(selectedAppointment.client_phone, `Ola ${selectedAppointment.client_name}, tudo bem?`)}
                  target="_blank"
                  rel="noreferrer"
                >
                  Abrir WhatsApp
                </a>
              </div>
              <dl className="detail-list">
                <div>
                  <dt>Servico</dt>
                  <dd>{selectedAppointment.service_name}</dd>
                </div>
                <div>
                  <dt>Valor</dt>
                  <dd>{formatCurrency(selectedAppointment.charged_amount_cents)}</dd>
                </div>
                <div>
                  <dt>Recebido</dt>
                  <dd>{formatCurrency(selectedAppointment.received_amount_cents)}</dd>
                </div>
                <div>
                  <dt>Observacoes</dt>
                  <dd>{selectedAppointment.notes || selectedClient?.notes || 'Sem observacoes.'}</dd>
                </div>
              </dl>
            </>
          ) : (
            <p className="empty-state">Selecione um atendimento para ver detalhes.</p>
          )}
        </aside>
      </div>
    )
  }

  function renderAppointmentRow(appointment: AppointmentRecord) {
    const paymentState = getPaymentState(appointment)

    return (
      <article
        className={selectedAppointmentId === appointment.id ? 'agenda-row active' : 'agenda-row'}
        key={appointment.id}
        onClick={() => setSelectedAppointmentId(appointment.id)}
      >
        <time dateTime={`${appointment.scheduled_date}T${appointment.start_time}`}>{appointment.start_time}</time>
        <div className="row-main">
          <strong>{appointment.client_name}</strong>
          <span>
            {appointment.service_name} - {formatCurrency(appointment.charged_amount_cents)}
          </span>
        </div>
        <span className={`status-pill ${appointment.status}`}>{statusLabels[appointment.status]}</span>
        <span className={`status-pill ${paymentState}`}>
          {paymentState === 'paid' ? 'Pago' : paymentState === 'partial' ? 'Parcial' : 'Pendente'}
        </span>
        <div className="row-actions">
          <button
            type="button"
            aria-label={`Marcar ${appointment.client_name} como concluido`}
            onClick={(event) => {
              event.stopPropagation()
              void updateAppointment(appointment.id, {
                status: 'completed',
                received_amount_cents: appointment.charged_amount_cents,
              })
            }}
          >
            <CheckCircle2 size={15} aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label={`Marcar ${appointment.client_name} como nao compareceu`}
            onClick={(event) => {
              event.stopPropagation()
              void updateAppointment(appointment.id, { status: 'no_show' })
            }}
          >
            <XCircle size={15} aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label={`Excluir horario de ${appointment.client_name}`}
            onClick={(event) => {
              event.stopPropagation()
              void deleteAppointment(appointment.id)
            }}
          >
            <Trash2 size={15} aria-hidden="true" />
          </button>
        </div>
      </article>
    )
  }

  function renderClients() {
    return (
      <section className="panel full-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Clientes</p>
            <h2>Base privada da Hellen.</h2>
          </div>
          <span>{filteredClients.length} cliente(s)</span>
        </div>
        <div className="client-grid">
          {filteredClients.map((client) => {
            const clientAppointments = appointments.filter(
              (appointment) => appointment.client_id === client.id || appointment.client_phone === client.phone,
            )
            const total = clientAppointments.reduce((sum, appointment) => sum + appointment.received_amount_cents, 0)

            return (
              <article className="client-card" key={client.id}>
                <strong>{client.full_name}</strong>
                <span>{client.phone}</span>
                <p>{client.notes || 'Sem observacoes.'}</p>
                <small>
                  {clientAppointments.length} atendimento(s) - {formatCurrency(total)}
                </small>
                <a href={buildWhatsAppUrl(client.phone, `Ola ${client.full_name}, tudo bem?`)} target="_blank" rel="noreferrer">
                  WhatsApp
                </a>
              </article>
            )
          })}
        </div>
      </section>
    )
  }

  function renderLandingEditor() {
    return (
      <section className="panel full-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Landing</p>
            <h2>Dados publicos do front-end.</h2>
          </div>
          <span>{profile.published ? 'Publicado' : 'Oculto'}</span>
        </div>
        <form className="editor-form" onSubmit={handleSaveProfile}>
          <label>
            Nome da marca
            <input
              value={profile.brand_name}
              onChange={(event) => setProfile({ ...profile, brand_name: event.target.value })}
            />
          </label>
          <label>
            Subtitulo
            <input
              value={profile.subtitle}
              onChange={(event) => setProfile({ ...profile, subtitle: event.target.value })}
            />
          </label>
          <label>
            Celular
            <input value={profile.phone} onChange={(event) => setProfile({ ...profile, phone: event.target.value })} />
          </label>
          <label>
            WhatsApp com DDI
            <input
              value={profile.whatsapp_number}
              onChange={(event) => setProfile({ ...profile, whatsapp_number: event.target.value })}
            />
          </label>
          <label>
            Instagram
            <input
              value={profile.instagram_handle}
              onChange={(event) => setProfile({ ...profile, instagram_handle: event.target.value })}
            />
          </label>
          <label>
            URL Instagram
            <input
              value={profile.instagram_url}
              onChange={(event) => setProfile({ ...profile, instagram_url: event.target.value })}
            />
          </label>
          <label className="wide-field">
            Bio
            <textarea
              rows={4}
              value={profile.bio}
              onChange={(event) => setProfile({ ...profile, bio: event.target.value })}
            />
          </label>
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={profile.published}
              onChange={(event) => setProfile({ ...profile, published: event.target.checked })}
            />
            Site publicado
          </label>
          <button className="primary-action" type="submit" disabled={isSaving}>
            <Save size={16} aria-hidden="true" /> Salvar dados
          </button>
        </form>
      </section>
    )
  }

  function renderServicesEditor() {
    return (
      <section className="panel full-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Servicos</p>
            <h2>Precos que aparecem na landing.</h2>
          </div>
          <span>{services.length} cadastrados</span>
        </div>
        <form className="editor-form compact" onSubmit={handleCreateService}>
          <label>
            Nome
            <input value={newService.name} onChange={(event) => setNewService({ ...newService, name: event.target.value })} />
          </label>
          <label>
            Preco
            <input value={newService.price} onChange={(event) => setNewService({ ...newService, price: event.target.value })} />
          </label>
          <label>
            Duracao
            <input
              inputMode="numeric"
              value={newService.durationMinutes}
              onChange={(event) => setNewService({ ...newService, durationMinutes: event.target.value })}
            />
          </label>
          <label className="wide-field">
            Descricao
            <input
              value={newService.description}
              onChange={(event) => setNewService({ ...newService, description: event.target.value })}
            />
          </label>
          <button className="primary-action" type="submit">
            <Plus size={16} aria-hidden="true" /> Criar servico
          </button>
        </form>
        <div className="service-editor-list">
          {services.map((service) => (
            <article className="service-editor-row" key={service.id}>
              <input value={service.name} onChange={(event) => void updateService(service, { name: event.target.value })} />
              <input
                value={centsToInputValue(service.price_cents)}
                onChange={(event) => void updateService(service, { price_cents: parseCurrencyToCents(event.target.value) })}
              />
              <input
                inputMode="numeric"
                value={service.duration_minutes}
                onChange={(event) =>
                  void updateService(service, { duration_minutes: Number.parseInt(event.target.value, 10) || 0 })
                }
              />
              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={service.published}
                  onChange={(event) => void updateService(service, { published: event.target.checked })}
                />
                Publicado
              </label>
              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={service.active}
                  onChange={(event) => void updateService(service, { active: event.target.checked })}
                />
                Ativo
              </label>
            </article>
          ))}
        </div>
      </section>
    )
  }

  function renderGalleryEditor() {
    return (
      <section className="panel full-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Fotos e artes</p>
            <h2>Conteudo que aparece no front-end.</h2>
          </div>
          <span>{gallery.filter((item) => item.published).length} publicadas</span>
        </div>
        <form className="editor-form compact" onSubmit={handleCreateGalleryItem}>
          <label>
            Titulo
            <input
              value={galleryDraft.title}
              onChange={(event) => setGalleryDraft({ ...galleryDraft, title: event.target.value })}
            />
          </label>
          <label>
            URL da imagem
            <input
              value={galleryDraft.imageUrl}
              onChange={(event) => setGalleryDraft({ ...galleryDraft, imageUrl: event.target.value })}
              placeholder="Opcional se enviar arquivo"
            />
          </label>
          <label>
            Enviar arquivo
            <input accept="image/*" type="file" onChange={handleGalleryFile} />
          </label>
          <label className="wide-field">
            Texto alternativo
            <input
              value={galleryDraft.altText}
              onChange={(event) => setGalleryDraft({ ...galleryDraft, altText: event.target.value })}
            />
          </label>
          <button className="primary-action" type="submit" disabled={isSaving}>
            <Camera size={16} aria-hidden="true" /> Publicar foto
          </button>
        </form>
        <div className="photo-admin-grid">
          {sortByOrder(gallery).map((item) => (
            <article className="photo-admin-card" key={item.id}>
              <img src={resolveImageUrl(item.image_path)} alt={item.alt_text} />
              <div>
                <strong>{item.title}</strong>
                <span>{item.published ? 'Visivel na landing' : 'Oculta'}</span>
              </div>
              <button type="button" onClick={() => void updateGalleryItem(item, { published: !item.published })}>
                {item.published ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
              </button>
              <button type="button" onClick={() => void deleteGalleryItem(item.id)}>
                <Trash2 size={16} aria-hidden="true" />
              </button>
            </article>
          ))}
        </div>
      </section>
    )
  }
}

export default App
