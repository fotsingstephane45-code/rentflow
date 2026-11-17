import type { Metadata } from 'next'
import { SummaryScreen } from '@/components/rentflow-mobile/overview-screens'

export const metadata: Metadata = { title: 'Synthèse mensuelle — RentFlow' }

export default function Page() {
  return <SummaryScreen />
}
