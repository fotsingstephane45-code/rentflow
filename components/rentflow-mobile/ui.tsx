'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Building2, ChartNoAxesColumnIncreasing, Clock3, FileText, House, Send, ShieldCheck, Wallet } from 'lucide-react'
import { useRentFlow } from '@/components/rentflow-mobile/state'

type Audience = 'owner' | 'tenant'

const ownerTabs = [
  { href: '/espace-proprietaire', label: 'Accueil', icon: House },
  { href: '/rappels', label: 'Rappels', icon: Send },
  { href: '/logements', label: 'Logements', icon: Building2 },
  { href: '/synthese', label: 'Synthèse', icon: ChartNoAxesColumnIncreasing },
]

const tenantTabs = [
  { href: '/locataire/dashboard', label: 'Accueil', icon: House },
  { href: '/paiement', label: 'Loyer', icon: Wallet },
  { href: '/locataire/historique', label: 'Historique', icon: Clock3 },
  { href: '/locataire/quittances', label: 'Quittances', icon: FileText },
]

export function AppFrame({ children, showTabs = true, audience = 'owner', demoMode = true }: { children: ReactNode; showTabs?: boolean; audience?: Audience; demoMode?: boolean }) {
  const pathname = usePathname()
  const { isDemo, dataError, loading, subscriptionReadOnly } = useRentFlow()
  const tabs = audience === 'tenant' ? tenantTabs : ownerTabs
  const activeTab = audience === 'tenant'
    ? pathname === '/paiement' || pathname === '/locataire/paiement' ? '/paiement' : pathname
    : ['/paiements-a-confirmer', '/confirmer-paiement', '/quittance'].includes(pathname) ? '/espace-proprietaire' : pathname

  return (
    <div className="rf-phone-frame">
      <main className={`rf-screen${showTabs ? ' rf-screen-with-tabs' : ''}`}>
        {demoMode && !loading && (isDemo ? <aside className="rf-demo-banner" role="note" aria-label="Mode démonstration">
          <span><ShieldCheck aria-hidden="true" />DÉMO · données fictives, non sauvegardées</span>
          <nav aria-label="Choisir une démonstration">
            <Link href="/espace-proprietaire" aria-current={audience === 'owner' ? 'page' : undefined}>Propriétaire</Link>
            <Link href="/locataire/dashboard" aria-current={audience === 'tenant' ? 'page' : undefined}>Locataire</Link>
          </nav>
        </aside> : <aside className="rf-demo-banner" role="status"><span><ShieldCheck aria-hidden="true" />COMPTE RENTFLOW · session sécurisée</span></aside>)}
        {!isDemo && dataError && <p className="rf-inline-notice" role="alert">{dataError}</p>}
        {!isDemo && !loading && subscriptionReadOnly && <aside className="rf-inline-notice" role="status">Votre essai est terminé ou votre forfait est inactif. Votre compte est en lecture seule. Réactivez un forfait pour reprendre les modifications.</aside>}
        {children}
      </main>
      {showTabs && (
        <nav className="rf-bottom-nav" aria-label={audience === 'tenant' ? 'Navigation locataire' : 'Navigation propriétaire'}>
          {tabs.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} aria-current={activeTab === href ? 'page' : undefined} className="rf-tab-link">
              <Icon aria-hidden="true" />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
      )}
    </div>
  )
}

export function PageDate({ children = 'Novembre 2026' }: { children?: ReactNode }) {
  return <p className="rf-date">{children}</p>
}

export function BrandMark() {
  return <span className="rf-avatar" aria-hidden="true">N</span>
}

export function Money({ amount, compact = false }: { amount: number; compact?: boolean }) {
  return <>{new Intl.NumberFormat('fr-FR').format(amount)}{compact ? '' : ' '}<span className={compact ? 'rf-currency-inline' : 'rf-currency'}>FCFA</span></>
}

export function PrimaryButton({ children, onClick, type = 'button', className = '', disabled = false }: { children: ReactNode; onClick?: () => void; type?: 'button' | 'submit'; className?: string; disabled?: boolean }) {
  return <button className={`rf-primary-button ${className}`} type={type} onClick={onClick} disabled={disabled}>{children}</button>
}

export function OutlineButton({ children, onClick, type = 'button', className = '' }: { children: ReactNode; onClick?: () => void; type?: 'button' | 'submit'; className?: string }) {
  return <button className={`rf-outline-button ${className}`} type={type} onClick={onClick}>{children}</button>
}

export function BackTitle({ href, children }: { href: string; children: ReactNode }) {
  return <div className="rf-back-title"><Link href={href} aria-label="Retour"><span aria-hidden="true">‹</span></Link><h1>{children}</h1></div>
}

export function FormField({ label, id, type = 'text', placeholder, required = true, inputMode }: { label: string; id: string; type?: string; placeholder?: string; required?: boolean; inputMode?: 'numeric' | 'tel' | 'email' | 'text' }) {
  return <label className="rf-field" htmlFor={id}>{label}<input id={id} name={id} type={type} placeholder={placeholder} required={required} inputMode={inputMode} /></label>
}
