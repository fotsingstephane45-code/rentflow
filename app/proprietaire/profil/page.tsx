import type { Metadata } from 'next'
import { OwnerProfileScreen } from '@/components/rentflow-mobile/management-screens'

export const metadata: Metadata = { title: 'Profil propriétaire — RentFlow' }

export default function Page() {
  return <OwnerProfileScreen />
}
