import type { Metadata } from 'next'
import { HowItWorksPage } from '@/components/rentflow-pages'

export const metadata: Metadata = { title: 'Comment ça marche | RentFlow', description: 'Découvrez les trois étapes de suivi locatif avec RentFlow.' }
export default function Page() { return <HowItWorksPage /> }
