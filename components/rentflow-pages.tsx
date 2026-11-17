import type { ReactNode } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, BadgeCheck, Building2, CalendarCheck, Check, CircleHelp, FileText, MessageCircle, ShieldCheck, Wallet } from 'lucide-react'
import { SiteFooter, SiteHeader } from '@/components/site-header'
import { ContactForm } from '@/components/rentflow-interactions'

function PageFrame({ eyebrow, title, description, children }: { eyebrow: string; title: ReactNode; description: string; children: ReactNode }) {
  return <div className="site-shell"><SiteHeader /><main><section className="page-intro section-wrap"><span className="eyebrow"><span className="eyebrow-dot" />{eyebrow}</span><h1>{title}</h1><p>{description}</p></section>{children}</main><SiteFooter /></div>
}

export function FeaturesPage() {
  const items = [
    { icon: <Building2 />, number: '01', title: 'Un dossier pour chaque logement', body: 'Gardez ensemble les informations utiles sur vos biens, leurs occupants et les loyers attendus. Retrouvez le bon détail quand vous en avez besoin.' },
    { icon: <CalendarCheck />, number: '02', title: 'Le suivi des loyers, sans deviner', body: 'Visualisez les paiements reçus, ceux à vérifier et les prochaines échéances. Rien n’est marqué payé sans votre confirmation.' },
    { icon: <MessageCircle />, number: '03', title: 'Des rappels que vous envoyez', body: 'Préparez un message clair, puis ouvrez WhatsApp pour l’envoyer vous-même. Pas d’envoi automatique à votre place.' },
    { icon: <FileText />, number: '04', title: 'Des quittances à retrouver', body: 'Après confirmation, retrouvez l’historique de vos quittances et des paiements enregistrés dans un espace organisé.' },
    { icon: <Wallet />, number: '05', title: 'Vous gardez le contrôle des paiements', body: 'Vos locataires vous règlent directement par Mobile Money ou en espèces. RentFlow ne collecte ni ne transfère d’argent.' },
    { icon: <ShieldCheck />, number: '06', title: 'Un bilan pour y voir plus clair', body: 'Consultez les loyers reçus et attendus sur la période pour faire le point sur votre gestion.' },
  ]
  return <PageFrame eyebrow="CE QUI COMPTE, BIEN RANGÉ" title={<>Tout le suivi locatif,<br /><em>sans le casse-tête.</em></>} description="Les outils essentiels pour gérer vos biens, suivre les loyers et garder une trace claire — avec vous aux commandes.">
    <section className="feature-page section-wrap"><div className="feature-page-photo"><Image src="/rentflow-interior.png" alt="Salon clair dans un appartement locatif bien entretenu" fill sizes="(max-width: 760px) 100vw, 50vw" /><span>UN MEILLEUR SUIVI COMMENCE PAR UNE VUE CLAIRE</span></div><div className="feature-details">{items.map(item => <article key={item.number}><span className="feature-icon">{item.icon}</span><div><span className="eyebrow">{item.number} — RENTFLOW</span><h2>{item.title}</h2><p>{item.body}</p></div></article>)}</div></section>
    <section className="callout section-wrap"><div><span className="eyebrow">UNE QUESTION SUR LE PRODUIT ?</span><h2>Voyons ce qui vous<br />serait vraiment utile.</h2></div><Link className="button button-primary" href="/contact">Nous contacter <ArrowRight size={15} /></Link></section>
  </PageFrame>
}

export function HowItWorksPage() {
  const steps = [
    { n: '01', title: 'Rassemblez vos logements', text: 'Ajoutez un bien, ses unités, le loyer prévu et les informations de vos locataires. Vous commencez avec une vue organisée.', icon: <Building2 /> },
    { n: '02', title: 'Suivez le mois au fil de l’eau', text: 'Chaque échéance apparaît dans le suivi. Si un locataire vous signale un paiement, vous vérifiez d’abord votre compte ou votre reçu.', icon: <CalendarCheck /> },
    { n: '03', title: 'Confirmez, puis gardez la trace', text: 'Une fois le paiement vérifié, marquez-le comme reçu. Vous pouvez alors préparer la quittance et conserver un historique clair.', icon: <BadgeCheck /> },
  ]
  return <PageFrame eyebrow="UN PARCOURS SIMPLE" title={<>De votre premier bien<br />à un suivi <em>plus serein.</em></>} description="RentFlow vous accompagne dans votre organisation. Les confirmations et les décisions restent toujours entre vos mains.">
    <section className="how-page section-wrap"><div className="how-photo"><Image src="/rentflow-visit.png" alt="Une propriétaire et un locataire échangent autour d’un document dans leur résidence" fill sizes="(max-width: 760px) 100vw, 42vw" /><div className="photo-callout"><span><ShieldCheck size={17} /></span><b>Vous gardez le contrôle</b><small>Chaque paiement est vérifié par vous.</small></div></div><div className="how-steps">{steps.map(step => <article key={step.n}><span className="step-number">{step.n}</span><span className="step-icon">{step.icon}</span><div><h2>{step.title}</h2><p>{step.text}</p></div></article>)}</div></section>
    <section className="principle-strip"><ShieldCheck /><p><b>Important :</b> RentFlow ne reçoit jamais les loyers et n’envoie aucun rappel à votre place.</p></section>
    <section className="callout section-wrap"><div><span className="eyebrow">VOTRE ESPACE DE GESTION</span><h2>Retrouvez vos<br />logements et loyers.</h2></div><Link className="button button-primary" href="/connexion">Accéder à mon espace <ArrowRight size={15} /></Link></section>
  </PageFrame>
}

export function PricingPage() {
  return <PageFrame eyebrow="SIMPLE ET TRANSPARENT" title={<>Un prix clair.<br /><em>Aucune commission.</em></>} description="Le tarif définitif n’est pas encore publié. Nous préférons vous informer avant votre inscription plutôt que de vous surprendre après.">
    <section className="pricing-page section-wrap"><div className="pricing-intro"><span className="price-tag">AU LANCEMENT</span><div className="price-number">1 <small>mois</small></div><h2>pour découvrir RentFlow.</h2><p>Les conditions et le prix éventuel après l’essai seront annoncés avant toute inscription. Pas de frais cachés sur vos loyers.</p><Link className="button button-primary button-large" href="/contact">Être informé du lancement <ArrowRight size={15} /></Link></div><div className="pricing-includes"><h3>Ce qui est prévu</h3><p><Check /> Un mois d’essai pour découvrir le produit</p><p><Check /> Un forfait selon le nombre de logements</p><p><Check /> Aucun pourcentage prélevé sur vos loyers</p><p><Check /> Vous encaissez toujours directement</p><div className="pricing-note"><CircleHelp size={18} /><span>Le montant exact sera communiqué avant l’ouverture des comptes. Aucun paiement n’est demandé sur cette page.</span></div></div></section>
    <section className="pricing-foot section-wrap"><span className="eyebrow">VOTRE ARGENT RESTE À VOUS</span><h2>Le prix de RentFlow n’est jamais prélevé sur votre loyer.</h2><Link href="/questions" className="underlined-link">En savoir plus <ArrowRight size={15} /></Link></section>
  </PageFrame>
}

export function AboutPage() {
  return <PageFrame eyebrow="UNE GESTION PLUS LISIBLE" title={<>RentFlow, pensé<br />pour le quotidien <em>locatif.</em></>} description="Un outil de suivi conçu pour aider propriétaires et locataires à mieux s’organiser, sans remplacer leurs échanges ni leurs moyens de paiement.">
    <section className="section-wrap about-page"><div className="about-card"><span className="feature-icon"><Building2 /></span><h2>Notre rôle : clarifier le suivi.</h2><p>RentFlow rassemble les informations des logements, les échéances, les déclarations et les quittances afin que chacun puisse retrouver les bons éléments au bon moment.</p></div><div className="about-card"><span className="feature-icon"><ShieldCheck /></span><h2>Les paiements restent entre vous.</h2><p>Les locataires règlent directement leur propriétaire. Une déclaration n’est jamais une preuve de transfert et la confirmation reste manuelle.</p></div><div className="about-card"><span className="feature-icon"><MessageCircle /></span><h2>Une approche locale.</h2><p>RentFlow est pensé en français, en FCFA et pour les réalités de gestion locative au Cameroun.</p></div></section>
    <section className="callout section-wrap"><div><span className="eyebrow">DÉCOUVREZ L’INTERFACE</span><h2>Ouvrez votre espace<br />de gestion.</h2></div><Link className="button button-primary" href="/connexion">Se connecter <ArrowRight size={15} /></Link></section>
  </PageFrame>
}

export function QuestionsPage() {
  const questions = [
    ['Est-ce que RentFlow reçoit l’argent de mes locataires ?', 'Non. Les locataires vous paient directement, comme ils le font déjà. RentFlow n’encaisse, ne détient et ne transfère aucun loyer.'],
    ['Les rappels WhatsApp sont-ils envoyés automatiquement ?', 'Non. RentFlow peut vous aider à préparer un rappel, mais c’est vous qui décidez quand et si vous l’envoyez.'],
    ['Qui confirme qu’un loyer a été payé ?', 'Vous. Vérifiez votre Mobile Money, votre relevé ou votre reçu, puis marquez manuellement le paiement comme reçu.'],
    ['Mes locataires doivent-ils installer une application ?', 'Le fonctionnement prévu est simple pour vos locataires. Les détails seront précisés avant le lancement du produit.'],
    ['Le produit est-il déjà disponible ?', 'La création de compte par e-mail et plusieurs fonctions de gestion sont disponibles. L’intégration et la vérification du service sont encore en cours; consultez les informations de disponibilité avant d’utiliser vos données réelles.'],
    ['Combien coûte RentFlow ?', 'Les tarifs définitifs ne sont pas encore publiés. Aucun prix ne vous sera demandé sans annonce claire des conditions.'],
  ]
  return <PageFrame eyebrow="ON VOUS RÉPOND SANS DÉTOUR" title={<>Les questions<br /><em>qu’on nous pose.</em></>} description="Paiements, rappels, tarifs : voici les réponses importantes pour gérer vos locations en confiance.">
    <section className="faq-page section-wrap"><div className="faq-sidebar"><span className="faq-icon"><CircleHelp size={24} /></span><h2>Vous hésitez encore ?</h2><p>Écrivez-nous, nous vous répondrons au sujet du lancement et des fonctionnalités prévues.</p><Link href="/contact" className="underlined-link">Poser une question <ArrowRight size={15} /></Link></div><div className="faq-list">{questions.map(([question, answer]) => <details key={question}><summary>{question}<span>+</span></summary><p>{answer}</p></details>)}</div></section>
  </PageFrame>
}

export function ContactPage() {
  return <PageFrame eyebrow="PARLONS DE VOTRE GESTION" title={<>Une question ?<br /><em>On vous écoute.</em></>} description="Dites-nous ce qui vous aiderait à mieux gérer vos logements. Votre messagerie préparera le message pour que vous puissiez l’envoyer.">
    <section className="contact-page section-wrap"><div className="contact-aside"><span className="contact-icon"><MessageCircle size={22} /></span><h2>Une vraie gestion,<br />à votre rythme.</h2><p>Parlez-nous de votre situation : nombre de biens, suivi des loyers ou quittances. Votre retour aide à prioriser RentFlow.</p><div className="contact-assurance"><ShieldCheck size={18} /><span><b>Pas de paiement ici</b><small>Le formulaire n’envoie pas vos informations.</small></span></div></div><ContactForm /></section>
  </PageFrame>
}
