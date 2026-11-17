import type { Metadata } from 'next'
import { OwnerTenantsScreen } from '@/components/rentflow-mobile/management-screens'

export const metadata: Metadata = { title: 'Locataires — RentFlow' }

export default function Page() {
  return <OwnerTenantsScreen />
}
