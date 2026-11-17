import type { Metadata } from 'next'
import { TenantPaymentScreen } from '@/components/rentflow-mobile/payment-screens'

export const metadata: Metadata = { title: 'Paiement du loyer — RentFlow', robots: { index: false, follow: false } }

type PageProps = { searchParams: Promise<{ token?: string }> }

export default async function Page({ searchParams }: PageProps) {
  const { token } = await searchParams
  return <TenantPaymentScreen token={token ?? ''} />
}
