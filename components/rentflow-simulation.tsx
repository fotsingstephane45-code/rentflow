'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, BadgeCheck, CalendarDays, Check, FileText, MessageCircle, RotateCcw, ShieldCheck, Wallet } from 'lucide-react'
import { SiteFooter, SiteHeader } from '@/components/site-header'

const stages = ['Rappel J−5', 'Rappel envoyé', 'Jour J', 'À vérifier', 'Quittance', 'Synthèse']
const money = (amount: number) => new Intl.NumberFormat('fr-FR').format(amount)

export function RentFlowSimulation() {
  const [stage, setStage] = useState(0)
  const [method, setMethod] = useState('Orange Money')
  const [rejected, setRejected] = useState(false)
  const paid = stage >= 4 && !rejected
  const awaiting = stage === 3 && !rejected
  const received = paid ? 80_000 : 0
  const declarations = 65_000 + (awaiting ? 80_000 : 0)
  const currentStep = rejected ? 3 : stage

  function restart() {
    setStage(0)
    setMethod('Orange Money')
    setRejected(false)
  }

  return <div className="site-shell rf-sim-shell">
    <div className="rf-sim-noprint"><SiteHeader /></div>
    <main className="rf-sim-page">
      <header className="rf-sim-intro">
        <span className="eyebrow"><span className="eyebrow-dot" /> MODE SIMULATION · DONNÉES FICTIVES</span>
        <h1>Du rappel à la <em>quittance.</em></h1>
        <p>Avance dans un exemple d’agence immobilière pour voir ce que voit le locataire, ce que vérifie l’agent et ce qui apparaît dans la synthèse.</p>
        <div className="rf-sim-safety"><ShieldCheck aria-hidden="true" /><span>Aucune donnée n’est envoyée à Supabase ou à WhatsApp. Les boutons font avancer cette simulation uniquement.</span></div>
      </header>

      <section className="rf-sim-scenario rf-sim-noprint" aria-label="Scénario exemple">
        <div><small>AGENCE</small><b>Agence Mbarga</b></div>
        <div><small>LOCATAIRE</small><b>Amina · Appartement B12</b></div>
        <div><small>LOYER MENSUEL</small><b>80 000 FCFA</b></div>
        <div><small>ÉCHÉANCE</small><b>5 décembre 2026</b></div>
      </section>

      <ol className="rf-sim-progress rf-sim-noprint" aria-label="Progression de la simulation">
        {stages.map((label, index) => <li key={label} className={index < currentStep ? 'is-done' : index === currentStep ? 'is-current' : ''} aria-current={index === currentStep ? 'step' : undefined}><span>{index < currentStep ? <Check aria-hidden="true" /> : index + 1}</span><b>{label}</b></li>)}
      </ol>

      <section className="rf-sim-workspace">
        <article className="rf-sim-main-card rf-sim-noprint" aria-live="polite">
          {stage === 0 && !rejected && <>
            <div className="rf-sim-date"><CalendarDays aria-hidden="true" /><span>30 novembre 2026 · J−5</span></div>
            <h2>Il reste cinq jours avant l’échéance.</h2>
            <p>La page <b>Rappels</b> repère les loyers dus dans cinq jours et affiche Amina avec son montant de 80 000 FCFA.</p>
            <div className="rf-sim-message"><MessageCircle aria-hidden="true" /><p>Bonjour Amina, petit rappel : votre loyer de 80 000 FCFA pour l’Appartement B12 arrive à échéance le 5 décembre.</p></div>
            <p className="rf-sim-hint"><b>En réel :</b> l’agent appuie sur « Envoyer », vérifie le message prérempli, puis l’envoie dans WhatsApp. L’application ne l’envoie pas automatiquement.</p>
            <button className="button button-primary rf-sim-action" type="button" onClick={() => setStage(1)}>Simuler l’envoi du rappel <ArrowRight size={16} /></button>
          </>}

          {stage === 1 && !rejected && <>
            <div className="rf-sim-date"><Check aria-hidden="true" /><span>Rappel J−5 préparé · simulation</span></div>
            <h2>Amina reçoit le rappel dans cet exemple.</h2>
            <p>Le rappel précise le montant, le logement, la date d’échéance et les instructions de paiement. L’agent peut continuer à suivre l’échéance.</p>
            <div className="rf-sim-message"><MessageCircle aria-hidden="true" /><p>Le message est prêt pour WhatsApp. Dans l’application réelle, l’agent choisit le destinataire et confirme lui-même l’envoi.</p></div>
            <button className="button button-primary rf-sim-action" type="button" onClick={() => setStage(2)}>Avancer au jour J <ArrowRight size={16} /></button>
          </>}

          {stage === 2 && !rejected && <>
            <div className="rf-sim-date rf-sim-date-due"><CalendarDays aria-hidden="true" /><span>5 décembre 2026 · Jour J</span></div>
            <h2>Le loyer est dû aujourd’hui.</h2>
            <p>Amina paie directement l’agence. RentFlow ne prend pas l’argent et ne traite pas le transfert.</p>
            <label className="rf-field" htmlFor="sim-payment-method">Mode de paiement choisi<select id="sim-payment-method" value={method} onChange={event => setMethod(event.target.value)}><option>Orange Money</option><option>MTN MoMo</option><option>Espèces</option></select></label>
            <div className="rf-sim-external"><Wallet aria-hidden="true" /><span><b>{method}</b><small>Le transfert se fait en dehors de RentFlow.</small></span></div>
            <p className="rf-sim-hint"><b>En réel :</b> le locataire ouvre son lien personnel, paie avec les coordonnées données par l’agence, puis déclare le paiement dans RentFlow.</p>
            <button className="button button-primary rf-sim-action" type="button" onClick={() => { setRejected(false); setStage(3) }}>Simuler le paiement et sa déclaration <ArrowRight size={16} /></button>
          </>}

          {stage === 3 && !rejected && <>
            <div className="rf-sim-date rf-sim-date-pending"><FileText aria-hidden="true" /><span>Déclaration reçue · à vérifier</span></div>
            <h2>L’agent doit vérifier le transfert.</h2>
            <p>Amina déclare avoir payé 80 000 FCFA. La déclaration seule ne prouve pas que l’argent a été reçu.</p>
            <div className="rf-sim-payment-slip"><div><small>LOCATAIRE</small><b>Amina · Appartement B12</b></div><div><small>MONTANT DÉCLARÉ</small><b>80 000 FCFA</b></div><div><small>MODE</small><b>{method}</b></div><div><small>RÉFÉRENCE FICTIVE</small><b>DEMO-OM-5821</b></div></div>
            <p className="rf-sim-hint"><b>En réel :</b> l’agent contrôle son compte Orange Money ou MTN MoMo. Il confirme seulement si le transfert correspond.</p>
            <div className="rf-sim-actions"><button className="button button-primary" type="button" onClick={() => { setRejected(false); setStage(4) }}>Paiement vérifié · confirmer</button><button className="button button-outline" type="button" onClick={() => setRejected(true)}>Refuser la déclaration</button></div>
          </>}

          {rejected && <>
            <div className="rf-sim-date rf-sim-date-rejected"><span aria-hidden="true">!</span><span>Déclaration refusée · simulation</span></div>
            <h2>Aucune quittance n’est créée.</h2>
            <p>Si le montant ou la référence ne correspond pas, l’agent refuse la déclaration et contacte le locataire pour clarifier la situation.</p>
            <button className="button button-primary rf-sim-action" type="button" onClick={() => { setRejected(false); setStage(2) }}>Reprendre le scénario avant confirmation <ArrowRight size={16} /></button>
          </>}

          {stage === 4 && !rejected && <>
            <div className="rf-sim-date rf-sim-date-confirmed"><BadgeCheck aria-hidden="true" /><span>Paiement confirmé · quittance créée</span></div>
            <h2>La quittance devient disponible.</h2>
            <p>Après vérification, l’agent confirme le paiement. RentFlow conserve la confirmation et génère la quittance pour Amina.</p>
            <div className="rf-sim-receipt"><span>QUITTANCE · DOCUMENT FICTIF</span><b>80 000 FCFA</b><p>Loyer de décembre 2026 · Appartement B12</p><div><span>Locataire</span><b>Amina</b></div><div><span>Agence</span><b>Agence Mbarga</b></div><div><span>Référence</span><b>RF-2026-DEMO-0042</b></div></div>
            <button className="button button-primary rf-sim-action" type="button" onClick={() => setStage(5)}>Voir la synthèse de l’agence <ArrowRight size={16} /></button>
          </>}

          {stage === 5 && !rejected && <>
            <div className="rf-sim-date rf-sim-date-confirmed"><FileText aria-hidden="true" /><span>Fin de mois · rapport de décembre</span></div>
            <h2>La direction voit l’état des loyers.</h2>
            <p>La synthèse distingue les montants confirmés, les déclarations à vérifier et les loyers en retard.</p>
            <p className="rf-sim-hint"><b>En réel :</b> l’agent peut imprimer cette synthèse ou l’enregistrer en PDF, puis l’envoyer au boss. RentFlow ne l’envoie pas encore automatiquement par e-mail.</p>
            <button className="button button-primary rf-sim-action" type="button" onClick={() => window.print()}>Imprimer cette synthèse <FileText size={16} /></button>
          </>}
        </article>

        <aside className="rf-sim-side-card rf-sim-noprint">
          <h2>Le mécanisme en bref</h2>
          <ol>
            <li><span>1</span><p><b>J−5</b> · l’échéance apparaît dans les rappels ; l’agent prépare puis envoie le message.</p></li>
            <li><span>2</span><p><b>Jour J</b> · le locataire paie directement par le moyen convenu.</p></li>
            <li><span>3</span><p><b>Déclaration</b> · le locataire signale son paiement ; il reste à vérifier.</p></li>
            <li><span>4</span><p><b>Confirmation</b> · l’agent vérifie le transfert ; la quittance est alors créée.</p></li>
            <li><span>5</span><p><b>Synthèse</b> · le rapport récapitule encaissé, à vérifier et en retard.</p></li>
          </ol>
          <Link className="rf-sim-link" href="/espace-proprietaire">Parcourir aussi la démo de l’application <ArrowRight size={15} /></Link>
        </aside>
      </section>

      <section className="rf-sim-report" aria-labelledby="sim-report-title">
        <div className="rf-sim-report-heading"><div><span className="eyebrow">EXEMPLE POUR LA DIRECTION</span><h2 id="sim-report-title">Synthèse · décembre 2026</h2><p>Agence Mbarga · préparée par l’agent immobilier</p></div><span className="rf-sim-demo-stamp">SIMULATION</span></div>
        <div className="rf-sim-kpis"><article><small>Loyers attendus</small><b>{money(195_000)} FCFA</b></article><article><small>Confirmés</small><b>{money(received)} FCFA</b></article><article><small>À vérifier</small><b>{money(declarations)} FCFA</b></article><article><small>En retard</small><b>50 000 FCFA</b></article></div>
        <div className="rf-sim-table-wrap"><table><thead><tr><th>Logement · locataire</th><th>Attendu</th><th>État</th></tr></thead><tbody>
          <tr><td>Appartement B12 · Amina</td><td>80 000 FCFA</td><td>{rejected ? 'Déclaration refusée' : paid ? 'Confirmé' : awaiting ? 'À vérifier' : stage >= 2 ? 'À payer aujourd’hui' : stage >= 1 ? 'À payer le 5 déc.' : 'Échéance à venir'}</td></tr>
          <tr><td>Studio A3 · Alain</td><td>50 000 FCFA</td><td>En retard</td></tr>
          <tr><td>Appartement C4 · Chantal</td><td>65 000 FCFA</td><td>À vérifier</td></tr>
        </tbody><tfoot><tr><th>Total attendu</th><th>195 000 FCFA</th><th>{paid ? '80 000 FCFA confirmés' : '0 FCFA confirmé'}</th></tr></tfoot></table></div>
        <p className="rf-sim-report-note">Cette fiche est fictive. Dans l’application, le rapport peut être imprimé ou enregistré en PDF pour être transmis manuellement au responsable.</p>
        {stage === 5 && <button className="button button-primary rf-sim-print rf-sim-noprint" type="button" onClick={() => window.print()}>Imprimer / enregistrer en PDF</button>}
      </section>

      <div className="rf-sim-bottom-actions rf-sim-noprint"><button className="button button-quiet" type="button" onClick={restart}><RotateCcw size={15} /> Recommencer la simulation</button><Link className="rf-sim-link" href="/comment-ca-marche">Lire le parcours produit <ArrowRight size={15} /></Link></div>
    </main>
    <div className="rf-sim-noprint"><SiteFooter /></div>
  </div>
}
