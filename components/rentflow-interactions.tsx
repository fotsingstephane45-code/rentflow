'use client'

import { useState } from 'react'
import type { FormEvent } from 'react'
import Link from 'next/link'
import { ArrowRight, Check, ChevronDown, Plus, Search, ShieldCheck, Wallet } from 'lucide-react'

type Payment = { id: number; tenant: string; property: string; rent: number; due: string; status: 'À vérifier' | 'Payé' | 'En attente' }
const startingPayments: Payment[] = [
  { id: 1, tenant: 'Aline Mballa', property: 'Studio 3 · Les Palmiers', rent: 60000, due: '05 nov.', status: 'À vérifier' },
  { id: 2, tenant: 'Paul Tchoumi', property: 'Appartement 2 · Nlongkak', rent: 85000, due: '05 nov.', status: 'En attente' },
  { id: 3, tenant: 'Marie Ngo', property: 'Studio 1 · Les Palmiers', rent: 30000, due: '05 nov.', status: 'Payé' },
]
const formatMoney = (amount: number) => new Intl.NumberFormat('fr-FR').format(amount)

export function ContactForm() {
  const [submitted, setSubmitted] = useState(false)
  const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() ?? ''
  const hasSupportEmail = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(supportEmail)
  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!hasSupportEmail) return
    const values = new FormData(event.currentTarget)
    const subject = `Demande RentFlow — ${String(values.get('name')).trim()}`
    const body = `Nom : ${String(values.get('name')).trim()}\nE-mail : ${String(values.get('email')).trim()}\n\nMessage :\n${String(values.get('message')).trim()}`
    window.location.href = `mailto:${supportEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    setSubmitted(true)
  }
  if (submitted) return <div className="form-success" role="status"><span><Check size={20} /></span><h2>Votre application e-mail va s’ouvrir.</h2><p>Vérifiez le destinataire et le message prérempli, puis envoyez-le depuis votre messagerie.</p><button className="button button-outline" onClick={() => setSubmitted(false)}>Retour au formulaire</button></div>
  return <form className="contact-form" onSubmit={onSubmit}>
    <span className="eyebrow">DEMANDE D’INFORMATION</span><h2>Parlez-nous de votre projet.</h2>
    <label htmlFor="name">Votre nom<input id="name" name="name" autoComplete="name" placeholder="Ex. Amina Nguema" required /></label>
    <label htmlFor="email">Votre adresse e-mail<input id="email" name="email" type="email" autoComplete="email" placeholder="vous@exemple.com" required /></label>
    <label htmlFor="message">Ce que vous aimeriez savoir<textarea id="message" name="message" rows={4} placeholder="J’aimerais suivre plusieurs logements…" required /></label>
    <p className="form-disclaimer"><ShieldCheck size={15} />{hasSupportEmail ? 'Votre messagerie s’ouvrira avec le message prérempli. Rien n’est envoyé sans votre action.' : 'Le formulaire sera activé quand une adresse de support sera configurée.'}</p>
    <button className="button button-primary button-large" type="submit" disabled={!hasSupportEmail}>{hasSupportEmail ? 'Préparer l’e-mail' : 'Contact non configuré'} <ArrowRight size={15} /></button>
  </form>
}

export function OwnerDashboard() {
  const [payments, setPayments] = useState(startingPayments)
  const [filter, setFilter] = useState('Tous')
  const [notice, setNotice] = useState('')
  const [propertyOpen, setPropertyOpen] = useState(false)
  const [propertyName, setPropertyName] = useState('')
  const [propertiesOccupied, setPropertiesOccupied] = useState(8)
  const paidCount = payments.filter(payment => payment.status === 'Payé').length
  const visiblePayments = payments.filter(payment => filter === 'Tous' || payment.status === filter)
  function confirmPayment(id: number) {
    setPayments(current => current.map(payment => payment.id === id ? { ...payment, status: 'Payé' } : payment))
    setNotice('Paiement confirmé dans cette démo. Aucune transaction n’a été effectuée.')
  }
  function addProperty(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!propertyName.trim()) return
    setPropertiesOccupied(count => Math.min(count + 1, 10))
    setNotice(`« ${propertyName.trim()} » ajouté à cette démonstration.`)
    setPropertyName('')
    setPropertyOpen(false)
  }
  return <div className="site-shell"><main className="owner-page">
    <header className="owner-header"><Link className="brand" href="/"><span className="brand-mark"><span>R</span></span><span>rentflow<span className="brand-period">.</span></span></Link><nav aria-label="Navigation de la démo"><Link href="/fonctionnalites">Fonctionnalités</Link><Link href="/questions">Aide</Link><Link href="/" className="owner-back">Quitter la démo <ArrowRight size={14} /></Link></nav></header>
    <div className="demo-notice"><span><ShieldCheck size={16} /></span><div><b>Espace propriétaire · démonstration</b><small>Exemples fictifs. Vos actions ne sont pas enregistrées et aucun argent n’est déplacé.</small></div><Link href="/questions">À propos de la démo <ArrowRight size={14} /></Link></div>
    <div className="owner-content"><div className="owner-title"><div><span className="eyebrow">VUE D’ENSEMBLE · NOVEMBRE 2026</span><h1>Bonjour, Jean.</h1><p>Voici l’état de vos logements pour ce mois.</p></div><button className="button button-primary" type="button" onClick={() => { setPropertyOpen(!propertyOpen); setNotice('') }}><Plus size={16} /> Ajouter un logement</button></div>
    {notice && <p className="owner-toast" role="status"><Check size={16} />{notice}</p>}
    {propertyOpen && <form className="property-form" onSubmit={addProperty}><label htmlFor="property-name">Nom du logement<input id="property-name" value={propertyName} onChange={event => setPropertyName(event.target.value)} placeholder="Ex. Résidence Les Palmiers" required /></label><button className="button button-primary" type="submit">Ajouter à la démo</button><button className="button button-quiet" type="button" onClick={() => setPropertyOpen(false)}>Annuler</button></form>}
    <section className="owner-stats"><article><span>LOYERS CONFIRMÉS</span><b>{formatMoney(payments.filter(payment => payment.status === 'Payé').reduce((sum, payment) => sum + payment.rent, 0))}<small> FCFA</small></b><p><Check size={14} /> {paidCount} paiements confirmés</p></article><article><span>À VÉRIFIER</span><b>{formatMoney(payments.filter(payment => payment.status === 'À vérifier').reduce((sum, payment) => sum + payment.rent, 0))}<small> FCFA</small></b><p>Vérifiez votre compte avant confirmation</p></article><article><span>LOGEMENTS OCCUPÉS</span><b>{propertiesOccupied}<small> / 10</small></b><p>Sur 2 immeubles · exemple de démo</p></article></section>
    <section className="owner-table-card"><div className="owner-table-head"><div><h2>Suivi des loyers</h2><p>Chaque paiement est confirmé par vos soins.</p></div><label className="filter-label"><Search size={15} /><select aria-label="Filtrer les paiements" value={filter} onChange={event => setFilter(event.target.value)}><option>Tous</option><option>À vérifier</option><option>En attente</option><option>Payé</option></select><ChevronDown size={13} /></label></div>
      <div className="owner-table"><div className="owner-table-labels"><span>LOCATAIRE / LOGEMENT</span><span>ÉCHÉANCE</span><span>MONTANT</span><span>STATUT / ACTION</span></div>{visiblePayments.map(payment => <article className="owner-row" key={payment.id}><div><b>{payment.tenant}</b><small>{payment.property}</small></div><span>{payment.due}</span><strong>{formatMoney(payment.rent)} <small>FCFA</small></strong><div>{payment.status === 'Payé' ? <span className="status-pill status-paid"><Check size={12} /> Payé</span> : payment.status === 'En attente' ? <span className="status-pill status-pending">En attente</span> : <button className="confirm-button" type="button" onClick={() => confirmPayment(payment.id)}>Confirmer après vérification</button>}</div></article>)}</div>
      {visiblePayments.length === 0 && <p className="table-empty">Aucun paiement dans cette catégorie.</p>}
      <div className="owner-table-foot"><Wallet size={15} /><span>RentFlow n’encaisse pas les loyers. Vérifiez le paiement avant de le confirmer.</span></div>
    </section><p className="demo-footnote">Toutes les données ci-dessus sont fictives et réinitialisées au rechargement.</p><Link href="/" className="owner-home-link">← Retour à l’accueil</Link></div>
  </main></div>
}
