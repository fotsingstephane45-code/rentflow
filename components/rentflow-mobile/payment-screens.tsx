'use client'

import { useEffect, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Check, Send } from 'lucide-react'
import { getNextDueDate, useRentFlow } from '@/components/rentflow-mobile/state'
import { AppFrame, BackTitle, Money, PrimaryButton } from '@/components/rentflow-mobile/ui'
import { createClient } from '@/lib/supabase/client'

type TenantPaymentInfo = {
  owner_name: string
  unit_name: string
  property_name: string
  tenant_name: string
  amount_due: number
  due_on: string
  period_month: string
  status: string
  orange_money_phone: string | null
  mtn_momo_phone: string | null
}

export function TenantPaymentScreen({ token = '' }: { token?: string }) {
  const { properties, tenantPropertyId, setTenantPropertyId, reportTenantPayment, isDemo } = useRentFlow()
  const occupiedProperties = properties.filter(property => property.occupied)
  const property = occupiedProperties.find(item => item.id === tenantPropertyId) ?? occupiedProperties[0]
  const [paymentReported, setPaymentReported] = useState(false)
  const [declarationOpen, setDeclarationOpen] = useState(false)
  const [method, setMethod] = useState('Orange Money')
  const [reference, setReference] = useState('')
  const [paymentDate, setPaymentDate] = useState(() => new Date(Date.now() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 10))
  const [tenantPayment, setTenantPayment] = useState<TenantPaymentInfo | null>(null)
  const [linkError, setLinkError] = useState(!token && !isDemo ? 'Ouvrez le lien personnel envoyé par le propriétaire pour consulter votre loyer.' : '')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!token) return
    let active = true
    Promise.resolve(createClient().rpc('get_tenant_payment', { p_token: token }).then(({ data, error }) => {
      if (!active) return
      if (error || !data) {
        setLinkError('Ce lien de paiement est invalide, expiré ou révoqué. Demandez un nouveau lien au propriétaire.')
        return
      }
      setTenantPayment(data as TenantPaymentInfo)
      setLinkError('')
    })).catch(() => {
      if (active) setLinkError('La page de paiement ne peut pas être chargée pour le moment.')
    })
    return () => { active = false }
  }, [token])


  async function submitDeclaration(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if ((!token && !isDemo) || (!token && !property)) return
    setSubmitting(true)
    try {
      await reportTenantPayment(token, { propertyId: property?.id ?? '', method, reference, paymentDate })
      setPaymentReported(true)
      setDeclarationOpen(false)
    } catch (error) {
      setLinkError(error instanceof Error && error.message.includes('already_declared')
        ? 'Un paiement a déjà été signalé pour cette échéance. Le propriétaire doit le vérifier.'
        : 'La déclaration n’a pas pu être envoyée. Vérifiez le lien puis réessayez.')
    } finally {
      setSubmitting(false)
    }
  }

  const dueAmount = tenantPayment?.amount_due ?? property?.rent ?? 0
  const ownerName = tenantPayment?.owner_name ?? 'M. Nkou'
  const monthName = tenantPayment?.period_month
    ? new Intl.DateTimeFormat('fr-FR', { month: 'long' }).format(new Date(`${tenantPayment.period_month}T12:00:00`))
    : 'novembre'
  const dueDate = tenantPayment?.due_on
    ? new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${tenantPayment.due_on}T12:00:00`))
    : property ? getNextDueDate(property) : '—'

  if (!token) return <AppFrame audience="tenant" showTabs={false} demoMode={false}>
    <BackTitle href="/">Paiement du loyer</BackTitle>
    <section className="rf-white-card rf-empty-state"><Check aria-hidden="true" /><h1>Votre lien personnel est nécessaire</h1><p>Demandez au propriétaire de vous envoyer le lien sécurisé de l’échéance. Il vous donnera accès au montant et aux moyens de paiement à jour.</p></section>
  </AppFrame>

  return (
    <AppFrame audience="tenant" showTabs={!token} demoMode={!token && isDemo}>
      <div className="rf-owner-line"><span className="rf-avatar">{ownerName.slice(0, 1).toUpperCase()}</span><b>De la part de {ownerName}</b></div>
      <h1 className="rf-page-heading rf-tenant-title">Loyer de {monthName}</h1>
      <p className="rf-subtitle">{tenantPayment ? `${tenantPayment.unit_name} · ${tenantPayment.tenant_name}` : property ? `${property.name} · ${property.tenant.split(' · ')[0]}` : 'Aucun logement occupé dans cette démo'}</p>
      {!token && occupiedProperties.length > 1 && <label className="rf-field" htmlFor="tenant-property-select">Logement de démonstration<select id="tenant-property-select" value={property?.id ?? ''} onChange={event => { setTenantPropertyId(event.target.value); setPaymentReported(false) }}>{occupiedProperties.map(item => <option value={item.id} key={item.id}>{item.name} · {item.tenant.split(' · ')[0]}</option>)}</select></label>}
      {linkError && <p className="rf-inline-notice" role="alert">{linkError}</p>}
      {token && !tenantPayment && !linkError && <section className="rf-white-card rf-empty-state"><p>Chargement du loyer…</p></section>}
      {((!token && isDemo) || tenantPayment) && <>
      <section className="rf-revenue-card rf-amount-due"><span>Montant à payer</span><strong><Money amount={dueAmount} /></strong><small className="rf-due-chip">Échéance : {dueDate}</small></section>
      <h2 className="rf-section-heading">Modes de paiement</h2>
      {!token && <p className="rf-demo-account-note" role="note">Page de démonstration : les numéros sont fictifs. N’effectuez aucun transfert.</p>}
      <section className="rf-payment-number rf-white-card"><span className="rf-provider-mark rf-orange" /><span><small>Orange Money{token ? '' : ' · exemple'}</small><b>{tenantPayment?.orange_money_phone || (token ? 'Non renseigné' : '69X XX XX XX')}</b></span>{!tenantPayment?.orange_money_phone && <span className="rf-number-masked">Masqué</span>}</section>
      <section className="rf-payment-number rf-white-card"><span className="rf-provider-mark rf-mtn" /><span><small>MTN MoMo{token ? '' : ' · exemple'}</small><b>{tenantPayment?.mtn_momo_phone || (token ? 'Non renseigné' : '67X XX XX XX')}</b></span>{!tenantPayment?.mtn_momo_phone && <span className="rf-number-masked">Masqué</span>}</section>
      <p className="rf-helper rf-payment-instructions">Payez directement le titulaire du compte. RentFlow ne traite aucun transfert.</p>
      {!token && !property && <p className="rf-inline-notice" role="status">Aucun logement occupé n’est disponible pour cette déclaration.</p>}
      {tenantPayment?.status === 'paid' && <p className="rf-inline-notice" role="status">Ce loyer a été confirmé par le propriétaire.</p>}
      {tenantPayment?.status === 'awaiting_confirmation' && <p className="rf-inline-notice" role="status">Votre déclaration a été reçue. Le propriétaire doit encore vérifier le paiement.</p>}
      {token && tenantPayment && <div className="rf-demo-route-links"><Link href={`/locataire/historique?token=${encodeURIComponent(token)}`}>Suivi de ce loyer</Link>{tenantPayment.status === 'paid' && <Link href={`/locataire/quittances?token=${encodeURIComponent(token)}`}>Ouvrir la quittance</Link>}</div>}
      {(token ? tenantPayment?.status === 'due' || tenantPayment?.status === 'overdue' : Boolean(property)) && !declarationOpen && !paymentReported && <PrimaryButton className="rf-full-button" onClick={() => setDeclarationOpen(true)}>J’ai payé</PrimaryButton>}
      {declarationOpen && <form className="rf-inline-form rf-declaration-form" onSubmit={submitDeclaration}>
        <h2>Déclarer un paiement{token ? '' : ' · démo'}</h2>
        <label className="rf-field" htmlFor="tenant-payment-method">Mode de paiement<select id="tenant-payment-method" value={method} onChange={event => setMethod(event.target.value)}><option>Orange Money</option><option>MTN MoMo</option><option>Espèces</option>{!token && <option>Virement bancaire</option>}</select></label>
        <label className="rf-field" htmlFor="tenant-payment-date">Date du paiement<input id="tenant-payment-date" type="date" value={paymentDate} onChange={event => setPaymentDate(event.target.value)} required /></label>
        {!token && <label className="rf-field" htmlFor="tenant-payment-reference">Référence de transaction<input id="tenant-payment-reference" value={reference} onChange={event => setReference(event.target.value)} placeholder="Facultatif" /></label>}
        <PrimaryButton className="rf-full-button" type="submit" disabled={submitting}>{submitting ? 'Envoi…' : 'Envoyer ma déclaration'}</PrimaryButton>
      </form>}
      {paymentReported && <p className="rf-inline-notice" role="status">Votre déclaration a été ajoutée. Elle reste à vérifier et ne prouve pas un transfert réel.</p>}
      <p className="rf-helper rf-centered">La déclaration reste « à vérifier » jusqu’au contrôle manuel du propriétaire.</p>
      </>}

    </AppFrame>
  )
}

export function ConfirmPaymentScreen({ paymentId }: { paymentId?: string }) {
  const { pendingPayments, paymentHistory, selectedPayment, setSelectedPayment, confirmSelectedPayment, rejectPayment, isDemo } = useRentFlow()
  const [reference, setReference] = useState(selectedPayment.reference ?? '')
  const [rejectionReason, setRejectionReason] = useState('')
  const [rejectOpen, setRejectOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const router = useRouter()
  const activePayment = pendingPayments.find(payment => payment.id === paymentId) ?? selectedPayment
  const isPending = pendingPayments.some(payment => payment.id === activePayment.id)
  const hasPayment = isDemo || [...pendingPayments, ...paymentHistory].some(payment => payment.id === activePayment.id)
  useEffect(() => {
    const payment = pendingPayments.find(item => item.id === paymentId)
    if (payment) {
      setSelectedPayment(payment)
      setReference(payment.reference ?? '')
    }
  }, [paymentId, pendingPayments, setSelectedPayment])

  async function confirm() {
    setBusy(true)
    setNotice('')
    try {
      await confirmSelectedPayment(reference)
      router.push('/quittance')
    } catch {
      setNotice('Le paiement n’a pas pu être confirmé. Actualisez la page puis réessayez.')
    } finally {
      setBusy(false)
    }
  }

  async function reject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setNotice('')
    try {
      await rejectPayment(activePayment.id, rejectionReason)
      router.push('/paiements-a-confirmer')
    } catch {
      setNotice('Le refus n’a pas pu être enregistré. Vérifiez le motif puis réessayez.')
    } finally {
      setBusy(false)
    }
  }

  if (!hasPayment) return <AppFrame showTabs={false}><BackTitle href="/paiements-a-confirmer">Vérifier la déclaration</BackTitle><section className="rf-white-card rf-empty-state"><h1>Déclaration introuvable</h1><p>Cette déclaration a peut-être déjà été traitée ou n’est pas accessible avec ce compte.</p><Link className="rf-primary-button rf-full-button" href="/paiements-a-confirmer">Retour aux paiements</Link></section></AppFrame>

  return (
    <AppFrame showTabs={false}>
      <BackTitle href="/paiements-a-confirmer">Vérifier la déclaration</BackTitle>
      <section className="rf-white-card rf-payment-review">
        <div className="rf-review-person"><span className="rf-unit-code rf-code-amber">{activePayment.id}</span><span className="rf-row-main"><b>{activePayment.unit}</b><small>{activePayment.tenant} déclare avoir payé</small></span></div>
        <strong className="rf-review-amount"><Money amount={activePayment.amount} /></strong>
        <div className="rf-detail-row"><span>Mode déclaré</span><b>{activePayment.method}</b></div>
        <div className="rf-detail-row"><span>Déclaré</span><b>{activePayment.declaredAt}</b></div>
        <div className="rf-detail-row"><span>Date indiquée</span><b>{activePayment.date}</b></div>
      </section>
      <aside className="rf-warning-card"><b>Déclaration non vérifiée</b><p>Contrôlez votre relevé Mobile Money ou l’espèce reçue avant de confirmer.</p></aside>
      <label className="rf-field" htmlFor="payment-reference">Référence vérifiée (facultatif)<input id="payment-reference" value={reference} onChange={event => setReference(event.target.value)} placeholder="Ex. référence reçue par SMS" /></label>
      {isPending ? <PrimaryButton className="rf-full-button" disabled={busy} onClick={confirm}>{busy ? 'Enregistrement…' : isDemo ? 'Marquer confirmé dans la démo' : 'Confirmer le paiement'}</PrimaryButton> : <p className="rf-inline-notice" role="status">Cette déclaration a déjà été traitée.</p>}
      {isPending && !rejectOpen && <button className="rf-danger-button rf-full-button" type="button" onClick={() => setRejectOpen(true)}>Refuser la déclaration</button>}
      {rejectOpen && <form className="rf-inline-form" onSubmit={reject}><label className="rf-field" htmlFor="payment-rejection-reason">Motif du refus<input id="payment-rejection-reason" value={rejectionReason} onChange={event => setRejectionReason(event.target.value)} required minLength={4} placeholder="Ex. transfert introuvable" /></label><PrimaryButton className="rf-full-button" type="submit" disabled={busy}>{busy ? 'Enregistrement…' : 'Enregistrer le refus'}</PrimaryButton><button className="rf-outline-button rf-full-button" type="button" onClick={() => setRejectOpen(false)}>Annuler</button></form>}
      {notice && <p className="rf-inline-notice" role="alert">{notice}</p>}
      {isDemo && <p className="rf-helper rf-centered">La confirmation et la quittance sont fictives dans cette démonstration.</p>}
    </AppFrame>
  )
}

export function ReceiptScreen({ receiptNumber = '' }: { receiptNumber?: string }) {
  const { selectedReceipt, receipts, isDemo } = useRentFlow()
  const lastReceipt = receiptNumber ? receipts.find(receipt => receipt.number === receiptNumber) ?? null : selectedReceipt
  const [notice, setNotice] = useState('')

  async function shareReceipt() {
    if (!lastReceipt) return
    const prefix = isDemo ? 'DÉMO NON VALABLE — ' : ''
    const message = `${prefix}Quittance n° ${lastReceipt.number} — ${new Intl.NumberFormat('fr-FR').format(lastReceipt.amount)} FCFA, loyer de ${lastReceipt.month}. Locataire : ${lastReceipt.tenant}.`
    try {
      if (navigator.share) await navigator.share({ title: 'Quittance RentFlow', text: message })
      else {
        await navigator.clipboard.writeText(message)
        setNotice('Quittance copiée. Vous pouvez la coller dans WhatsApp.')
      }
    } catch {
      setNotice('Partage annulé.')
    }
  }

  if (!lastReceipt) {
    return <AppFrame showTabs={false}><section className="rf-white-card rf-empty-state"><h1>Aucune quittance disponible</h1><p>Une quittance apparaît après confirmation d’un paiement.</p><a className="rf-outline-button rf-full-button" href="/paiements-a-confirmer">Voir les paiements à confirmer</a></section></AppFrame>
  }

  return (
    <AppFrame showTabs={false}>
      <section className="rf-receipt-success"><span><Check aria-hidden="true" /></span><h1>{isDemo ? 'Confirmation de démo' : 'Paiement confirmé'}</h1><p>Quittance n° {lastReceipt.number}</p></section>
      {isDemo && <p className="rf-demo-receipt-stamp">DOCUMENT FICTIF · NON VALABLE</p>}
      <section className="rf-white-card rf-receipt-card">
        <strong><Money amount={lastReceipt.amount} /></strong><p>Loyer de {lastReceipt.month}</p>
        <div className="rf-detail-row"><span>Propriétaire</span><b>{lastReceipt.owner}</b></div>
        <div className="rf-detail-row"><span>Locataire</span><b>{lastReceipt.tenant}</b></div>
        <div className="rf-detail-row"><span>Logement</span><b>{lastReceipt.unit}</b></div>
        <div className="rf-detail-row"><span>Date déclarée</span><b>{lastReceipt.paidOn}</b></div>
        <div className="rf-detail-row"><span>Mode déclaré</span><b>{lastReceipt.method}</b></div>
        {lastReceipt.reference && <div className="rf-detail-row"><span>Référence</span><b>{lastReceipt.reference}</b></div>}
      </section>
      <PrimaryButton className="rf-full-button rf-share-button" onClick={shareReceipt}><Send aria-hidden="true" />Partager le récapitulatif</PrimaryButton>
      <button className="rf-outline-button rf-full-button" type="button" onClick={() => window.print()}>Imprimer / enregistrer en PDF</button>
      {notice && <p className="rf-inline-notice" role="status">{notice}</p>}
    </AppFrame>
  )
}
