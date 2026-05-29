import { useEffect, useMemo, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import type { Session } from '@supabase/supabase-js'
import {
  Banknote,
  BarChart3,
  Ban,
  Boxes,
  CalendarCheck2,
  CalendarDays,
  Camera,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Clock3,
  CreditCard,
  Eye,
  EyeOff,
  Home,
  List,
  LogOut,
  Menu,
  MessageCircle,
  Package,
  Phone,
  Plus,
  Save,
  Search,
  Send,
  Share2,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserRound,
  UsersRound,
  Wallet,
  XCircle,
} from 'lucide-react'
import brandBanner from './assets/hellen-brand-banner.svg'
import portraitImage from './assets/hellen-brows-chatgpt-image.png'
import careCardImage from './assets/hellen-care-card.svg'
import brandLogo from './assets/hellen-martins-logo.svg'
import {
  addDays,
  buildTimeSlots,
  buildWhatsAppUrl,
  calculateAdminStats,
  centsToInputValue,
  defaultAppointments,
  defaultClients,
  defaultGallery,
  defaultProducts,
  defaultProfile,
  defaultServices,
  defaultStockMovements,
  defaultUnavailableBlocks,
  formatCurrency,
  formatDateLong,
  formatDateShort,
  getAvailableSlots,
  getLowStockProducts,
  getPaymentState,
  getServiceUsage,
  hasScheduleConflict,
  isTimeInBlock,
  isUnavailableTime,
  maskBrazilianPhone,
  parseCurrencyToCents,
  sortByOrder,
  timelineSlots,
} from './domain'
import type {
  AppointmentRecord,
  AppointmentStatus,
  BusinessProfile,
  ClientRecord,
  GalleryItem,
  PaymentMethod,
  ProductItem,
  ServiceItem,
  StockMovement,
  StockMovementType,
} from './domain'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import './App.css'

type AdminTab = 'today' | 'agenda' | 'clients' | 'finance' | 'products' | 'landing'
type CalendarView = 'day' | 'week' | 'month' | 'list'

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

type BookingDraft = {
  serviceId: string
  date: string
  time: string
  clientName: string
  clientPhone: string
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

type ProductDraft = {
  name: string
  category: string
  quantity: string
  unitCost: string
  salePrice: string
  minimumQuantity: string
  notes: string
}

type GalleryDraft = {
  title: string
  imageUrl: string
  altText: string
  file: File | null
}

type BookingStatus =
  | { type: 'idle'; message: string }
  | { type: 'error'; message: string }
  | { type: 'success'; message: string; appointment: AppointmentRecord }

const todayIso = () => new Date().toISOString().slice(0, 10)

const adminTabs: Array<{ id: AdminTab; label: string; icon: typeof CalendarDays }> = [
  { id: 'today', label: 'Hoje', icon: Home },
  { id: 'agenda', label: 'Agenda', icon: CalendarDays },
  { id: 'clients', label: 'Clientes', icon: UsersRound },
  { id: 'finance', label: 'Financeiro', icon: Banknote },
  { id: 'products', label: 'Produtos', icon: Boxes },
  { id: 'landing', label: 'Landing', icon: Camera },
]

const statusLabels: Record<AppointmentStatus, string> = {
  scheduled: 'Agendado',
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

const movementTypeLabels: Record<StockMovementType, string> = {
  in: 'Entrada',
  out: 'Saida',
  service_use: 'Uso em atendimento',
  sale: 'Venda para cliente',
  adjustment: 'Ajuste manual',
}

const assetMap: Record<string, string> = {
  brandBanner,
  brandLogo,
  careCard: careCardImage,
  portrait: portraitImage,
}

function newAppointmentDraft(services: ServiceItem[], date = todayIso(), time = '09:00'): AppointmentDraft {
  const firstService = services[0] ?? defaultServices[0]

  return {
    clientName: '',
    clientPhone: '',
    serviceId: firstService.id,
    scheduledDate: date,
    startTime: time,
    status: 'scheduled',
    chargedAmount: centsToInputValue(firstService.price_cents),
    receivedAmount: '0,00',
    paymentMethod: 'pix',
    notes: '',
  }
}

function newBookingDraft(services: ServiceItem[]): BookingDraft {
  const firstService = services[0] ?? defaultServices[0]

  return {
    serviceId: firstService.id,
    date: todayIso(),
    time: '09:00',
    clientName: '',
    clientPhone: '',
    notes: '',
  }
}

function newProductDraft(): ProductDraft {
  return {
    name: '',
    category: 'Henna',
    quantity: '0',
    unitCost: '0,00',
    salePrice: '0,00',
    minimumQuantity: '1',
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

function getGeneralMessage() {
  return 'Ola Hellen, vim pelo Instagram/site e quero agendar um horario.'
}

function getBookingMessage(appointment: AppointmentRecord) {
  return `Ola Hellen, quero confirmar ${appointment.service_name} no dia ${formatDateShort(
    appointment.scheduled_date,
  )} as ${appointment.start_time}. Meu nome e ${appointment.client_name}.`
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
  const [products, setProducts] = useState<ProductItem[]>(defaultProducts)
  const [stockMovements, setStockMovements] = useState<StockMovement[]>(defaultStockMovements)
  const [dataStatus, setDataStatus] = useState('')

  const [activeTab, setActiveTab] = useState<AdminTab>('today')
  const [calendarView, setCalendarView] = useState<CalendarView>('day')
  const [agendaDate, setAgendaDate] = useState(todayIso())
  const [searchTerm, setSearchTerm] = useState('')
  const [appointmentDraft, setAppointmentDraft] = useState<AppointmentDraft>(() => newAppointmentDraft(defaultServices))
  const [bookingDraft, setBookingDraft] = useState<BookingDraft>(() => newBookingDraft(defaultServices))
  const [bookingStatus, setBookingStatus] = useState<BookingStatus>({ type: 'idle', message: '' })
  const [newService, setNewService] = useState<ServiceDraft>({
    name: '',
    description: '',
    durationMinutes: '45',
    price: '0,00',
    published: true,
  })
  const [newProduct, setNewProduct] = useState<ProductDraft>(() => newProductDraft())
  const [galleryDraft, setGalleryDraft] = useState<GalleryDraft>({
    title: '',
    imageUrl: '',
    altText: '',
    file: null,
  })
  const [selectedAppointmentId, setSelectedAppointmentId] = useState(defaultAppointments[0]?.id ?? '')
  const [isSaving, setIsSaving] = useState(false)

  const today = todayIso()
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
  const agendaAppointments = useMemo(
    () => sortedAppointments.filter((appointment) => appointment.scheduled_date === agendaDate),
    [agendaDate, sortedAppointments],
  )
  const stats = useMemo(() => calculateAdminStats(appointments, today, clients, products), [appointments, clients, products, today])
  const lowStockProducts = useMemo(() => getLowStockProducts(products), [products])
  const serviceUsage = useMemo(() => getServiceUsage(appointments), [appointments])
  const availableSlots = useMemo(() => getAvailableSlots(appointments, bookingDraft.date), [appointments, bookingDraft.date])
  const selectedAppointment = appointments.find((appointment) => appointment.id === selectedAppointmentId) ?? agendaAppointments[0]
  const selectedClient = selectedAppointment
    ? clients.find((client) => client.id === selectedAppointment.client_id || client.phone === selectedAppointment.client_phone)
    : null
  const filteredClients = clients.filter((client) => {
    const search = searchTerm.toLowerCase()
    return (
      client.full_name.toLowerCase().includes(search) ||
      client.phone.includes(search) ||
      client.notes.toLowerCase().includes(search)
    )
  })
  const filteredAppointments = sortedAppointments.filter((appointment) => {
    if (calendarView === 'day') {
      return appointment.scheduled_date === agendaDate
    }
    if (calendarView === 'week') {
      return appointment.scheduled_date >= agendaDate && appointment.scheduled_date <= addDays(agendaDate, 6)
    }
    if (calendarView === 'month') {
      return appointment.scheduled_date.startsWith(agendaDate.slice(0, 7))
    }
    return true
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
      setBookingDraft(newBookingDraft(serviceResult.data as ServiceItem[]))
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

    const [profileResult, serviceResult, galleryResult, clientResult, appointmentResult, productResult, movementResult] =
      await Promise.all([
        supabase.from('business_profile').select('*').eq('id', 'default').maybeSingle(),
        supabase.from('services').select('*').order('sort_order', { ascending: true }),
        supabase.from('gallery_items').select('*').order('sort_order', { ascending: true }),
        supabase.from('clients').select('*').order('full_name', { ascending: true }),
        supabase.from('appointments').select('*').order('scheduled_date', { ascending: true }),
        supabase.from('products').select('*').order('name', { ascending: true }),
        supabase.from('stock_movements').select('*').order('created_at', { ascending: false }).limit(12),
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

    if (productResult.data) {
      setProducts(productResult.data as ProductItem[])
    }

    if (movementResult.data) {
      setStockMovements(movementResult.data as StockMovement[])
    }

    if (
      profileResult.error ||
      serviceResult.error ||
      galleryResult.error ||
      clientResult.error ||
      appointmentResult.error ||
      productResult.error ||
      movementResult.error
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

  async function handlePublicBooking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBookingStatus({ type: 'idle', message: '' })
    const service = publishedServices.find((item) => item.id === bookingDraft.serviceId) ?? publishedServices[0]

    if (!service) {
      setBookingStatus({ type: 'error', message: 'Escolha um servico para agendar.' })
      return
    }

    if (!bookingDraft.clientName.trim() || maskBrazilianPhone(bookingDraft.clientPhone).length < 14) {
      setBookingStatus({ type: 'error', message: 'Informe nome e WhatsApp para confirmar o pedido.' })
      return
    }

    if (hasScheduleConflict(appointments, bookingDraft.date, bookingDraft.time) || isUnavailableTime(bookingDraft.time)) {
      setBookingStatus({ type: 'error', message: 'Esse horario nao esta disponivel. Escolha outro horario.' })
      return
    }

    setIsSaving(true)
    const publicClient: ClientRecord = {
      id: crypto.randomUUID(),
      full_name: bookingDraft.clientName.trim(),
      phone: maskBrazilianPhone(bookingDraft.clientPhone),
      birth_date: null,
      notes: bookingDraft.notes.trim(),
    }
    const appointment: AppointmentRecord = {
      id: crypto.randomUUID(),
      client_id: supabase ? null : publicClient.id,
      client_name: publicClient.full_name,
      client_phone: publicClient.phone,
      service_id: service.id,
      service_name: service.name,
      scheduled_date: bookingDraft.date,
      start_time: bookingDraft.time,
      status: 'scheduled',
      charged_amount_cents: service.price_cents,
      received_amount_cents: 0,
      payment_method: 'pix',
      notes: bookingDraft.notes.trim(),
    }

    if (supabase) {
      const clientResult = await supabase.from('clients').insert(publicClient)
      const clientError = clientResult.error
      if (clientError && !clientError.message.toLowerCase().includes('duplicate')) {
        setBookingStatus({ type: 'error', message: 'Nao foi possivel registrar seus dados. Chame no WhatsApp.' })
        setIsSaving(false)
        return
      }

      const { error } = await supabase.from('appointments').insert(appointment)
      if (error) {
        setBookingStatus({ type: 'error', message: 'Horario ocupado ou indisponivel. Chame a Hellen no WhatsApp.' })
        setIsSaving(false)
        return
      }
    }

    setClients((current) => (current.some((client) => client.phone === publicClient.phone) ? current : [...current, publicClient]))
    setAppointments((current) => [...current, appointment])
    setSelectedAppointmentId(appointment.id)
    setBookingStatus({ type: 'success', message: 'Pedido de agendamento criado.', appointment })
    setBookingDraft(newBookingDraft(publishedServices))
    setIsSaving(false)
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

    if (hasScheduleConflict(appointments, appointmentDraft.scheduledDate, appointmentDraft.startTime)) {
      setDataStatus('Horario ja ocupado. Escolha outro horario.')
      return
    }

    setIsSaving(true)
    const service = services.find((item) => item.id === appointmentDraft.serviceId) ?? services[0]
    const maskedPhone = maskBrazilianPhone(appointmentDraft.clientPhone)
    const existingClient = clients.find((client) => client.phone === maskedPhone)
    let nextClient = existingClient

    if (!nextClient) {
      nextClient = {
        id: crypto.randomUUID(),
        full_name: appointmentDraft.clientName.trim(),
        phone: maskedPhone,
        birth_date: null,
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

      setClients((current) => [...current, nextClient as ClientRecord])
    }

    const nextAppointment: AppointmentRecord = {
      id: crypto.randomUUID(),
      client_id: nextClient.id,
      client_name: appointmentDraft.clientName.trim(),
      client_phone: maskedPhone,
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
        setDataStatus('Nao foi possivel criar o horario. Verifique conflito de agenda.')
        setIsSaving(false)
        return
      }
    }

    setAppointments((current) => [...current, nextAppointment])
    setSelectedAppointmentId(nextAppointment.id)
    setAgendaDate(nextAppointment.scheduled_date)
    setAppointmentDraft(newAppointmentDraft(services, nextAppointment.scheduled_date, '09:00'))
    setDataStatus('Horario criado.')
    setIsSaving(false)
  }

  async function updateAppointment(id: string, patch: Partial<AppointmentRecord>) {
    const currentAppointment = appointments.find((appointment) => appointment.id === id)
    if (
      patch.scheduled_date &&
      patch.start_time &&
      hasScheduleConflict(appointments, patch.scheduled_date, patch.start_time, id)
    ) {
      setDataStatus('Esse novo horario ja esta ocupado.')
      return
    }

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

    setDataStatus(currentAppointment?.client_name ? `Horario de ${currentAppointment.client_name} atualizado.` : 'Horario atualizado.')
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

  async function handleCreateProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const product: ProductItem = {
      id: crypto.randomUUID(),
      name: newProduct.name.trim(),
      category: newProduct.category.trim(),
      quantity: Number.parseInt(newProduct.quantity, 10) || 0,
      unit_cost_cents: parseCurrencyToCents(newProduct.unitCost),
      sale_price_cents: parseCurrencyToCents(newProduct.salePrice),
      minimum_quantity: Number.parseInt(newProduct.minimumQuantity, 10) || 0,
      updated_at: new Date().toISOString(),
      notes: newProduct.notes.trim(),
    }

    if (supabase) {
      const { error } = await supabase.from('products').insert(product)

      if (error) {
        setDataStatus('Nao foi possivel criar o produto.')
        return
      }
    }

    setProducts((current) => [...current, product].sort((a, b) => a.name.localeCompare(b.name)))
    setNewProduct(newProductDraft())
    setDataStatus('Produto criado.')
  }

  async function updateProduct(product: ProductItem, patch: Partial<ProductItem>) {
    const updatedProduct = { ...product, ...patch, updated_at: new Date().toISOString() }
    setProducts((current) => current.map((item) => (item.id === product.id ? updatedProduct : item)))

    if (supabase) {
      const { error } = await supabase.from('products').update(patch).eq('id', product.id)

      if (error) {
        setDataStatus('Nao foi possivel salvar o produto.')
        await loadAdminData()
        return
      }
    }

    setDataStatus('Produto salvo.')
  }

  async function adjustProductQuantity(product: ProductItem, type: StockMovementType, delta: number) {
    const nextQuantity = Math.max(product.quantity + delta, 0)
    const movement: StockMovement = {
      id: crypto.randomUUID(),
      product_id: product.id,
      product_name: product.name,
      type,
      quantity: Math.abs(delta),
      notes: movementTypeLabels[type],
      created_at: new Date().toISOString(),
    }

    await updateProduct(product, { quantity: nextQuantity })

    if (supabase) {
      const { error } = await supabase.from('stock_movements').insert(movement)
      if (error) {
        setDataStatus('Produto salvo, mas a movimentacao nao foi registrada.')
        return
      }
    }

    setStockMovements((current) => [movement, ...current].slice(0, 12))
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

  async function handleShareAdmin() {
    const shareText = `Agenda Hellen Designer - ${formatDateShort(agendaDate)}`

    if (navigator.share) {
      await navigator.share({ title: 'Agenda Hellen Designer', text: shareText, url: window.location.href })
      return
    }

    await navigator.clipboard?.writeText(shareText)
    setDataStatus('Resumo copiado.')
  }

  if (isAdminRoute) {
    return renderAdmin()
  }

  return renderLanding()

  function renderLanding() {
    const selectedService = publishedServices.find((service) => service.id === bookingDraft.serviceId) ?? publishedServices[0]
    const allBookingSlots = buildTimeSlots('08:00', '18:00', 30)

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
            <a href="#agendamento">Agendamento</a>
            <a href="#galeria">Galeria</a>
            <a href={profile.instagram_url} target="_blank" rel="noreferrer">
              Instagram
            </a>
          </nav>
          <button className="ghost-action nav-admin" type="button" onClick={() => goToPath('/admin')}>
            Admin
          </button>
        </header>

        <section className="hero-band" aria-label="Hellen Martins Designer">
          <div className="hero-copy">
            <p className="eyebrow">Hellen Martins Brows</p>
            <h1>{profile.brand_name}</h1>
            <p className="hero-subtitle">{profile.subtitle}</p>
            <p className="hero-text">{profile.bio}</p>
            <div className="hero-actions">
              <a className="primary-action" href="#agendamento">
                <CalendarCheck2 size={18} aria-hidden="true" /> Agendar horario
              </a>
              <a className="ghost-action" href={buildWhatsAppUrl(profile.whatsapp_number, getGeneralMessage())} target="_blank" rel="noreferrer">
                <MessageCircle size={18} aria-hidden="true" /> Chamar no WhatsApp
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
              <span>Realce sua beleza com naturalidade</span>
            </div>
            <div className="floating-note bottom">
              <Clock3 size={17} aria-hidden="true" />
              <span>Separe um tempinho para voce</span>
            </div>
          </div>
        </section>

        <section className="proof-strip" aria-label="Diferenciais">
          <article>
            <strong>3</strong>
            <span>procedimentos principais</span>
          </article>
          <article>
            <strong>HM</strong>
            <span>atendimento com hora marcada</span>
          </article>
          <article>
            <strong>Zap</strong>
            <span>confirmacao direta pelo WhatsApp</span>
          </article>
        </section>

        <section className="service-band" id="servicos">
          <div className="section-heading">
            <p className="eyebrow">Servicos e precos</p>
            <h2>Escolha o procedimento.</h2>
            <p>Valores publicados pela Hellen e atualizados pelo painel administrativo.</p>
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
                  <button
                    type="button"
                    onClick={() => {
                      setBookingDraft((current) => ({ ...current, serviceId: service.id }))
                      document.getElementById('agendamento')?.scrollIntoView({ behavior: 'smooth' })
                    }}
                  >
                    Escolher horario
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="booking-band" id="agendamento">
          <div className="section-heading">
            <p className="eyebrow">Agendamento</p>
            <h2>Agende de forma simples e rapida.</h2>
            <p>Cada detalhe foi pensado com carinho. Escolha o procedimento, um horario e confirme pelo WhatsApp.</p>
          </div>

          <div className="booking-layout">
            <form className="booking-form" onSubmit={handlePublicBooking}>
              <fieldset>
                <legend>Servico</legend>
                <div className="service-picker">
                  {publishedServices.map((service) => (
                    <button
                      className={bookingDraft.serviceId === service.id ? 'selected' : ''}
                      type="button"
                      key={service.id}
                      onClick={() => setBookingDraft((current) => ({ ...current, serviceId: service.id }))}
                    >
                      <strong>{service.name}</strong>
                      <span>{formatCurrency(service.price_cents)} · {service.duration_minutes} min</span>
                    </button>
                  ))}
                </div>
              </fieldset>

              <div className="booking-fields">
                <label>
                  Data
                  <input
                    required
                    type="date"
                    min={today}
                    value={bookingDraft.date}
                    onChange={(event) => setBookingDraft((current) => ({ ...current, date: event.target.value }))}
                  />
                </label>
                <label>
                  Nome
                  <input
                    required
                    value={bookingDraft.clientName}
                    onChange={(event) => setBookingDraft((current) => ({ ...current, clientName: event.target.value }))}
                    placeholder="Seu nome"
                  />
                </label>
                <label>
                  WhatsApp
                  <input
                    required
                    inputMode="tel"
                    value={bookingDraft.clientPhone}
                    onChange={(event) =>
                      setBookingDraft((current) => ({
                        ...current,
                        clientPhone: maskBrazilianPhone(event.target.value),
                      }))
                    }
                    placeholder="(16) 99999-9999"
                  />
                </label>
              </div>

              <fieldset>
                <legend>Horarios</legend>
                <div className="time-grid" aria-label="Horarios disponiveis">
                  {allBookingSlots.map((slot) => {
                    const occupied = hasScheduleConflict(appointments, bookingDraft.date, slot)
                    const unavailable = isUnavailableTime(slot)
                    const disabled = occupied || unavailable

                    return (
                      <button
                        className={bookingDraft.time === slot ? 'selected' : ''}
                        disabled={disabled}
                        key={slot}
                        type="button"
                        onClick={() => setBookingDraft((current) => ({ ...current, time: slot }))}
                      >
                        {slot}
                        {disabled ? <span>{unavailable ? 'indisponivel' : 'ocupado'}</span> : null}
                      </button>
                    )
                  })}
                </div>
                {availableSlots.length === 0 ? (
                  <p className="form-status" role="status">
                    Nenhum horario livre neste dia. Chame a Hellen no WhatsApp.
                  </p>
                ) : null}
              </fieldset>

              <label>
                Observacoes (opcional)
                <textarea
                  rows={3}
                  value={bookingDraft.notes}
                  onChange={(event) => setBookingDraft((current) => ({ ...current, notes: event.target.value }))}
                  placeholder="Ex: primeira vez, alergia relatada ou preferencia"
                />
              </label>

              {bookingStatus.type === 'error' ? (
                <p className="form-status error" role="alert">
                  {bookingStatus.message}
                </p>
              ) : null}

              <button className="primary-action" type="submit" disabled={isSaving}>
                <Send size={16} aria-hidden="true" /> {isSaving ? 'Confirmando...' : 'Confirmar agendamento'}
              </button>
            </form>

            <aside className="booking-preview" aria-live="polite">
              <p className="eyebrow">Resumo</p>
              {selectedService ? (
                <>
                  <h3>{selectedService.name}</h3>
                  <dl>
                    <div>
                      <dt>Valor</dt>
                      <dd>{formatCurrency(selectedService.price_cents)}</dd>
                    </div>
                    <div>
                      <dt>Data</dt>
                      <dd>{formatDateLong(bookingDraft.date)}</dd>
                    </div>
                    <div>
                      <dt>Horario</dt>
                      <dd>{bookingDraft.time}</dd>
                    </div>
                  </dl>
                  {bookingStatus.type === 'success' ? (
                    <div className="success-panel">
                      <CheckCircle2 size={22} aria-hidden="true" />
                      <strong>{bookingStatus.message}</strong>
                      <span>
                        Envie a mensagem para finalizar a confirmacao com a Hellen.
                      </span>
                      <a
                        className="primary-action"
                        href={buildWhatsAppUrl(profile.whatsapp_number, getBookingMessage(bookingStatus.appointment))}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <MessageCircle size={16} aria-hidden="true" /> Confirmar no WhatsApp
                      </a>
                    </div>
                  ) : (
                    <p>Ao confirmar, a Hellen recebe nome, WhatsApp, servico, data e horario desejado.</p>
                  )}
                </>
              ) : (
                <p className="empty-state">Nenhum servico publicado no momento.</p>
              )}
            </aside>
          </div>
        </section>

        <section className="care-band" aria-label="Apresentacao profissional">
          <img src={careCardImage} alt="Cada detalhe foi pensado com carinho" />
          <div>
            <p className="eyebrow">Atendimento personalizado</p>
            <h2>Cada detalhe foi pensado com carinho.</h2>
            <p>
              O desenho e definido considerando mapeamento, medidas faciais, preferencia da cliente e acabamento natural.
            </p>
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
                  <img src={resolveImageUrl(item.image_path)} alt={item.alt_text} loading="lazy" decoding="async" />
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
            <p className="eyebrow">Contato</p>
            <h2>Separe um tempinho para voce.</h2>
            <p>{profile.address}. Para duvidas, referencias e ajustes de horario, fale direto pelo WhatsApp.</p>
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
              <h1>Entre para organizar agenda, clientes e pagamentos.</h1>
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
            {adminTabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  className={activeTab === tab.id ? 'active' : ''}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                >
                  <Icon size={17} aria-hidden="true" />
                  {tab.label}
                </button>
              )
            })}
          </nav>
          <button className="ghost-action sidebar-exit" type="button" onClick={handleSignOut}>
            <LogOut size={16} aria-hidden="true" /> Sair
          </button>
        </aside>

        <section className="admin-main">
          {renderAdminTopbar()}
          {dataStatus ? <p className="form-status top-status">{dataStatus}</p> : null}

          {(activeTab === 'today' || activeTab === 'agenda') && renderAgendaDashboard()}
          {activeTab === 'clients' && renderClients()}
          {activeTab === 'finance' && renderFinance()}
          {activeTab === 'products' && renderProducts()}
          {activeTab === 'landing' && renderLandingManager()}
        </section>

        <nav className="mobile-bottom-nav" aria-label="Navegacao do admin">
          {adminTabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                className={activeTab === tab.id ? 'active' : ''}
                type="button"
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon size={18} aria-hidden="true" />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </nav>
      </main>
    )
  }

  function renderAdminTopbar() {
    return (
      <header className="admin-appbar">
        <div className="appbar-main">
          <button className="icon-button" type="button" aria-label="Abrir menu">
            <Menu size={22} aria-hidden="true" />
          </button>
          <h1>{activeTab === 'today' ? 'Agenda' : adminTabs.find((tab) => tab.id === activeTab)?.label}</h1>
          <div className="appbar-actions">
            <button className="icon-button" type="button" aria-label="Compartilhar agenda" onClick={() => void handleShareAdmin()}>
              <Share2 size={18} aria-hidden="true" />
            </button>
            <button className="icon-button" type="button" aria-label="Ver lista" onClick={() => setCalendarView('list')}>
              <List size={20} aria-hidden="true" />
            </button>
            <button className="icon-button" type="button" aria-label="Ajuda">
              <CircleHelp size={20} aria-hidden="true" />
            </button>
          </div>
        </div>
        <div className="date-control" aria-label="Controle de data">
          <button type="button" aria-label="Dia anterior" onClick={() => setAgendaDate((date) => addDays(date, -1))}>
            <ChevronLeft size={22} aria-hidden="true" />
          </button>
          <strong>{formatDateLong(agendaDate)}</strong>
          <button type="button" aria-label="Proximo dia" onClick={() => setAgendaDate((date) => addDays(date, 1))}>
            <ChevronRight size={22} aria-hidden="true" />
          </button>
        </div>
      </header>
    )
  }

  function renderAgendaDashboard() {
    return (
      <div className="admin-workspace">
        <section className="metric-grid" aria-label="Resumo do negocio">
          <article>
            <CalendarDays size={18} aria-hidden="true" />
            <span>Hoje</span>
            <strong>{stats.todayCount}</strong>
          </article>
          <article>
            <Wallet size={18} aria-hidden="true" />
            <span>Dia</span>
            <strong>{formatCurrency(stats.receivedCents)}</strong>
          </article>
          <article>
            <BarChart3 size={18} aria-hidden="true" />
            <span>Semana</span>
            <strong>{formatCurrency(stats.weekReceivedCents)}</strong>
          </article>
          <article>
            <Banknote size={18} aria-hidden="true" />
            <span>Mes</span>
            <strong>{formatCurrency(stats.monthReceivedCents)}</strong>
          </article>
          <article>
            <Clock3 size={18} aria-hidden="true" />
            <span>Pendente</span>
            <strong>{formatCurrency(stats.pendingCents)}</strong>
          </article>
          <article>
            <UsersRound size={18} aria-hidden="true" />
            <span>Clientes</span>
            <strong>{stats.clientCount}</strong>
          </article>
        </section>

        <section className="quick-actions" aria-label="Atalhos rapidos">
          <button type="button" onClick={() => setActiveTab('agenda')}>
            <Plus size={17} aria-hidden="true" /> Novo horario
          </button>
          <button type="button" onClick={() => setActiveTab('clients')}>
            <UserRound size={17} aria-hidden="true" /> Nova cliente
          </button>
          <button type="button" onClick={() => setActiveTab('products')}>
            <Package size={17} aria-hidden="true" /> Novo produto
          </button>
          <button type="button" onClick={() => setActiveTab('finance')}>
            <CreditCard size={17} aria-hidden="true" /> Novo pagamento
          </button>
        </section>

        <div className="agenda-columns">
          <section className="panel agenda-panel">
            <div className="panel-heading compact-heading">
              <div>
                <p className="eyebrow">Agenda da Hellen</p>
                <h2>{calendarView === 'list' ? 'Lista de horarios' : 'Grade diaria'}</h2>
              </div>
              <div className="segmented-control" role="tablist" aria-label="Visualizacao da agenda">
                {(['day', 'week', 'month', 'list'] as CalendarView[]).map((view) => (
                  <button
                    key={view}
                    className={calendarView === view ? 'active' : ''}
                    type="button"
                    onClick={() => setCalendarView(view)}
                  >
                    {view === 'day' ? 'Dia' : view === 'week' ? 'Semana' : view === 'month' ? 'Mes' : 'Lista'}
                  </button>
                ))}
              </div>
            </div>

            {activeTab === 'agenda' ? renderAppointmentForm() : null}
            {calendarView === 'day' ? renderTimeline() : renderAppointmentList(filteredAppointments)}
          </section>

          <aside className="side-stack">
            {renderSelectedAppointment()}
            <section className="panel stock-preview">
              <div className="panel-heading compact-heading">
                <div>
                  <p className="eyebrow">Estoque baixo</p>
                  <h2>Produtos</h2>
                </div>
                <span>{lowStockProducts.length}</span>
              </div>
              {lowStockProducts.length ? (
                <div className="stock-list">
                  {lowStockProducts.slice(0, 4).map((product) => (
                    <article key={product.id}>
                      <strong>{product.name}</strong>
                      <span>
                        {product.quantity} em estoque · minimo {product.minimum_quantity}
                      </span>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="empty-state">Nenhum produto abaixo do minimo.</p>
              )}
            </section>
          </aside>
        </div>

        <button className="fab-button" type="button" aria-label="Criar novo horario" onClick={() => setActiveTab('agenda')}>
          <Plus size={28} aria-hidden="true" />
        </button>
      </div>
    )
  }

  function renderAppointmentForm() {
    return (
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
            inputMode="tel"
            value={appointmentDraft.clientPhone}
            onChange={(event) =>
              setAppointmentDraft({ ...appointmentDraft, clientPhone: maskBrazilianPhone(event.target.value) })
            }
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
    )
  }

  function renderTimeline() {
    return (
      <div className="timeline-shell">
        <div className="timeline-professional">
          <span />
          <div>
            <UserRound size={19} aria-hidden="true" />
            <strong>Hellen</strong>
          </div>
        </div>
        <div className="timeline-grid">
          {timelineSlots.map((slot) => {
            const appointment = agendaAppointments.find((item) => item.start_time === slot)
            const blocked = defaultUnavailableBlocks.find((block) => isTimeInBlock(slot, block))
            const isHalfHour = slot.endsWith(':30')

            return (
              <div className="timeline-row" key={slot}>
                <time>{isHalfHour ? slot : slot}</time>
                <div className="timeline-cell">
                  {appointment ? (
                    <button
                      className={`timeline-appointment ${appointment.status}`}
                      type="button"
                      onClick={() => setSelectedAppointmentId(appointment.id)}
                    >
                      <strong>
                        {appointment.start_time} · {appointment.client_name}
                      </strong>
                      <span>
                        {appointment.service_name} · {formatCurrency(appointment.charged_amount_cents)}
                      </span>
                      <small>
                        {statusLabels[appointment.status]} · {getPaymentState(appointment) === 'paid' ? 'Pago' : 'Pendente'}
                      </small>
                    </button>
                  ) : blocked ? (
                    <div className="timeline-blocked">
                      <Ban size={14} aria-hidden="true" />
                      <span>{blocked.label}</span>
                    </div>
                  ) : (
                    <button
                      className="timeline-empty"
                      type="button"
                      onClick={() => {
                        setActiveTab('agenda')
                        setAppointmentDraft((current) => ({ ...current, scheduledDate: agendaDate, startTime: slot }))
                      }}
                    >
                      Horario livre
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  function renderAppointmentList(items: AppointmentRecord[]) {
    return (
      <div className="agenda-list">
        {items.map((appointment) => renderAppointmentRow(appointment))}
        {items.length === 0 ? (
          <p className="empty-state">Nenhum horario neste filtro. Crie um novo atendimento ou altere a data.</p>
        ) : null}
      </div>
    )
  }

  function renderSelectedAppointment() {
    const paymentState = selectedAppointment ? getPaymentState(selectedAppointment) : 'pending'

    return (
      <section className="panel detail-panel">
        <div className="panel-heading compact-heading">
          <div>
            <p className="eyebrow">Detalhe</p>
            <h2>{selectedAppointment?.client_name ?? 'Selecione um horario'}</h2>
          </div>
        </div>
        {selectedAppointment ? (
          <>
            <div className="client-summary">
              <UserRound size={22} aria-hidden="true" />
              <span>{selectedAppointment.client_phone}</span>
              <a
                href={buildWhatsAppUrl(
                  selectedAppointment.client_phone,
                  `Ola ${selectedAppointment.client_name}, tudo bem? Confirmando seu horario de ${selectedAppointment.service_name} as ${selectedAppointment.start_time}.`,
                )}
                target="_blank"
                rel="noreferrer"
              >
                Confirmar WhatsApp
              </a>
            </div>
            <div className="status-row">
              <span className={`status-pill ${selectedAppointment.status}`}>{statusLabels[selectedAppointment.status]}</span>
              <span className={`status-pill ${paymentState}`}>
                {paymentState === 'paid' ? 'Pago' : paymentState === 'partial' ? 'Parcial' : 'Pendente'}
              </span>
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
            <div className="reschedule-grid">
              <label>
                Remarcar data
                <input
                  type="date"
                  value={selectedAppointment.scheduled_date}
                  onChange={(event) => void updateAppointment(selectedAppointment.id, { scheduled_date: event.target.value })}
                />
              </label>
              <label>
                Remarcar hora
                <input
                  type="time"
                  value={selectedAppointment.start_time}
                  onChange={(event) => void updateAppointment(selectedAppointment.id, { start_time: event.target.value })}
                />
              </label>
            </div>
            <div className="row-actions detail-actions">
              <button
                type="button"
                aria-label={`Marcar ${selectedAppointment.client_name} como confirmado`}
                onClick={() => void updateAppointment(selectedAppointment.id, { status: 'confirmed' })}
              >
                <CalendarCheck2 size={15} aria-hidden="true" />
              </button>
              <button
                type="button"
                aria-label={`Marcar ${selectedAppointment.client_name} como concluido`}
                onClick={() =>
                  void updateAppointment(selectedAppointment.id, {
                    status: 'completed',
                    received_amount_cents: selectedAppointment.charged_amount_cents,
                  })
                }
              >
                <CheckCircle2 size={15} aria-hidden="true" />
              </button>
              <button
                type="button"
                aria-label={`Marcar ${selectedAppointment.client_name} como nao compareceu`}
                onClick={() => void updateAppointment(selectedAppointment.id, { status: 'no_show' })}
              >
                <XCircle size={15} aria-hidden="true" />
              </button>
              <button
                type="button"
                aria-label={`Excluir horario de ${selectedAppointment.client_name}`}
                onClick={() => void deleteAppointment(selectedAppointment.id)}
              >
                <Trash2 size={15} aria-hidden="true" />
              </button>
            </div>
          </>
        ) : (
          <p className="empty-state">Selecione um atendimento para ver detalhes.</p>
        )}
      </section>
    )
  }

  function renderAppointmentRow(appointment: AppointmentRecord) {
    const paymentState = getPaymentState(appointment)

    return (
      <article
        className={selectedAppointmentId === appointment.id ? 'agenda-row active' : 'agenda-row'}
        key={appointment.id}
      >
        <button type="button" className="row-select" onClick={() => setSelectedAppointmentId(appointment.id)}>
          <time dateTime={`${appointment.scheduled_date}T${appointment.start_time}`}>{appointment.start_time}</time>
          <div className="row-main">
            <strong>{appointment.client_name}</strong>
            <span>
              {appointment.service_name} · {formatCurrency(appointment.charged_amount_cents)}
            </span>
          </div>
        </button>
        <span className={`status-pill ${appointment.status}`}>{statusLabels[appointment.status]}</span>
        <span className={`status-pill ${paymentState}`}>
          {paymentState === 'paid' ? 'Pago' : paymentState === 'partial' ? 'Parcial' : 'Pendente'}
        </span>
        <div className="row-actions">
          <button
            type="button"
            aria-label={`Marcar ${appointment.client_name} como concluido`}
            onClick={() =>
              void updateAppointment(appointment.id, {
                status: 'completed',
                received_amount_cents: appointment.charged_amount_cents,
              })
            }
          >
            <CheckCircle2 size={15} aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label={`Abrir WhatsApp de ${appointment.client_name}`}
            onClick={() => window.open(buildWhatsAppUrl(appointment.client_phone, `Ola ${appointment.client_name}, tudo bem?`), '_blank')}
          >
            <MessageCircle size={15} aria-hidden="true" />
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
            <h2>Historico e preferencias.</h2>
          </div>
          <label className="admin-search slim-search">
            <Search size={16} aria-hidden="true" />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Buscar cliente"
            />
          </label>
        </div>
        <div className="client-grid">
          {filteredClients.map((client) => {
            const clientAppointments = appointments.filter(
              (appointment) => appointment.client_id === client.id || appointment.client_phone === client.phone,
            )
            const total = clientAppointments.reduce((sum, appointment) => sum + appointment.received_amount_cents, 0)
            const sortedClientAppointments = [...clientAppointments].sort((a, b) =>
              `${b.scheduled_date} ${b.start_time}`.localeCompare(`${a.scheduled_date} ${a.start_time}`),
            )
            const lastAppointment = sortedClientAppointments.find((appointment) => appointment.scheduled_date <= today)
            const nextAppointment = sortedClientAppointments
              .reverse()
              .find((appointment) => appointment.scheduled_date >= today && appointment.status !== 'canceled')

            return (
              <article className="client-card" key={client.id}>
                <div>
                  <strong>{client.full_name}</strong>
                  <span>{client.phone}</span>
                </div>
                <p>{client.notes || 'Sem anotacoes profissionais.'}</p>
                <dl>
                  <div>
                    <dt>Ultimo</dt>
                    <dd>{lastAppointment ? `${formatDateShort(lastAppointment.scheduled_date)} · ${lastAppointment.service_name}` : 'Sem historico'}</dd>
                  </div>
                  <div>
                    <dt>Proximo</dt>
                    <dd>{nextAppointment ? `${formatDateShort(nextAppointment.scheduled_date)} as ${nextAppointment.start_time}` : 'Nada marcado'}</dd>
                  </div>
                  <div>
                    <dt>Total recebido</dt>
                    <dd>{formatCurrency(total)}</dd>
                  </div>
                </dl>
                <a href={buildWhatsAppUrl(client.phone, `Ola ${client.full_name}, tudo bem?`)} target="_blank" rel="noreferrer">
                  WhatsApp
                </a>
              </article>
            )
          })}
        </div>
        {filteredClients.length === 0 ? (
          <p className="empty-state">Nenhuma cliente encontrada. Ajuste a busca ou crie um novo horario.</p>
        ) : null}
      </section>
    )
  }

  function renderFinance() {
    const pendingAppointments = appointments.filter((appointment) => getPaymentState(appointment) !== 'paid')

    return (
      <div className="finance-layout">
        <section className="metric-grid finance-metrics" aria-label="Resumo financeiro">
          <article>
            <Wallet size={18} aria-hidden="true" />
            <span>Recebido hoje</span>
            <strong>{formatCurrency(stats.receivedCents)}</strong>
          </article>
          <article>
            <BarChart3 size={18} aria-hidden="true" />
            <span>Semana</span>
            <strong>{formatCurrency(stats.weekReceivedCents)}</strong>
          </article>
          <article>
            <Banknote size={18} aria-hidden="true" />
            <span>Mes</span>
            <strong>{formatCurrency(stats.monthReceivedCents)}</strong>
          </article>
          <article>
            <Clock3 size={18} aria-hidden="true" />
            <span>Pendente</span>
            <strong>{formatCurrency(stats.pendingCents)}</strong>
          </article>
        </section>

        <section className="panel full-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Pagamentos</p>
              <h2>Recebimentos por atendimento.</h2>
            </div>
            <span>{pendingAppointments.length} pendente(s)</span>
          </div>
          <div className="payment-list">
            {sortedAppointments.map((appointment) => {
              const paymentState = getPaymentState(appointment)
              return (
                <article key={appointment.id}>
                  <div>
                    <strong>{appointment.client_name}</strong>
                    <span>
                      {formatDateShort(appointment.scheduled_date)} · {appointment.service_name}
                    </span>
                  </div>
                  <span className={`status-pill ${paymentState}`}>
                    {paymentState === 'paid' ? 'Pago' : paymentState === 'partial' ? 'Parcial' : 'Pendente'}
                  </span>
                  <label>
                    Recebido
                    <input
                      inputMode="decimal"
                      value={centsToInputValue(appointment.received_amount_cents)}
                      onChange={(event) =>
                        void updateAppointment(appointment.id, {
                          received_amount_cents: parseCurrencyToCents(event.target.value),
                        })
                      }
                    />
                  </label>
                  <select
                    aria-label={`Metodo de pagamento de ${appointment.client_name}`}
                    value={appointment.payment_method}
                    onChange={(event) =>
                      void updateAppointment(appointment.id, { payment_method: event.target.value as PaymentMethod })
                    }
                  >
                    {Object.entries(paymentMethodLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </article>
              )
            })}
          </div>
        </section>

        <section className="panel full-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Relatorio simples</p>
              <h2>Servicos mais realizados.</h2>
            </div>
          </div>
          <div className="usage-list">
            {serviceUsage.map((item) => (
              <article key={item.serviceName}>
                <strong>{item.serviceName}</strong>
                <span>{item.count} atendimento(s)</span>
                <b>{formatCurrency(item.revenueCents)}</b>
              </article>
            ))}
          </div>
        </section>
      </div>
    )
  }

  function renderProducts() {
    return (
      <section className="panel full-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Produtos e estoque</p>
            <h2>Controle de materiais.</h2>
          </div>
          <span>{stats.lowStockCount} baixo(s)</span>
        </div>

        <form className="editor-form compact product-form" onSubmit={handleCreateProduct}>
          <label>
            Produto
            <input value={newProduct.name} onChange={(event) => setNewProduct({ ...newProduct, name: event.target.value })} />
          </label>
          <label>
            Categoria
            <input value={newProduct.category} onChange={(event) => setNewProduct({ ...newProduct, category: event.target.value })} />
          </label>
          <label>
            Estoque
            <input
              inputMode="numeric"
              value={newProduct.quantity}
              onChange={(event) => setNewProduct({ ...newProduct, quantity: event.target.value })}
            />
          </label>
          <label>
            Custo
            <input value={newProduct.unitCost} onChange={(event) => setNewProduct({ ...newProduct, unitCost: event.target.value })} />
          </label>
          <label>
            Venda
            <input value={newProduct.salePrice} onChange={(event) => setNewProduct({ ...newProduct, salePrice: event.target.value })} />
          </label>
          <label>
            Minimo
            <input
              inputMode="numeric"
              value={newProduct.minimumQuantity}
              onChange={(event) => setNewProduct({ ...newProduct, minimumQuantity: event.target.value })}
            />
          </label>
          <label className="wide-field">
            Observacoes
            <input value={newProduct.notes} onChange={(event) => setNewProduct({ ...newProduct, notes: event.target.value })} />
          </label>
          <button className="primary-action" type="submit">
            <Plus size={16} aria-hidden="true" /> Criar produto
          </button>
        </form>

        <div className="product-grid">
          {products.map((product) => {
            const low = product.quantity <= product.minimum_quantity
            return (
              <article className={low ? 'product-card low' : 'product-card'} key={product.id}>
                <div>
                  <strong>{product.name}</strong>
                  <span>{product.category}</span>
                </div>
                <dl>
                  <div>
                    <dt>Estoque</dt>
                    <dd>{product.quantity}</dd>
                  </div>
                  <div>
                    <dt>Minimo</dt>
                    <dd>{product.minimum_quantity}</dd>
                  </div>
                  <div>
                    <dt>Custo</dt>
                    <dd>{formatCurrency(product.unit_cost_cents)}</dd>
                  </div>
                </dl>
                {low ? <span className="status-pill pending">Estoque baixo</span> : <span className="status-pill paid">Ok</span>}
                <div className="product-actions">
                  <button type="button" onClick={() => void adjustProductQuantity(product, 'in', 1)}>
                    Entrada
                  </button>
                  <button type="button" onClick={() => void adjustProductQuantity(product, 'service_use', -1)}>
                    Uso
                  </button>
                  <button type="button" onClick={() => void adjustProductQuantity(product, 'sale', -1)}>
                    Venda
                  </button>
                </div>
                <label>
                  Anotacao
                  <input value={product.notes} onChange={(event) => void updateProduct(product, { notes: event.target.value })} />
                </label>
              </article>
            )
          })}
        </div>

        <section className="movement-panel">
          <p className="eyebrow">Movimentacoes recentes</p>
          <div className="movement-list">
            {stockMovements.map((movement) => (
              <article key={movement.id}>
                <strong>{movement.product_name}</strong>
                <span>
                  {movementTypeLabels[movement.type]} · {movement.quantity} un.
                </span>
              </article>
            ))}
          </div>
        </section>
      </section>
    )
  }

  function renderLandingManager() {
    return (
      <div className="landing-manager">
        {renderLandingEditor()}
        {renderServicesEditor()}
        {renderGalleryEditor()}
      </div>
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
            <h2>Precos e publicacao.</h2>
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
              <input aria-label="Nome do servico" value={service.name} onChange={(event) => void updateService(service, { name: event.target.value })} />
              <input
                aria-label="Preco do servico"
                value={centsToInputValue(service.price_cents)}
                onChange={(event) => void updateService(service, { price_cents: parseCurrencyToCents(event.target.value) })}
              />
              <input
                aria-label="Duracao do servico"
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
              <button
                type="button"
                aria-label={item.published ? `Ocultar ${item.title}` : `Publicar ${item.title}`}
                onClick={() => void updateGalleryItem(item, { published: !item.published })}
              >
                {item.published ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
              </button>
              <button type="button" aria-label={`Excluir ${item.title}`} onClick={() => void deleteGalleryItem(item.id)}>
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
