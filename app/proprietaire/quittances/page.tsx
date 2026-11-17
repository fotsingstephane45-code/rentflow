import type { Metadata } from 'next'
import { OwnerReceiptsScreen } from '@/components/rentflow-mobile/management-screens'

export const metadata: Metadata = { title: 'Quittances — RentFlow' }

export default function Page() {
  return <OwnerReceiptsScreen />
}
