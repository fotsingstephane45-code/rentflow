import type { Metadata } from 'next'
import { ForfaitsScreen } from '@/components/rentflow-mobile/forfaits-screen'

export const metadata: Metadata = {
  title: 'Forfaits RentFlow',
  description: 'Comparez le forfait gratuit RentFlow et le forfait payant dont le tarif reste à définir.',
}

export default function ForfaitsPage() {
  return <ForfaitsScreen />
}
