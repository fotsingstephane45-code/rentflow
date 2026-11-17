import type { Metadata } from 'next'
import { RentFlowSimulation } from '@/components/rentflow-simulation'

export const metadata: Metadata = {
  title: 'Simulation du parcours locatif — RentFlow',
  description: 'Visualisez le rappel de loyer, le paiement déclaré, sa confirmation, la quittance et la synthèse mensuelle.',
}

export default function Page() {
  return <RentFlowSimulation />
}
