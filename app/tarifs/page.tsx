import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

export const metadata: Metadata = {
  title: 'Forfaits RentFlow',
  description: 'Découvrez la période d’essai et les conditions de lancement de RentFlow.',
}

export default function TarifsPage() {
  redirect('/forfaits')
}
