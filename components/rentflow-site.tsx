import Image from 'next/image'
import Link from 'next/link'
import { ArrowDown, ArrowRight, ArrowUpRight, BadgeCheck, Building2, CalendarDays, Check, CircleHelp, FileText, MessageCircle, ShieldCheck, Wallet } from 'lucide-react'
import { SiteFooter, SiteHeader } from '@/components/site-header'

const features = [
  { icon: <Building2 />, title: 'Vos biens, bien rangés', text: 'Retrouvez logements, locataires et échéances au même endroit.' },
  { icon: <CalendarDays />, title: 'Un suivi sans oubli', text: 'Repérez rapidement les loyers reçus, attendus ou à vérifier.' },
  { icon: <FileText />, title: 'Des quittances claires', text: 'Gardez une trace organisée après avoir confirmé le paiement.' },
]

export function RentFlowSite() {
  return <div className="site-shell">
    <SiteHeader />
    <main>
      <section className="hero-section">
        <div className="hero-copy">
          <span className="eyebrow"><span className="eyebrow-dot" /> L’OUTIL LOCATIF FAIT POUR VOUS</span>
          <h1>La location,<br />en <em>plus simple.</em></h1>
          <p className="hero-description">Suivez vos loyers, organisez vos logements et retrouvez chaque quittance sans courir après vos carnets ou vos messages.</p>
          <div className="hero-actions"><Link className="button button-primary button-large" href="/espace-proprietaire">Explorer la démo <ArrowRight size={16} /></Link><Link className="text-link" href="/inscription"><span className="play-mark"><ArrowDown size={14} /></span> Créer un compte</Link><Link className="text-link" href="/simulation"><span className="play-mark"><ArrowRight size={14} /></span> Voir une simulation guidée</Link></div>
          <div className="hero-assurance"><span className="assurance-icon"><ShieldCheck size={18} /></span><span><b>Vous gardez la main.</b><small>RentFlow ne reçoit jamais vos loyers.</small></span></div>
        </div>
        <div className="hero-image-wrap">
          <Image className="hero-image" src="/rentflow-property.png" alt="Immeuble résidentiel entouré de verdure à Yaoundé" fill priority sizes="(max-width: 900px) 100vw, 54vw" />
          <div className="image-label"><span className="image-label-icon"><Building2 size={17} /></span><span><b>Chaque logement, à sa place</b><small>Une vue claire sur votre patrimoine</small></span><ArrowUpRight size={16} /></div>
          <div className="image-location"><span className="location-dot" /> Yaoundé · Douala</div>
          <div className="image-index">01 <span>/</span> 03</div>
        </div>
      </section>

      <section className="proof-row" aria-label="Ce que RentFlow simplifie"><span>UN SEUL ESPACE POUR</span><span><Building2 /> vos logements</span><span><Wallet /> vos loyers</span><span><FileText /> vos quittances</span><span><MessageCircle /> vos rappels</span></section>

      <section className="dashboard-preview section-wrap" aria-labelledby="dashboard-preview-title">
        <div className="dashboard-preview-copy"><span className="eyebrow"><span className="eyebrow-dot" /> APERÇU DE L’APPLICATION</span><h2 id="dashboard-preview-title">Vos loyers,<br /><em>en un coup d’œil.</em></h2><p>Le tableau de bord rassemble les paiements à vérifier, les loyers suivis et les retards — dans l’interface mobile conçue pour RentFlow.</p><Link className="underlined-link" href="/espace-proprietaire">Parcourir la démo interactive <ArrowRight size={15} /></Link></div>
        <div className="dashboard-preview-device"><Image src="/rentflow-dashboard-reference.png" alt="Maquette mobile du tableau de bord RentFlow avec des paiements à vérifier et des loyers en FCFA" width={390} height={844} sizes="(max-width: 760px) 72vw, 290px" /><span>MAQUETTE · DONNÉES FICTIVES</span></div>
      </section>

      <section className="intro-section section-wrap"><div className="intro-title"><span className="eyebrow">UNE GESTION PLUS LISIBLE</span><h2>Fini les informations<br />éparpillées <em>partout.</em></h2></div><div className="intro-copy"><p>Un locataire vous écrit sur WhatsApp. Un paiement est fait par Mobile Money. Une quittance est dans un tiroir. RentFlow vous aide à remettre de l’ordre dans ce quotidien — sans prendre la place de vos habitudes.</p><Link className="underlined-link" href="/fonctionnalites">Voir toutes les fonctionnalités <ArrowRight size={15} /></Link></div></section>

      <section className="feature-band section-wrap" aria-label="Fonctionnalités principales">{features.map((feature, index) => <article className="feature-item" key={feature.title}><span className="feature-count">0{index + 1}</span><span className="feature-icon">{feature.icon}</span><h3>{feature.title}</h3><p>{feature.text}</p><Link href="/fonctionnalites" aria-label={`En savoir plus : ${feature.title}`}><ArrowUpRight size={17} /></Link></article>)}</section>

      <section className="story-section">
        <div className="story-image"><Image src="/rentflow-interior.png" alt="Intérieur lumineux d’un appartement locatif" fill sizes="(max-width: 760px) 100vw, 48vw" /><span className="photo-caption"><span /> UN LOGEMENT BIEN SUIVI, C’EST PLUS DE SÉRÉNITÉ</span></div>
        <div className="story-copy"><span className="eyebrow">CONÇU POUR LE QUOTIDIEN</span><h2>Une vue claire.<br /><em>Des décisions sereines.</em></h2><p>Voyez d’un coup d’œil ce qui a été réglé, ce qui reste à confirmer et les prochaines échéances. Vous décidez quoi faire — RentFlow vous aide à ne rien perdre de vue.</p><ul><li><Check /> Vos logements et locataires au même endroit</li><li><Check /> Une confirmation manuelle avant toute quittance</li><li><Check /> Des rappels préparés, envoyés par vous</li></ul><Link className="button button-outline" href="/espace-proprietaire">Explorer l’espace de démo <ArrowRight size={15} /></Link></div>
      </section>

      <section className="steps-preview section-wrap"><div className="steps-heading"><span className="eyebrow">TROIS ÉTAPES, SANS DÉTOUR</span><h2>Vos loyers suivis.<br /><em>Votre temps retrouvé.</em></h2><Link className="underlined-link" href="/comment-ca-marche">Découvrir le parcours <ArrowRight size={15} /></Link></div><div className="step-list"><article><span>01</span><div><h3>Ajoutez vos logements</h3><p>Rassemblez l’essentiel sur vos biens, vos locataires et les loyers attendus.</p></div><Building2 /></article><article><span>02</span><div><h3>Suivez chaque échéance</h3><p>Retrouvez les paiements à vérifier et les rappels à préparer.</p></div><CalendarDays /></article><article><span>03</span><div><h3>Confirmez et classez</h3><p>Vous validez le paiement. La quittance et l’historique restent organisés.</p></div><BadgeCheck /></article></div></section>

      <section className="guardrail-section"><div className="guardrail-inner"><span className="guardrail-icon"><ShieldCheck size={23} /></span><div><span className="eyebrow">VOTRE ARGENT RESTE À VOUS</span><h2>RentFlow ne touche<br />jamais à vos <em>loyers.</em></h2><p>Votre locataire vous paie directement — par Mobile Money, en espèces ou selon vos habitudes. Vous vérifiez le paiement avant de le marquer comme reçu.</p><Link className="underlined-link" href="/questions">Lire nos réponses <ArrowRight size={15} /></Link></div><div className="guardrail-stamp"><Wallet size={29} /><b>100%</b><span>ENTRE VOS MAINS</span></div></div></section>

      <section className="home-bottom section-wrap"><div className="bottom-card"><span className="eyebrow">PRÊT À Y VOIR PLUS CLAIR ?</span><h2>Faisons le point<br />sur votre gestion.</h2><p>Parcourez les fonctionnalités ou demandez à être informé du lancement.</p><div><Link className="button button-light" href="/contact">Demander un accès <ArrowRight size={15} /></Link><Link className="bottom-help" href="/questions"><CircleHelp size={15} /> Questions fréquentes</Link></div></div></section>
    </main>
    <SiteFooter />
  </div>
}
