import type { Metadata } from 'next'
import { AboutPage } from '@/components/rentflow-pages'

export const metadata: Metadata = {
  title: 'À propos de RentFlow',
  description: 'Découvrez la mission de RentFlow : rendre le suivi locatif plus clair pour les propriétaires et locataires au Cameroun.',
}

export default function Page() {
  return <AboutPage />
}
