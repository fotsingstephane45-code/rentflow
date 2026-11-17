import type { Metadata } from 'next'
import { ReceiptScreen } from '@/components/rentflow-mobile/payment-screens'

export const metadata: Metadata = { title: 'Quittance de loyer — RentFlow' }

type PageProps = { searchParams: Promise<{ number?: string }> }

export default async function Page({ searchParams }: PageProps) {
  const { number } = await searchParams
  return <ReceiptScreen receiptNumber={number} />
}
