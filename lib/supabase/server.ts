import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getSupabasePublicConfig } from './config'

export async function createClient() {
  const config = getSupabasePublicConfig()
  if (!config) throw new Error('Supabase public environment variables are missing.')

  const cookieStore = await cookies()
  return createServerClient(config.url, config.key, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // Les Server Components ne peuvent pas écrire les cookies; proxy.ts les rafraîchit.
        }
      },
    },
  })
}
