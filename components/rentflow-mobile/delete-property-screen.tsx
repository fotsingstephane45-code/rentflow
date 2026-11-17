'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useRentFlow } from '@/components/rentflow-mobile/state'
import { AppFrame, BackTitle } from '@/components/rentflow-mobile/ui'

export function DeletePropertyScreen({ propertyId }: { propertyId: string }) {
  const router = useRouter()
  const { properties, pendingPayments, removeProperty, archiveProperty } = useRentFlow()
  const [notice, setNotice] = useState('')
  const property = properties.find(item => item.id === propertyId)
  const hasConfirmedPayments = (property?.confirmedPaymentCount ?? 0) > 0
  const hasPendingPayment = property ? pendingPayments.some(payment => payment.propertyId === property.id) : false
  const canArchive = Boolean(property && (hasConfirmedPayments || (property.leaseCount ?? 0) > 0))
  const canDelete = Boolean(property && !hasConfirmedPayments && !property.occupied && !hasPendingPayment && (property.leaseCount ?? 0) === 0)

  async function permanentlyDelete() {
    if (!property) return
    if (await removeProperty(property.id)) {
      router.replace('/logements')
      return
    }
    setNotice('La suppression n’est pas possible tant que ce logement est occupé ou lié à un paiement.')
  }

  async function archive() {
    if (!property) return
    if (await archiveProperty(property.id)) {
      router.replace('/logements')
      return
    }
    setNotice('Aucun paiement confirmé ne permet d’archiver ce logement.')
  }

  return (
    <AppFrame showTabs={false}>
      <BackTitle href="/logements">Supprimer un logement</BackTitle>
      <p className="rf-delete-intro">Deux cas possibles, selon l’historique du logement.</p>
      {property ? (
        <section className="rf-white-card rf-delete-card">
          <span className={`rf-delete-badge ${canArchive ? 'rf-delete-badge--history' : 'rf-delete-badge--empty'}`}>
            {canArchive ? 'Historique à conserver' : 'Aucun bail ni paiement'}
          </span>
          <h2>{canArchive ? `Archiver « ${property.name} » ?` : `Supprimer « ${property.name} » ?`}</h2>
          <p>{canArchive
            ? 'Ce logement disparaîtra de la liste active, mais ses baux, paiements et quittances resteront dans l’historique.'
            : 'Ce logement n’a aucun bail ni paiement. Il sera supprimé définitivement.'}</p>
          {!canArchive && !canDelete && (
            <p className="rf-delete-warning" role="note">
              Un logement occupé ou lié à un paiement en attente ne peut pas être supprimé. Terminez ou vérifiez la location d’abord.
            </p>
          )}
          <div className="rf-delete-actions">
            {canArchive
              ? <button className="rf-primary-button" type="button" onClick={archive}>Archiver</button>
              : <button className="rf-delete-confirm-danger" type="button" onClick={permanentlyDelete} disabled={!canDelete}>Supprimer définitivement</button>}
            <Link className="rf-delete-confirm-cancel" href="/logements">Annuler</Link>
          </div>
        </section>
      ) : (
        <section className="rf-white-card rf-delete-card">
          <h2>Ce logement n’est plus disponible.</h2>
          <p>La liste a peut-être été mise à jour depuis l’ouverture de cette page.</p>
          <Link className="rf-delete-confirm-cancel" href="/logements">Retour aux logements</Link>
        </section>
      )}
      {notice && <p className="rf-inline-notice" role="status">{notice}</p>}
    </AppFrame>
  )
}
