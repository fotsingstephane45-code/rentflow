'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Check, ChevronRight } from 'lucide-react'
import { AppFrame, BackTitle } from '@/components/rentflow-mobile/ui'
import { useRentFlow } from '@/components/rentflow-mobile/state'
import { createClient } from '@/lib/supabase/client'

export function ForfaitsScreen() {
  const { isDemo } = useRentFlow()
  const [trial, setTrial] = useState<{ status: string; trial_ends_at: string; current_period_ends_at: string | null } | null>(null)
  const [subscriptionError, setSubscriptionError] = useState('')
  const [plans, setPlans] = useState<{ id: string; code: string; name: string; max_occupied_units: number | null; monthly_price: number | null; currency: string }[]>([])
  const [plansError, setPlansError] = useState('')
  useEffect(() => {
    let active = true
    const client = createClient()
    Promise.resolve(client.from('subscription_plans').select('id,code,name,max_occupied_units,monthly_price,currency').eq('enabled', true).order('display_order').then(({ data, error }) => {
      if (!active) return
      if (error) setPlansError('Les forfaits ne peuvent pas être chargés pour le moment.')
      else setPlans(data ?? [])
    })).catch(() => { if (active) setPlansError('Les forfaits ne peuvent pas être chargés pour le moment.') })
    if (!isDemo) Promise.resolve(client.from('subscriptions').select('status,trial_ends_at,current_period_ends_at').maybeSingle().then(({ data, error }) => {
      if (!active) return
      if (error) setSubscriptionError('Impossible de lire le statut de votre compte. Réessayez ou contactez le support.')
      else if (data) setTrial(data)
    })).catch(() => { if (active) setSubscriptionError('Impossible de lire le statut de votre compte. Réessayez ou contactez le support.') })
    return () => { active = false }
  }, [isDemo])
  const trialEnd = trial?.trial_ends_at ? new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(trial.trial_ends_at)) : ''
  const trialExpired = trial?.status === 'trial' && new Date(trial.trial_ends_at).getTime() <= Date.now()
  const subscriptionExpired = trial?.status === 'active' && trial.current_period_ends_at && new Date(trial.current_period_ends_at).getTime() <= Date.now()

  return (
    <AppFrame showTabs={false}>
      <BackTitle href="/">Nos forfaits</BackTitle>
      <section className="rf-plan-intro">
        <span className="rf-trial-chip">Essai d’un mois prévu</span>
        <h2>Choisissez votre formule.</h2>
        <p>Le compte démarre avec un mois d’essai. Les forfaits publiés sont affichés ci-dessous.</p>
        {trial && <p role="status">Votre compte : {trialExpired || subscriptionExpired ? 'forfait arrivé à échéance · lecture seule' : trial.status === 'trial' ? `essai jusqu’au ${trialEnd}` : trial.status === 'read_only' ? 'lecture seule' : trial.status === 'active' ? 'abonnement actif' : trial.status}.</p>}
        {subscriptionError && <p role="alert">{subscriptionError}</p>}
      </section>
      <nav className="rf-plan-summary" aria-label="Résumé des forfaits">
        <Link href="#plan-gratuit"><span>Essai</span><strong>1 mois offert</strong></Link>
        {plans.map(plan => <Link href={`#plan-${encodeURIComponent(plan.code)}`} key={plan.id}><span>{plan.name}</span><strong>{plan.monthly_price === null ? 'Tarif à confirmer' : `${new Intl.NumberFormat('fr-FR').format(plan.monthly_price)} ${plan.currency} / mois`}</strong></Link>)}
      </nav>
      {plansError && <p className="rf-inline-notice" role="alert">{plansError}</p>}
      <div className="rf-plan-grid">
        <section className="rf-white-card rf-plan-card" id="plan-gratuit">
          <div className="rf-plan-card-top"><span className="rf-plan-icon"><Check aria-hidden="true" /></span><span className="rf-status-green">À l’inscription</span></div>
          <h3>Essai gratuit</h3>
          <p className="rf-plan-duration"><strong>1</strong><span>mois</span></p>
          <p>Le compte est créé avec un mois d’essai. Les données de gestion sont enregistrées dans votre espace sécurisé.</p>
          <ul>
            <li><Check aria-hidden="true" />Un mois d’essai à la création du compte</li>
            <li><Check aria-hidden="true" />Forfaits selon les logements occupés</li>
            <li><Check aria-hidden="true" />Aucune commission sur les loyers</li>
          </ul>
          <Link className="rf-plan-card-cta rf-plan-card-cta-primary" href="/inscription">Créer mon compte <ChevronRight aria-hidden="true" /></Link>
        </section>
        {plans.map(plan => <section className="rf-white-card rf-plan-card rf-plan-paid-card" id={`plan-${plan.code}`} key={plan.id}>
          <div className="rf-plan-card-top"><span className="rf-plan-icon"><Check aria-hidden="true" /></span><span className="rf-plan-pending">Forfait disponible</span></div>
          <h3>{plan.name}</h3>
          <p className="rf-plan-duration rf-plan-price-pending"><strong>{plan.monthly_price === null ? 'Tarif à confirmer' : new Intl.NumberFormat('fr-FR').format(plan.monthly_price)}</strong><span>{plan.monthly_price === null ? '' : `${plan.currency} / mois`}</span></p>
          <p>{plan.max_occupied_units === null ? 'Pour un nombre illimité de logements occupés.' : `Jusqu’à ${plan.max_occupied_units} logements occupés.`} L’activation est effectuée après validation du paiement hors application.</p>
          <Link className="rf-plan-card-cta rf-plan-card-cta-primary" href="/contact">Demander l’activation <ChevronRight aria-hidden="true" /></Link>
        </section>)}
        {!plans.length && !plansError && <section className="rf-white-card rf-plan-card rf-plan-paid-card" id="plan-payant">
          <div className="rf-plan-card-top"><span className="rf-plan-icon"><Check aria-hidden="true" /></span><span className="rf-plan-pending">En préparation</span></div>
          <h3>Forfait payant</h3><p>Les forfaits payants seront affichés ici dès publication du tarif et du nombre de logements inclus.</p>
          <button className="rf-plan-card-cta rf-plan-card-cta-muted" type="button" disabled>Pas encore publié</button>
        </section>}
      </div>
      <section className="rf-plan-info" aria-label="Informations sur les forfaits">
        <b>Pas de surprise</b>
        <p>RentFlow ne prélève aucun loyer. L’activation des forfaits se fait séparément de la gestion des paiements locatifs.</p>
      </section>
      <p className="rf-account-switch rf-plan-signin">Déjà inscrit ? <Link href="/connexion">Se connecter</Link></p>
      {isDemo && <p className="rf-demo-note">Connectez-vous pour consulter le forfait de votre compte.</p>}
    </AppFrame>
  )
}
