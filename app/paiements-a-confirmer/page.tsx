import type { Metadata } from 'next'
import { PendingPaymentsScreen } from '@/components/rentflow-mobile/overview-screens'

export const metadata: Metadata = { title: 'Paiements à confirmer — RentFlow' }

export default function Page() {
  return <PendingPaymentsScreen />
}
