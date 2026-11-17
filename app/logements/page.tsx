import type { Metadata } from 'next'
import { PropertiesScreen } from '@/components/rentflow-mobile/overview-screens'

export const metadata: Metadata = { title: 'Mes logements — RentFlow' }

export default function Page() {
  return <PropertiesScreen />
}
