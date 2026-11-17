import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'RentFlow — Gestion locative',
    short_name: 'RentFlow',
    description: 'Suivi locatif pensé pour les propriétaires et locataires au Cameroun.',
    start_url: '/espace-proprietaire',
    display: 'standalone',
    background_color: '#f8f7f2',
    theme_color: '#0b8067',
    lang: 'fr-CM',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' }],
  }
}
