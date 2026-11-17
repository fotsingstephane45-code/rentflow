'use client'

import { useEffect, useMemo, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight, Building2, FileText, Search, Users, Wallet } from 'lucide-react'
import { useRentFlow, type Payment } from '@/components/rentflow-mobile/state'
import { AppFrame, Money, PageDate, PrimaryButton } from '@/components/rentflow-mobile/ui'
import { createClient } from '@/lib/supabase/client'

const paymentStatusLabel: Record<Payment['status'], string> = {
  pending: 'À vérifier',
  confirmed: 'Confirmé',
  rejected: 'Refusé dans la démo',
  cancelled: 'Annulé',
}

export function OwnerTenantsScreen() {
  const { properties, isDemo } = useRentFlow()
  const [query, setQuery] = useState('')
  const tenants = properties.filter(property => property.occupied && property.tenant !== 'Aucun locataire')
  const visibleTenants = tenants.filter(property => `${property.tenant} ${property.name} ${property.building}`.toLocaleLowerCase('fr').includes(query.toLocaleLowerCase('fr')))

  return (
    <AppFrame>
      <PageDate>{isDemo ? 'Gestion locative · Démo' : 'Gestion locative'}</PageDate>
      <h1 className="rf-page-heading">Mes locataires</h1>
      <p className="rf-subtitle">Locataires associés à vos logements occupés.</p>
      <label className="rf-search-field"><Search aria-hidden="true" /><span className="rf-sr-status">Rechercher un locataire</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Nom, logement ou immeuble" /></label>
      {visibleTenants.length ? <section className="rf-white-card rf-history-list">{visibleTenants.map(property => <article className="rf-history-row" key={property.id}><span className="rf-unit-code rf-code-green"><Users aria-hidden="true" /></span><span className="rf-row-main"><b>{property.tenant.split(' · ')[0]}</b><small>{property.name} · {property.building}</small></span><span className="rf-row-amount"><b><Money amount={property.rent} compact /></b><small>par mois</small></span></article>)}</section> : <section className="rf-white-card rf-empty-state"><Users aria-hidden="true" /><h2>Aucun résultat</h2><p>Essayez un autre nom ou logement.</p></section>}
      <Link className="rf-primary-button rf-full-button" href="/nouveau-locataire">Ajouter un locataire <ArrowRight aria-hidden="true" /></Link>
      {isDemo && <p className="rf-helper">Les changements ne sont conservés que pendant cette démonstration.</p>}
    </AppFrame>
  )
}

export function OwnerPaymentsScreen() {
  const { pendingPayments, paymentHistory, setSelectedPayment, isDemo } = useRentFlow()
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('Tous')
  const payments = useMemo(() => [...pendingPayments, ...paymentHistory]
    .filter(payment => `${payment.tenant} ${payment.unit} ${payment.method} ${payment.reference ?? ''}`.toLocaleLowerCase('fr').includes(query.toLocaleLowerCase('fr')))
    .filter(payment => statusFilter === 'Tous' || payment.status === statusFilter), [paymentHistory, pendingPayments, query, statusFilter])

  return (
    <AppFrame>
      <PageDate>{new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(new Date())}{isDemo ? ' · Démo' : ''}</PageDate>
      <h1 className="rf-page-heading">Suivi des paiements</h1>
      <p className="rf-subtitle">Aucune déclaration ne signifie qu’un transfert a réellement eu lieu.</p>
      <label className="rf-search-field"><Search aria-hidden="true" /><span className="rf-sr-status">Rechercher un paiement</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Locataire, logement, mode ou référence" /></label>
      <div className="rf-filter-pills" role="group" aria-label="Filtrer par statut">
        {[['Tous', 'Tous'], ['pending', 'À vérifier'], ['confirmed', 'Confirmés'], ['rejected', 'Refusés']].map(([value, label]) => <button key={value} type="button" aria-pressed={statusFilter === value} className={statusFilter === value ? 'is-active' : ''} onClick={() => setStatusFilter(value)}>{label}</button>)}
      </div>
      {payments.length ? <section className="rf-white-card rf-history-list">{payments.map(payment => <article className="rf-history-row" key={payment.id}><span className={`rf-unit-code ${payment.status === 'pending' ? 'rf-code-amber' : payment.status === 'confirmed' ? 'rf-code-green' : 'rf-code-red'}`}><Wallet aria-hidden="true" /></span><span className="rf-row-main"><b>{payment.tenant} · {payment.unit}</b><small>{payment.method} · {payment.date}{payment.reference ? ` · ${payment.reference}` : ''}</small></span><span className="rf-row-amount"><b><Money amount={payment.amount} compact /></b><small>{paymentStatusLabel[payment.status]}</small></span>{payment.status === 'pending' && <button className="rf-send-round" type="button" aria-label={`Examiner le paiement de ${payment.tenant}`} onClick={() => { setSelectedPayment(payment); router.push(`/confirmer-paiement?paymentId=${encodeURIComponent(payment.id)}`) }}><ArrowRight aria-hidden="true" /></button>}</article>)}</section> : <section className="rf-white-card rf-empty-state"><Wallet aria-hidden="true" /><h2>Aucun paiement trouvé</h2><p>Les filtres de recherche s’appliquent aux données de votre compte.</p></section>}
      <Link className="rf-outline-button rf-full-button" href="/paiements-a-confirmer">Ouvrir les déclarations à vérifier</Link>
    </AppFrame>
  )
}

export function OwnerReceiptsScreen() {
  const { receipts, setSelectedReceipt, isDemo } = useRentFlow()

  return (
    <AppFrame>
      <PageDate>{isDemo ? 'Documents de démonstration' : 'Documents enregistrés'}</PageDate>
      <h1 className="rf-page-heading">Quittances</h1>
      <p className="rf-subtitle">Quittances émises après confirmation manuelle d’un paiement.</p>
      {receipts.length ? <section className="rf-white-card rf-history-list">{receipts.map(receipt => <article className="rf-history-row" key={receipt.number}><span className="rf-unit-code rf-code-green"><FileText aria-hidden="true" /></span><span className="rf-row-main"><b>{receipt.tenant} · {receipt.unit}</b><small>{receipt.number} · {receipt.month}</small></span><span className="rf-row-amount"><b><Money amount={receipt.amount} compact /></b><small>{isDemo ? 'Démo' : 'Émise'}</small></span><Link className="rf-rent-button" href={`/quittance?number=${encodeURIComponent(receipt.number)}`} onClick={() => setSelectedReceipt(receipt)}>Ouvrir</Link></article>)}</section> : <section className="rf-white-card rf-empty-state"><FileText aria-hidden="true" /><h2>Aucune quittance disponible</h2><p>Une quittance apparaît après confirmation d’un paiement.</p></section>}
    </AppFrame>
  )
}

export function OwnerProfileScreen() {
  const router = useRouter()
  const [notice, setNotice] = useState('')
  const [profile, setProfile] = useState<{ full_name: string; email: string; phone: string; account_kind: string; orange_money_phone: string; mtn_momo_phone: string } | null>(null)
  const [unitCount, setUnitCount] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let active = true
    async function loadProfile() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const [{ data }, { count }] = await Promise.all([
        supabase.from('profiles').select('full_name,email,phone,account_kind,orange_money_phone,mtn_momo_phone').eq('user_id', user.id).maybeSingle(),
        supabase.from('units').select('id', { count: 'exact', head: true }).is('archived_at', null),
      ])
      if (!active) return
      setProfile(data ?? { full_name: '', email: user.email ?? '', phone: '', account_kind: 'owner', orange_money_phone: '', mtn_momo_phone: '' })
      setUnitCount(count ?? 0)
    }
    loadProfile().catch(() => setNotice('Impossible de charger le profil depuis Supabase.'))
    return () => { active = false }
  }, [])

  async function signOut() {
    const { error } = await createClient().auth.signOut()
    if (error) {
      setNotice('La déconnexion a échoué. Réessayez.')
      return
    }
    router.replace('/connexion')
    router.refresh()
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!profile) return
    const values = new FormData(event.currentTarget)
    const changes = {
      full_name: String(values.get('profile-name')).trim(),
      phone: String(values.get('profile-phone')).trim(),
      orange_money_phone: String(values.get('profile-orange')).trim(),
      mtn_momo_phone: String(values.get('profile-mtn')).trim(),
    }
    setSaving(true)
    setNotice('')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setSaving(false)
      setNotice('Votre session a expiré. Reconnectez-vous puis réessayez.')
      return
    }
    const { error } = await supabase.from('profiles').update(changes).eq('user_id', user.id)
    setSaving(false)
    if (error) {
      setNotice('Le profil n’a pas pu être enregistré. Vérifiez la connexion puis réessayez.')
      return
    }
    setProfile({ ...profile, ...changes })
    setNotice('Profil enregistré.')
  }

  return (
    <AppFrame showTabs={false}>
      <PageDate>Mon compte</PageDate>
      <h1 className="rf-page-heading">Mon espace</h1>
      <p className="rf-subtitle">Informations de votre compte RentFlow.</p>
      <section className="rf-white-card rf-tenant-property"><form key={profile?.email ?? 'profile-loading'} className="rf-form" onSubmit={saveProfile}>
        <label className="rf-field" htmlFor="profile-name">Nom<input id="profile-name" name="profile-name" defaultValue={profile?.full_name ?? ''} required /></label>
        <div className="rf-detail-row"><span>E-mail</span><b>{profile?.email || '—'}</b></div>
        <label className="rf-field" htmlFor="profile-phone">Téléphone<input id="profile-phone" name="profile-phone" type="tel" defaultValue={profile?.phone ?? ''} required /></label>
        <div className="rf-detail-row"><span>Type de compte</span><b>{profile?.account_kind === 'agent' ? 'Agent immobilier' : 'Propriétaire'}</b></div>
        <label className="rf-field" htmlFor="profile-orange">Numéro Orange Money<input id="profile-orange" name="profile-orange" type="tel" defaultValue={profile?.orange_money_phone ?? ''} /></label>
        <label className="rf-field" htmlFor="profile-mtn">Numéro MTN MoMo<input id="profile-mtn" name="profile-mtn" type="tel" defaultValue={profile?.mtn_momo_phone ?? ''} /></label>
        <div className="rf-detail-row"><span>Logements enregistrés</span><b>{unitCount ?? '…'}</b></div>
        <PrimaryButton className="rf-full-button" type="submit" disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer le profil'}</PrimaryButton>
      </form></section>
      <p className="rf-demo-account-note" role="note">Votre profil est enregistré dans Supabase. Les logements et paiements de votre compte sont chargés depuis la base.</p>
      <div className="rf-demo-route-links"><Link href="/proprietaire/locataires">Gérer les locataires <ArrowRight aria-hidden="true" /></Link><Link href="/proprietaire/paiements">Voir les paiements <ArrowRight aria-hidden="true" /></Link><Link href="/forfaits">Consulter les forfaits <ArrowRight aria-hidden="true" /></Link></div>
      <button className="rf-outline-button rf-full-button" type="button" onClick={signOut}>Se déconnecter</button>
      {notice && <p className="rf-inline-notice" role="status">{notice}</p>}
    </AppFrame>
  )
}

export function PropertyDetailsScreen({ propertyId }: { propertyId: string }) {
  const { properties, updateProperty, endLease, isDemo } = useRentFlow()
  const property = properties.find(item => item.id === propertyId)
  const [editing, setEditing] = useState(false)
  const [building, setBuilding] = useState('')
  const [name, setName] = useState('')
  const [rent, setRent] = useState('')
  const [notice, setNotice] = useState('')
  const [endLeaseConfirm, setEndLeaseConfirm] = useState(false)
  const [endingLease, setEndingLease] = useState(false)

  function beginEditing() {
    if (!property) return
    setBuilding(property.building)
    setName(property.name)
    setRent(String(property.rent))
    setNotice('')
    setEditing(true)
  }

  async function saveChanges(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!await updateProperty(propertyId, { building, name, rent: Number(rent) })) {
      setNotice('Vérifiez le nom, l’immeuble et le montant. Un nom de logement doit rester unique; le loyer d’un logement occupé doit être supérieur à 0 FCFA.')
      return
    }
    setEditing(false)
    setNotice(property?.occupied ? 'Modifications enregistrées. Le nouveau loyer s’appliquera dès le mois prochain ; les échéances déjà générées conservent leur montant.' : 'Modifications enregistrées.')
  }

  async function finishLease() {
    setEndingLease(true)
    const ended = await endLease(propertyId)
    setEndingLease(false)
    setEndLeaseConfirm(false)
    setNotice(ended
      ? 'Bail terminé. Les échéances déjà dues et les paiements confirmés sont conservés; les échéances futures sont annulées.'
      : 'Le bail n’a pas pu être terminé. Vérifiez d’abord les paiements en attente de confirmation, puis réessayez.')
  }

  return (
    <AppFrame>
      <PageDate>{isDemo ? 'Détail du logement · Démo' : 'Détail du logement'}</PageDate>
      {property ? <><h1 className="rf-page-heading">{property.name}</h1><p className="rf-subtitle">{property.building} · {property.city}</p><section className="rf-white-card rf-tenant-property">{editing ? <form className="rf-inline-form" onSubmit={saveChanges}><label className="rf-field" htmlFor="property-building">Nom de l’immeuble<input id="property-building" value={building} onChange={event => setBuilding(event.target.value)} required maxLength={80} /></label><label className="rf-field" htmlFor="property-name">Nom du logement<input id="property-name" value={name} onChange={event => setName(event.target.value)} required maxLength={80} /></label><label className="rf-field" htmlFor="property-rent">Loyer mensuel (FCFA)<input id="property-rent" type="number" inputMode="numeric" min="0" step="1" value={rent} onChange={event => setRent(event.target.value)} required /></label><PrimaryButton className="rf-full-button" type="submit">Enregistrer les modifications</PrimaryButton><button className="rf-outline-button rf-full-button" type="button" onClick={() => { setEditing(false); setNotice('') }}>Annuler</button></form> : <><div className="rf-detail-row"><span>Statut</span><b>{property.occupied ? 'Occupé' : 'Libre'}</b></div><div className="rf-detail-row"><span>Locataire</span><b>{property.tenant}</b></div><div className="rf-detail-row"><span>Loyer mensuel</span><b><Money amount={property.rent} /></b></div>{property.nextRent && property.nextRentFrom && <div className="rf-detail-row"><span>Nouveau loyer dès {new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(new Date(`${property.nextRentFrom}T12:00:00`))}</span><b><Money amount={property.nextRent} /></b></div>}{property.occupied && <div className="rf-detail-row"><span>Jour d’échéance</span><b>Le {property.dueDay ?? 15} de chaque mois</b></div>}{property.leaseStart && <div className="rf-detail-row"><span>Début du bail</span><b>{property.leaseStart}</b></div>}<div className="rf-detail-row"><span>Paiements confirmés</span><b>{property.confirmedPaymentCount}</b></div><button className="rf-outline-button rf-full-button" type="button" onClick={beginEditing}>Modifier le logement et le loyer</button>{property.occupied && <button className="rf-outline-button rf-full-button" type="button" onClick={() => { setEndLeaseConfirm(value => !value); setNotice('') }}>Terminer le bail</button>}{endLeaseConfirm && <div className="rf-inline-form" role="group" aria-label="Confirmer la fin du bail"><p className="rf-helper">Le bail prendra fin aujourd’hui. Les paiements confirmés et échéances déjà dues seront conservés; les échéances futures seront annulées.</p><PrimaryButton className="rf-full-button" disabled={endingLease} onClick={finishLease}>{endingLease ? 'Fin du bail…' : 'Confirmer la fin du bail'}</PrimaryButton><button className="rf-outline-button rf-full-button" type="button" disabled={endingLease} onClick={() => setEndLeaseConfirm(false)}>Garder le bail</button></div>}</>}{notice && <p className="rf-inline-notice" role="status">{notice}</p>}</section>{!property.occupied && <Link className="rf-primary-button rf-full-button" href={`/nouveau-locataire?unitId=${encodeURIComponent(property.id)}`}>Ajouter un locataire <ArrowRight aria-hidden="true" /></Link>}</> : <section className="rf-white-card rf-empty-state"><Building2 aria-hidden="true" /><h2>Logement introuvable</h2><p>Ce logement n’existe plus ou n’est pas accessible avec ce compte.</p></section>}
      <Link className="rf-outline-button rf-full-button" href="/logements">Retour aux logements</Link>
    </AppFrame>
  )
}
