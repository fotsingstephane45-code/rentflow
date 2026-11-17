import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { getSupabasePublicConfig } from '@/lib/supabase/config'

function requiresAccount(pathname: string) {
  return pathname === '/espace-proprietaire'
    || pathname === '/logements'
    || pathname.startsWith('/logements/')
    || pathname === '/nouveau-locataire'
    || pathname === '/paiements-a-confirmer'
    || pathname === '/confirmer-paiement'
    || pathname === '/rappels'
    || pathname === '/synthese'
    || pathname === '/quittance'
    || pathname === '/proprietaire'
    || pathname.startsWith('/proprietaire/')
}

function loginRedirect(request: NextRequest, reason?: string) {
  const loginUrl = new URL('/connexion', request.url)
  loginUrl.searchParams.set('next', `${request.nextUrl.pathname}${request.nextUrl.search}`)
  if (reason) loginUrl.searchParams.set('auth_error', reason)
  return NextResponse.redirect(loginUrl)
}

export async function proxy(request: NextRequest) {
  const config = getSupabasePublicConfig()
  if (!config) {
    if (requiresAccount(request.nextUrl.pathname)) return loginRedirect(request, 'config')
    return NextResponse.next({ request })
  }

  let response = NextResponse.next({ request })
  const supabase = createServerClient(config.url, config.key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
      },
    },
  })

  // Rafraîchit les cookies de session et protège l'espace du titulaire.
  // Les tables métier gardent leurs propres contrôles RLS côté base.
  const { data, error } = await supabase.auth.getClaims()
  const claims = data?.claims
  if (requiresAccount(request.nextUrl.pathname) && (error || !claims)) return loginRedirect(request)
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
