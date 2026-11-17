import type { Metadata } from 'next'
import { ConfirmPaymentScreen } from '@/components/rentflow-mobile/payment-screens'

export const metadata: Metadata = { title: 'Confirmer un paiement — RentFlow' }

type PageProps = { searchParams: Promise<{ paymentId?: string }> }

export default async function Page({ searchParams }: PageProps) {
  const { paymentId } = await searchParams
  return <ConfirmPaymentScreen paymentId={paymentId} />
}
