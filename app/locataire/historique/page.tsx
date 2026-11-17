import type { Metadata } from 'next'
import { TenantHistoryScreen } from '@/components/rentflow-mobile/tenant-screens'

export const metadata: Metadata = { title: 'Historique du loyer — RentFlow', robots: { index: false, follow: false } }

type PageProps = { searchParams: Promise<{ token?: string }> }

export default async function Page({ searchParams }: PageProps) {
  const { token } = await searchParams
  return <TenantHistoryScreen token={token ?? ''} />
}
