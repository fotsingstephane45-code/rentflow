import type { Metadata } from 'next'
import { PasswordRecoveryScreen } from '@/components/rentflow-mobile/account-screens'

export const metadata: Metadata = { title: 'Mot de passe oublié — RentFlow' }

export default function Page() {
  return <PasswordRecoveryScreen />
}
