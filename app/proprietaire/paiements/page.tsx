import type { Metadata } from 'next'
import { OwnerPaymentsScreen } from '@/components/rentflow-mobile/management-screens'

export const metadata: Metadata = { title: 'Paiements — RentFlow' }

export default function Page() {
  return <OwnerPaymentsScreen />
}
