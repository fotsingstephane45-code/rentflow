import type { Metadata } from 'next'
import { RentFlowSite } from '@/components/rentflow-site'

export const metadata: Metadata = {
  title: 'RentFlow — Votre gestion locative, enfin simplifiée',
  description: 'Gérez vos logements, suivez les loyers et retrouvez vos quittances dans une application pensée pour les propriétaires au Cameroun.',
}

export default function Page() {
  return <RentFlowSite />
}
