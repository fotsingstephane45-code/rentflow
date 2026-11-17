import type { Metadata } from 'next'
import { TenantReceiptsScreen } from '@/components/rentflow-mobile/tenant-screens'

export const metadata: Metadata = { title: 'Quittance locataire — RentFlow', robots: { index: false, follow: false } }

type PageProps = { searchParams: Promise<{ token?: string }> }

export default async function Page({ searchParams }: PageProps) {
  const { token } = await searchParams
  return <TenantReceiptsScreen token={token ?? ''} />
}
