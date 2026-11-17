import type { Metadata } from 'next'
import { ContactPage } from '@/components/rentflow-pages'

export const metadata: Metadata = { title: 'Contact | RentFlow', description: 'Parlez-nous de votre gestion locative et de votre intérêt pour RentFlow.' }
export default function Page() { return <ContactPage /> }
