import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Info } from 'lucide-react'
import { SiteFooter, SiteHeader } from '@/components/site-header'

export const metadata: Metadata = { title: 'Conditions d’utilisation | RentFlow', description: 'Conditions provisoires d’utilisation de RentFlow.' }

export default function TermsPage() {
  return <div className="site-shell"><SiteHeader /><main><section className="page-intro section-wrap"><span className="eyebrow"><span className="eyebrow-dot" /> CONDITIONS D’UTILISATION</span><h1>Un outil de suivi,<br /><em>sous votre contrôle.</em></h1><p>RentFlow organise les informations de gestion locative et ne remplace ni le bail ni les échanges entre les parties.</p></section><section className="policy-page section-wrap"><article><Info size={22} /><h2>Compte et données</h2><p>Vous devez protéger vos identifiants et vérifier les informations que vous enregistrez. Les espaces propriétaires nécessitent un compte. Les données d’un compte sont privées et séparées de celles des autres titulaires.</p></article><article><Info size={22} /><h2>Suivi des paiements</h2><p>RentFlow ne collecte ni ne transfère d’argent. Une déclaration de paiement par un locataire n’est pas une preuve de transfert; seul le propriétaire vérifie et confirme le paiement. Les quittances reflètent les informations saisies et confirmées dans l’application.</p></article><article><Info size={22} /><h2>État du service</h2><p>Le service est encore en préparation et certaines fonctions, notamment les forfaits payants, le formulaire de contact et certaines pages locataires, ne sont pas finalisées. Les conditions complètes, tarifs, durée de conservation et procédure de suppression du compte seront publiés avant l’ouverture commerciale.</p></article><Link href="/questions" className="underlined-link">Voir les questions fréquentes <ArrowRight size={15} /></Link></section></main><SiteFooter /></div>
}
