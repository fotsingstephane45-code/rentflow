'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Building2, ChevronDown, Home, Menu, X } from 'lucide-react'

const links = [
  { href: '/fonctionnalites', label: 'Fonctionnalités' },
  { href: '/comment-ca-marche', label: 'Comment ça marche' },
  { href: '/simulation', label: 'Simulation guidée' },
  { href: '/a-propos', label: 'À propos' },
  { href: '/tarifs', label: 'Tarifs' },
  { href: '/questions', label: 'Questions' },
]

export function Brand({ light = false }: { light?: boolean }) {
  return <Link href="/" className={`brand ${light ? 'brand-light' : ''}`} aria-label="RentFlow, accueil">
    <span className="brand-mark"><Home size={17} strokeWidth={2.2} /></span>
    <span>rentflow<span className="brand-period">.</span></span>
  </Link>
}

export function SiteHeader() {
  const [open, setOpen] = useState(false)
  return <>
    <div className="topline"><span><Building2 size={14} /> Votre gestion locative, pensée pour le Cameroun</span><Link href="/comment-ca-marche">Découvrir RentFlow <ArrowRight size={13} /></Link></div>
    <header className="site-header">
      <div className="header-inner">
        <Brand />
        <nav className={`main-nav ${open ? 'is-open' : ''}`} aria-label="Navigation principale">
          {links.map(link => <Link key={link.href} href={link.href} onClick={() => setOpen(false)}>{link.label}</Link>)}
          <Link className="mobile-nav-cta" href="/inscription" onClick={() => setOpen(false)}>Créer un compte <ArrowRight size={15} /></Link>
        </nav>
        <div className="header-actions">
          <Link className="login-link" href="/connexion">Se connecter</Link>
          <Link className="button button-primary header-cta" href="/espace-proprietaire">Explorer la démo <ArrowRight size={15} /></Link>
        </div>
        <button className="menu-toggle" type="button" aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'} aria-expanded={open} onClick={() => setOpen(!open)}>{open ? <X size={22} /> : <Menu size={22} />}</button>
      </div>
    </header>
  </>
}

export function SiteFooter() {
  return <footer className="site-footer">
    <div className="footer-main">
      <div className="footer-about"><Brand light /><p>Moins de paperasse, plus de sérénité.<br />Pour les propriétaires de Yaoundé et Douala.</p><Link className="footer-contact-link" href="/contact">Nous écrire <ArrowRight size={14} /></Link></div>
      <div className="footer-column"><b>LE PRODUIT</b><Link href="/fonctionnalites">Fonctionnalités</Link><Link href="/comment-ca-marche">Comment ça marche</Link><Link href="/a-propos">À propos</Link><Link href="/tarifs">Tarifs</Link></div>
      <div className="footer-column"><b>À VOTRE SERVICE</b><Link href="/espace-proprietaire">Espace propriétaire · démo</Link><Link href="/questions">Questions fréquentes</Link><Link href="/contact">Contact</Link></div><div className="footer-column footer-legal"><b>INFORMATIONS</b><Link href="/confidentialite">Confidentialité</Link><Link href="/conditions">Conditions d’utilisation</Link></div>
      <div className="footer-note"><span className="footer-note-icon"><Building2 size={18} /></span><p>RentFlow ne collecte pas vos loyers. Vous gardez le contrôle de chaque paiement.</p></div>
    </div>
    <div className="footer-bottom"><span>© {new Date().getFullYear()} RentFlow · Cameroun</span><span>Un outil de gestion, pas un service de paiement.</span><Link href="/">Retour à l’accueil <ChevronDown size={13} className="back-to-top-icon" /></Link></div>
  </footer>
}
