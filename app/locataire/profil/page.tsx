import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

export const metadata: Metadata = { title: 'Informations du locataire — RentFlow' }

type PageProps = { searchParams: Promise<{ token?: string }> }

export default async function Page({ searchParams }: PageProps) {
  const { token } = await searchParams
  redirect(token ? `/paiement?token=${encodeURIComponent(token)}` : '/paiement')
}
