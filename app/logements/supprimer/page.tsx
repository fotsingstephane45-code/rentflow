import type { Metadata } from 'next'
import { DeletePropertyScreen } from '@/components/rentflow-mobile/delete-property-screen'

export const metadata: Metadata = { title: 'Supprimer un logement — RentFlow' }

type PageProps = {
  searchParams: Promise<{ propertyId?: string }>
}

export default async function Page({ searchParams }: PageProps) {
  const { propertyId } = await searchParams
  return <DeletePropertyScreen propertyId={propertyId ?? ''} />
}
