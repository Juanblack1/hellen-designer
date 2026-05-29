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
  CalendarRange,
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  CircleHelp,
  ClipboardList,
  Clock3,
  CreditCard,
  Edit3,
  Eye,
  EyeOff,
  History,
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
  Settings,
  Share2,
  ShieldCheck,
  SlidersHorizontal,
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
  addMinutesToTime,
  buildAgendaSlotsForDate,
  buildWhatsAppUrl,
  calculateAdminStats,
  centsToInputValue,
  defaultAvailabilityExceptions,
  defaultAvailabilityRules,
  defaultAppointments,
  defaultBusinessHours,
  defaultClients,
  defaultGallery,
  defaultPaymentTransactions,
  defaultProducts,
  defaultProfile,
  defaultScheduleSettings,
  defaultServices,
  defaultStockMovements,
  formatCurrency,
  formatDateLong,
  formatDateShort,
  getAppointmentEndTime,
  getAvailableSlots,
  getBusinessHourForDate,
  getLowStockProducts,
  getPaymentState,
  getServiceUsage,
  getWeekDates,
  hasScheduleConflict,
  isSlotBlockedByException,
  isSlotInsideAvailability,
  maskBrazilianPhone,
  parseCurrencyToCents,
  rangesOverlap,
  sortByOrder,
} from './domain'
import type {
  AppointmentRecord,
  AppointmentStatus,
  AvailabilityException,
  AvailabilityExceptionType,
  AvailabilityRule,
  BusinessHour,
  BusinessProfile,
  ClientRecord,
  GalleryItem,
  PaymentMethod,
  PaymentStatus,
  PaymentTransaction,
  ProductItem,
  ScheduleSettings,
  ServiceItem,
  StockMovement,
  StockMovementType,
} from './domain'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import './App.css'

type AdminTab = 'today' | 'agenda' | 'clients' | 'finance' | 'services' | 'products' | 'settings' | 'landing'
type CalendarView = 'day' | 'week' | 'month' | 'list'
type PaymentFilter = 'all' | PaymentStatus | 'open'
type AppointmentDrawerMode = 'create' | 'edit'

type AppointmentDraft = {
  id: string
  clientId: string
  clientName: string
  clientPhone: string
  serviceId: string
  scheduledDate: string
  startTime: string
  endTime: string
  status: AppointmentStatus
  chargedAmount: string
  receivedAmount: string
  paymentMethod: PaymentMethod
  paymentStatus: PaymentStatus
  professional: string
  notes: string
}

type AppointmentDrawerState = {
  open: boolean
  mode: AppointmentDrawerMode
  appointmentId: string
}

type PartialPaymentDraft = {
  appointmentId: string
  amount: string
  method: PaymentMethod
  paidAt: string
  notes: string
}

type CancelPaymentDraft = {
  appointmentId: string
  reason: string
  notes: string
}

type ExceptionDraft = {
  date: string
  type: AvailabilityExceptionType
  startTime: string
  endTime: string
  reason: string
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

type ClientDraft = {
  fullName: string
  phone: string
  birthDate: string
  notes: string
}

type PaymentLauncherDraft = {
  search: string
}

type GalleryDraft = {
  title: string
  imageUrl: string
  altText: string
  file: File | null
}

const todayIso = () => new Date().toISOString().slice(0, 10)
const canonicalPublicUrl = import.meta.env.VITE_PUBLIC_SITE_URL?.trim() || 'https://hellen-designer.vercel.app'
const canonicalAdminUrl = import.meta.env.VITE_ADMIN_SITE_URL?.trim() || 'https://hellen-designer-admin.vercel.app'
const localHostnames = new Set(['localhost', '127.0.0.1', '::1'])

const adminTabs: Array<{ id: AdminTab; label: string; icon: typeof CalendarDays }> = [
  { id: 'today', label: 'Hoje', icon: Home },
  { id: 'agenda', label: 'Agenda', icon: CalendarDays },
  { id: 'finance', label: 'Financeiro', icon: Banknote },
  { id: 'clients', label: 'Clientes', icon: UsersRound },
  { id: 'services', label: 'Servicos', icon: Sparkles },
  { id: 'settings', label: 'Horarios', icon: Settings },
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
  transfer: 'Transferencia',
  other: 'Outro',
}

const paymentStatusLabels: Record<PaymentStatus, string> = {
  pending: 'Pendente',
  partial: 'Pago parcial',
  paid: 'Pago',
  canceled: 'Cancelado',
}

const dayLabels = ['Domingo', 'Segunda', 'Terca', 'Quarta', 'Quinta', 'Sexta', 'Sabado']

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
  const duration = firstService?.duration_minutes ?? 60

  return {
    id: '',
    clientId: '',
    clientName: '',
    clientPhone: '',
    serviceId: firstService.id,
    scheduledDate: date,
    startTime: time,
    endTime: addMinutesToTime(time, duration),
    status: 'scheduled',
    chargedAmount: centsToInputValue(firstService.price_cents),
    receivedAmount: '0,00',
    paymentMethod: 'pix',
    paymentStatus: 'pending',
    professional: 'Hellen',
    notes: '',
  }
}

function appointmentToDraft(appointment: AppointmentRecord, services: ServiceItem[]): AppointmentDraft {
  return {
    id: appointment.id,
    clientId: appointment.client_id ?? '',
    clientName: appointment.client_name,
    clientPhone: appointment.client_phone,
    serviceId: appointment.service_id ?? services[0]?.id ?? '',
    scheduledDate: appointment.scheduled_date,
    startTime: appointment.start_time,
    endTime: getAppointmentEndTime(appointment, services),
    status: appointment.status,
    chargedAmount: centsToInputValue(appointment.charged_amount_cents),
    receivedAmount: centsToInputValue(appointment.received_amount_cents),
    paymentMethod: appointment.payment_method,
    paymentStatus: getPaymentState(appointment),
    professional: 'Hellen',
    notes: appointment.notes,
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

function newClientDraft(): ClientDraft {
  return {
    fullName: '',
    phone: '',
    birthDate: '',
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
  return 'Ola Hellen, vim pelo Instagram/site e quero saber sobre os procedimentos.'
}

function getServiceMessage(service: ServiceItem) {
  return `Ola Hellen, vim pelo site e quero saber sobre ${service.name} (${formatCurrency(service.price_cents)}).`
}

function isLocalHost(hostname: string) {
  return localHostnames.has(hostname) || hostname.endsWith('.local')
}

function isAdminHost(hostname: string) {
  const normalized = hostname.toLowerCase()
  return (
    normalized.startsWith('admin.') ||
    normalized.startsWith('admin-') ||
    normalized.startsWith('hellen-admin') ||
    normalized.startsWith('hellen-designer-admin') ||
    normalized.startsWith('hellenmartins-admin')
  )
}

function dateStamp(value?: string | null) {
  if (!value) {
    return 0
  }

  const stamp = new Date(value).getTime()
  return Number.isFinite(stamp) ? stamp : 0
}

function appointmentDateStamp(appointment: AppointmentRecord) {
  return Math.max(
    dateStamp(appointment.updated_at),
    dateStamp(appointment.created_at),
    dateStamp(`${appointment.scheduled_date}T${appointment.start_time}:00`),
  )
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
  const [paymentTransactions, setPaymentTransactions] = useState<PaymentTransaction[]>(defaultPaymentTransactions)
  const [products, setProducts] = useState<ProductItem[]>(defaultProducts)
  const [stockMovements, setStockMovements] = useState<StockMovement[]>(defaultStockMovements)
  const [businessHours, setBusinessHours] = useState<BusinessHour[]>(defaultBusinessHours)
  const [availabilityRules, setAvailabilityRules] = useState<AvailabilityRule[]>(defaultAvailabilityRules)
  const [availabilityExceptions, setAvailabilityExceptions] =
    useState<AvailabilityException[]>(defaultAvailabilityExceptions)
  const [scheduleSettings, setScheduleSettings] = useState<ScheduleSettings>(defaultScheduleSettings)
  const [dataStatus, setDataStatus] = useState('')

  const [activeTab, setActiveTab] = useState<AdminTab>('today')
  const [calendarView, setCalendarView] = useState<CalendarView>('day')
  const [agendaDate, setAgendaDate] = useState(todayIso())
  const [searchTerm, setSearchTerm] = useState('')
  const [financeSearch, setFinanceSearch] = useState('')
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('open')
  const [appointmentDraft, setAppointmentDraft] = useState<AppointmentDraft>(() => newAppointmentDraft(defaultServices))
  const [clientPickerSearch, setClientPickerSearch] = useState('')
  const [isClientPickerExpanded, setIsClientPickerExpanded] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const [appointmentDrawer, setAppointmentDrawer] = useState<AppointmentDrawerState>({
    open: false,
    mode: 'create',
    appointmentId: '',
  })
  const [partialPaymentDraft, setPartialPaymentDraft] = useState<PartialPaymentDraft | null>(null)
  const [cancelPaymentDraft, setCancelPaymentDraft] = useState<CancelPaymentDraft | null>(null)
  const [isClientModalOpen, setIsClientModalOpen] = useState(false)
  const [isProductModalOpen, setIsProductModalOpen] = useState(false)
  const [isPaymentLauncherOpen, setIsPaymentLauncherOpen] = useState(false)
  const [newClient, setNewClient] = useState<ClientDraft>(() => newClientDraft())
  const [paymentLauncher, setPaymentLauncher] = useState<PaymentLauncherDraft>({ search: '' })
  const [exceptionDraft, setExceptionDraft] = useState<ExceptionDraft>({
    date: todayIso(),
    type: 'blocked',
    startTime: '12:00',
    endTime: '13:30',
    reason: '',
  })
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
  const hostname = window.location.hostname
  const adminHost = isAdminHost(hostname)
  const localHost = isLocalHost(hostname)
  const adminPath = route.startsWith('/admin') || route === '/auth'
  const redirectToAdminHost = adminPath && !adminHost && !localHost
  const isAdminRoute = adminHost || (adminPath && localHost)
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
  const selectedAppointment = appointments.find((appointment) => appointment.id === selectedAppointmentId) ?? agendaAppointments[0]
  const selectedClient = selectedAppointment
    ? clients.find((client) => client.id === selectedAppointment.client_id || client.phone === selectedAppointment.client_phone)
    : null
  const clientsByRecent = useMemo(
    () =>
      [...clients].sort((a, b) => {
        const latestAppointmentA = Math.max(
          0,
          ...appointments
            .filter((appointment) => appointment.client_id === a.id || appointment.client_phone === a.phone)
            .map(appointmentDateStamp),
        )
        const latestAppointmentB = Math.max(
          0,
          ...appointments
            .filter((appointment) => appointment.client_id === b.id || appointment.client_phone === b.phone)
            .map(appointmentDateStamp),
        )

        return (
          Math.max(dateStamp(b.updated_at), dateStamp(b.created_at), latestAppointmentB) -
          Math.max(dateStamp(a.updated_at), dateStamp(a.created_at), latestAppointmentA)
        )
      }),
    [appointments, clients],
  )
  const productsByRecent = useMemo(
    () => [...products].sort((a, b) => dateStamp(b.updated_at) - dateStamp(a.updated_at) || a.name.localeCompare(b.name)),
    [products],
  )
  const paymentAppointmentsByRecent = useMemo(
    () =>
      [...appointments].sort((a, b) => {
        const latestTransactionA = Math.max(
          0,
          ...paymentTransactions
            .filter((transaction) => transaction.appointment_id === a.id)
            .map((transaction) => Math.max(dateStamp(transaction.paid_at), dateStamp(transaction.created_at))),
        )
        const latestTransactionB = Math.max(
          0,
          ...paymentTransactions
            .filter((transaction) => transaction.appointment_id === b.id)
            .map((transaction) => Math.max(dateStamp(transaction.paid_at), dateStamp(transaction.created_at))),
        )

        return Math.max(appointmentDateStamp(b), latestTransactionB) - Math.max(appointmentDateStamp(a), latestTransactionA)
      }),
    [appointments, paymentTransactions],
  )
  const selectedDraftService = services.find((service) => service.id === appointmentDraft.serviceId) ?? services[0]
  const agendaSlots = useMemo(
    () => buildAgendaSlotsForDate(agendaDate, businessHours, scheduleSettings),
    [agendaDate, businessHours, scheduleSettings],
  )
  const weekDates = useMemo(() => getWeekDates(agendaDate), [agendaDate])
  const availableSlotsForDraft = useMemo(
    () =>
      getAvailableSlots(
        appointments,
        appointmentDraft.scheduledDate,
        services,
        businessHours,
        availabilityRules,
        availabilityExceptions,
        scheduleSettings,
        selectedDraftService?.duration_minutes ?? 60,
      ),
    [
      appointments,
      appointmentDraft.scheduledDate,
      services,
      businessHours,
      availabilityRules,
      availabilityExceptions,
      scheduleSettings,
      selectedDraftService,
    ],
  )
  const filteredClients = clientsByRecent.filter((client) => {
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
  const financeAppointments = paymentAppointmentsByRecent.filter((appointment) => {
    const paymentState = getPaymentState(appointment)
    const term = financeSearch.trim().toLowerCase()
    const matchesTerm =
      !term ||
      appointment.client_name.toLowerCase().includes(term) ||
      appointment.client_phone.includes(term) ||
      appointment.service_name.toLowerCase().includes(term)

    if (!matchesTerm) {
      return false
    }

    if (paymentFilter === 'all') {
      return true
    }

    if (paymentFilter === 'open') {
      return paymentState === 'pending' || paymentState === 'partial'
    }

    return paymentState === paymentFilter
  })

  function goToPath(path: string) {
    window.history.pushState(null, '', path)
    setRoute(path)
    window.scrollTo({ top: 0 })
  }

  function selectAdminTab(tab: AdminTab) {
    setActiveTab(tab)
    setIsMobileSidebarOpen(false)
  }

  function toggleAdminMenu() {
    if (window.matchMedia('(max-width: 860px)').matches) {
      setIsMobileSidebarOpen((current) => !current)
      return
    }

    setIsSidebarCollapsed((current) => !current)
  }

  function openPublicLanding() {
    if (adminHost && !localHost) {
      window.location.href = canonicalPublicUrl
      return
    }

    goToPath('/')
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

    // Public visitors should see the branded fallback content, not technical loading details.
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

    const [
      profileResult,
      serviceResult,
      galleryResult,
      clientResult,
      appointmentResult,
      productResult,
      movementResult,
      paymentTransactionResult,
      businessHourResult,
      availabilityRuleResult,
      availabilityExceptionResult,
      settingsResult,
    ] = await Promise.all([
        supabase.from('business_profile').select('*').eq('id', 'default').maybeSingle(),
        supabase.from('services').select('*').order('sort_order', { ascending: true }),
        supabase.from('gallery_items').select('*').order('sort_order', { ascending: true }),
        supabase.from('clients').select('*').order('full_name', { ascending: true }),
        supabase.from('appointments').select('*').order('scheduled_date', { ascending: true }),
        supabase.from('products').select('*').order('name', { ascending: true }),
        supabase.from('stock_movements').select('*').order('created_at', { ascending: false }).limit(12),
        supabase.from('payment_transactions').select('*').order('paid_at', { ascending: false }),
        supabase.from('business_hours').select('*').order('day_of_week', { ascending: true }),
        supabase.from('availability_rules').select('*').order('day_of_week', { ascending: true }),
        supabase.from('availability_exceptions').select('*').order('date', { ascending: true }),
        supabase.from('schedule_settings').select('*').eq('id', 'default').maybeSingle(),
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

    if (paymentTransactionResult.data) {
      setPaymentTransactions(paymentTransactionResult.data as PaymentTransaction[])
    }

    if (businessHourResult.data?.length) {
      setBusinessHours(businessHourResult.data as BusinessHour[])
    }

    if (availabilityRuleResult.data?.length) {
      setAvailabilityRules(availabilityRuleResult.data as AvailabilityRule[])
    }

    if (availabilityExceptionResult.data) {
      setAvailabilityExceptions(availabilityExceptionResult.data as AvailabilityException[])
    }

    if (settingsResult.data) {
      const settingsData = settingsResult.data as Partial<ScheduleSettings>
      setScheduleSettings({
        slot_interval_minutes: settingsData.slot_interval_minutes ?? defaultScheduleSettings.slot_interval_minutes,
        buffer_between_services_minutes:
          settingsData.buffer_between_services_minutes ?? defaultScheduleSettings.buffer_between_services_minutes,
        minimum_notice_hours: settingsData.minimum_notice_hours ?? defaultScheduleSettings.minimum_notice_hours,
        max_days_ahead: settingsData.max_days_ahead ?? defaultScheduleSettings.max_days_ahead,
        allow_same_day_booking: settingsData.allow_same_day_booking ?? defaultScheduleSettings.allow_same_day_booking,
        allow_manual_outside_availability:
          settingsData.allow_manual_outside_availability ?? defaultScheduleSettings.allow_manual_outside_availability,
      })
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
      setDataStatus('Alguns dados nao carregaram. Confira conexao e permissoes.')
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
    if (redirectToAdminHost) {
      window.location.replace(canonicalAdminUrl)
      return undefined
    }

    if (isAdminRoute || route === '/') {
      return undefined
    }

    const redirectTimer = window.setTimeout(() => {
      window.history.replaceState(null, '', '/')
      setRoute('/')
    }, 0)

    return () => window.clearTimeout(redirectTimer)
  }, [isAdminRoute, redirectToAdminHost, route])

  async function handleSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setAuthStatus('')

    if (!supabase) {
      setIsAdmin(true)
      setAuthStatus('Acesso local ativado.')
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
    if (!adminHost) {
      goToPath('/')
    }
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

  async function handleCreateClient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const maskedPhone = maskBrazilianPhone(newClient.phone)

    if (newClient.fullName.trim().length < 2 || maskedPhone.length < 8) {
      setDataStatus('Informe nome e WhatsApp da cliente.')
      return
    }

    if (clients.some((client) => client.phone === maskedPhone)) {
      setDataStatus('Ja existe uma cliente com esse WhatsApp.')
      return
    }

    const now = new Date().toISOString()
    const client: ClientRecord = {
      id: crypto.randomUUID(),
      full_name: newClient.fullName.trim(),
      phone: maskedPhone,
      birth_date: newClient.birthDate || null,
      notes: newClient.notes.trim(),
      created_at: now,
      updated_at: now,
    }

    let savedClient = client

    if (supabase) {
      const { data, error } = await supabase.from('clients').insert(client).select('*').single()
      if (error) {
        setDataStatus('Nao foi possivel cadastrar a cliente.')
        return
      }

      savedClient = data as ClientRecord
      setClients((current) => [savedClient, ...current])
    } else {
      setClients((current) => [client, ...current])
    }

    if (appointmentDrawer.open) {
      selectClientForDraft(savedClient)
    }

    setNewClient(newClientDraft())
    setIsClientModalOpen(false)
    setDataStatus('Cliente cadastrada.')
  }

  function getDraftService(draft = appointmentDraft) {
    return services.find((item) => item.id === draft.serviceId) ?? services[0]
  }

  function selectClientForDraft(client: ClientRecord) {
    setAppointmentDraft((current) => ({
      ...current,
      clientId: client.id,
      clientName: client.full_name,
      clientPhone: client.phone,
    }))
    setClientPickerSearch(client.full_name)
    setIsClientPickerExpanded(false)
  }

  function openNewAppointmentDrawer(date = agendaDate, time = '09:00') {
    const draft = newAppointmentDraft(services, date, time)
    setAppointmentDraft(draft)
    setClientPickerSearch('')
    setIsClientPickerExpanded(false)
    setAppointmentDrawer({ open: true, mode: 'create', appointmentId: '' })
    setActiveTab('agenda')
  }

  function getFirstAvailableSlot(date = agendaDate) {
    const service = services[0] ?? defaultServices[0]
    return (
      getAvailableSlots(
        appointments,
        date,
        services,
        businessHours,
        availabilityRules,
        availabilityExceptions,
        scheduleSettings,
        service.duration_minutes,
      )[0] ?? buildAgendaSlotsForDate(date, businessHours, scheduleSettings)[0] ?? '09:00'
    )
  }

  function openEditAppointmentDrawer(appointment: AppointmentRecord) {
    setSelectedAppointmentId(appointment.id)
    setAppointmentDraft(appointmentToDraft(appointment, services))
    setClientPickerSearch(appointment.client_name)
    setIsClientPickerExpanded(false)
    setAppointmentDrawer({ open: true, mode: 'edit', appointmentId: appointment.id })
    setActiveTab('agenda')
  }

  function closeAppointmentDrawer() {
    setAppointmentDrawer({ open: false, mode: 'create', appointmentId: '' })
  }

  function patchDraftService(serviceId: string) {
    const service = services.find((item) => item.id === serviceId) ?? services[0]
    setAppointmentDraft((current) => ({
      ...current,
      serviceId,
      chargedAmount: centsToInputValue(service?.price_cents ?? 0),
      endTime: addMinutesToTime(current.startTime, service?.duration_minutes ?? 60),
    }))
  }

  function patchDraftStartTime(startTime: string) {
    const service = getDraftService()
    setAppointmentDraft((current) => ({
      ...current,
      startTime,
      endTime: addMinutesToTime(startTime, service?.duration_minutes ?? 60),
    }))
  }

  function validateAppointmentDraft(ignoreId?: string) {
    const service = getDraftService()
    const duration = service?.duration_minutes ?? 60
    const endTime = addMinutesToTime(appointmentDraft.startTime, duration)
    const chargedAmount = parseCurrencyToCents(appointmentDraft.chargedAmount)
    const receivedAmount = parseCurrencyToCents(appointmentDraft.receivedAmount)

    if (appointmentDraft.clientName.trim().length < 2 || normalizeWhitespace(appointmentDraft.clientPhone).length < 8) {
      return 'Informe nome e WhatsApp da cliente.'
    }

    if (!service) {
      return 'Selecione um servico.'
    }

    if (receivedAmount > chargedAmount) {
      return 'O valor recebido nao pode ser maior que o valor cobrado.'
    }

    if (!scheduleSettings.allow_same_day_booking && appointmentDraft.scheduledDate === today) {
      return 'A regra atual nao permite agendamento no mesmo dia.'
    }

    if (appointmentDraft.scheduledDate > addDays(today, scheduleSettings.max_days_ahead)) {
      return 'Data fora do limite de dias a frente configurado.'
    }

    if (scheduleSettings.minimum_notice_hours > 0) {
      const appointmentDate = new Date(`${appointmentDraft.scheduledDate}T${appointmentDraft.startTime}:00`)
      const minimumDate = new Date(Date.now() + scheduleSettings.minimum_notice_hours * 60 * 60 * 1000)
      if (appointmentDate < minimumDate) {
        return 'Horario abaixo da antecedencia minima configurada.'
      }
    }

    if (
      !scheduleSettings.allow_manual_outside_availability &&
      !isSlotInsideAvailability(
        appointmentDraft.scheduledDate,
        appointmentDraft.startTime,
        endTime,
        businessHours,
        availabilityRules,
        availabilityExceptions,
      )
    ) {
      return 'Horario fora da disponibilidade configurada.'
    }

    if (
      hasScheduleConflict(
        appointments,
        appointmentDraft.scheduledDate,
        appointmentDraft.startTime,
        ignoreId,
        services,
        duration,
        scheduleSettings.buffer_between_services_minutes,
      )
    ) {
      return 'Horario ja ocupado. Escolha outro horario.'
    }

    return ''
  }

  function normalizeWhitespace(value: string) {
    return value.replace(/\s/g, '')
  }

  function stripModernAppointmentFields(patch: Partial<AppointmentRecord>) {
    const legacyPatch: Partial<AppointmentRecord> = { ...patch }
    delete legacyPatch.end_time
    delete legacyPatch.payment_status
    delete legacyPatch.payment_canceled_reason
    return legacyPatch
  }

  function isSchemaCompatibilityError(error: { code?: string; message?: string } | null) {
    const message = error?.message?.toLowerCase() ?? ''
    return error?.code === '42703' || error?.code === '42P01' || message.includes('column') || message.includes('relation')
  }

  async function insertAppointmentInDatabase(appointment: AppointmentRecord) {
    if (!supabase) {
      return null
    }

    const { error } = await supabase.from('appointments').insert(appointment)
    if (!error || !isSchemaCompatibilityError(error)) {
      return error
    }

    const legacyAppointment = stripModernAppointmentFields(appointment)
    const retry = await supabase.from('appointments').insert(legacyAppointment)
    return retry.error
  }

  async function updateAppointmentInDatabase(id: string, patch: Partial<AppointmentRecord>) {
    if (!supabase) {
      return null
    }

    const { error } = await supabase.from('appointments').update(patch).eq('id', id)
    if (!error || !isSchemaCompatibilityError(error)) {
      return error
    }

    const retry = await supabase.from('appointments').update(stripModernAppointmentFields(patch)).eq('id', id)
    return retry.error
  }

  async function handleSaveAppointment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const validationMessage = validateAppointmentDraft(appointmentDrawer.mode === 'edit' ? appointmentDrawer.appointmentId : undefined)
    if (validationMessage) {
      setDataStatus(validationMessage)
      return
    }

    setIsSaving(true)
    const service = getDraftService()
    const maskedPhone = maskBrazilianPhone(appointmentDraft.clientPhone)
    const existingClient =
      clients.find((client) => client.id === appointmentDraft.clientId) ?? clients.find((client) => client.phone === maskedPhone)
    let nextClient = existingClient

    if (!nextClient) {
      nextClient = {
        id: crypto.randomUUID(),
        full_name: appointmentDraft.clientName.trim(),
        phone: maskedPhone,
        birth_date: null,
        notes: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
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
    } else if (
      (nextClient.full_name !== appointmentDraft.clientName.trim() || nextClient.phone !== maskedPhone) &&
      appointmentDraft.clientId
    ) {
      const updatedClient = {
        ...nextClient,
        full_name: appointmentDraft.clientName.trim(),
        phone: maskedPhone,
        updated_at: new Date().toISOString(),
      }
      setClients((current) => current.map((client) => (client.id === updatedClient.id ? updatedClient : client)))

      if (supabase) {
        await supabase
          .from('clients')
          .update({ full_name: updatedClient.full_name, phone: updatedClient.phone })
          .eq('id', updatedClient.id)
      }
    }

    const chargedAmount = parseCurrencyToCents(appointmentDraft.chargedAmount)
    const receivedAmount = parseCurrencyToCents(appointmentDraft.receivedAmount)
    const paymentStatus = getPaymentState({
      charged_amount_cents: chargedAmount,
      received_amount_cents: receivedAmount,
      payment_status: appointmentDraft.paymentStatus === 'canceled' ? 'canceled' : null,
    })
    const now = new Date().toISOString()
    const nextAppointment: AppointmentRecord = {
      id: appointmentDrawer.mode === 'edit' ? appointmentDrawer.appointmentId : crypto.randomUUID(),
      client_id: nextClient.id,
      client_name: appointmentDraft.clientName.trim(),
      client_phone: maskedPhone,
      service_id: service?.id ?? null,
      service_name: service?.name ?? 'Atendimento',
      scheduled_date: appointmentDraft.scheduledDate,
      start_time: appointmentDraft.startTime,
      end_time: addMinutesToTime(appointmentDraft.startTime, service?.duration_minutes ?? 60),
      status: appointmentDraft.status,
      charged_amount_cents: chargedAmount,
      received_amount_cents: receivedAmount,
      payment_method: appointmentDraft.paymentMethod,
      payment_status: paymentStatus,
      payment_canceled_reason: paymentStatus === 'canceled' ? 'Lancamento cancelado' : null,
      notes: appointmentDraft.notes.trim(),
      created_at: appointmentDrawer.mode === 'edit' ? undefined : now,
      updated_at: now,
    }

    if (appointmentDrawer.mode === 'edit') {
      const appointmentPatch: Partial<AppointmentRecord> = { ...nextAppointment }
      delete appointmentPatch.id
      if (!appointmentPatch.created_at) {
        delete appointmentPatch.created_at
      }
      await updateAppointment(nextAppointment.id, appointmentPatch)
      setIsSaving(false)
      closeAppointmentDrawer()
      return
    }

    if (supabase) {
      const error = await insertAppointmentInDatabase(nextAppointment)
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
    closeAppointmentDrawer()
    setIsSaving(false)
  }

  async function updateAppointment(id: string, patch: Partial<AppointmentRecord>) {
    const currentAppointment = appointments.find((appointment) => appointment.id === id)
    if (!currentAppointment) {
      return
    }

    const nextAppointment = { ...currentAppointment, ...patch }
    const service = services.find((item) => item.id === nextAppointment.service_id) ?? services[0]
    const duration = service?.duration_minutes ?? 60
    const nextEnd = nextAppointment.end_time ?? addMinutesToTime(nextAppointment.start_time, duration)
    const touchesSchedule = Boolean(patch.scheduled_date || patch.start_time || patch.end_time || patch.service_id)

    if (
      touchesSchedule &&
      !scheduleSettings.allow_manual_outside_availability &&
      !isSlotInsideAvailability(
        nextAppointment.scheduled_date,
        nextAppointment.start_time,
        nextEnd,
        businessHours,
        availabilityRules,
        availabilityExceptions,
      )
    ) {
      setDataStatus('Esse horario esta fora da disponibilidade configurada.')
      return
    }

    if (
      touchesSchedule &&
      hasScheduleConflict(
        appointments,
        nextAppointment.scheduled_date,
        nextAppointment.start_time,
        id,
        services,
        duration,
        scheduleSettings.buffer_between_services_minutes,
      )
    ) {
      setDataStatus('Esse novo horario ja esta ocupado.')
      return
    }

    setAppointments((current) =>
      current.map((appointment) =>
        appointment.id === id ? { ...nextAppointment, updated_at: new Date().toISOString() } : appointment,
      ),
    )

    if (supabase) {
      const error = await updateAppointmentInDatabase(id, patch)

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

  async function recordPaymentTransaction(
    appointment: AppointmentRecord,
    amountCents: number,
    method: PaymentMethod,
    paidAt: string,
    notes: string,
  ) {
    if (amountCents <= 0) {
      return
    }

    const transaction: PaymentTransaction = {
      id: crypto.randomUUID(),
      appointment_id: appointment.id,
      amount_cents: amountCents,
      method,
      paid_at: paidAt,
      notes,
      created_at: new Date().toISOString(),
    }

    setPaymentTransactions((current) => [transaction, ...current])

    if (supabase) {
      const { error } = await supabase.from('payment_transactions').insert(transaction)
      if (error) {
        setDataStatus('Recebimento atualizado, mas o historico financeiro nao foi salvo no banco.')
      }
    }
  }

  async function markAppointmentPaid(appointment: AppointmentRecord) {
    const remainingAmount = Math.max(appointment.charged_amount_cents - appointment.received_amount_cents, 0)
    await updateAppointment(appointment.id, {
      received_amount_cents: appointment.charged_amount_cents,
      payment_method: appointment.payment_method,
      payment_status: 'paid',
      payment_canceled_reason: null,
    })
    await recordPaymentTransaction(
      appointment,
      remainingAmount,
      appointment.payment_method,
      new Date().toISOString(),
      remainingAmount ? 'Pagamento integral registrado.' : '',
    )
  }

  function openPartialPayment(appointment: AppointmentRecord) {
    const remainingAmount = Math.max(appointment.charged_amount_cents - appointment.received_amount_cents, 0)
    setPartialPaymentDraft({
      appointmentId: appointment.id,
      amount: centsToInputValue(remainingAmount),
      method: appointment.payment_method,
      paidAt: new Date().toISOString().slice(0, 16),
      notes: '',
    })
  }

  async function handlePartialPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!partialPaymentDraft) {
      return
    }

    const appointment = appointments.find((item) => item.id === partialPaymentDraft.appointmentId)
    if (!appointment) {
      return
    }

    const amountCents = parseCurrencyToCents(partialPaymentDraft.amount)
    const remainingAmount = Math.max(appointment.charged_amount_cents - appointment.received_amount_cents, 0)
    if (amountCents <= 0) {
      setDataStatus('Informe um valor maior que zero.')
      return
    }

    if (amountCents > remainingAmount) {
      setDataStatus('O valor parcial nao pode ser maior que o saldo restante.')
      return
    }

    const nextReceived = appointment.received_amount_cents + amountCents
    const nextStatus = nextReceived >= appointment.charged_amount_cents ? 'paid' : 'partial'
    await updateAppointment(appointment.id, {
      received_amount_cents: nextReceived,
      payment_method: partialPaymentDraft.method,
      payment_status: nextStatus,
      payment_canceled_reason: null,
    })
    await recordPaymentTransaction(
      appointment,
      amountCents,
      partialPaymentDraft.method,
      new Date(partialPaymentDraft.paidAt).toISOString(),
      partialPaymentDraft.notes.trim(),
    )
    setPartialPaymentDraft(null)
    setDataStatus(nextStatus === 'paid' ? 'Pagamento quitado.' : 'Pagamento parcial registrado.')
  }

  function openCancelPayment(appointment: AppointmentRecord) {
    setCancelPaymentDraft({
      appointmentId: appointment.id,
      reason: 'Cliente cancelou',
      notes: '',
    })
  }

  async function handleCancelPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!cancelPaymentDraft) {
      return
    }

    const appointment = appointments.find((item) => item.id === cancelPaymentDraft.appointmentId)
    if (!appointment) {
      return
    }

    const reason = [cancelPaymentDraft.reason, cancelPaymentDraft.notes.trim()].filter(Boolean).join(' - ')
    await updateAppointment(appointment.id, {
      payment_status: 'canceled',
      payment_canceled_reason: reason,
    })
    setCancelPaymentDraft(null)
    setDataStatus('Pagamento cancelado sem apagar o historico.')
  }

  async function handleCreateService(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (newService.name.trim().length < 2) {
      setDataStatus('Informe o nome do servico.')
      return
    }

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

  async function deleteService(service: ServiceItem) {
    const serviceHasHistory = appointments.some((appointment) => appointment.service_id === service.id)

    if (serviceHasHistory) {
      await updateService(service, { active: false, published: false })
      setDataStatus('Servico possui historico; foi desativado sem apagar atendimentos antigos.')
      return
    }

    setServices((current) => current.filter((item) => item.id !== service.id))

    if (supabase) {
      const { error } = await supabase.from('services').delete().eq('id', service.id)

      if (error) {
        setDataStatus('Nao foi possivel excluir o servico.')
        await loadAdminData()
        return
      }
    }

    setDataStatus('Servico excluido.')
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

    setProducts((current) => [product, ...current])
    setNewProduct(newProductDraft())
    setIsProductModalOpen(false)
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

  async function updateBusinessHour(hour: BusinessHour, patch: Partial<BusinessHour>) {
    const updatedHour = { ...hour, ...patch }
    setBusinessHours((current) => current.map((item) => (item.id === hour.id ? updatedHour : item)))

    if (supabase) {
      const { error } = await supabase.from('business_hours').upsert(updatedHour)
      if (error) {
        setDataStatus('Nao foi possivel salvar o horario de funcionamento.')
        await loadAdminData()
        return
      }
    }

    setDataStatus('Horario de funcionamento salvo.')
  }

  async function updateAvailabilityRule(rule: AvailabilityRule, patch: Partial<AvailabilityRule>) {
    const updatedRule = { ...rule, ...patch }
    setAvailabilityRules((current) => current.map((item) => (item.id === rule.id ? updatedRule : item)))

    if (supabase) {
      const { error } = await supabase.from('availability_rules').upsert(updatedRule)
      if (error) {
        setDataStatus('Nao foi possivel salvar a disponibilidade.')
        await loadAdminData()
        return
      }
    }

    setDataStatus('Disponibilidade salva.')
  }

  async function addAvailabilityException(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const exception: AvailabilityException = {
      id: crypto.randomUUID(),
      date: exceptionDraft.date,
      type: exceptionDraft.type,
      start_time:
        exceptionDraft.type === 'holiday' || exceptionDraft.type === 'vacation' ? null : exceptionDraft.startTime,
      end_time: exceptionDraft.type === 'holiday' || exceptionDraft.type === 'vacation' ? null : exceptionDraft.endTime,
      reason: exceptionDraft.reason.trim() || 'Bloqueio manual',
    }

    setAvailabilityExceptions((current) => [...current, exception].sort((a, b) => a.date.localeCompare(b.date)))

    if (supabase) {
      const { error } = await supabase.from('availability_exceptions').insert(exception)
      if (error) {
        setDataStatus('Nao foi possivel criar o bloqueio.')
        await loadAdminData()
        return
      }
    }

    setExceptionDraft({ date: agendaDate, type: 'blocked', startTime: '12:00', endTime: '13:30', reason: '' })
    setDataStatus('Bloqueio salvo.')
  }

  async function deleteAvailabilityException(exceptionId: string) {
    setAvailabilityExceptions((current) => current.filter((exception) => exception.id !== exceptionId))

    if (supabase) {
      const { error } = await supabase.from('availability_exceptions').delete().eq('id', exceptionId)
      if (error) {
        setDataStatus('Nao foi possivel remover o bloqueio.')
        await loadAdminData()
        return
      }
    }

    setDataStatus('Bloqueio removido.')
  }

  async function updateScheduleSettings(patch: Partial<ScheduleSettings>) {
    const updatedSettings = { ...scheduleSettings, ...patch }
    setScheduleSettings(updatedSettings)

    if (supabase) {
      const { error } = await supabase.from('schedule_settings').upsert({ id: 'default', ...updatedSettings })
      if (error) {
        setDataStatus('Nao foi possivel salvar as regras da agenda.')
        await loadAdminData()
        return
      }
    }

    setDataStatus('Regras da agenda salvas.')
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

  if (redirectToAdminHost) {
    return null
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
            <a href="#contato">Contato</a>
            <a href={buildWhatsAppUrl(profile.whatsapp_number, getGeneralMessage())} target="_blank" rel="noreferrer">
              WhatsApp
            </a>
            <a href={profile.instagram_url} target="_blank" rel="noreferrer">
              Instagram
            </a>
          </nav>
        </header>

        <section className="hero-band" aria-label="Hellen Martins Designer">
          <div className="hero-copy">
            <p className="eyebrow">Hellen Martins Brows</p>
            <h1>{profile.brand_name}</h1>
            <p className="hero-subtitle">{profile.subtitle}</p>
            <p className="hero-text">{profile.bio}</p>
            <div className="hero-actions">
              <a className="primary-action" href={buildWhatsAppUrl(profile.whatsapp_number, getGeneralMessage())} target="_blank" rel="noreferrer">
                <MessageCircle size={18} aria-hidden="true" /> Chamar no WhatsApp
              </a>
              <a className="ghost-action" href="#servicos">
                <Sparkles size={18} aria-hidden="true" /> Ver servicos
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
            <span>horario combinado pelo WhatsApp</span>
          </article>
          <article>
            <strong>IG</strong>
            <span>artes e referencias atualizadas</span>
          </article>
        </section>

        <section className="service-band" id="servicos">
          <div className="section-heading">
            <p className="eyebrow">Servicos e precos</p>
            <h2>Procedimentos publicados.</h2>
            <p>Veja valores, duracao media e fale com a Hellen para combinar seu atendimento.</p>
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
                    Chamar no WhatsApp
                  </a>
                </div>
              </article>
            ))}
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
            <p>{profile.address}. Para duvidas, referencias e disponibilidade, fale direto pelo WhatsApp.</p>
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
          <a href={buildWhatsAppUrl(profile.whatsapp_number, getGeneralMessage())} target="_blank" rel="noreferrer">
            WhatsApp
          </a>
        </footer>

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
            <button className="brand-link auth-brand" type="button" onClick={openPublicLanding}>
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
            <button className="ghost-action" type="button" onClick={openPublicLanding}>
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
      <main
        className={[
          'admin-shell',
          isSidebarCollapsed ? 'sidebar-collapsed' : '',
          isMobileSidebarOpen ? 'mobile-sidebar-open' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <aside className="admin-sidebar">
          <div className="sidebar-header">
            <button className="brand-link" type="button" onClick={() => goToPath('/')}>
              <img src={brandLogo} alt="" />
              <span>
                <strong>Hellen Designer</strong>
                <small>Admin privado</small>
              </span>
            </button>
            <button
              className="icon-button sidebar-toggle"
              type="button"
              aria-label={isSidebarCollapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
              onClick={toggleAdminMenu}
            >
              <Menu size={18} aria-hidden="true" />
            </button>
          </div>
          <nav aria-label="Secoes do admin">
            {adminTabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  className={activeTab === tab.id ? 'active' : ''}
                  type="button"
                  onClick={() => selectAdminTab(tab.id)}
                >
                  <Icon size={17} aria-hidden="true" />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </nav>
          <button className="ghost-action sidebar-exit" type="button" onClick={handleSignOut}>
            <LogOut size={16} aria-hidden="true" /> <span>Sair</span>
          </button>
        </aside>
        {isMobileSidebarOpen ? (
          <button
            className="sidebar-scrim"
            type="button"
            aria-label="Fechar menu lateral"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
        ) : null}

        <section className="admin-main">
          {renderAdminTopbar()}
          {dataStatus ? <p className="form-status top-status">{dataStatus}</p> : null}

          {(activeTab === 'today' || activeTab === 'agenda') && renderAgendaDashboard()}
          {activeTab === 'clients' && renderClients()}
          {activeTab === 'finance' && renderFinance()}
          {activeTab === 'services' && renderServicesEditor()}
          {activeTab === 'products' && renderProducts()}
          {activeTab === 'settings' && renderScheduleSettings()}
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
                onClick={() => selectAdminTab(tab.id)}
              >
                <Icon size={18} aria-hidden="true" />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </nav>
        {renderAppointmentDrawer()}
        {renderClientModal()}
        {renderProductModal()}
        {renderPaymentLauncherModal()}
        {renderPartialPaymentModal()}
        {renderCancelPaymentModal()}
      </main>
    )
  }

  function renderAdminTopbar() {
    return (
      <header className="admin-appbar">
        <div className="appbar-main">
          <button className="icon-button" type="button" aria-label="Alternar menu" onClick={toggleAdminMenu}>
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
          <button type="button" onClick={() => openNewAppointmentDrawer(agendaDate, getFirstAvailableSlot(agendaDate))}>
            <Plus size={17} aria-hidden="true" /> Novo horario
          </button>
          <button type="button" onClick={() => setIsClientModalOpen(true)}>
            <UserRound size={17} aria-hidden="true" /> Nova cliente
          </button>
          <button type="button" onClick={() => setIsProductModalOpen(true)}>
            <Package size={17} aria-hidden="true" /> Novo produto
          </button>
          <button type="button" onClick={() => setIsPaymentLauncherOpen(true)}>
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

            {calendarView === 'day' && renderTimeline()}
            {calendarView === 'week' && renderWeekAgenda()}
            {calendarView === 'month' && renderMonthAgenda()}
            {calendarView === 'list' && renderAppointmentList(filteredAppointments)}
          </section>

          <aside className="side-stack">
            {renderSelectedAppointment()}
            {renderAutomationPanel()}
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
                        {product.quantity} em estoque - minimo {product.minimum_quantity}
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

        <button
          className="fab-button"
          type="button"
          aria-label="Criar novo horario"
          onClick={() => openNewAppointmentDrawer(agendaDate, getFirstAvailableSlot(agendaDate))}
        >
          <Plus size={28} aria-hidden="true" />
        </button>
      </div>
    )
  }

  function renderAutomationPanel() {
    const openPayments = appointments.filter((appointment) => {
      const paymentState = getPaymentState(appointment)
      return paymentState === 'pending' || paymentState === 'partial'
    })
    const nextReminderAppointment = sortedAppointments.find(
      (appointment) =>
        appointment.scheduled_date >= today &&
        (appointment.status === 'scheduled' || appointment.status === 'confirmed'),
    )
    const quickSlot = getFirstAvailableSlot(agendaDate)

    return (
      <section className="panel automation-panel">
        <div className="panel-heading compact-heading">
          <div>
            <p className="eyebrow">Automacoes</p>
            <h2>Acoes rapidas.</h2>
          </div>
          <SlidersHorizontal size={18} aria-hidden="true" />
        </div>
        <div className="automation-list">
          <button type="button" onClick={() => openNewAppointmentDrawer(agendaDate, quickSlot)}>
            <CalendarCheck2 size={16} aria-hidden="true" />
            <span>
              <strong>Encaixe rapido</strong>
              <small>{formatDateShort(agendaDate)} as {quickSlot}</small>
            </span>
          </button>
          <button
            type="button"
            onClick={() => {
              setExceptionDraft({
                date: agendaDate,
                type: 'blocked',
                startTime: quickSlot,
                endTime: addMinutesToTime(quickSlot, scheduleSettings.slot_interval_minutes),
                reason: 'Bloqueio manual',
              })
              selectAdminTab('settings')
            }}
          >
            <Ban size={16} aria-hidden="true" />
            <span>
              <strong>Bloquear horario</strong>
              <small>Abre configuracoes com a data atual</small>
            </span>
          </button>
          <button type="button" onClick={() => setIsPaymentLauncherOpen(true)}>
            <Wallet size={16} aria-hidden="true" />
            <span>
              <strong>Receber pendentes</strong>
              <small>{openPayments.length} pagamento(s) em aberto</small>
            </span>
          </button>
          <button
            type="button"
            disabled={!nextReminderAppointment}
            onClick={() => {
              if (!nextReminderAppointment) {
                return
              }

              window.open(
                buildWhatsAppUrl(
                  nextReminderAppointment.client_phone,
                  `Ola ${nextReminderAppointment.client_name}, tudo bem? Confirmando seu horario de ${nextReminderAppointment.service_name} em ${formatDateShort(nextReminderAppointment.scheduled_date)} as ${nextReminderAppointment.start_time}.`,
                ),
                '_blank',
              )
            }}
          >
            <MessageCircle size={16} aria-hidden="true" />
            <span>
              <strong>Lembrete WhatsApp</strong>
              <small>{nextReminderAppointment ? nextReminderAppointment.client_name : 'Nenhum horario futuro'}</small>
            </span>
          </button>
        </div>
      </section>
    )
  }

  function renderAppointmentDrawer() {
    if (!appointmentDrawer.open) {
      return null
    }

    const clientPickerTerm = clientPickerSearch.trim().toLowerCase()
    const selectedClientForDraft = clients.find((client) => client.id === appointmentDraft.clientId)
    const clientCandidates = clientsByRecent.filter((client) => {
        if (!clientPickerTerm) {
          return true
        }

        return (
          client.full_name.toLowerCase().includes(clientPickerTerm) ||
          client.phone.includes(clientPickerTerm) ||
          client.notes.toLowerCase().includes(clientPickerTerm)
        )
      })
    const visibleClientCount = isClientPickerExpanded || clientPickerTerm ? 12 : 4
    const clientMatches = clientCandidates.slice(0, visibleClientCount)
    const draftEndTime = addMinutesToTime(appointmentDraft.startTime, getDraftService()?.duration_minutes ?? 60)

    return (
      <div className="drawer-backdrop" role="presentation" onMouseDown={closeAppointmentDrawer}>
        <aside
          className="appointment-drawer"
          role="dialog"
          aria-modal="true"
          aria-labelledby="appointment-drawer-title"
          onMouseDown={(event) => event.stopPropagation()}
        >
          <div className="drawer-heading">
            <div>
              <p className="eyebrow">{appointmentDrawer.mode === 'edit' ? 'Editar horario' : 'Novo horario'}</p>
              <h2 id="appointment-drawer-title">
                {formatDateShort(appointmentDraft.scheduledDate)} as {appointmentDraft.startTime}
              </h2>
            </div>
            <button className="icon-button" type="button" aria-label="Fechar" onClick={closeAppointmentDrawer}>
              <XCircle size={18} aria-hidden="true" />
            </button>
          </div>

          <form className="drawer-form" onSubmit={handleSaveAppointment}>
            <section className="drawer-section">
              <h3>Cliente</h3>
              <label>
                Buscar cliente cadastrada
                <input
                  value={clientPickerSearch}
                  onChange={(event) => {
                    setClientPickerSearch(event.target.value)
                    setIsClientPickerExpanded(Boolean(event.target.value.trim()))
                  }}
                  placeholder="Digite nome, telefone ou observacao"
                />
              </label>
              <div className="client-picker-toolbar">
                <span>
                  {clientCandidates.length
                    ? `${clientCandidates.length} cliente(s) encontrada(s)`
                    : 'Nenhuma cliente encontrada'}
                </span>
                {clientCandidates.length > 4 ? (
                  <button
                    className="client-list-toggle"
                    type="button"
                    aria-expanded={isClientPickerExpanded}
                    aria-controls="client-picker-results"
                    onClick={() => setIsClientPickerExpanded((current) => !current)}
                  >
                    {isClientPickerExpanded ? <ChevronUp size={14} aria-hidden="true" /> : <ChevronDown size={14} aria-hidden="true" />}
                    {isClientPickerExpanded ? 'Recolher' : 'Expandir'}
                  </button>
                ) : null}
              </div>
              <div className={isClientPickerExpanded ? 'client-suggestions expanded' : 'client-suggestions'} id="client-picker-results">
                {clientMatches.map((client) => (
                  <button
                    key={client.id}
                    className={client.id === appointmentDraft.clientId ? 'selected' : ''}
                    type="button"
                    onClick={() => selectClientForDraft(client)}
                  >
                    <UserRound size={14} aria-hidden="true" />
                    <span>{client.full_name}</span>
                    <small>{client.phone}</small>
                  </button>
                ))}
                <button
                  className="create-inline-client"
                  type="button"
                  onClick={() => {
                    setNewClient({
                      fullName: appointmentDraft.clientName,
                      phone: appointmentDraft.clientPhone,
                      birthDate: '',
                      notes: '',
                    })
                    setIsClientModalOpen(true)
                  }}
                >
                  <Plus size={14} aria-hidden="true" />
                  <span>Cadastrar nova</span>
                  <small>Abre formulario rapido</small>
                </button>
              </div>
              {selectedClientForDraft ? (
                <p className="selected-client-note">Selecionada: {selectedClientForDraft.full_name}</p>
              ) : null}
              <label>
                Nome no atendimento
                <input
                  required
                  value={appointmentDraft.clientName}
                  onChange={(event) =>
                    setAppointmentDraft({ ...appointmentDraft, clientId: '', clientName: event.target.value })
                  }
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
            </section>

            <section className="drawer-section two-column">
              <h3>Atendimento</h3>
              <label>
                Servico
                <select value={appointmentDraft.serviceId} onChange={(event) => patchDraftService(event.target.value)}>
                  {services
                    .filter((service) => service.active)
                    .map((service) => (
                      <option key={service.id} value={service.id}>
                        {service.name}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                Profissional
                <input value={appointmentDraft.professional} readOnly />
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
                Inicio
                <input
                  required
                  type="time"
                  value={appointmentDraft.startTime}
                  onChange={(event) => patchDraftStartTime(event.target.value)}
                />
              </label>
              <label>
                Fim calculado
                <input readOnly value={draftEndTime} />
              </label>
              <label>
                Status
                <select
                  value={appointmentDraft.status}
                  onChange={(event) =>
                    setAppointmentDraft({ ...appointmentDraft, status: event.target.value as AppointmentStatus })
                  }
                >
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </section>

            <section className="drawer-section two-column">
              <h3>Financeiro</h3>
              <label>
                Valor total
                <input
                  inputMode="decimal"
                  value={appointmentDraft.chargedAmount}
                  onChange={(event) => setAppointmentDraft({ ...appointmentDraft, chargedAmount: event.target.value })}
                />
              </label>
              <label>
                Valor recebido
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
            </section>

            <section className="drawer-section">
              <label>
                Observacoes
                <textarea
                  rows={3}
                  value={appointmentDraft.notes}
                  onChange={(event) => setAppointmentDraft({ ...appointmentDraft, notes: event.target.value })}
                  placeholder="Preferencias, alergias, combinados ou observacoes profissionais"
                />
              </label>
              <div className="drawer-slot-strip">
                {availableSlotsForDraft.slice(0, 8).map((slot) => (
                  <button key={slot} type="button" onClick={() => patchDraftStartTime(slot)}>
                    {slot}
                  </button>
                ))}
              </div>
            </section>

            <div className="drawer-actions">
              <button className="ghost-action" type="button" onClick={closeAppointmentDrawer}>
                Cancelar
              </button>
              <button className="primary-action" type="submit" disabled={isSaving}>
                <Save size={16} aria-hidden="true" />
                {appointmentDrawer.mode === 'edit' ? 'Salvar alteracoes' : 'Salvar agendamento'}
              </button>
            </div>
          </form>
        </aside>
      </div>
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
          {agendaSlots.map((slot) => {
            const slotEnd = addMinutesToTime(slot, scheduleSettings.slot_interval_minutes)
            const appointment = agendaAppointments.find((item) => item.start_time === slot)
            const occupiedBy = agendaAppointments.find(
              (item) =>
                item.status !== 'canceled' &&
                item.status !== 'no_show' &&
                item.start_time !== slot &&
                rangesOverlap(slot, slotEnd, item.start_time, getAppointmentEndTime(item, services)),
            )
            const blocked = isSlotBlockedByException(agendaDate, slot, slotEnd, availabilityExceptions)
            const insideAvailability = isSlotInsideAvailability(
              agendaDate,
              slot,
              slotEnd,
              businessHours,
              availabilityRules,
              availabilityExceptions,
            )
            const isHalfHour = slot.endsWith(':30')

            return (
              <div className="timeline-row" key={slot}>
                <time>{isHalfHour ? slot : slot}</time>
                <div className="timeline-cell">
                  {appointment ? (
                    <button
                      className={`timeline-appointment ${appointment.status}`}
                      type="button"
                      onClick={() => openEditAppointmentDrawer(appointment)}
                    >
                      <strong>
                        {appointment.start_time} - {getAppointmentEndTime(appointment, services)} - {appointment.client_name}
                      </strong>
                      <span>
                        {appointment.service_name} - {formatCurrency(appointment.charged_amount_cents)}
                      </span>
                      <small>
                        {statusLabels[appointment.status]} - {paymentStatusLabels[getPaymentState(appointment)]}
                      </small>
                    </button>
                  ) : occupiedBy ? (
                    <button
                      className="timeline-occupied"
                      type="button"
                      onClick={() => openEditAppointmentDrawer(occupiedBy)}
                    >
                      Ocupado por {occupiedBy.client_name}
                    </button>
                  ) : blocked ? (
                    <div className="timeline-blocked">
                      <Ban size={14} aria-hidden="true" />
                      <span>Bloqueado</span>
                    </div>
                  ) : !insideAvailability ? (
                    <div className="timeline-blocked unavailable">
                      <Clock3 size={14} aria-hidden="true" />
                      <span>Indisponivel</span>
                    </div>
                  ) : (
                    <button
                      className="timeline-empty"
                      type="button"
                      onClick={() => openNewAppointmentDrawer(agendaDate, slot)}
                    >
                      Livre
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

  function renderWeekAgenda() {
    const weekSlots = Array.from(
      new Set(weekDates.flatMap((date) => buildAgendaSlotsForDate(date, businessHours, scheduleSettings))),
    ).sort()

    return (
      <div className="week-agenda" aria-label="Agenda semanal">
        <div className="week-grid-header">
          <span />
          {weekDates.map((date) => (
            <button key={date} type="button" onClick={() => setAgendaDate(date)}>
              <small>{dayLabels[new Date(`${date}T12:00:00`).getDay()]}</small>
              <strong>{formatDateShort(date)}</strong>
            </button>
          ))}
        </div>
        <div className="week-grid-body">
          {weekSlots.map((slot) => (
            <div className="week-grid-row" key={slot}>
              <time>{slot}</time>
              {weekDates.map((date) => {
                const slotEnd = addMinutesToTime(slot, scheduleSettings.slot_interval_minutes)
                const appointment = appointments.find((item) => item.scheduled_date === date && item.start_time === slot)
                const blocked = isSlotBlockedByException(date, slot, slotEnd, availabilityExceptions)
                const insideAvailability = isSlotInsideAvailability(
                  date,
                  slot,
                  slotEnd,
                  businessHours,
                  availabilityRules,
                  availabilityExceptions,
                )

                return (
                  <div className="week-slot" key={`${date}-${slot}`}>
                    {appointment ? (
                      <button
                        className={`week-appointment ${appointment.status}`}
                        type="button"
                        onClick={() => openEditAppointmentDrawer(appointment)}
                      >
                        <strong>{appointment.client_name}</strong>
                        <span>{appointment.service_name}</span>
                        <small>{paymentStatusLabels[getPaymentState(appointment)]}</small>
                      </button>
                    ) : blocked || !insideAvailability ? (
                      <span className="week-blocked">{blocked ? 'Bloqueado' : 'Indisponivel'}</span>
                    ) : (
                      <button className="week-empty" type="button" onClick={() => openNewAppointmentDrawer(date, slot)}>
                        +
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    )
  }

  function renderMonthAgenda() {
    const monthStart = `${agendaDate.slice(0, 7)}-01`
    const monthDate = new Date(`${monthStart}T12:00:00`)
    const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate()
    const monthDays = Array.from({ length: daysInMonth }, (_, index) => `${agendaDate.slice(0, 7)}-${String(index + 1).padStart(2, '0')}`)

    return (
      <div className="month-agenda" aria-label="Agenda mensal">
        {monthDays.map((date) => {
          const dayAppointments = appointments.filter((appointment) => appointment.scheduled_date === date)
          const businessHour = getBusinessHourForDate(date, businessHours)

          return (
            <button
              key={date}
              className={date === agendaDate ? 'month-day active' : 'month-day'}
              type="button"
              onClick={() => {
                setAgendaDate(date)
                setCalendarView('day')
              }}
            >
              <strong>{formatDateShort(date)}</strong>
              <span>{businessHour?.is_open ? `${businessHour.start_time}-${businessHour.end_time}` : 'Fechado'}</span>
              <small>{dayAppointments.length ? `${dayAppointments.length} horario(s)` : 'Livre'}</small>
            </button>
          )
        })}
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
                {paymentStatusLabels[paymentState]}
              </span>
            </div>
            <dl className="detail-list">
              <div>
                <dt>Horario</dt>
                <dd>
                  {selectedAppointment.start_time} ate {getAppointmentEndTime(selectedAppointment, services)}
                </dd>
              </div>
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
                <dt>Saldo</dt>
                <dd>{formatCurrency(Math.max(selectedAppointment.charged_amount_cents - selectedAppointment.received_amount_cents, 0))}</dd>
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
                  onChange={(event) =>
                    void updateAppointment(selectedAppointment.id, {
                      start_time: event.target.value,
                      end_time: addMinutesToTime(
                        event.target.value,
                        services.find((service) => service.id === selectedAppointment.service_id)?.duration_minutes ?? 60,
                      ),
                    })
                  }
                />
              </label>
            </div>
            <div className="row-actions detail-actions">
              <button
                type="button"
                aria-label={`Editar horario de ${selectedAppointment.client_name}`}
                onClick={() => openEditAppointmentDrawer(selectedAppointment)}
              >
                <Edit3 size={15} aria-hidden="true" />
              </button>
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
                onClick={() => void updateAppointment(selectedAppointment.id, { status: 'completed' })}
              >
                <CheckCircle2 size={15} aria-hidden="true" />
              </button>
              <button
                type="button"
                aria-label={`Cancelar horario de ${selectedAppointment.client_name}`}
                onClick={() => void updateAppointment(selectedAppointment.id, { status: 'canceled' })}
              >
                <Ban size={15} aria-hidden="true" />
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
            <div className="payment-actions detail-payment-actions">
              <button type="button" onClick={() => void markAppointmentPaid(selectedAppointment)}>
                <CheckCircle2 size={15} aria-hidden="true" /> Pago
              </button>
              <button type="button" onClick={() => openPartialPayment(selectedAppointment)}>
                <Wallet size={15} aria-hidden="true" /> Parcial
              </button>
              <button type="button" onClick={() => openCancelPayment(selectedAppointment)}>
                <XCircle size={15} aria-hidden="true" /> Cancelar pagamento
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
              {appointment.service_name} - {appointment.start_time} ate {getAppointmentEndTime(appointment, services)}
            </span>
            <small>
              {formatCurrency(appointment.charged_amount_cents)} total - {formatCurrency(appointment.received_amount_cents)} recebido
            </small>
          </div>
        </button>
        <span className={`status-pill ${appointment.status}`}>{statusLabels[appointment.status]}</span>
        <span className={`status-pill ${paymentState}`}>
          {paymentStatusLabels[paymentState]}
        </span>
        <div className="row-actions">
          <button
            type="button"
            aria-label={`Editar horario de ${appointment.client_name}`}
            onClick={() => openEditAppointmentDrawer(appointment)}
          >
            <Edit3 size={15} aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label={`Marcar ${appointment.client_name} como concluido`}
            onClick={() => void updateAppointment(appointment.id, { status: 'completed' })}
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
          <div className="heading-actions">
            <label className="admin-search slim-search">
              <Search size={16} aria-hidden="true" />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Buscar cliente"
              />
            </label>
            <button className="primary-action compact-action" type="button" onClick={() => setIsClientModalOpen(true)}>
              <Plus size={16} aria-hidden="true" /> Nova cliente
            </button>
          </div>
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
                    <dd>{lastAppointment ? `${formatDateShort(lastAppointment.scheduled_date)} - ${lastAppointment.service_name}` : 'Sem historico'}</dd>
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
    const paymentFilters: Array<{ id: PaymentFilter; label: string }> = [
      { id: 'open', label: 'Em aberto' },
      { id: 'all', label: 'Todos' },
      { id: 'pending', label: 'Pendente' },
      { id: 'partial', label: 'Pago parcial' },
      { id: 'paid', label: 'Pago' },
      { id: 'canceled', label: 'Cancelado' },
    ]

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
            <div className="heading-actions">
              <span>{pendingAppointments.length} pendente(s)</span>
              <button className="primary-action compact-action" type="button" onClick={() => setIsPaymentLauncherOpen(true)}>
                <Plus size={16} aria-hidden="true" /> Novo pagamento
              </button>
            </div>
          </div>
          <div className="finance-toolbar">
            <label className="admin-search slim-search">
              <Search size={16} aria-hidden="true" />
              <input
                value={financeSearch}
                onChange={(event) => setFinanceSearch(event.target.value)}
                placeholder="Buscar cliente, telefone ou servico"
              />
            </label>
            <div className="filter-chips" aria-label="Filtro de pagamentos">
              {paymentFilters.map((filter) => (
                <button
                  key={filter.id}
                  className={paymentFilter === filter.id ? 'active' : ''}
                  type="button"
                  onClick={() => setPaymentFilter(filter.id)}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
          <div className="payment-card-list">
            {financeAppointments.map((appointment) => {
              const paymentState = getPaymentState(appointment)
              const remainingAmount = Math.max(appointment.charged_amount_cents - appointment.received_amount_cents, 0)
              const transactions = paymentTransactions.filter((transaction) => transaction.appointment_id === appointment.id)

              return (
                <article className="payment-card" key={appointment.id}>
                  <div className="payment-card-header">
                    <div>
                      <strong>{appointment.client_name}</strong>
                      <span>
                        {formatDateShort(appointment.scheduled_date)} as {appointment.start_time} - {appointment.service_name}
                      </span>
                    </div>
                    <span className={`status-pill ${paymentState}`}>{paymentStatusLabels[paymentState]}</span>
                  </div>

                  <dl className="payment-summary-grid">
                    <div>
                      <dt>Total</dt>
                      <dd>{formatCurrency(appointment.charged_amount_cents)}</dd>
                    </div>
                    <div>
                      <dt>Pago</dt>
                      <dd>{formatCurrency(appointment.received_amount_cents)}</dd>
                    </div>
                    <div>
                      <dt>Restante</dt>
                      <dd>{formatCurrency(remainingAmount)}</dd>
                    </div>
                    <div>
                      <dt>Metodo</dt>
                      <dd>{paymentMethodLabels[appointment.payment_method]}</dd>
                    </div>
                  </dl>

                  {appointment.payment_canceled_reason ? (
                    <p className="payment-note">{appointment.payment_canceled_reason}</p>
                  ) : null}

                  <div className="payment-actions">
                    <button type="button" onClick={() => void markAppointmentPaid(appointment)} disabled={paymentState === 'paid'}>
                      <CheckCircle2 size={15} aria-hidden="true" /> Pago
                    </button>
                    <button type="button" onClick={() => openPartialPayment(appointment)} disabled={paymentState === 'paid' || paymentState === 'canceled'}>
                      <Wallet size={15} aria-hidden="true" /> Parcial
                    </button>
                    <button type="button" onClick={() => openCancelPayment(appointment)} disabled={paymentState === 'canceled'}>
                      <XCircle size={15} aria-hidden="true" /> Cancelado
                    </button>
                  </div>

                  <details className="transaction-history">
                    <summary>
                      <History size={14} aria-hidden="true" />
                      Historico financeiro ({transactions.length})
                    </summary>
                    {transactions.length ? (
                      <div>
                        {transactions.map((transaction) => (
                          <article key={transaction.id}>
                            <strong>{formatCurrency(transaction.amount_cents)}</strong>
                            <span>
                              {paymentMethodLabels[transaction.method]} -{' '}
                              {new Intl.DateTimeFormat('pt-BR', {
                                day: '2-digit',
                                month: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit',
                              }).format(new Date(transaction.paid_at))}
                            </span>
                            {transaction.notes ? <small>{transaction.notes}</small> : null}
                          </article>
                        ))}
                      </div>
                    ) : (
                      <p>Nenhum recebimento parcial registrado.</p>
                    )}
                  </details>
                </article>
              )
            })}
            {financeAppointments.length === 0 ? (
              <p className="empty-state">Nenhum pagamento neste filtro.</p>
            ) : null}
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

  function renderClientModal() {
    if (!isClientModalOpen) {
      return null
    }

    return (
      <div className="modal-backdrop" role="presentation" onMouseDown={() => setIsClientModalOpen(false)}>
        <form
          className="payment-modal entity-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="client-modal-title"
          onSubmit={handleCreateClient}
          onMouseDown={(event) => event.stopPropagation()}
        >
          <div className="drawer-heading">
            <div>
              <p className="eyebrow">Nova cliente</p>
              <h2 id="client-modal-title">Cadastro rapido.</h2>
            </div>
            <button className="icon-button" type="button" aria-label="Fechar" onClick={() => setIsClientModalOpen(false)}>
              <XCircle size={18} aria-hidden="true" />
            </button>
          </div>
          <label>
            Nome completo
            <input
              required
              value={newClient.fullName}
              onChange={(event) => setNewClient({ ...newClient, fullName: event.target.value })}
              placeholder="Nome da cliente"
            />
          </label>
          <label>
            WhatsApp
            <input
              required
              inputMode="tel"
              value={newClient.phone}
              onChange={(event) => setNewClient({ ...newClient, phone: maskBrazilianPhone(event.target.value) })}
              placeholder="(16) 99999-9999"
            />
          </label>
          <label>
            Nascimento
            <input
              type="date"
              value={newClient.birthDate}
              onChange={(event) => setNewClient({ ...newClient, birthDate: event.target.value })}
            />
          </label>
          <label>
            Anotacoes profissionais
            <textarea
              rows={3}
              value={newClient.notes}
              onChange={(event) => setNewClient({ ...newClient, notes: event.target.value })}
              placeholder="Preferencia, sensibilidade, alergias relatadas..."
            />
          </label>
          <div className="drawer-actions">
            <button className="ghost-action" type="button" onClick={() => setIsClientModalOpen(false)}>
              Cancelar
            </button>
            <button className="primary-action" type="submit">
              Salvar cliente
            </button>
          </div>
        </form>
      </div>
    )
  }

  function renderProductModal() {
    if (!isProductModalOpen) {
      return null
    }

    return (
      <div className="modal-backdrop" role="presentation" onMouseDown={() => setIsProductModalOpen(false)}>
        <form
          className="payment-modal entity-modal wide-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="product-modal-title"
          onSubmit={handleCreateProduct}
          onMouseDown={(event) => event.stopPropagation()}
        >
          <div className="drawer-heading">
            <div>
              <p className="eyebrow">Novo produto</p>
              <h2 id="product-modal-title">Estoque e materiais.</h2>
            </div>
            <button className="icon-button" type="button" aria-label="Fechar" onClick={() => setIsProductModalOpen(false)}>
              <XCircle size={18} aria-hidden="true" />
            </button>
          </div>
          <div className="modal-grid">
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
              Estoque minimo
              <input
                inputMode="numeric"
                value={newProduct.minimumQuantity}
                onChange={(event) => setNewProduct({ ...newProduct, minimumQuantity: event.target.value })}
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
            <label className="wide-field">
              Observacoes
              <textarea
                rows={3}
                value={newProduct.notes}
                onChange={(event) => setNewProduct({ ...newProduct, notes: event.target.value })}
              />
            </label>
          </div>
          <div className="drawer-actions">
            <button className="ghost-action" type="button" onClick={() => setIsProductModalOpen(false)}>
              Cancelar
            </button>
            <button className="primary-action" type="submit">
              Salvar produto
            </button>
          </div>
        </form>
      </div>
    )
  }

  function renderPaymentLauncherModal() {
    if (!isPaymentLauncherOpen) {
      return null
    }

    const search = paymentLauncher.search.trim().toLowerCase()
    const appointmentsToReceive = paymentAppointmentsByRecent
      .filter((appointment) => {
        const paymentState = getPaymentState(appointment)
        const matchesSearch =
          !search ||
          appointment.client_name.toLowerCase().includes(search) ||
          appointment.client_phone.includes(search) ||
          appointment.service_name.toLowerCase().includes(search)

        return matchesSearch && paymentState !== 'paid' && paymentState !== 'canceled'
      })
      .slice(0, 8)

    return (
      <div className="modal-backdrop" role="presentation" onMouseDown={() => setIsPaymentLauncherOpen(false)}>
        <section
          className="payment-modal entity-modal wide-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="payment-launcher-title"
          onMouseDown={(event) => event.stopPropagation()}
        >
          <div className="drawer-heading">
            <div>
              <p className="eyebrow">Novo pagamento</p>
              <h2 id="payment-launcher-title">Selecione o atendimento.</h2>
            </div>
            <button className="icon-button" type="button" aria-label="Fechar" onClick={() => setIsPaymentLauncherOpen(false)}>
              <XCircle size={18} aria-hidden="true" />
            </button>
          </div>
          <label className="admin-search modal-search">
            <Search size={16} aria-hidden="true" />
            <input
              value={paymentLauncher.search}
              onChange={(event) => setPaymentLauncher({ search: event.target.value })}
              placeholder="Buscar por cliente, telefone ou servico"
            />
          </label>
          <div className="payment-picker-list">
            {appointmentsToReceive.map((appointment) => {
              const remainingAmount = Math.max(appointment.charged_amount_cents - appointment.received_amount_cents, 0)

              return (
                <article key={appointment.id}>
                  <div>
                    <strong>{appointment.client_name}</strong>
                    <span>
                      {formatDateShort(appointment.scheduled_date)} as {appointment.start_time} - {appointment.service_name}
                    </span>
                    <small>Saldo {formatCurrency(remainingAmount)}</small>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsPaymentLauncherOpen(false)
                      openPartialPayment(appointment)
                    }}
                  >
                    Parcial
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsPaymentLauncherOpen(false)
                      void markAppointmentPaid(appointment)
                    }}
                  >
                    Pago
                  </button>
                </article>
              )
            })}
            {appointmentsToReceive.length === 0 ? <p className="empty-state">Nenhum atendimento em aberto encontrado.</p> : null}
          </div>
        </section>
      </div>
    )
  }

  function renderPartialPaymentModal() {
    if (!partialPaymentDraft) {
      return null
    }

    const appointment = appointments.find((item) => item.id === partialPaymentDraft.appointmentId)
    const remainingAmount = appointment
      ? Math.max(appointment.charged_amount_cents - appointment.received_amount_cents, 0)
      : 0

    return (
      <div className="modal-backdrop" role="presentation" onMouseDown={() => setPartialPaymentDraft(null)}>
        <form
          className="payment-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="partial-payment-title"
          onSubmit={handlePartialPayment}
          onMouseDown={(event) => event.stopPropagation()}
        >
          <div className="drawer-heading">
            <div>
              <p className="eyebrow">Pagamento parcial</p>
              <h2 id="partial-payment-title">{appointment?.client_name ?? 'Recebimento'}</h2>
            </div>
            <button className="icon-button" type="button" aria-label="Fechar" onClick={() => setPartialPaymentDraft(null)}>
              <XCircle size={18} aria-hidden="true" />
            </button>
          </div>
          <p className="payment-note">Saldo restante: {formatCurrency(remainingAmount)}</p>
          <label>
            Valor pago agora
            <input
              required
              inputMode="decimal"
              value={partialPaymentDraft.amount}
              onChange={(event) => setPartialPaymentDraft({ ...partialPaymentDraft, amount: event.target.value })}
            />
          </label>
          <label>
            Forma de pagamento
            <select
              value={partialPaymentDraft.method}
              onChange={(event) =>
                setPartialPaymentDraft({ ...partialPaymentDraft, method: event.target.value as PaymentMethod })
              }
            >
              {Object.entries(paymentMethodLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Data do pagamento
            <input
              type="datetime-local"
              value={partialPaymentDraft.paidAt}
              onChange={(event) => setPartialPaymentDraft({ ...partialPaymentDraft, paidAt: event.target.value })}
            />
          </label>
          <label>
            Observacao
            <textarea
              rows={3}
              value={partialPaymentDraft.notes}
              onChange={(event) => setPartialPaymentDraft({ ...partialPaymentDraft, notes: event.target.value })}
            />
          </label>
          <div className="drawer-actions">
            <button className="ghost-action" type="button" onClick={() => setPartialPaymentDraft(null)}>
              Cancelar
            </button>
            <button className="primary-action" type="submit">
              Registrar parcial
            </button>
          </div>
        </form>
      </div>
    )
  }

  function renderCancelPaymentModal() {
    if (!cancelPaymentDraft) {
      return null
    }

    const appointment = appointments.find((item) => item.id === cancelPaymentDraft.appointmentId)
    const reasons = ['Cliente cancelou', 'Nao compareceu', 'Cortesia', 'Erro de lancamento', 'Outro']

    return (
      <div className="modal-backdrop" role="presentation" onMouseDown={() => setCancelPaymentDraft(null)}>
        <form
          className="payment-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cancel-payment-title"
          onSubmit={handleCancelPayment}
          onMouseDown={(event) => event.stopPropagation()}
        >
          <div className="drawer-heading">
            <div>
              <p className="eyebrow">Cancelamento financeiro</p>
              <h2 id="cancel-payment-title">{appointment?.client_name ?? 'Pagamento'}</h2>
            </div>
            <button className="icon-button" type="button" aria-label="Fechar" onClick={() => setCancelPaymentDraft(null)}>
              <XCircle size={18} aria-hidden="true" />
            </button>
          </div>
          <p className="payment-note">Use somente quando esse valor nao sera mais recebido. O atendimento permanece no historico.</p>
          <label>
            Motivo
            <select
              value={cancelPaymentDraft.reason}
              onChange={(event) => setCancelPaymentDraft({ ...cancelPaymentDraft, reason: event.target.value })}
            >
              {reasons.map((reason) => (
                <option key={reason} value={reason}>
                  {reason}
                </option>
              ))}
            </select>
          </label>
          <label>
            Observacao
            <textarea
              rows={3}
              value={cancelPaymentDraft.notes}
              onChange={(event) => setCancelPaymentDraft({ ...cancelPaymentDraft, notes: event.target.value })}
            />
          </label>
          <div className="drawer-actions">
            <button className="ghost-action" type="button" onClick={() => setCancelPaymentDraft(null)}>
              Voltar
            </button>
            <button className="primary-action danger-action" type="submit">
              Confirmar cancelamento
            </button>
          </div>
        </form>
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
          <div className="heading-actions">
            <span>{stats.lowStockCount} baixo(s)</span>
            <button className="primary-action compact-action" type="button" onClick={() => setIsProductModalOpen(true)}>
              <Plus size={16} aria-hidden="true" /> Novo produto
            </button>
          </div>
        </div>

        <div className="product-grid">
          {productsByRecent.map((product) => {
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
                  {movementTypeLabels[movement.type]} - {movement.quantity} un.
                </span>
              </article>
            ))}
          </div>
        </section>
      </section>
    )
  }

  function renderScheduleSettings() {
    return (
      <div className="settings-layout">
        <section className="panel full-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Funcionamento</p>
              <h2>Dias e horarios gerais.</h2>
            </div>
            <CalendarRange size={22} aria-hidden="true" />
          </div>
          <div className="hours-list">
            {businessHours.map((hour) => (
              <article key={hour.id} className={hour.is_open ? 'hours-row open' : 'hours-row'}>
                <strong>{dayLabels[hour.day_of_week]}</strong>
                <label className="toggle-label">
                  <input
                    type="checkbox"
                    checked={hour.is_open}
                    onChange={(event) => void updateBusinessHour(hour, { is_open: event.target.checked })}
                  />
                  Aberto
                </label>
                <label>
                  Inicio
                  <input
                    type="time"
                    value={hour.start_time}
                    onChange={(event) => void updateBusinessHour(hour, { start_time: event.target.value })}
                  />
                </label>
                <label>
                  Fim
                  <input
                    type="time"
                    value={hour.end_time}
                    onChange={(event) => void updateBusinessHour(hour, { end_time: event.target.value })}
                  />
                </label>
              </article>
            ))}
          </div>
        </section>

        <section className="panel full-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Disponibilidade</p>
              <h2>Faixas que podem receber agendamento.</h2>
            </div>
            <SlidersHorizontal size={22} aria-hidden="true" />
          </div>
          <div className="availability-list">
            {availabilityRules.map((rule) => (
              <article key={rule.id} className={rule.active ? 'availability-row active' : 'availability-row'}>
                <strong>{dayLabels[rule.day_of_week]}</strong>
                <label>
                  Inicio
                  <input
                    type="time"
                    value={rule.start_time}
                    onChange={(event) => void updateAvailabilityRule(rule, { start_time: event.target.value })}
                  />
                </label>
                <label>
                  Fim
                  <input
                    type="time"
                    value={rule.end_time}
                    onChange={(event) => void updateAvailabilityRule(rule, { end_time: event.target.value })}
                  />
                </label>
                <label className="toggle-label">
                  <input
                    type="checkbox"
                    checked={rule.active}
                    onChange={(event) => void updateAvailabilityRule(rule, { active: event.target.checked })}
                  />
                  Ativo
                </label>
              </article>
            ))}
          </div>
        </section>

        <section className="panel full-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Bloqueios</p>
              <h2>Pausas, feriados e indisponibilidades.</h2>
            </div>
            <Ban size={22} aria-hidden="true" />
          </div>
          <form className="editor-form compact exception-form" onSubmit={addAvailabilityException}>
            <label>
              Data
              <input
                type="date"
                value={exceptionDraft.date}
                onChange={(event) => setExceptionDraft({ ...exceptionDraft, date: event.target.value })}
              />
            </label>
            <label>
              Tipo
              <select
                value={exceptionDraft.type}
                onChange={(event) =>
                  setExceptionDraft({ ...exceptionDraft, type: event.target.value as AvailabilityExceptionType })
                }
              >
                <option value="blocked">Bloqueio</option>
                <option value="holiday">Feriado</option>
                <option value="vacation">Ferias</option>
                <option value="custom_available">Horario extra</option>
              </select>
            </label>
            <label>
              Inicio
              <input
                type="time"
                disabled={exceptionDraft.type === 'holiday' || exceptionDraft.type === 'vacation'}
                value={exceptionDraft.startTime}
                onChange={(event) => setExceptionDraft({ ...exceptionDraft, startTime: event.target.value })}
              />
            </label>
            <label>
              Fim
              <input
                type="time"
                disabled={exceptionDraft.type === 'holiday' || exceptionDraft.type === 'vacation'}
                value={exceptionDraft.endTime}
                onChange={(event) => setExceptionDraft({ ...exceptionDraft, endTime: event.target.value })}
              />
            </label>
            <label className="wide-field">
              Motivo
              <input
                value={exceptionDraft.reason}
                onChange={(event) => setExceptionDraft({ ...exceptionDraft, reason: event.target.value })}
                placeholder="Almoco, compromisso, feriado, curso..."
              />
            </label>
            <button className="primary-action" type="submit">
              <Plus size={16} aria-hidden="true" /> Salvar bloqueio
            </button>
          </form>
          <div className="exception-list">
            {availabilityExceptions.map((exception) => (
              <article key={exception.id}>
                <div>
                  <strong>{formatDateShort(exception.date)}</strong>
                  <span>
                    {exception.type === 'custom_available'
                      ? 'Horario extra'
                      : exception.type === 'holiday'
                        ? 'Feriado'
                        : exception.type === 'vacation'
                          ? 'Ferias'
                          : 'Bloqueio'}
                    {exception.start_time && exception.end_time ? ` - ${exception.start_time} ate ${exception.end_time}` : ''}
                  </span>
                </div>
                <p>{exception.reason}</p>
                <button type="button" aria-label="Remover bloqueio" onClick={() => void deleteAvailabilityException(exception.id)}>
                  <Trash2 size={15} aria-hidden="true" />
                </button>
              </article>
            ))}
            {availabilityExceptions.length === 0 ? <p className="empty-state">Nenhum bloqueio cadastrado.</p> : null}
          </div>
        </section>

        <section className="panel full-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Regras</p>
              <h2>Comportamento da agenda.</h2>
            </div>
            <ClipboardList size={22} aria-hidden="true" />
          </div>
          <div className="settings-grid">
            <label>
              Intervalo dos slots
              <select
                value={scheduleSettings.slot_interval_minutes}
                onChange={(event) =>
                  void updateScheduleSettings({
                    slot_interval_minutes: Number.parseInt(event.target.value, 10) as ScheduleSettings['slot_interval_minutes'],
                  })
                }
              >
                <option value={15}>15 minutos</option>
                <option value={30}>30 minutos</option>
                <option value={60}>60 minutos</option>
              </select>
            </label>
            <label>
              Intervalo entre servicos
              <input
                inputMode="numeric"
                value={scheduleSettings.buffer_between_services_minutes}
                onChange={(event) =>
                  void updateScheduleSettings({
                    buffer_between_services_minutes: Number.parseInt(event.target.value, 10) || 0,
                  })
                }
              />
            </label>
            <label>
              Antecedencia minima (h)
              <input
                inputMode="numeric"
                value={scheduleSettings.minimum_notice_hours}
                onChange={(event) =>
                  void updateScheduleSettings({ minimum_notice_hours: Number.parseInt(event.target.value, 10) || 0 })
                }
              />
            </label>
            <label>
              Dias a frente
              <input
                inputMode="numeric"
                value={scheduleSettings.max_days_ahead}
                onChange={(event) =>
                  void updateScheduleSettings({ max_days_ahead: Number.parseInt(event.target.value, 10) || 0 })
                }
              />
            </label>
            <label className="toggle-label settings-toggle">
              <input
                type="checkbox"
                checked={scheduleSettings.allow_same_day_booking}
                onChange={(event) => void updateScheduleSettings({ allow_same_day_booking: event.target.checked })}
              />
              Permitir agendamento no mesmo dia
            </label>
            <label className="toggle-label settings-toggle">
              <input
                type="checkbox"
                checked={scheduleSettings.allow_manual_outside_availability}
                onChange={(event) =>
                  void updateScheduleSettings({ allow_manual_outside_availability: event.target.checked })
                }
              />
              Permitir encaixe manual fora da disponibilidade
            </label>
          </div>
        </section>
      </div>
    )
  }

  function renderLandingManager() {
    return (
      <div className="landing-manager">
        {renderLandingEditor()}
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
    const publishedCount = services.filter((service) => service.active && service.published).length

    return (
      <section className="panel full-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Servicos</p>
            <h2>Procedimentos, precos e publicacao.</h2>
          </div>
          <div className="heading-actions">
            <span>{publishedCount} visivel(is) na landing</span>
            <span>{services.length} cadastrados</span>
          </div>
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
                aria-label="Descricao do servico"
                value={service.description}
                onChange={(event) => void updateService(service, { description: event.target.value })}
              />
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
              <button
                className="icon-button service-delete"
                type="button"
                aria-label={`Excluir ou desativar ${service.name}`}
                onClick={() => void deleteService(service)}
              >
                <Trash2 size={15} aria-hidden="true" />
              </button>
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
