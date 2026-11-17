import type { Metadata } from 'next'
import { DashboardScreen } from '@/components/rentflow-mobile/overview-screens'

export const metadata: Metadata = {
  title: 'Espace propriétaire — RentFlow',
  description: 'Suivez vos logements, échéances et paiements enregistrés dans RentFlow.',
}

export default function Page() {
  return <DashboardScreen />
}
