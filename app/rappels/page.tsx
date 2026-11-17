import type { Metadata } from 'next'
import { RemindersScreen } from '@/components/rentflow-mobile/overview-screens'

export const metadata: Metadata = { title: 'Rappels — RentFlow' }

export default function Page() {
  return <RemindersScreen />
}
