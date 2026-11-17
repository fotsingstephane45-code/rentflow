import type { Metadata } from 'next'
import { DashboardScreen } from '@/components/rentflow-mobile/overview-screens'

export const metadata: Metadata = {
  title: 'Tableau de bord propriétaire — RentFlow',
  description: 'Vue des logements, loyers et déclarations à vérifier.',
}

export default function Page() {
  return <DashboardScreen />
}
