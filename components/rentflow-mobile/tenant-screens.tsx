'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ArrowRight, Building2, CalendarDays, FileText, ShieldCheck } from 'lucide-react'
import { getNextDueDate, useRentFlow } from '@/components/rentflow-mobile/state'
import { AppFrame, Money, PageDate } from '@/components/rentflow-mobile/ui'
import { createClient } from '@/lib/supabase/client'

function getTenantName(tenant: string) {
  return tenant.split(' · ')[0]
}

function getTenantPayments(pendingPayments: ReturnType<typeof useRentFlow>['pendingPayments'], paymentHistory: ReturnType<typeof useRentFlow>['paymentHistory'], propertyId: string) {
  return [...pendingPayments, ...paymentHistory].filter(payment => payment.propertyId === propertyId)
}

export function TenantDashboardScreen() {
  const { properties, pendingPayments, paymentHistory, tenantPropertyId } = useRentFlow()
  const property = properties.find(item => item.id === tenantPropertyId && item.occupied) ?? properties.find(item => item.occupied)
  const payments = property ? getTenantPayments(pendingPayments, paymentHistory, property.id) : []
  const latestPayment = payments[0]

  return (
    <AppFrame audience="tenant">
      <PageDate />
      <h1 className="rf-page-heading">Bonjour, {property ? getTenantName(property.tenant) : 'locataire'}</h1>
      <p className="rf-subtitle">Voici votre espace locataire de démonstration.</p>
      <section className="rf-white-card rf-tenant-property">
        <span className="rf-unit-code rf-code-green"><Building2 aria-hidden="true" /></span>
        <h2>{property?.name ?? 'Aucun logement associé'}</h2>
        <p>{property ? `${property.building} · ${property.city === 'Douala' ? 'Douala' : 'Yaoundé'}` : 'Aucun logement occupé dans cette démo.'}</p>
        <div className="rf-detail-row"><span>Propriétaire</span><b>M. Nkou · démo</b></div>
      </section>
      <section className="rf-tenant-amount"><span>Loyer mensuel</span><strong><Money amount={property?.rent ?? 0} /></strong></section>
      <section className="rf-white-card rf-tenant-property">
        <div className="rf-detail-row"><span><CalendarDays size={15} /> Prochaine échéance</span><b>{property ? getNextDueDate(property) : '—'}</b></div>
        <div className="rf-detail-row"><span>Statut de la dernière déclaration</span><b>{latestPayment ? latestPayment.status === 'pending' ? 'À vérifier' : latestPayment.status === 'confirmed' ? 'Confirmé dans la démo' : 'Refusé dans la démo' : 'Aucune déclaration'}</b></div>
      </section>
      <Link className="rf-primary-button rf-full-button" href="/paiement">Consulter mon loyer <ArrowRight aria-hidden="true" /></Link>
      <Link className="rf-outline-button rf-full-button" href="/locataire/historique">Voir mon historique</Link>
      <div className="rf-demo-route-links"><Link href="/locataire/profil">Mon profil de démonstration <ArrowRight aria-hidden="true" /></Link></div>
      <p className="rf-demo-account-note" role="note"><ShieldCheck aria-hidden="true" /> Ces informations sont fictives. Aucune session ni donnée de compte n’est active.</p>
    </AppFrame>
  )
}

export function TenantHistoryScreen({ token = '' }: { token?: string }) {
  const { pendingPayments, paymentHistory, tenantPropertyId } = useRentFlow()
  const [filter, setFilter] = useState('Tous')
  const [linkedPayment, setLinkedPayment] = useState<{ owner_name: string; unit_name: string; tenant_name: string; amount_due: number; due_on: string; period_month: string; status: string } | null>(null)
  const [linkError, setLinkError] = useState('')
  useEffect(() => {
    if (!token) return
    let active = true
    Promise.resolve(createClient().rpc('get_tenant_payment', { p_token: token }).then(({ data, error }) => {
      if (!active) return
      if (error || !data) setLinkError('Ce lien est invalide ou expiré.')
      else setLinkedPayment(data as typeof linkedPayment)
    })).catch(() => { if (active) setLinkError('Impossible de charger cet historique.') })
    return () => { active = false }
  }, [token])
  const payments = getTenantPayments(pendingPayments, paymentHistory, tenantPropertyId).filter(payment => filter === 'Tous' || payment.status === filter)

  if (!token) return <AppFrame audience="tenant" showTabs={false} demoMode={false}>
    <PageDate>Suivi du loyer</PageDate><h1 className="rf-page-heading">Mon paiement</h1>
    <section className="rf-white-card rf-empty-state"><ShieldCheck aria-hidden="true" /><h2>Lien personnel requis</h2><p>Ouvrez le lien sécurisé reçu de votre propriétaire pour consulter le statut de votre échéance.</p><Link className="rf-primary-button rf-full-button" href="/paiement">Ouvrir mon lien de paiement</Link></section>
  </AppFrame>

  if (token) {
    const statusLabel = linkedPayment?.status === 'paid' ? 'Confirmé par le propriétaire' : linkedPayment?.status === 'awaiting_confirmation' ? 'À vérifier par le propriétaire' : linkedPayment?.status === 'overdue' ? 'En retard' : 'À payer'
    return <AppFrame audience="tenant" showTabs={false} demoMode={false}>
      <PageDate>Suivi du loyer</PageDate><h1 className="rf-page-heading">Mon paiement</h1>
      {linkError && <p className="rf-inline-notice" role="alert">{linkError}</p>}
      {!linkedPayment && !linkError && <section className="rf-white-card rf-empty-state"><p>Chargement…</p></section>}
      {linkedPayment && <section className="rf-white-card rf-history-list"><article className="rf-history-row"><span className={`rf-unit-code ${linkedPayment.status === 'paid' ? 'rf-code-green' : 'rf-code-amber'}`}><FileText aria-hidden="true" /></span><span className="rf-row-main"><b>{linkedPayment.unit_name} · <Money amount={linkedPayment.amount_due} /></b><small>{new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(new Date(`${linkedPayment.period_month}T12:00:00`))} · échéance {new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${linkedPayment.due_on}T12:00:00`))}</small></span><span className={linkedPayment.status === 'paid' ? 'rf-status-green' : 'rf-status-pending'}>{statusLabel}</span></article></section>}
      {linkedPayment && <Link className="rf-outline-button rf-full-button" href={`/locataire/quittances?token=${encodeURIComponent(token)}`}>Consulter la quittance de ce loyer</Link>}
      <Link className="rf-primary-button rf-full-button" href={`/paiement?token=${encodeURIComponent(token)}`}>Retour aux détails du loyer</Link>
    </AppFrame>
  }

  return (
    <AppFrame audience="tenant">
      <PageDate>Historique de démonstration</PageDate>
      <h1 className="rf-page-heading">Mes paiements</h1>
      <p className="rf-subtitle">Les déclarations restent à vérifier jusqu’au contrôle du propriétaire.</p>
      <div className="rf-filter-pills" role="group" aria-label="Filtrer les paiements">
        {[['Tous', 'Tous'], ['pending', 'À vérifier'], ['confirmed', 'Confirmés'], ['rejected', 'Refusés']].map(([value, label]) => <button key={value} type="button" aria-pressed={filter === value} className={filter === value ? 'is-active' : ''} onClick={() => setFilter(value)}>{label}</button>)}
      </div>
      {payments.length ? <section className="rf-white-card rf-history-list">{payments.map(payment => <article className="rf-history-row" key={payment.id}><span className={`rf-unit-code ${payment.status === 'pending' ? 'rf-code-amber' : payment.status === 'confirmed' ? 'rf-code-green' : 'rf-code-red'}`}><FileText aria-hidden="true" /></span><span className="rf-row-main"><b>{payment.method} · <Money amount={payment.amount} /></b><small>{payment.date}{payment.rejectionReason ? ` · ${payment.rejectionReason}` : ''}</small></span><span className={payment.status === 'pending' ? 'rf-status-pending' : payment.status === 'confirmed' ? 'rf-status-green' : 'rf-status-rejected'}>{payment.status === 'pending' ? 'À vérifier' : payment.status === 'confirmed' ? 'Démo' : 'Refusé'}</span></article>)}</section> : <section className="rf-white-card rf-empty-state"><FileText aria-hidden="true" /><h2>Aucun paiement dans cette vue</h2><p>Les actions de démonstration ne sont pas conservées après rechargement.</p></section>}
      <Link className="rf-outline-button rf-full-button" href="/paiement">Déclarer un paiement de démo</Link>
    </AppFrame>
  )
}

export function TenantReceiptsScreen({ token = '' }: { token?: string }) {
  const { receipts, tenantPropertyId, setSelectedReceipt } = useRentFlow()
  const tenantReceipts = receipts.filter(receipt => receipt.propertyId === tenantPropertyId)
  const [linkedReceipt, setLinkedReceipt] = useState<any>(null)
  const [linkError, setLinkError] = useState('')
  const [loading, setLoading] = useState(Boolean(token))
  useEffect(() => {
    if (!token) return
    let active = true
    Promise.resolve(createClient().rpc('get_tenant_receipt', { p_token: token }).then(({ data, error }) => {
      if (!active) return
      setLinkedReceipt(data)
      if (error) setLinkError('La quittance ne peut pas être chargée. Vérifiez le lien ou demandez au propriétaire de le renouveler.')
      setLoading(false)
    })).catch(() => {
      if (active) { setLinkError('La quittance ne peut pas être chargée pour le moment.'); setLoading(false) }
    })
    return () => { active = false }
  }, [token])

  if (!token) return <AppFrame audience="tenant" showTabs={false} demoMode={false}>
    <PageDate>Quittance du loyer</PageDate><h1 className="rf-page-heading">Ma quittance</h1>
    <section className="rf-white-card rf-empty-state"><ShieldCheck aria-hidden="true" /><h2>Lien personnel requis</h2><p>Ouvrez le lien sécurisé reçu de votre propriétaire pour consulter la quittance liée à cette échéance.</p><Link className="rf-primary-button rf-full-button" href="/paiement">Ouvrir mon lien de paiement</Link></section>
  </AppFrame>

  if (token) return <AppFrame audience="tenant" showTabs={false} demoMode={false}>
    <PageDate>Quittance du loyer</PageDate><h1 className="rf-page-heading">Ma quittance</h1>
    {linkError && <p className="rf-inline-notice" role="alert">{linkError}</p>}
    {loading && <section className="rf-white-card rf-empty-state"><p>Chargement…</p></section>}
    {!loading && !linkedReceipt && !linkError && <section className="rf-white-card rf-empty-state"><FileText aria-hidden="true" /><h2>Pas encore de quittance</h2><p>Elle apparaîtra après confirmation du paiement par le propriétaire.</p></section>}
    {linkedReceipt && <><p className="rf-demo-receipt-stamp">{linkedReceipt.status === 'cancelled' ? 'QUITTANCE ANNULÉE' : 'QUITTANCE'}</p><section className="rf-white-card rf-receipt-card"><strong><Money amount={Number(linkedReceipt.amount)} /></strong><p>Loyer de {new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(new Date(`${linkedReceipt.period_month}T12:00:00`))}</p><div className="rf-detail-row"><span>N°</span><b>{linkedReceipt.receipt_number}</b></div><div className="rf-detail-row"><span>Propriétaire</span><b>{linkedReceipt.owner_name}</b></div><div className="rf-detail-row"><span>Locataire</span><b>{linkedReceipt.tenant_name}</b></div><div className="rf-detail-row"><span>Logement</span><b>{linkedReceipt.unit_name}</b></div><div className="rf-detail-row"><span>Date de paiement</span><b>{new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${linkedReceipt.paid_on}T12:00:00`))}</b></div><div className="rf-detail-row"><span>Mode déclaré</span><b>{linkedReceipt.method === 'orange_money' ? 'Orange Money' : linkedReceipt.method === 'mtn_momo' ? 'MTN MoMo' : 'Espèces'}</b></div></section><button className="rf-outline-button rf-full-button" type="button" onClick={() => window.print()}>Imprimer / enregistrer en PDF</button></>}
    <Link className="rf-primary-button rf-full-button" href={`/paiement?token=${encodeURIComponent(token)}`}>Retour au loyer</Link>
  </AppFrame>

  return (
    <AppFrame audience="tenant">
      <PageDate>Documents de démonstration</PageDate>
      <h1 className="rf-page-heading">Mes quittances</h1>
      <p className="rf-subtitle">Une quittance n’apparaît qu’après une confirmation manuelle dans la démo.</p>
      {tenantReceipts.length ? <section className="rf-white-card rf-history-list">{tenantReceipts.map(receipt => <article className="rf-history-row" key={receipt.number}><span className="rf-unit-code rf-code-green"><FileText aria-hidden="true" /></span><span className="rf-row-main"><b>{receipt.unit}</b><small>{receipt.number} · {receipt.month} · {receipt.method}</small></span><span className="rf-row-amount"><b><Money amount={receipt.amount} compact /></b><small>Démo</small></span><Link className="rf-rent-button" href="/quittance" onClick={() => setSelectedReceipt(receipt)}>Ouvrir</Link></article>)}</section> : <section className="rf-white-card rf-empty-state"><FileText aria-hidden="true" /><h2>Aucune quittance disponible</h2><p>Aucun paiement n’a été confirmé dans cette session de démonstration.</p></section>}
    </AppFrame>
  )
}

export function TenantProfileScreen() {
  const { properties, tenantPropertyId } = useRentFlow()
  const property = properties.find(item => item.id === tenantPropertyId && item.occupied) ?? properties.find(item => item.occupied)

  return (
    <AppFrame showTabs={false} audience="tenant">
      <PageDate>Profil de démonstration</PageDate>
      <h1 className="rf-page-heading">Mon profil</h1>
      <p className="rf-subtitle">Aucun compte réel n’est connecté.</p>
      <section className="rf-white-card rf-tenant-property"><div className="rf-detail-row"><span>Nom</span><b>{property ? getTenantName(property.tenant) : 'Non renseigné'} · exemple</b></div><div className="rf-detail-row"><span>Logement</span><b>{property?.name ?? 'Aucun logement'}</b></div><div className="rf-detail-row"><span>Contact</span><b>{property?.tenant.split(' · ')[1] ?? 'Non renseigné'}</b></div></section>
      <p className="rf-demo-account-note" role="note">La modification du profil nécessite un service de compte connecté. Rien n’est enregistré dans cette démo.</p>
      <div className="rf-demo-route-links"><Link href="/locataire/dashboard">Retour à mon espace <ArrowRight aria-hidden="true" /></Link><Link href="/connexion">Connexion indisponible en démo <ArrowRight aria-hidden="true" /></Link></div>
    </AppFrame>
  )
}
