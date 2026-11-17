'use client'

import { useEffect, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight, Building2, Check, Send, Trash2, Users, Wallet } from 'lucide-react'
import { Brand } from '@/components/site-header'
import { daysBetweenISODateKeys, localISODate, monthKeyInTimeZone, shiftMonthKey, useRentFlow, type Property } from '@/components/rentflow-mobile/state'
import { AppFrame, Money, PageDate, PrimaryButton } from '@/components/rentflow-mobile/ui'
import { createClient } from '@/lib/supabase/client'

const format = (amount: number) => new Intl.NumberFormat('fr-FR').format(amount)
export function DashboardScreen() {
  const { pendingPayments, paymentHistory, properties, rentPeriods, isDemo, loading, dataError, accountTimezone } = useRentFlow()
  const [ownerName, setOwnerName] = useState(isDemo ? 'M. Nkou' : '')
  useEffect(() => {
    if (loading) return
    if (isDemo) {
      setOwnerName('M. Nkou')
      return
    }
    let active = true
    createClient().from('profiles').select('full_name').maybeSingle().then(({ data }) => {
      if (active) setOwnerName(data?.full_name || 'votre compte')
    })
    return () => { active = false }
  }, [isDemo, loading])
  const occupiedProperties = properties.filter(property => property.occupied)
  const currentMonth = monthKeyInTimeZone(new Date(), accountTimezone)
  const currentMonthPeriods = rentPeriods.filter(period => period.month.slice(0, 7) === currentMonth)
  const billableCurrentPeriods = currentMonthPeriods.filter(period => period.status !== 'cancelled')
  const expectedRent = billableCurrentPeriods.length
    ? billableCurrentPeriods.reduce((total, period) => total + period.amount, 0)
    : isDemo ? occupiedProperties.reduce((total, property) => total + property.rent, 0) : 0
  const confirmedPayments = paymentHistory.filter(payment => payment.status === 'confirmed' && payment.periodMonth?.slice(0, 7) === currentMonth)
  const collectedRent = confirmedPayments.reduce((total, payment) => total + payment.amount, 0)
  const collectionRate = expectedRent ? Math.min(100, Math.round((collectedRent / expectedRent) * 100)) : 0
  const pendingUnits = [...new Set(pendingPayments.map(payment => payment.unit))]
  const pendingSummary = pendingUnits.length
    ? `${pendingUnits.join(' et ')} attendent une vérification`
    : 'Aucune déclaration à vérifier'

  return (
    <AppFrame>
      <header className="rf-dashboard-header">
        <Brand />
        <PageDate>{new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric', timeZone: accountTimezone }).format(new Date())}</PageDate>
      </header>
      <section className="rf-dashboard-welcome">
        <div>
          <span className="rf-home-eyebrow">VOTRE ESPACE PROPRIÉTAIRE</span>
          <h1 className="rf-greeting">Bonjour, {ownerName || '…'}</h1>
          <p className="rf-home-subtitle">Vos logements et vos loyers, au même endroit.</p>
        </div>
        <span className="rf-home-welcome-icon"><Building2 aria-hidden="true" /></span>
      </section>
      <section className="rf-home-shortcuts" aria-label="Accès rapides">
        <Link className="rf-home-shortcut" href="/logements">
          <span className="rf-home-shortcut-icon"><Building2 aria-hidden="true" /></span>
          <span><b>Mes logements</b><small>{properties.length} biens suivis</small></span>
          <ArrowRight aria-hidden="true" />
        </Link>
        <Link className="rf-home-shortcut" href="/paiements-a-confirmer">
          <span className="rf-home-shortcut-icon"><Wallet aria-hidden="true" /></span>
          <span><b>Paiements</b><small>{pendingPayments.length} à vérifier</small></span>
          <ArrowRight aria-hidden="true" />
        </Link>
        <Link className="rf-home-shortcut" href="/proprietaire/locataires">
          <span className="rf-home-shortcut-icon"><Users aria-hidden="true" /></span>
          <span><b>Locataires</b><small>Voir les occupants</small></span>
          <ArrowRight aria-hidden="true" />
        </Link>
      </section>
      <Link className="rf-pending-banner" href="/paiements-a-confirmer">
        <span><b>{pendingPayments.length} paiement{pendingPayments.length > 1 ? 's' : ''} à confirmer</b><small>{pendingSummary}</small></span>
        <span className="rf-verify-button">Vérifier</span>
      </Link>
      {dataError && <p className="rf-inline-notice" role="alert">{dataError}</p>}
      {loading && <p className="rf-helper">Chargement de vos données…</p>}
      <section className="rf-revenue-card" aria-label={isDemo ? 'Loyers confirmés dans la démo' : 'Loyers confirmés'}>
        <span>{isDemo ? 'Loyers marqués confirmés · démo' : 'Loyers confirmés'}</span>
        <strong><Money amount={collectedRent} /></strong>
        <div className="rf-progress"><span style={{ width: `${collectionRate}%` }} /></div>
        <small>sur <Money amount={expectedRent} /> attendus · {collectionRate} %</small>
      </section>
      <section className="rf-stat-row" aria-label={isDemo ? 'État des paiements de démonstration' : 'État des paiements'}>
        <article><b>{confirmedPayments.length}</b><span>Confirmés</span></article>
        <article><b className="rf-late-number">{pendingPayments.length}</b><span>À vérifier</span></article>
        <article><b>{properties.filter(property => !property.occupied).length}</b><span>Logements libres</span></article>
      </section>
      <section className="rf-white-card rf-late-card">
        <h2>Déclarations à vérifier</h2>
        {pendingPayments.length ? pendingPayments.map(payment => <div className="rf-list-row" key={payment.id}><span className="rf-unit-code rf-code-amber">{payment.id}</span><span className="rf-row-main"><b>{payment.unit}</b><small>{payment.tenant} · {payment.method}</small></span><span className="rf-row-amount"><b><Money amount={payment.amount} compact /></b><small className="rf-status-pending">À vérifier</small></span></div>) : <p className="rf-empty">Aucune déclaration en attente.</p>}
      </section>
      <nav className="rf-demo-route-links" aria-label="Autres sections propriétaire">
        <Link href="/proprietaire/paiements">Suivi des paiements <ArrowRight aria-hidden="true" /></Link>
        <Link href="/proprietaire/quittances">Quittances de démonstration <ArrowRight aria-hidden="true" /></Link>
        <Link href="/proprietaire/profil">Profil de démonstration <ArrowRight aria-hidden="true" /></Link>
      </nav>
    </AppFrame>
  )
}

const reminders = [
  { unit: 'Studio 5', tenant: 'M. Kamga', rent: 25000, date: 'échéance le 15', due: 'J-5' },
  { unit: 'Appart. A3', tenant: 'M. Onana', rent: 60000, date: 'échéance le 15', due: 'J-5' },
  { unit: 'Studio 9', tenant: 'M. Ndi', rent: 30000, date: 'à payer aujourd’hui', due: 'J' },
  { unit: 'Appart. B4', tenant: 'Mme Abega', rent: 60000, date: 'à payer aujourd’hui', due: 'J' },
]

export function RemindersScreen() {
  const { rentPeriods, properties, createTenantPaymentLink, isDemo, accountTimezone } = useRentFlow()
  const [owner, setOwner] = useState({ name: 'M. Nkou', orange: '69X XX XX XX', mtn: '67X XX XX XX' })
  const [notice, setNotice] = useState('')
  const [sending, setSending] = useState('')
  useEffect(() => {
    if (isDemo) return
    let active = true
    createClient().from('profiles').select('full_name,orange_money_phone,mtn_momo_phone').maybeSingle().then(({ data }) => {
      if (!active || !data) return
      setOwner({ name: data.full_name || 'Votre agence', orange: data.orange_money_phone || '', mtn: data.mtn_momo_phone || '' })
    })
    return () => { active = false }
  }, [isDemo])

  const todayKey = localISODate(new Date(), accountTimezone)
  const liveReminders = rentPeriods.flatMap(period => {
    if (period.status === 'paid' || period.status === 'awaiting_confirmation' || period.status === 'cancelled') return []
    const dueKey = period.dueOn.slice(0, 10)
    const due = new Date(`${dueKey}T12:00:00Z`)
    const days = daysBetweenISODateKeys(dueKey, todayKey)
    if (days !== 5 && days !== 0) return []
    const property = properties.find(item => item.id === period.unitId)
    return [{ ...period, date: days === 0 ? 'à payer aujourd’hui' : `échéance le ${new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', timeZone: 'UTC' }).format(due)}`, due: days === 0 ? 'J' : 'J-5', phone: period.phone || property?.tenant.split(' · ')[1] || '' }]
  })
  const rows = isDemo
    ? reminders.map(item => ({ ...item, id: item.unit, periodId: '', phone: '' }))
    : liveReminders.map(item => ({ ...item, id: item.id, periodId: item.id, rent: item.amount }))

  async function sendReminder(item: (typeof rows)[number]) {
    setNotice('')
    setSending(item.id)
    const popup = window.open('about:blank', '_blank')
    try {
      let paymentUrl = `${window.location.origin}/paiement`
      if (!isDemo) {
        if ((!owner.orange && !owner.mtn) || !item.phone) throw new Error('missing_contact_details')
        const token = await createTenantPaymentLink(item.periodId)
        const url = new URL('/paiement', window.location.origin)
        url.searchParams.set('token', token)
        paymentUrl = url.toString()
      }
      const paymentNumbers = [owner.orange ? `Orange Money : ${owner.orange}` : '', owner.mtn ? `MTN MoMo : ${owner.mtn}` : ''].filter(Boolean).join(' · ')
      const message = `Bonjour ${item.tenant}, de la part de ${owner.name}. Rappel : ${format(item.rent)} FCFA pour ${item.unit}, échéance ${item.date}. ${paymentNumbers}. Paiement et déclaration : ${paymentUrl}`
      const digits = item.phone.replace(/\D/g, '')
      const phone = digits.length === 9 ? `237${digits}` : digits
      const waUrl = phone ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}` : `https://wa.me/?text=${encodeURIComponent(message)}`
      if (popup) popup.location.href = waUrl
      else window.open(waUrl, '_blank', 'noopener,noreferrer')
    } catch (error) {
      popup?.close()
      const message = error && typeof error === 'object' && 'message' in error ? String(error.message) : ''
      setNotice(message.includes('subscription_read_only')
        ? 'Votre essai ou forfait est arrivé à échéance. Le compte est en lecture seule.'
        : 'Renseignez le téléphone du locataire et au moins un numéro Mobile Money dans votre profil, puis réessayez.')
    } finally {
      setSending('')
    }
  }

  const firstReminder = rows[0]
  return (
    <AppFrame>
      <PageDate>{new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: accountTimezone }).format(new Date())}</PageDate>
      <h1 className="rf-page-heading">Rappels du jour</h1>
      <p className="rf-subtitle">{rows.length} message{rows.length === 1 ? '' : 's'} à préparer</p>
      <button className="rf-primary-button rf-reminders-cta" type="button" disabled={!firstReminder || Boolean(sending)} onClick={() => firstReminder && sendReminder(firstReminder)}><Send aria-hidden="true" />Envoyer le premier rappel</button>
      <p className="rf-helper rf-centered rf-reminders-helper">Message prérempli ; choisissez le destinataire dans WhatsApp.</p>
      <section className="rf-white-card rf-message-preview">
        <b className="rf-caption">APERÇU DU MESSAGE</b>
        <p>Chaque message contient le montant, l’échéance, les coordonnées Mobile Money et le lien personnel du loyer concerné.</p>
      </section>
      <section className="rf-white-card rf-reminder-list" aria-label="Locataires à relancer">
        {rows.map(reminder => (
          <div className="rf-list-row" key={reminder.unit}>
            <span className={`rf-unit-code ${reminder.due === 'J' ? 'rf-code-red' : 'rf-code-amber'}`}>{reminder.due}</span>
            <span className="rf-row-main"><b>{reminder.unit} · {reminder.tenant}</b><small>{format(reminder.rent)} FCFA · {reminder.date}</small></span>
            <button type="button" className="rf-send-round" disabled={Boolean(sending)} onClick={() => sendReminder(reminder)} aria-label={`Préparer le rappel WhatsApp pour ${reminder.unit}`}><Send aria-hidden="true" /></button>
          </div>
        ))}{!rows.length && <p className="rf-empty">Aucun rappel à envoyer aujourd’hui.</p>}
      </section>
      {notice && <p className="rf-inline-notice" role="alert">{notice}</p>}
    </AppFrame>
  )
}

export function PropertiesScreen() {
  const { properties, addProperty, addProperties, loading } = useRentFlow()
  const cities = Array.from(new Map(['Yaoundé', 'Douala', 'Bafoussam', 'Bamenda', 'Garoua', 'Maroua', 'Ngaoundéré', 'Bertoua', 'Ebolowa', 'Kribi', 'Limbe', ...properties.map(property => property.city)].filter(Boolean).map(item => [item.toLocaleLowerCase('fr'), item])).values())
  const [city, setCity] = useState('')
  const [customCityMode, setCustomCityMode] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [multiOpen, setMultiOpen] = useState(false)
  const [bulkMode, setBulkMode] = useState<'series' | 'list'>('series')
  const [bulkPrefix, setBulkPrefix] = useState('Appartement')
  const [bulkCount, setBulkCount] = useState('10')
  const [bulkStart, setBulkStart] = useState('1')
  const [bulkNames, setBulkNames] = useState('')
  const [building, setBuilding] = useState('')
  const [propertyName, setPropertyName] = useState('')
  const [notice, setNotice] = useState('')
  const [saving, setSaving] = useState(false)
  const selectedCity = cities.find(item => item.toLocaleLowerCase('fr') === city.trim().replace(/\s+/g, ' ').toLocaleLowerCase('fr')) ?? city.trim().replace(/\s+/g, ' ')
  const customCity = customCityMode && !cities.some(item => item.toLocaleLowerCase('fr') === selectedCity.toLocaleLowerCase('fr'))
  const visible = properties.filter(property => property.city.toLocaleLowerCase('fr') === selectedCity.toLocaleLowerCase('fr'))
  const buildingName = visible[0]?.building ?? `Résidence ${selectedCity || 'principale'}`
  const occupiedCount = visible.filter(property => property.occupied).length
  const totalCount = visible.length

  useEffect(() => {
    if (!loading && !city.trim()) setCity(properties[0]?.city ?? 'Yaoundé')
  }, [city, loading, properties])

  async function submitProperty(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving) return
    const targetCity = selectedCity
    const targetBuilding = (building || buildingName).trim()
    const targetName = propertyName.trim()
    if (!targetCity) {
      setNotice('Saisissez la ville ou la commune du logement.')
      return
    }
    const duplicate = properties.some(property => property.city.toLocaleLowerCase('fr') === targetCity.toLocaleLowerCase('fr')
      && property.building.trim().toLocaleLowerCase('fr') === targetBuilding.toLocaleLowerCase('fr')
      && property.name.trim().toLocaleLowerCase('fr') === targetName.toLocaleLowerCase('fr'))
    if (duplicate) {
      setNotice('Un logement portant ce nom existe déjà dans cet immeuble.')
      return
    }
    setSaving(true)
    try {
      const saved = await addProperty(targetCity, targetBuilding, targetName)
      if (!saved) {
        setNotice('Le logement n’a pas pu être enregistré. Vérifiez les informations et réessayez.')
        return
      }
      setPropertyName('')
      setBuilding('')
      setFormOpen(false)
      setNotice('Logement enregistré.')
    } finally {
      setSaving(false)
    }
  }

  async function addSeveral() {
    if (saving) return
    const firstNumber = Number(bulkStart)
    const count = Number(bulkCount)
    if (!selectedCity) {
      setNotice('Choisissez ou saisissez d’abord la ville du logement.')
      return
    }
    if (bulkMode === 'series' && (!bulkPrefix.trim() || !Number.isSafeInteger(firstNumber) || firstNumber < 1 || !Number.isSafeInteger(count) || count < 1 || count > 100)) {
      setNotice('Indiquez un nom, un numéro de départ et une quantité comprise entre 1 et 100.')
      return
    }
    const names = bulkMode === 'series'
      ? Array.from({ length: count }, (_, index) => `${bulkPrefix.trim()} ${firstNumber + index}`.trim())
      : bulkNames.split(/\r?\n/).map(name => name.trim()).filter(Boolean)
    if (!names.length || names.length > 100 || names.some(name => name.length > 160)) {
      setNotice('Ajoutez entre 1 et 100 noms de logement, de 160 caractères maximum chacun.')
      return
    }
    setSaving(true)
    try {
      const result = await addProperties(selectedCity, (building || buildingName).trim(), names)
      if (!result) {
        setNotice('Les logements n’ont pas pu être enregistrés. Vérifiez les informations et réessayez.')
        setMultiOpen(false)
        return
      }
      setMultiOpen(false)
      setBulkNames('')
      setNotice(result.added
        ? `${result.added} logement${result.added > 1 ? 's' : ''} ajouté${result.added > 1 ? 's' : ''}${result.skipped ? ` · ${result.skipped} nom${result.skipped > 1 ? 's' : ''} déjà présent${result.skipped > 1 ? 's' : ''}, ignoré${result.skipped > 1 ? 's' : ''}` : ''}.`
        : 'Tous ces logements existent déjà dans cet immeuble.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppFrame>
      <h1 className="rf-page-heading rf-properties-title">Mes logements</h1>
      <label className="rf-field rf-city-filter" htmlFor="property-city">Ville ou commune<select id="property-city" value={customCity ? '__custom__' : selectedCity} onChange={event => { const value = event.target.value; setNotice(''); if (value === '__custom__') { setCity(''); setCustomCityMode(true) } else { setCity(value); setCustomCityMode(false) } }}><option value="" disabled>Choisir une ville</option>{cities.map(item => <option key={item} value={item}>{item}</option>)}<option value="__custom__">Autre ville ou commune…</option></select></label>
      {customCity && <label className="rf-field rf-city-filter" htmlFor="property-city-custom">Saisir la ville ou la commune<input id="property-city-custom" value={city} onChange={event => { setCity(event.target.value); setNotice('') }} placeholder="Ex. Kribi, Dschang, Foumban…" maxLength={100} autoFocus required aria-describedby="property-city-help" /></label>}
      <p className="rf-helper rf-city-helper" id="property-city-help">La liste propose des villes courantes et les lieux déjà utilisés. « Autre ville ou commune » permet toute autre localisation.</p>
      <section className="rf-white-card rf-property-card">
        <div className="rf-property-heading"><h2>Logements à {selectedCity}</h2><p>{totalCount} logements · {occupiedCount} occupés</p></div>
        {visible.length ? visible.map(property => (
          <div className="rf-list-row rf-property-row" key={property.id}>
            <span className={`rf-unit-code ${property.occupied ? 'rf-code-green' : 'rf-code-neutral'}`} aria-hidden="true"><Building2 /></span>
            <span className="rf-row-main"><b><Link href={`/proprietaire/logements/${encodeURIComponent(property.id)}`}>{property.name}</Link></b><small>{property.tenant}{property.rent ? ` · ${format(property.rent)} FCFA` : ''}</small></span>
            <div className="rf-property-row-actions">
              {property.occupied ? <span className="rf-status-green">Occupé</span> : <Link className="rf-rent-button" href={`/nouveau-locataire?unitId=${encodeURIComponent(property.id)}`}>Louer</Link>}
              <Link className="rf-delete-property-button" href={`/logements/supprimer?propertyId=${encodeURIComponent(property.id)}`} aria-label={`Supprimer ${property.name}`} title={`Supprimer ${property.name}`}><Trash2 aria-hidden="true" /></Link>
            </div>
          </div>
        )) : <p className="rf-empty">Aucun logement enregistré dans cette ville.</p>}
      </section>
      <p className="rf-properties-delete-note">Un logement qui a déjà un paiement confirmé est archivé, pas supprimé : son historique reste.</p>
      {notice && <p className="rf-inline-notice" role="status">{notice}</p>}
      {formOpen && <form className="rf-inline-form" onSubmit={submitProperty}>
        <label className="rf-field">Nom de l’immeuble<input value={building} onChange={event => setBuilding(event.target.value)} placeholder={buildingName} /></label>
        <label className="rf-field">Nom du logement<input value={propertyName} onChange={event => setPropertyName(event.target.value)} placeholder="Ex. Studio 6" required /></label>
        <PrimaryButton type="submit" disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer le logement'}</PrimaryButton>
      </form>}
      {multiOpen && <section className="rf-inline-form"><h2>Ajout rapide</h2><p className="rf-helper">Ajoutez jusqu’à 100 logements d’un coup à {selectedCity || 'la ville sélectionnée'}.</p><div className="rf-filter-pills" role="group" aria-label="Mode d’ajout rapide"><button type="button" aria-pressed={bulkMode === 'series'} className={bulkMode === 'series' ? 'is-active' : ''} onClick={() => setBulkMode('series')}>Créer une série</button><button type="button" aria-pressed={bulkMode === 'list'} className={bulkMode === 'list' ? 'is-active' : ''} onClick={() => setBulkMode('list')}>Coller des noms</button></div>{bulkMode === 'series' ? <><label className="rf-field" htmlFor="bulk-prefix">Nom de base<input id="bulk-prefix" value={bulkPrefix} onChange={event => setBulkPrefix(event.target.value)} placeholder="Appartement" maxLength={140} required /></label><div className="rf-two-fields"><label className="rf-field" htmlFor="bulk-count">Quantité<input id="bulk-count" type="number" min="1" max="100" value={bulkCount} onChange={event => setBulkCount(event.target.value)} required /></label><label className="rf-field" htmlFor="bulk-start">Numéro de départ<input id="bulk-start" type="number" min="1" value={bulkStart} onChange={event => setBulkStart(event.target.value)} required /></label></div><p className="rf-helper">Exemple : « Studio », quantité 40 → Studio 1 à Studio 40.</p></> : <label className="rf-field" htmlFor="bulk-names">Un nom par ligne<textarea id="bulk-names" value={bulkNames} onChange={event => setBulkNames(event.target.value)} rows={7} placeholder={'Studio A1\nStudio A2\nAppartement B1'} /></label>}<PrimaryButton disabled={saving || !selectedCity} onClick={addSeveral}>{saving ? 'Enregistrement…' : 'Enregistrer les logements'}</PrimaryButton></section>}
      <div className="rf-property-actions"><button className="rf-outline-button" type="button" onClick={() => { setFormOpen(current => !current); setMultiOpen(false); setNotice('') }}>+ Ajouter un logement</button><button className="rf-outline-button" type="button" onClick={() => { setMultiOpen(current => !current); setFormOpen(false); setNotice('') }}>+ Ajout rapide</button></div>
    </AppFrame>
  )
}

export function SummaryScreen() {
  const { properties, pendingPayments, paymentHistory, rentPeriods, isDemo, accountTimezone } = useRentFlow()
  const currentMonth = monthKeyInTimeZone(new Date(), accountTimezone)
  const previousMonth = shiftMonthKey(currentMonth, -1)
  const [selectedMonth, setSelectedMonth] = useState(currentMonth)
  useEffect(() => setSelectedMonth(currentMonth), [currentMonth])
  const selectedMonthDate = new Date(`${selectedMonth}-15T12:00:00Z`)
  const monthLabel = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(selectedMonthDate)
  const selectedMonthName = new Intl.DateTimeFormat('fr-FR', { month: 'long', timeZone: 'UTC' }).format(selectedMonthDate)
  const confirmedPayments = paymentHistory.filter(payment => payment.status === 'confirmed' && (payment.periodMonth?.slice(0, 7) === selectedMonth || (!payment.periodMonth && payment.date.toLocaleLowerCase('fr').includes(selectedMonthName))))
  const collected = confirmedPayments.reduce((total, payment) => total + payment.amount, 0)
  const monthPeriods = rentPeriods.filter(period => period.month.slice(0, 7) === selectedMonth)
  const billablePeriods = monthPeriods.filter(period => period.status !== 'cancelled')
  const expected = billablePeriods.reduce((total, period) => total + period.amount, 0)
    + (isDemo && !monthPeriods.length ? properties.filter(property => property.occupied).reduce((total, property) => total + property.rent, 0) : 0)
  const outstandingPeriods = billablePeriods.filter(period => period.status !== 'paid')
  const outstanding = monthPeriods.length
    ? outstandingPeriods.reduce((total, period) => total + period.amount, 0)
    : isDemo ? Math.max(0, expected - collected) : 0
  const pendingForMonth = pendingPayments.filter(payment => payment.periodMonth?.slice(0, 7) === selectedMonth)
  const methodTotals = confirmedPayments.reduce<Record<string, number>>((totals, payment) => ({ ...totals, [payment.method]: (totals[payment.method] ?? 0) + 1 }), {})
  const paymentCount = Object.values(methodTotals).reduce((total, count) => total + count, 0)
  const paymentMethods = Object.entries(methodTotals)

  return (
    <AppFrame>
      <PageDate>{isDemo ? 'Synthèse du mois · Démo' : 'Synthèse du mois'}</PageDate>
      <h1 className="rf-page-heading">{monthLabel}</h1>
      <label className="rf-field rf-summary-month" htmlFor="summary-month">Période<select id="summary-month" value={selectedMonth} onChange={event => setSelectedMonth(event.target.value)}><option value={currentMonth}>{new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${currentMonth}-15T12:00:00Z`))}</option><option value={previousMonth}>{new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${previousMonth}-15T12:00:00Z`))}</option></select></label>
      <section className="rf-revenue-card rf-summary-revenue"><span>{isDemo ? 'Loyers marqués confirmés · démo' : 'Loyers confirmés'}</span><strong><Money amount={collected} /></strong><small>sur <Money amount={expected} /> attendus · {paymentCount} confirmation{paymentCount > 1 ? 's' : ''} · {pendingForMonth.length} à vérifier</small></section>
      <section className="rf-white-card rf-breakdown">
        <h2>Par mode de paiement</h2>
        {paymentCount ? <><div className="rf-payment-bar" aria-label={`Répartition de ${paymentCount} confirmations de démonstration`}>{paymentMethods.map(([method, count]) => <span key={method} style={{ width: `${(count / paymentCount) * 100}%` }} />)}</div><p>{paymentMethods.map(([method, count]) => `${method} ${count}`).join(' · ')}</p></> : <p>Aucune confirmation de démo pour cette période.</p>}
      </section>
      <section className="rf-white-card rf-unpaid-card">
        <h2>Reste à suivre</h2>
        <div className="rf-summary-row"><b>Loyers non confirmés</b><b>{format(outstanding)} FCFA</b><span>{isDemo ? Math.max(0, properties.filter(property => property.occupied).length - paymentCount) : outstandingPeriods.length} logement{(isDemo ? Math.max(0, properties.filter(property => property.occupied).length - paymentCount) : outstandingPeriods.length) === 1 ? '' : 's'}</span></div>
        {pendingForMonth.map(payment => <div className="rf-summary-row" key={payment.id}><b>{payment.unit} · {payment.tenant}</b><b>{format(payment.amount)}</b><span className="rf-status-pending">À vérifier</span></div>)}
      </section>
      <p className="rf-helper">{isDemo ? 'Les données fictives de cette session disparaissent au rechargement.' : 'La synthèse est calculée à partir des échéances et paiements enregistrés.'}</p>
      <button className="rf-primary-button rf-full-button rf-summary-export" type="button" onClick={() => window.print()}>Imprimer / enregistrer en PDF</button>
    </AppFrame>
  )
}

export function PendingPaymentsScreen() {
  const { pendingPayments, rentPeriods, setSelectedPayment, registerCashRentPayment, isDemo, accountTimezone } = useRentFlow()
  const router = useRouter()
  const [cashOpen, setCashOpen] = useState(false)
  const [cashName, setCashName] = useState('')
  const [cashAmount, setCashAmount] = useState('')
  const [cashPeriodId, setCashPeriodId] = useState('')
  const [cashDate, setCashDate] = useState(() => localISODate(new Date(), accountTimezone))
  const [notice, setNotice] = useState('')
  const [cashBusy, setCashBusy] = useState(false)
  const cashEligiblePeriods = rentPeriods.filter(period => !['paid', 'cancelled', 'awaiting_confirmation'].includes(period.status))
  useEffect(() => {
    if (!cashOpen) setCashDate(localISODate(new Date(), accountTimezone))
  }, [accountTimezone, cashOpen])

  async function registerCash(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isDemo) {
      setNotice(`Note de démonstration : vérifiez le paiement de ${format(Number(cashAmount))} FCFA déclaré par ${cashName}. Rien n’a été enregistré.`)
      setCashOpen(false)
      return
    }
    if (!cashPeriodId) return
    setCashBusy(true)
    setNotice('')
    try {
      await registerCashRentPayment(cashPeriodId, cashDate)
      setNotice('Paiement en espèces enregistré et confirmé. La quittance est disponible.')
      setCashOpen(false)
      setCashPeriodId('')
    } catch {
      setNotice('Le paiement en espèces n’a pas pu être enregistré. Vérifiez que cette échéance n’est pas déjà payée ou en attente.')
    } finally {
      setCashBusy(false)
    }
  }

  return (
    <AppFrame>
      <PageDate />
      <h1 className="rf-page-heading">À confirmer <span className="rf-count-pill">{pendingPayments.length}</span></h1>
      <p className="rf-subtitle">Vérifiez votre Mobile Money avant de confirmer.</p>
      <section className="rf-pending-list">
        {pendingPayments.length ? pendingPayments.map(payment => (
          <article className="rf-white-card rf-pending-payment" key={payment.id}>
            <div className="rf-pending-info"><span className="rf-unit-code rf-code-amber">{payment.id}</span><span className="rf-row-main"><b>{payment.unit} · {payment.tenant}</b><small>{payment.method} · {payment.declaredAt}</small></span><strong>{format(payment.amount)}</strong></div>
            <div className="rf-pending-actions rf-pending-actions-priority"><button type="button" className="rf-primary-button" onClick={() => { setSelectedPayment(payment); router.push(`/confirmer-paiement?paymentId=${encodeURIComponent(payment.id)}`) }}>Confirmer</button><button type="button" className="rf-danger-button" onClick={() => { setSelectedPayment(payment); router.push(`/confirmer-paiement?paymentId=${encodeURIComponent(payment.id)}`) }}>Examiner / refuser</button></div>
          </article>
        )) : <section className="rf-white-card rf-empty-state"><Check /><h2>Tout est à jour</h2><p>Aucun paiement à vérifier.</p></section>}
      </section>
      <h2 className="rf-section-heading">Paiement en espèces</h2>
      <button className="rf-outline-button rf-full-button rf-cash-trigger" type="button" onClick={() => setCashOpen(current => !current)}>{isDemo ? 'Prévisualiser une note d’espèces' : 'Enregistrer un paiement reçu en espèces'}</button>
      <p className="rf-helper">Confirmez seulement après avoir reçu et vérifié le montant.</p>
      {notice && <p className="rf-inline-notice" role="status">{notice}</p>}
      {cashOpen && <form className="rf-inline-form" onSubmit={registerCash}>{isDemo ? <><label className="rf-field">Nom du locataire<input value={cashName} onChange={event => setCashName(event.target.value)} required placeholder="Ex. Mme Mballa" /></label><label className="rf-field">Montant (FCFA)<input type="number" inputMode="numeric" min="1" value={cashAmount} onChange={event => setCashAmount(event.target.value)} required placeholder="25 000" /></label></> : <><label className="rf-field" htmlFor="cash-rent-period">Loyer concerné<select id="cash-rent-period" value={cashPeriodId} onChange={event => setCashPeriodId(event.target.value)} required><option value="">Choisir une échéance</option>{cashEligiblePeriods.map(period => <option key={period.id} value={period.id}>{period.tenant} · {period.unit} · {format(period.amount)} FCFA · {period.month.slice(0, 7)}</option>)}</select></label><label className="rf-field" htmlFor="cash-paid-date">Date de réception<input id="cash-paid-date" type="date" value={cashDate} onChange={event => setCashDate(event.target.value)} required /></label></> }<PrimaryButton type="submit" disabled={cashBusy || (!isDemo && !cashEligiblePeriods.length)}>{cashBusy ? 'Enregistrement…' : isDemo ? 'Prévisualiser la note' : 'Confirmer le paiement reçu'}</PrimaryButton>{!isDemo && !cashEligiblePeriods.length && <p className="rf-helper">Aucune échéance disponible pour saisir des espèces.</p>}</form>}
    </AppFrame>
  )
}
