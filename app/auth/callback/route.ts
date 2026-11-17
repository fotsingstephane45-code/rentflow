import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function safeNextPath(value: string | null) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/espace-proprietaire'
  return value
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')
  const next = safeNextPath(request.nextUrl.searchParams.get('next'))
  const errorUrl = new URL('/connexion?auth_error=callback', request.url)

  if (!code) return NextResponse.redirect(errorUrl)

  const supabase = await createClient()
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
  if (exchangeError) return NextResponse.redirect(errorUrl)

  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    const metadata = user.user_metadata ?? {}
    const profileChanges: Record<string, string | null> = { email: user.email ?? null }
    if (typeof metadata.full_name === 'string') profileChanges.full_name = metadata.full_name
    if (typeof metadata.phone === 'string') profileChanges.phone = metadata.phone
    if (metadata.account_kind === 'agent' || metadata.account_kind === 'owner') profileChanges.account_kind = metadata.account_kind
    if (typeof metadata.orange_money_phone === 'string') profileChanges.orange_money_phone = metadata.orange_money_phone
    if (typeof metadata.mtn_momo_phone === 'string') profileChanges.mtn_momo_phone = metadata.mtn_momo_phone
    await supabase.from('profiles').update(profileChanges).eq('user_id', user.id)
  }

  return NextResponse.redirect(new URL(next, request.url))
}
