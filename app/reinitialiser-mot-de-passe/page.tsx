import type { Metadata } from 'next'
import { PasswordRecoveryScreen } from '@/components/rentflow-mobile/account-screens'

export const metadata: Metadata = { title: 'Réinitialisation du mot de passe — RentFlow' }

export default function Page() {
  return <PasswordRecoveryScreen reset />
}
