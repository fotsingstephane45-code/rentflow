import type { Metadata } from 'next'
import { FeaturesPage } from '@/components/rentflow-pages'

export const metadata: Metadata = { title: 'Fonctionnalités | RentFlow', description: 'Suivez vos logements, loyers, rappels et quittances dans un espace locatif clair.' }
export default function Page() { return <FeaturesPage /> }
