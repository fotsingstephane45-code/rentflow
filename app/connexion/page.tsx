import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { LoginScreen } from '@/components/rentflow-mobile/account-screens'

export const metadata: Metadata = { title: 'Connexion — RentFlow' }

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> }

export default async function Page({ searchParams }: PageProps) {
  const params = await searchParams
  if ('login-email' in params || 'login-password' in params) {
    const safe = new URLSearchParams()
    for (const key of ['next', 'auth_error']) {
      if (typeof params[key] === 'string') safe.set(key, params[key] as string)
    }
    redirect(`/connexion${safe.size ? `?${safe.toString()}` : ''}`)
  }
  return <LoginScreen />
}
