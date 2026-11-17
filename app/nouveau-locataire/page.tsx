import type { Metadata } from 'next'
import { NewLeaseScreen } from '@/components/rentflow-mobile/account-screens'

export const metadata: Metadata = { title: 'Nouveau locataire — RentFlow' }

type PageProps = { searchParams: Promise<{ unitId?: string }> }

export default async function Page({ searchParams }: PageProps) {
  const { unitId } = await searchParams
  return <NewLeaseScreen unitId={unitId} />
}
