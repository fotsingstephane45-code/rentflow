import type { Metadata } from 'next'
import { SignupScreen } from '@/components/rentflow-mobile/account-screens'

export const metadata: Metadata = { title: 'Créer un compte — RentFlow' }

export default function Page() {
  return <SignupScreen />
}
