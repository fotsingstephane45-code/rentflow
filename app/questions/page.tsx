import type { Metadata } from 'next'
import { QuestionsPage } from '@/components/rentflow-pages'

export const metadata: Metadata = { title: 'Questions fréquentes | RentFlow', description: 'Réponses sur les loyers, rappels, quittances et RentFlow.' }
export default function Page() { return <QuestionsPage /> }
