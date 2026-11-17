'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { getSupabasePublicConfig } from '@/lib/supabase/config'

export type PaymentStatus = 'pending' | 'confirmed' | 'rejected' | 'cancelled'

export type Payment = {
  id: string
  propertyId: string
  unit: string
  tenant: string
  amount: number
  method: string
  declaredAt: string
  date: string
  status: PaymentStatus
  periodMonth?: string
  reference?: string
  rejectionReason?: string
}

export type Property = {
  id: string
  propertyId?: string
  leaseId?: string
  leaseCount?: number
  city: string
  building: string
  name: string
  tenant: string
  rent: number
  occupied: boolean
  confirmedPaymentCount: number
  dueDay?: number
  leaseStart?: string
  nextRent?: number
  nextRentFrom?: string
}

export type Receipt = {
  number: string
  propertyId: string
  amount: number
  month: string
  owner: string
  tenant: string
  unit: string
  paidOn: string
  method: string
  reference: string
}

export type RentPeriod = {
  id: string
  leaseId: string
  unitId: string
  unit: string
  tenant: string
  phone: string
  amount: number
  month: string
  dueOn: string
  status: string
}

type CityStats = { total: number; occupied: number }

const DEFAULT_ACCOUNT_TIMEZONE = 'Africa/Douala'

export function localISODate(date = new Date(), timeZone = DEFAULT_ACCOUNT_TIMEZONE) {
  let parts: Intl.DateTimeFormatPart[]
  try {
    parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date)
  } catch {
    parts = new Intl.DateTimeFormat('en-CA', { timeZone: DEFAULT_ACCOUNT_TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date)
  }
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
}

export function monthKeyInTimeZone(date = new Date(), timeZone = DEFAULT_ACCOUNT_TIMEZONE) {
  return localISODate(date, timeZone).slice(0, 7)
}

export function shiftMonthKey(monthKey: string, delta: number) {
  const [year, month] = monthKey.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1 + delta, 15, 12))
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
}

export function daysBetweenISODateKeys(dateKey: string, referenceKey: string) {
  const parse = (key: string) => {
    const [year, month, day] = key.slice(0, 10).split('-').map(Number)
    return Date.UTC(year, month - 1, day)
  }
  return Math.round((parse(dateKey) - parse(referenceKey)) / 86_400_000)
}

function formatDateOnly(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(year, month - 1, day, 12)))
}

export function getNextDueDate(property: Property, today = new Date(), timeZone = DEFAULT_ACCOUNT_TIMEZONE) {
  const dueDay = property.dueDay ?? 15
  const todayKey = localISODate(today, timeZone)
  const [todayYear, todayMonth] = todayKey.split('-').map(Number)
  const dateFor = (year: number, month: number) => `${year}-${String(month).padStart(2, '0')}-${String(Math.min(dueDay, new Date(Date.UTC(year, month, 0)).getUTCDate())).padStart(2, '0')}`
  let dueDate = dateFor(todayYear, todayMonth)
  if (dueDate < todayKey) dueDate = dateFor(todayYear + Math.floor(todayMonth / 12), (todayMonth % 12) + 1)
  const leaseStart = property.leaseStart?.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (leaseStart) {
    const startYear = Number(leaseStart[3])
    const startMonth = Number(leaseStart[2])
    const startDate = `${leaseStart[3]}-${leaseStart[2]}-${leaseStart[1]}`
    if (dueDate < startDate) {
      dueDate = dateFor(startYear, startMonth)
      if (dueDate < startDate) dueDate = dateFor(startYear + Math.floor(startMonth / 12), (startMonth % 12) + 1)
    }
  }
  return formatDateOnly(dueDate)
}

const startingPayments: Payment[] = [
  { id: 'A2', propertyId: 'A2', unit: 'Appart. A2', tenant: 'M. Mbarga', amount: 60000, method: 'Orange Money', declaredAt: 'Aujourd’hui, 09:14', date: '10 novembre 2026', status: 'pending', reference: '' },
  { id: 'S2', propertyId: 'S2', unit: 'Studio 2', tenant: 'Mme Biyong', amount: 25000, method: 'MTN MoMo', declaredAt: 'Aujourd’hui, 08:40', date: '10 novembre 2026', status: 'pending', reference: '' },
]

const startingProperties: Property[] = [
  { id: 'S2', city: 'Bastos', building: 'Immeuble Bastos', name: 'Studio 2', tenant: 'Mme Biyong', rent: 25000, occupied: true, confirmedPaymentCount: 1 },
  { id: 'S3', city: 'Bastos', building: 'Immeuble Bastos', name: 'Studio 3', tenant: 'Mme Fotso', rent: 25000, occupied: true, confirmedPaymentCount: 1 },
  { id: 'S5', city: 'Bastos', building: 'Immeuble Bastos', name: 'Studio 5', tenant: 'M. Kamga', rent: 25000, occupied: true, confirmedPaymentCount: 1 },
  { id: 'A2', city: 'Bastos', building: 'Immeuble Bastos', name: 'Appart. A2', tenant: 'M. Mbarga', rent: 60000, occupied: true, confirmedPaymentCount: 1 },
  { id: 'S6', city: 'Bastos', building: 'Immeuble Bastos', name: 'Studio 6', tenant: 'Aucun locataire', rent: 0, occupied: false, confirmedPaymentCount: 0 },
  { id: 'M1', city: 'Mvog-Ada', building: 'Résidence Mvog-Ada', name: 'Studio 1', tenant: 'Mme Onana', rent: 30000, occupied: true, confirmedPaymentCount: 1 },
  { id: 'D1', city: 'Douala', building: 'Résidence Bonapriso', name: 'Appart. D1', tenant: 'M. Essomba', rent: 80000, occupied: true, confirmedPaymentCount: 1 },
]

function statsFor(properties: Property[]): Record<string, CityStats> {
  return properties.reduce<Record<string, CityStats>>((stats, property) => {
    const current = stats[property.city] ?? { total: 0, occupied: 0 }
    stats[property.city] = { total: current.total + 1, occupied: current.occupied + Number(property.occupied) }
    return stats
  }, {})
}

function one<T>(value: T | T[] | null | undefined): T | undefined {
  if (Array.isArray(value)) return value[0]
  return value ?? undefined
}

function localDate(value: string | null | undefined) {
  if (!value) return '—'
  const date = new Date(`${value.slice(0, 10)}T12:00:00`)
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(date)
}

function displayMethod(method: string) {
  return ({ orange_money: 'Orange Money', mtn_momo: 'MTN MoMo', cash: 'Espèces', bank_transfer: 'Virement bancaire' } as Record<string, string>)[method] ?? method
}

function toDatabaseMethod(method: string) {
  if (method === 'Orange Money') return 'orange_money'
  if (method === 'MTN MoMo') return 'mtn_momo'
  if (method === 'Espèces') return 'cash'
  if (method === 'Virement bancaire') return 'bank_transfer'
  return method
}

function displayMonth(value: string) {
  return new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(new Date(`${value.slice(0, 10)}T12:00:00`))
}

function parseFrenchDate(value: string) {
  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!match) return null
  const date = new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]), 12)
  if (date.getFullYear() !== Number(match[3]) || date.getMonth() !== Number(match[2]) - 1 || date.getDate() !== Number(match[1])) return null
  return `${match[3]}-${match[2]}-${match[1]}`
}

type RentFlowContextValue = {
  pendingPayments: Payment[]
  paymentHistory: Payment[]
  selectedPayment: Payment
  lastReceipt: Receipt | null
  selectedReceipt: Receipt | null
  setSelectedReceipt: (receipt: Receipt) => void
  receipts: Receipt[]
  rentPeriods: RentPeriod[]
  tenantPropertyId: string
  setTenantPropertyId: (propertyId: string) => void
  properties: Property[]
  archivedProperties: Property[]
  propertyStats: Record<string, CityStats>
  setSelectedPayment: (payment: Payment) => void
  confirmSelectedPayment: (reference: string) => Promise<void>
  rejectPayment: (paymentId: string, reason?: string) => Promise<void>
  reportTenantPayment: (token: string, details: { propertyId: string; method: string; reference: string; paymentDate: string }) => Promise<void>
  addProperty: (city: string, building: string, name: string) => Promise<boolean>
  addProperties: (city: string, building: string, names: string[]) => Promise<{ added: number; skipped: number } | null>
  updateProperty: (propertyId: string, changes: { building: string; name: string; rent: number }) => Promise<boolean>
  removeProperty: (propertyId: string) => Promise<boolean>
  archiveProperty: (propertyId: string) => Promise<boolean>
  endLease: (propertyId: string) => Promise<boolean>
  addLease: (propertyId: string, tenant: string, phone: string, rent: number, dueDay: number, leaseStart: string) => Promise<boolean>
  registerCashRentPayment: (periodId: string, paidOn: string, reference?: string) => Promise<void>
  cancelConfirmedPayment: (paymentId: string) => Promise<void>
  createTenantPaymentLink: (periodId: string) => Promise<string>
  isDemo: boolean
  subscriptionReadOnly: boolean
  accountTimezone: string
  loading: boolean
  dataError: string
  refresh: () => Promise<void>
}

const RentFlowContext = createContext<RentFlowContextValue | null>(null)

export function RentFlowProvider({ children }: { children: ReactNode }) {
  const config = getSupabasePublicConfig()
  const supabase = useMemo(() => config ? createClient() : null, [config?.url, config?.key])
  const [isDemo, setIsDemo] = useState(!supabase)
  const [loading, setLoading] = useState(Boolean(supabase))
  const [subscriptionReadOnly, setSubscriptionReadOnly] = useState(Boolean(supabase))
  const [accountTimezone, setAccountTimezone] = useState(DEFAULT_ACCOUNT_TIMEZONE)
  const [dataError, setDataError] = useState('')
  const [ownerId, setOwnerId] = useState<string | null>(null)
  const [pendingPayments, setPendingPayments] = useState(supabase ? [] : startingPayments)
  const [paymentHistory, setPaymentHistory] = useState<Payment[]>([])
  const [selectedPayment, setSelectedPayment] = useState(startingPayments[0])
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [rentPeriods, setRentPeriods] = useState<RentPeriod[]>([])
  const [selectedReceiptNumber, setSelectedReceiptNumber] = useState<string | null>(null)
  const selectedReceipt = receipts.find(receipt => receipt.number === selectedReceiptNumber) ?? receipts[0] ?? null
  const [tenantPropertyId, setTenantPropertyId] = useState('A2')
  const [properties, setProperties] = useState(supabase ? [] : startingProperties)
  const [archivedProperties, setArchivedProperties] = useState<Property[]>([])
  const [propertyStats, setPropertyStats] = useState(supabase ? {} : statsFor(startingProperties))
  const lastReceipt = receipts[0] ?? null

  const clearAccountData = useCallback(() => {
    setOwnerId(null)
    setAccountTimezone(DEFAULT_ACCOUNT_TIMEZONE)
    setProperties(supabase ? [] : startingProperties)
    setArchivedProperties([])
    setPropertyStats(supabase ? {} : statsFor(startingProperties))
    setPendingPayments(supabase ? [] : startingPayments)
    setPaymentHistory([])
    setSelectedPayment(startingPayments[0])
    setReceipts([])
    setRentPeriods([])
    setSelectedReceiptNumber(null)
    setTenantPropertyId(supabase ? '' : 'A2')
    setDataError('')
    setSubscriptionReadOnly(false)
  }, [supabase])

  const refresh = useCallback(async () => {
    if (!supabase) return
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      setIsDemo(true)
      clearAccountData()
      setLoading(false)
      return
    }

    setOwnerId(user.id)
    setIsDemo(false)
    setLoading(true)
    setSubscriptionReadOnly(true)
    setDataError('')
    try {
      const { data: profile, error: profileError } = await supabase.from('profiles').select('timezone').eq('user_id', user.id).maybeSingle()
      if (profileError) throw profileError
      const timezone = profile?.timezone || DEFAULT_ACCOUNT_TIMEZONE
      setAccountTimezone(timezone)
      const { error: generationError } = await supabase.rpc('generate_monthly_rent_periods', { p_month: localISODate(new Date(), timezone) })
      if (generationError) throw generationError
      const [unitResult, paymentResult, receiptResult, periodResult, rentChangeResult, subscriptionResult] = await Promise.all([
        supabase.from('units').select('id,name,property_id,archived_at,properties!inner(name,city),leases(id,active,monthly_rent,due_day,starts_on,ends_on,tenants(full_name,phone))').eq('owner_id', user.id),
        supabase.from('payment_declarations').select('id,rent_period_id,method,status,amount,reference,declared_at,paid_on,rejection_reason,rent_periods!inner(period_month,due_on,leases!inner(unit_id,units!inner(name),tenants!inner(full_name)))').eq('owner_id', user.id).order('declared_at', { ascending: false }),
        supabase.from('receipts').select('*').eq('owner_id', user.id).order('issued_at', { ascending: false }),
        supabase.from('rent_periods').select('id,lease_id,period_month,due_on,amount_due,status,leases!inner(unit_id,units!inner(name),tenants!inner(full_name,phone))').eq('owner_id', user.id).order('due_on', { ascending: true }),
        supabase.from('lease_rent_changes').select('lease_id,new_monthly_rent,effective_month').eq('owner_id', user.id).order('effective_month', { ascending: true }),
        supabase.from('subscriptions').select('status,trial_ends_at,current_period_ends_at').eq('owner_id', user.id).maybeSingle(),
      ])
      const queryError = unitResult.error ?? paymentResult.error ?? receiptResult.error ?? periodResult.error ?? rentChangeResult.error ?? subscriptionResult.error
      if (queryError) throw queryError
      const subscription = subscriptionResult.data
      setSubscriptionReadOnly(!subscription || !(
        (subscription.status === 'trial' && new Date(subscription.trial_ends_at).getTime() > Date.now())
        || (subscription.status === 'active' && (!subscription.current_period_ends_at || new Date(subscription.current_period_ends_at).getTime() > Date.now()))
      ))

      const rentChangesByLease = new Map<string, { rent: number; month: string }[]>()
      for (const change of (rentChangeResult.data ?? []) as any[]) {
        const leaseChanges = rentChangesByLease.get(change.lease_id) ?? []
        leaseChanges.push({ rent: Number(change.new_monthly_rent), month: change.effective_month })
        rentChangesByLease.set(change.lease_id, leaseChanges)
      }
      const currentMonth = monthKeyInTimeZone(new Date(), timezone)

      const mappedProperties: Property[] = (unitResult.data ?? []).map((row: any) => {
        const building = one(row.properties)
        const leases = (row.leases ?? []) as any[]
        const activeLease = leases.find(lease => lease.active)
        const tenant = activeLease ? one(activeLease.tenants) : undefined
        const changes = activeLease ? rentChangesByLease.get(activeLease.id) ?? [] : []
        const effectiveRent = changes.filter(change => change.month.slice(0, 7) <= currentMonth).at(-1)
        const futureRent = changes.find(change => change.month.slice(0, 7) > currentMonth)
        return {
          id: row.id,
          propertyId: row.property_id,
          leaseId: activeLease?.id,
          leaseCount: leases.length,
          city: building?.city ?? '',
          building: building?.name ?? '',
          name: row.name,
          tenant: tenant ? `${tenant.full_name}${tenant.phone ? ` · ${tenant.phone}` : ''}` : 'Aucun locataire',
          rent: effectiveRent?.rent ?? Number(activeLease?.monthly_rent ?? 0),
          occupied: Boolean(activeLease),
          confirmedPaymentCount: 0,
          dueDay: activeLease?.due_day,
          ...(futureRent ? { nextRent: futureRent.rent, nextRentFrom: futureRent.month } : {}),
          ...(activeLease?.starts_on ? { leaseStart: new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(`${activeLease.starts_on}T12:00:00`)) } : {}),
        }
      })

      const rawPayments = (paymentResult.data ?? []) as any[]
      const mappedPayments: Payment[] = rawPayments.map(row => {
        const period = one(row.rent_periods)
        const lease = one(period?.leases)
        return {
          id: row.id,
          propertyId: lease?.unit_id ?? '',
          unit: one(lease?.units)?.name ?? 'Logement',
          tenant: one(lease?.tenants)?.full_name ?? 'Locataire',
          amount: Number(row.amount),
          method: displayMethod(row.method),
          declaredAt: new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(row.declared_at)),
          date: localDate(row.paid_on ?? period?.period_month),
          status: row.status,
          periodMonth: period?.period_month,
          reference: row.reference ?? '',
          rejectionReason: row.rejection_reason ?? undefined,
        }
      })
      const mappedReceipts: Receipt[] = ((receiptResult.data ?? []) as any[]).map(row => ({
        number: row.receipt_number,
        propertyId: '',
        amount: Number(row.amount),
        month: displayMonth(row.period_month),
        owner: row.owner_name,
        tenant: row.tenant_name,
        unit: row.unit_name,
        paidOn: localDate(row.paid_on),
        method: displayMethod(row.method),
        reference: '',
      }))
      const mappedPeriods: RentPeriod[] = ((periodResult.data ?? []) as any[]).map(row => {
        const lease = one(row.leases)
        const unit = one(lease?.units)
        const tenant = one(lease?.tenants)
        return {
          id: row.id, leaseId: row.lease_id, unitId: lease?.unit_id ?? '', unit: unit?.name ?? '',
          tenant: tenant?.full_name ?? '', phone: tenant?.phone ?? '', amount: Number(row.amount_due),
          month: row.period_month, dueOn: row.due_on, status: row.status,
        }
      })

      const confirmedByUnit = new Map<string, number>()
      for (const payment of mappedPayments) if (payment.status === 'confirmed') confirmedByUnit.set(payment.propertyId, (confirmedByUnit.get(payment.propertyId) ?? 0) + 1)
      const withCounts = mappedProperties.map(property => ({ ...property, confirmedPaymentCount: confirmedByUnit.get(property.id) ?? 0 }))
      const activeProperties = withCounts.filter(property => !unitResult.data?.find((row: any) => row.id === property.id)?.archived_at)
      const archived = withCounts.filter(property => unitResult.data?.find((row: any) => row.id === property.id)?.archived_at)
      setProperties(activeProperties)
      setArchivedProperties(archived)
      setPropertyStats(statsFor(activeProperties))
      setPendingPayments(mappedPayments.filter(payment => payment.status === 'pending'))
      setPaymentHistory(mappedPayments.filter(payment => payment.status !== 'pending'))
      setSelectedPayment(mappedPayments.find(payment => payment.status === 'pending') ?? mappedPayments[0] ?? startingPayments[0])
      setReceipts(mappedReceipts)
      setRentPeriods(mappedPeriods)
      setSelectedReceiptNumber(current => mappedReceipts.some(receipt => receipt.number === current) ? current : null)
      if (activeProperties.length) setTenantPropertyId(activeProperties[0].id)
    } catch {
      setSubscriptionReadOnly(true)
      setProperties([])
      setArchivedProperties([])
      setPropertyStats({})
      setPendingPayments([])
      setPaymentHistory([])
      setReceipts([])
      setRentPeriods([])
      setDataError('Les données du compte n’ont pas pu être chargées. Vérifiez le schéma Supabase et les politiques RLS.')
    } finally {
      setLoading(false)
    }
  }, [clearAccountData, supabase])

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }
    refresh().catch(() => setLoading(false))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setIsDemo(false)
        queueMicrotask(() => { void refresh() })
      } else {
        setIsDemo(true)
        clearAccountData()
        setLoading(false)
      }
    })
    return () => subscription.unsubscribe()
  }, [clearAccountData, refresh, supabase])

  const confirmSelectedPayment = useCallback(async (reference: string) => {
    if (isDemo || !supabase) {
      const payment = pendingPayments.find(item => item.id === selectedPayment.id)
      if (!payment) return
      const confirmedPayment = { ...payment, status: 'confirmed' as const, reference }
      setPaymentHistory(current => [confirmedPayment, ...current])
      const receipt: Receipt = {
        number: `DEMO-${globalThis.crypto.randomUUID().slice(0, 8).toUpperCase()}`,
        propertyId: payment.propertyId, amount: payment.amount, month: 'novembre 2026', owner: 'M. Nkou',
        tenant: payment.tenant, unit: payment.unit, paidOn: payment.date, method: payment.method, reference,
      }
      setReceipts(current => [receipt, ...current])
      setSelectedReceiptNumber(receipt.number)
      setPendingPayments(current => current.filter(item => item.id !== payment.id))
      setProperties(current => current.map(property => property.id === payment.propertyId
        ? { ...property, confirmedPaymentCount: property.confirmedPaymentCount + 1 } : property))
      return
    }
    const { error } = await supabase.rpc('confirm_rent_payment', { p_payment_id: selectedPayment.id, p_verified_reference: reference || null })
    if (error) throw error
    await refresh()
  }, [isDemo, pendingPayments, refresh, selectedPayment, supabase])

  const setSelectedReceipt = useCallback((receipt: Receipt) => setSelectedReceiptNumber(receipt.number), [])

  const rejectPayment = useCallback(async (paymentId: string, reason = '') => {
    if (isDemo || !supabase) {
      const payment = pendingPayments.find(item => item.id === paymentId)
      if (!payment) return
      setPaymentHistory(current => [{ ...payment, status: 'rejected', rejectionReason: reason }, ...current])
      setPendingPayments(current => current.filter(item => item.id !== paymentId))
      return
    }
    const { error } = await supabase.rpc('reject_rent_payment', { p_payment_id: paymentId, p_reason: reason })
    if (error) throw error
    await refresh()
  }, [isDemo, pendingPayments, refresh, supabase])

  const reportTenantPayment = useCallback(async (token: string, details: { propertyId: string; method: string; reference: string; paymentDate: string }) => {
    if (token && supabase) {
      const parsedDate = details.paymentDate.match(/^\d{4}-\d{2}-\d{2}$/) ? details.paymentDate : localISODate(new Date())
      const { error } = await supabase.rpc('submit_tenant_payment', {
        p_token: token,
        p_method: toDatabaseMethod(details.method),
        p_paid_on: parsedDate,
        p_reference: details.reference || null,
      })
      if (error) throw error
      return
    }
    const property = properties.find(item => item.id === details.propertyId)
    if (!property?.occupied || property.rent <= 0) return
    const payment: Payment = {
      id: `demo-${globalThis.crypto.randomUUID().slice(0, 8)}`, propertyId: property.id, unit: property.name,
      tenant: property.tenant.split(' · ')[0], amount: property.rent, method: details.method,
      declaredAt: 'À l’instant', date: details.paymentDate, reference: details.reference, status: 'pending',
    }
    setPendingPayments(current => [payment, ...current])
    setSelectedPayment(payment)
  }, [isDemo, properties, refresh, supabase])

  const addProperties = useCallback(async (city: string, building: string, names: string[]) => {
    const cleanCity = city.trim().replace(/\s+/g, ' ')
    const cleanBuilding = building.trim().replace(/\s+/g, ' ')
    const requestedNames = names.map(name => name.trim().replace(/\s+/g, ' ')).filter(Boolean)
    const uniqueNames = Array.from(new Map<string, string>(requestedNames.map(name => [name.toLocaleLowerCase('fr'), name] as const)).values())
    if (!cleanCity || cleanCity.length > 100 || !cleanBuilding || cleanBuilding.length > 160 || !requestedNames.length || requestedNames.length > 100 || uniqueNames.some(name => name.length > 160)) return null

    if (isDemo || !supabase || !ownerId) {
      const existingNames = new Set(properties.filter(item => item.city.toLocaleLowerCase('fr') === cleanCity.toLocaleLowerCase('fr') && item.building.toLocaleLowerCase('fr') === cleanBuilding.toLocaleLowerCase('fr')).map(item => item.name.trim().toLocaleLowerCase('fr')))
      const toAdd = uniqueNames.filter(name => !existingNames.has(name.toLocaleLowerCase('fr')))
      const skipped = requestedNames.length - toAdd.length
      if (toAdd.length) {
        const newProperties: Property[] = toAdd.map(name => ({ id: `P-${globalThis.crypto.randomUUID().slice(0, 6).toUpperCase()}`, city: cleanCity, building: cleanBuilding, name, tenant: 'Aucun locataire', rent: 0, occupied: false, confirmedPaymentCount: 0 }))
        setProperties(current => [...current, ...newProperties])
        setPropertyStats(current => { const stats = current[cleanCity] ?? { total: 0, occupied: 0 }; return { ...current, [cleanCity]: { ...stats, total: stats.total + newProperties.length } } })
      }
      return { added: toAdd.length, skipped }
    }

    let buildingId = properties.find(item => item.city.toLocaleLowerCase('fr') === cleanCity.toLocaleLowerCase('fr') && item.building.toLocaleLowerCase('fr') === cleanBuilding.toLocaleLowerCase('fr'))?.propertyId
    let createdBuilding = false
    if (!buildingId) {
      const existingBuilding = await supabase.from('properties').select('id').eq('owner_id', ownerId).eq('name', cleanBuilding).eq('city', cleanCity).is('archived_at', null).maybeSingle()
      if (existingBuilding.error) return null
      buildingId = existingBuilding.data?.id
      if (!buildingId) {
        const propertyResult = await supabase.from('properties').insert({ owner_id: ownerId, name: cleanBuilding, neighborhood: '', city: cleanCity }).select('id').single()
        if (propertyResult.error || !propertyResult.data) return null
        buildingId = propertyResult.data.id
        createdBuilding = true
      }
    }
    const existingUnits = await supabase.from('units').select('name').eq('owner_id', ownerId).eq('property_id', buildingId).is('archived_at', null)
    if (existingUnits.error) return null
    const existingNames = new Set(existingUnits.data.map(unit => unit.name.trim().toLocaleLowerCase('fr')))
    const toAdd = uniqueNames.filter(name => !existingNames.has(name.toLocaleLowerCase('fr')))
    if (!toAdd.length) return { added: 0, skipped: requestedNames.length }
    const unitResult = await supabase.from('units').insert(toAdd.map(name => ({ owner_id: ownerId, property_id: buildingId, name })))
    if (unitResult.error) {
      if (createdBuilding) await supabase.from('properties').delete().eq('id', buildingId).eq('owner_id', ownerId)
      return null
    }
    await refresh()
    return { added: toAdd.length, skipped: requestedNames.length - toAdd.length }
  }, [isDemo, ownerId, properties, refresh, supabase])

  const addProperty = useCallback(async (city: string, building: string, name: string) => {
    const result = await addProperties(city, building, [name])
    return result !== null && result.added === 1
  }, [addProperties])

  const updateProperty = useCallback(async (propertyId: string, changes: { building: string; name: string; rent: number }) => {
    const property = properties.find(item => item.id === propertyId)
    const building = changes.building.trim()
    const name = changes.name.trim()
    const duplicateName = properties.some(item => item.id !== propertyId && item.name.toLocaleLowerCase('fr') === name.toLocaleLowerCase('fr'))
    if (!property || !building || !name || duplicateName || !Number.isSafeInteger(changes.rent) || changes.rent < 0 || (property.occupied && changes.rent === 0)) return false
    if (!isDemo && supabase && ownerId) {
      const { error } = await supabase.rpc('update_rental_unit', {
        p_unit_id: propertyId,
        p_property_name: building,
        p_unit_name: name,
        p_new_monthly_rent: changes.rent,
      })
      if (error) return false
      await refresh()
      return true
    }
    setProperties(current => current.map(item => item.id === propertyId ? { ...item, building, name, rent: changes.rent } : item))
    setPendingPayments(current => current.map(payment => payment.propertyId === propertyId ? { ...payment, unit: name } : payment))
    setPaymentHistory(current => current.map(payment => payment.propertyId === propertyId ? { ...payment, unit: name } : payment))
    setSelectedPayment(current => current.propertyId === propertyId ? { ...current, unit: name } : current)
    setReceipts(current => current.map(receipt => receipt.propertyId === propertyId ? { ...receipt, unit: name } : receipt))
    return true
  }, [isDemo, ownerId, pendingPayments, paymentHistory, properties, refresh, supabase])

  const removeProperty = useCallback(async (propertyId: string) => {
    const property = properties.find(item => item.id === propertyId)
    if (!property || property.occupied || property.confirmedPaymentCount > 0 || (property.leaseCount ?? 0) > 0 || pendingPayments.some(payment => payment.propertyId === property.id)) return false
    if (!isDemo && supabase && ownerId) {
      const { error } = await supabase.from('units').delete().eq('id', propertyId).eq('owner_id', ownerId)
      if (error) return false
      await refresh()
      return true
    }
    setProperties(current => current.filter(item => item.id !== propertyId))
    setPropertyStats(current => { const stats = current[property.city] ?? { total: 0, occupied: 0 }; return { ...current, [property.city]: { ...stats, total: Math.max(0, stats.total - 1) } } })
    return true
  }, [isDemo, ownerId, pendingPayments, properties, refresh, supabase])

  const archiveProperty = useCallback(async (propertyId: string) => {
    const property = properties.find(item => item.id === propertyId)
    if (!property || (property.confirmedPaymentCount === 0 && (property.leaseCount ?? 0) === 0)) return false
    if (!isDemo && supabase && ownerId) {
      if (property.leaseId) {
        const { error: leaseError } = await supabase.rpc('end_lease', { p_lease_id: property.leaseId })
        if (leaseError) return false
      }
      const now = new Date().toISOString()
      const { error } = await supabase.from('units').update({ archived_at: now }).eq('id', propertyId).eq('owner_id', ownerId)
      if (error) return false
      await refresh()
      return true
    }
    setArchivedProperties(current => current.some(item => item.id === property.id) ? current : [...current, property])
    setProperties(current => current.filter(item => item.id !== propertyId))
    setPropertyStats(current => { const stats = current[property.city] ?? { total: 0, occupied: 0 }; return { ...current, [property.city]: { total: Math.max(0, stats.total - 1), occupied: Math.max(0, stats.occupied - Number(property.occupied)) } } })
    return true
  }, [isDemo, ownerId, properties, refresh, supabase])

  const endLease = useCallback(async (propertyId: string) => {
    const property = properties.find(item => item.id === propertyId)
    if (!property?.leaseId || !property.occupied) return false
    if (!isDemo && supabase && ownerId) {
      const { error } = await supabase.rpc('end_lease', { p_lease_id: property.leaseId })
      if (error) return false
      await refresh()
      return true
    }
    setProperties(current => current.map(item => item.id === propertyId
      ? { ...item, occupied: false, tenant: 'Aucun locataire', rent: 0, dueDay: undefined, leaseStart: undefined, leaseId: undefined }
      : item))
    setPropertyStats(current => {
      const stats = current[property.city] ?? { total: 0, occupied: 0 }
      return { ...current, [property.city]: { ...stats, occupied: Math.max(0, stats.occupied - 1) } }
    })
    return true
  }, [isDemo, ownerId, properties, refresh, supabase])

  const addLease = useCallback(async (propertyId: string, tenant: string, phone: string, rent: number, dueDay: number, leaseStart: string) => {
    const property = properties.find(item => item.id === propertyId && !item.occupied)
    const startsOn = parseFrenchDate(leaseStart)
    if (!property || !tenant.trim() || !phone.trim() || !Number.isSafeInteger(rent) || rent <= 0 || dueDay < 1 || dueDay > 31 || !startsOn) return false
    if (!isDemo && supabase && ownerId) {
      const { error } = await supabase.rpc('create_tenant_lease', {
        p_unit_id: propertyId,
        p_full_name: tenant.trim(),
        p_phone: phone.trim(),
        p_monthly_rent: rent,
        p_due_day: dueDay,
        p_starts_on: startsOn,
      })
      if (error) return false
      await refresh()
      setTenantPropertyId(propertyId)
      return true
    }
    setProperties(current => current.map(item => item.id === property.id ? { ...item, tenant: `${tenant} · ${phone}`, rent, dueDay, leaseStart, occupied: true } : item))
    setTenantPropertyId(property.id)
    setPropertyStats(current => { const stats = current[property.city] ?? { total: 0, occupied: 0 }; return { ...current, [property.city]: { ...stats, occupied: stats.occupied + 1 } } })
    return true
  }, [isDemo, ownerId, properties, refresh, supabase])

  const registerCashRentPayment = useCallback(async (periodId: string, paidOn: string, reference = '') => {
    if (isDemo || !supabase) return
    const { error } = await supabase.rpc('register_cash_rent_payment', { p_rent_period_id: periodId, p_paid_on: paidOn, p_reference: reference || null })
    if (error) throw error
    await refresh()
  }, [isDemo, refresh, supabase])

  const cancelConfirmedPayment = useCallback(async (paymentId: string) => {
    if (isDemo || !supabase) {
      setPaymentHistory(current => current.map(payment => payment.id === paymentId ? { ...payment, status: 'cancelled' } : payment))
      return
    }
    const { error } = await supabase.rpc('cancel_confirmed_rent_payment', { p_payment_id: paymentId })
    if (error) throw error
    await refresh()
  }, [isDemo, refresh, supabase])

  const createTenantPaymentLink = useCallback(async (periodId: string) => {
    if (isDemo || !supabase) return ''
    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
    const { data, error } = await supabase.rpc('create_tenant_payment_link', { p_rent_period_id: periodId, p_expires_at: expiresAt })
    if (error || typeof data !== 'string') throw error ?? new Error('Lien de paiement non créé.')
    return data
  }, [isDemo, supabase])

  const value: RentFlowContextValue = {
    pendingPayments, paymentHistory, selectedPayment, lastReceipt, selectedReceipt, setSelectedReceipt, receipts, rentPeriods,
    tenantPropertyId, setTenantPropertyId, properties, archivedProperties, propertyStats, setSelectedPayment,
    confirmSelectedPayment, rejectPayment, reportTenantPayment, addProperty, updateProperty, removeProperty,
    archiveProperty, endLease, addLease, addProperties, registerCashRentPayment, cancelConfirmedPayment, createTenantPaymentLink, isDemo, subscriptionReadOnly, accountTimezone, loading, dataError, refresh,
  }

  return <RentFlowContext.Provider value={value}>{children}</RentFlowContext.Provider>
}

export function useRentFlow() {
  const value = useContext(RentFlowContext)
  if (!value) throw new Error('useRentFlow doit être utilisé dans RentFlowProvider.')
  return value
}
