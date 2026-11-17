import type { Metadata } from 'next'
import { PropertyDetailsScreen } from '@/components/rentflow-mobile/management-screens'

export const metadata: Metadata = { title: 'Détail du logement — RentFlow' }

type PageProps = { params: Promise<{ id: string }> }

export default async function Page({ params }: PageProps) {
  const { id } = await params
  return <PropertyDetailsScreen propertyId={id} />
}
