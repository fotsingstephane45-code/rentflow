'use client'

import { useEffect, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Building2, Eye, EyeOff } from 'lucide-react'
import { useRentFlow } from '@/components/rentflow-mobile/state'
import { AppFrame, BackTitle, FormField, PrimaryButton } from '@/components/rentflow-mobile/ui'
import { createClient } from '@/lib/supabase/client'
import { getSupabaseConfigError } from '@/lib/supabase/config'

function PasswordField({ id, label, show, onToggle, toggleable = true }: { id: string; label: string; show: boolean; onToggle: () => void; toggleable?: boolean }) {
  return <label className="rf-field" htmlFor={id}>{label}<span className="rf-password-control"><input id={id} name={id} type={show ? 'text' : 'password'} autoComplete={id.startsWith('login-') ? 'current-password' : 'new-password'} minLength={6} required placeholder="••••••" />{toggleable && <button type="button" aria-label={show ? 'Masquer le mot de passe' : 'Afficher le mot de passe'} onClick={onToggle}>{show ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}</button>}</span></label>
}

function getNextPath() {
  const next = new URLSearchParams(window.location.search).get('next')
  return next && next.startsWith('/') && !next.startsWith('//') ? next : '/espace-proprietaire'
}

function hasSecureAuthTransport() {
  return window.isSecureContext
}

const insecureAuthMessage = 'Connexion bloquée pour protéger vos identifiants. Sur cet ordinateur, ouvre http://localhost:3000 ; sur un autre appareil, utilise une adresse HTTPS.'

function getLoginErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : ''
  const normalized = message.toLowerCase().replace(/[_-]+/g, ' ')
  if (normalized.includes('email not confirmed')) {
    return 'Cette adresse n’est pas confirmée. Le projet Supabase demande encore cette vérification. Désactive « Confirm email » dans Authentication → Sign In / Providers → Email. Pour ce compte déjà créé, confirme-le dans Authentication → Users ou supprime-le et recrée-le après le changement.'
  }
  if (normalized.includes('invalid login credentials') || normalized.includes('invalid credentials')) return 'Adresse e-mail ou mot de passe incorrect.'
  if (normalized.includes('too many requests') || normalized.includes('rate limit')) return 'Trop de tentatives. Attends quelques minutes avant de réessayer.'
  return message || 'La connexion a échoué. Vérifie les informations puis réessaie.'
}

export function SignupScreen() {
  const [notice, setNotice] = useState('')
  const [confirmationEmail, setConfirmationEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [ready, setReady] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()

  useEffect(() => setReady(true), [])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!hasSecureAuthTransport()) {
      setNotice(insecureAuthMessage)
      return
    }
    const values = new FormData(event.currentTarget)
    const password = String(values.get('signup-password') ?? '')
    const passwordConfirm = String(values.get('signup-password-confirm') ?? '')
    if (password !== passwordConfirm) {
      setNotice('Les deux mots de passe ne correspondent pas.')
      return
    }
    const config = process.env.NEXT_PUBLIC_SUPABASE_URL && (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
    if (!config) {
      setNotice(getSupabaseConfigError())
      return
    }

    setBusy(true)
    setNotice('')
    try {
      const supabase = createClient()
      const origin = window.location.origin
      const email = String(values.get('signup-email')).trim().toLowerCase()
      const metadata = {
        full_name: String(values.get('signup-name')).trim(),
        phone: String(values.get('signup-phone')).trim(),
        account_kind: String(values.get('signup-role')) === 'agent' ? 'agent' : 'owner',
        orange_money_phone: String(values.get('orange-money')).trim(),
        mtn_momo_phone: String(values.get('mtn-momo')).trim(),
      }
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata,
          emailRedirectTo: `${origin}/auth/callback?next=/espace-proprietaire`,
        },
      })
      if (error) throw error

      if (data.session && data.user) {
        const { error: profileError } = await supabase.from('profiles').update(metadata).eq('user_id', data.user.id)
        if (profileError) throw new Error('Compte créé, mais le profil n’a pas pu être initialisé. Vérifiez que les scripts SQL ont bien été appliqués.')
        router.replace('/espace-proprietaire')
        router.refresh()
        return
      }

      setConfirmationEmail(email)
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'La création du compte a échoué. Réessayez.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AppFrame showTabs={false} demoMode={false}>
      <Link className="rf-trial-chip" href="/forfaits" aria-label="Consulter les forfaits Gratuit et Payant">Voir les forfaits Gratuit et Payant</Link>
      {confirmationEmail ? <section className="rf-white-card rf-auth-confirmation" role="status" aria-live="polite">
        <span className="rf-status-green">Connexion immédiate désactivée côté Supabase</span>
        <h1 className="rf-page-heading rf-account-heading">Confirmation e-mail requise</h1>
        <p className="rf-subtitle">Supabase demande encore une confirmation pour <strong>{confirmationEmail}</strong>. Pour activer l’inscription directe, désactive « Confirm email » dans Authentication → Sign In / Providers → Email. Ensuite, supprime ce compte de test ou confirme-le dans Authentication → Users, puis recrée-le ou reconnecte-toi.</p>
        <p className="rf-helper">Vous ne voyez pas le message ? Vérifiez le dossier courrier indésirable. Vous pourrez demander un nouveau lien depuis la page de connexion.</p>
        <Link className="rf-primary-button rf-full-button" href="/connexion">Continuer vers la connexion</Link>
        <Link className="rf-account-home-link" href="/">Retour à l’accueil</Link>
      </section> : <>
      <h1 className="rf-page-heading rf-account-heading">Créez votre compte</h1>
      <p className="rf-subtitle">Suivez vos loyers en un coup d’œil.</p>
      <form className="rf-form" method="post" action="/inscription" onSubmit={submit}>
        <FormField id="signup-name" label="Votre nom" placeholder="Ex. Jean Nkou" />
        <FormField id="signup-phone" label="Votre téléphone" type="tel" inputMode="tel" placeholder="6XX XX XX XX" />
        <FormField id="signup-email" label="E-mail (pour retrouver votre mot de passe)" type="email" inputMode="email" placeholder="nom@exemple.com" />
        <label className="rf-field" htmlFor="signup-role">Type de compte<select id="signup-role" name="signup-role" defaultValue="owner"><option value="owner">Propriétaire</option><option value="agent">Agent immobilier</option></select></label>
        <PasswordField id="signup-password" label="Mot de passe (6 caractères minimum)" show={showPassword} onToggle={() => setShowPassword(value => !value)} />
        <PasswordField id="signup-password-confirm" label="Confirmer le mot de passe" show={showPassword} onToggle={() => setShowPassword(value => !value)} />
        <h2 className="rf-form-section-title">Où vos locataires doivent payer</h2>
        <FormField id="orange-money" label="Numéro Orange Money" type="tel" inputMode="tel" placeholder="69X XX XX XX" required={false} />
        <FormField id="mtn-momo" label="Numéro MTN MoMo" type="tel" inputMode="tel" placeholder="67X XX XX XX" required={false} />
        <PrimaryButton className="rf-full-button" type="submit" disabled={busy || !ready}>{busy ? 'Création du compte…' : !ready ? 'Chargement sécurisé…' : 'Créer mon compte'}</PrimaryButton>
        <p className="rf-helper">Votre mot de passe est géré par Supabase Auth. Consultez notre <Link href="/confidentialite">politique de confidentialité</Link>.</p>
      </form>
      <p className="rf-account-switch">Vous avez déjà un compte ? <Link href="/connexion">Se connecter</Link></p>
      {notice && <p className="rf-inline-notice" role="status">{notice}</p>}
      </>}
    </AppFrame>
  )
}

export function LoginScreen() {
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [ready, setReady] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const currentUrl = new URL(window.location.href)
    const hadCredentialsInUrl = currentUrl.searchParams.has('login-email') || currentUrl.searchParams.has('login-password')
    if (hadCredentialsInUrl) {
      currentUrl.searchParams.delete('login-email')
      currentUrl.searchParams.delete('login-password')
      window.history.replaceState(window.history.state, '', `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`)
      setNotice('Les identifiants ont été retirés de l’adresse. Change le mot de passe exposé avant de te reconnecter.')
    }
    const error = currentUrl.searchParams.get('auth_error')
    if (!hadCredentialsInUrl && error === 'config') setNotice(getSupabaseConfigError())
    else if (!hadCredentialsInUrl && error === 'callback') setNotice('Le lien de confirmation ou de récupération est invalide ou expiré. Demandez un nouveau lien.')
    setReady(true)
  }, [])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!hasSecureAuthTransport()) {
      setNotice(insecureAuthMessage)
      return
    }
    const config = process.env.NEXT_PUBLIC_SUPABASE_URL && (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
    if (!config) {
      setNotice(getSupabaseConfigError())
      return
    }
    const values = new FormData(event.currentTarget)
    setBusy(true)
    setNotice('')
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithPassword({
        email: String(values.get('login-email')).trim().toLowerCase(),
        password: String(values.get('login-password')),
      })
      if (error) throw error
      router.replace(getNextPath())
      router.refresh()
    } catch (error) {
      setNotice(getLoginErrorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AppFrame showTabs={false} demoMode={false}>
      <section className="rf-login-promo"><span>Gestion des loyers</span><h1>Qui a payé ?<br />Qui doit ?</h1><p>Réponse en un coup d’œil.</p></section>
      <h2 className="rf-login-title">Bon retour</h2>
      <form className="rf-form rf-login-form" method="post" action="/connexion" onSubmit={submit}>
        <FormField id="login-email" label="Adresse e-mail" type="email" inputMode="email" placeholder="nom@exemple.com" />
        <PasswordField id="login-password" label="Mot de passe" show={showPassword} onToggle={() => setShowPassword(value => !value)} />
        <Link className="rf-forgot-link" href="/mot-de-passe-oublie">Mot de passe oublié ?</Link>
        <PrimaryButton className="rf-full-button" type="submit" disabled={busy || !ready}>{busy ? 'Connexion…' : !ready ? 'Chargement sécurisé…' : 'Se connecter'}</PrimaryButton>
      </form>
      <p className="rf-account-switch">Pas encore de compte ? <Link href="/inscription">Créer un compte</Link> · <Link href="/forfaits">Voir les forfaits</Link></p>
      {notice && <p className="rf-inline-notice" role="status">{notice}</p>}
    </AppFrame>
  )
}

export function PasswordRecoveryScreen({ reset = false }: { reset?: boolean }) {
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [ready, setReady] = useState(false)
  const router = useRouter()

  useEffect(() => setReady(true), [])

  async function requestReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!hasSecureAuthTransport()) {
      setNotice(insecureAuthMessage)
      return
    }
    const email = String(new FormData(event.currentTarget).get('recovery-email')).trim().toLowerCase()
    const config = process.env.NEXT_PUBLIC_SUPABASE_URL && (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
    if (!config) {
      setNotice(getSupabaseConfigError())
      return
    }
    setBusy(true)
    setNotice('')
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/reinitialiser-mot-de-passe`,
      })
      if (error) throw error
      setNotice('Si un compte correspond à cette adresse, un lien de réinitialisation vient de lui être envoyé.')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'La demande n’a pas pu être envoyée.')
    } finally {
      setBusy(false)
    }
  }

  async function savePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!hasSecureAuthTransport()) {
      setNotice(insecureAuthMessage)
      return
    }
    const values = new FormData(event.currentTarget)
    const password = String(values.get('new-password') ?? '')
    if (password !== values.get('new-password-confirm')) {
      setNotice('Les deux mots de passe ne correspondent pas.')
      return
    }
    const config = process.env.NEXT_PUBLIC_SUPABASE_URL && (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
    if (!config) {
      setNotice(getSupabaseConfigError())
      return
    }
    setBusy(true)
    setNotice('')
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      setNotice('Mot de passe modifié. Vous pouvez vous reconnecter.')
      setTimeout(() => router.replace('/connexion'), 1000)
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Le mot de passe n’a pas pu être modifié. Ouvrez à nouveau le lien reçu par e-mail.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AppFrame showTabs={false} demoMode={false}>
      <BackTitle href="/connexion">{reset ? 'Réinitialiser le mot de passe' : 'Mot de passe oublié'}</BackTitle>
      {reset ? <form className="rf-form" method="post" action="/reinitialiser-mot-de-passe" onSubmit={savePassword}>
        <p className="rf-subtitle">Choisissez un nouveau mot de passe d’au moins 6 caractères.</p>
        <PasswordField id="new-password" label="Nouveau mot de passe" show={false} onToggle={() => undefined} toggleable={false} />
        <PasswordField id="new-password-confirm" label="Confirmer le mot de passe" show={false} onToggle={() => undefined} toggleable={false} />
        <PrimaryButton className="rf-full-button" type="submit" disabled={busy || !ready}>{busy ? 'Enregistrement…' : !ready ? 'Chargement sécurisé…' : 'Enregistrer le mot de passe'}</PrimaryButton>
      </form> : <form className="rf-form" method="post" action="/mot-de-passe-oublie" onSubmit={requestReset}>
        <p className="rf-subtitle">Nous vous enverrons un lien si cette adresse est associée à un compte.</p>
        <FormField id="recovery-email" label="Adresse e-mail" type="email" inputMode="email" placeholder="nom@exemple.com" />
        <PrimaryButton className="rf-full-button" type="submit" disabled={busy || !ready}>{busy ? 'Envoi…' : !ready ? 'Chargement sécurisé…' : 'Envoyer le lien de récupération'}</PrimaryButton>
      </form>}
      {notice && <p className="rf-inline-notice" role="status">{notice}</p>}
      <Link className="rf-outline-button rf-full-button" href="/connexion">Retour à la connexion</Link>
    </AppFrame>
  )
}

export function NewLeaseScreen({ unitId }: { unitId?: string }) {
  const { properties, addLease } = useRentFlow()
  const router = useRouter()
  const vacantProperties = properties.filter(property => !property.occupied)
  const [selectedPropertyId, setSelectedPropertyId] = useState(unitId ?? '')
  const vacant = vacantProperties.find(property => property.id === selectedPropertyId) ?? vacantProperties[0]
  const [tenant, setTenant] = useState('')
  const [phone, setPhone] = useState('')
  const [rent, setRent] = useState('')
  const [dueDay, setDueDay] = useState('5')
  const [leaseStart, setLeaseStart] = useState(() => new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date()))
  const [notice, setNotice] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!vacantProperties.some(property => property.id === selectedPropertyId)) setSelectedPropertyId(vacantProperties[0]?.id ?? '')
  }, [selectedPropertyId, properties])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving) return
    const monthlyRent = Number(rent.replace(/\s/g, ''))
    if (!vacant) {
      setNotice('Aucun logement libre. Ajoutez un logement vacant avant de créer un bail.')
      return
    }
    if (!Number.isSafeInteger(monthlyRent) || monthlyRent <= 0) {
      setNotice('Le loyer doit être un montant entier supérieur à 0 FCFA.')
      return
    }
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(leaseStart)) {
      setNotice('Indiquez une date de début au format JJ/MM/AAAA.')
      return
    }
    setSaving(true)
    try {
      const saved = await addLease(vacant.id, tenant.trim(), phone.trim(), monthlyRent, Number(dueDay), leaseStart)
      if (!saved) {
        setNotice('Le bail n’a pas pu être enregistré. Vérifiez que le logement est libre et réessayez.')
        return
      }
      router.push('/logements')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppFrame showTabs={false} demoMode={false}>
      <BackTitle href="/logements">Nouveau locataire</BackTitle>
      {vacant ? <section className="rf-white-card rf-selected-property"><span className="rf-unit-code rf-code-neutral" aria-hidden="true"><Building2 /></span><span className="rf-row-main"><small>Logement sélectionné</small><b>{vacant.name} · {vacant.building}</b><small>{vacant.city}</small></span></section> : <section className="rf-white-card rf-empty-state"><Building2 aria-hidden="true" /><h2>Aucun logement libre</h2><p>Ajoutez d’abord un logement dans la ville où se trouve votre bien.</p><Link className="rf-outline-button rf-full-button" href="/logements">Ajouter ou choisir un logement</Link></section>}
      {vacant && <form className="rf-form rf-lease-form" onSubmit={submit}>
        {vacantProperties.length > 1 && <label className="rf-field" htmlFor="lease-unit">Logement<select id="lease-unit" value={vacant.id} onChange={event => setSelectedPropertyId(event.target.value)}>{vacantProperties.map(property => <option key={property.id} value={property.id}>{property.name} · {property.building} · {property.city}</option>)}</select></label>}
        <label className="rf-field" htmlFor="lease-name">Nom du locataire<input id="lease-name" value={tenant} onChange={event => setTenant(event.target.value)} placeholder="Ex. Marie Ngono" required /></label>
        <label className="rf-field" htmlFor="lease-phone">Téléphone du locataire<input id="lease-phone" type="tel" inputMode="tel" value={phone} onChange={event => setPhone(event.target.value)} placeholder="6XX XX XX XX" required /></label>
        <label className="rf-field" htmlFor="lease-rent">Loyer mensuel (FCFA)<input id="lease-rent" type="text" inputMode="numeric" pattern="[0-9 ]+" value={rent} onChange={event => setRent(event.target.value)} placeholder="25 000" required /></label>
        <div className="rf-two-fields"><label className="rf-field" htmlFor="lease-due">Jour d’échéance<select id="lease-due" value={dueDay} onChange={event => setDueDay(event.target.value)}>{Array.from({ length: 31 }, (_, index) => index + 1).map(day => <option key={day} value={day}>{day} de chaque mois</option>)}</select></label><label className="rf-field" htmlFor="lease-start">Date de début<input id="lease-start" type="text" inputMode="numeric" pattern="[0-9]{2}/[0-9]{2}/[0-9]{4}" value={leaseStart} onChange={event => setLeaseStart(event.target.value)} required /></label></div>
        <p className="rf-helper">Le bail crée le suivi mensuel. Les rappels restent envoyés manuellement par vous.</p>
        <PrimaryButton className="rf-full-button" type="submit" disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer le locataire'}</PrimaryButton>
      </form>}
      {notice && <p className="rf-inline-notice" role="status">{notice}</p>}
    </AppFrame>
  )
}
