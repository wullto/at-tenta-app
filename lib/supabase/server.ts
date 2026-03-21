import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"
import { getSupabaseConfig, hasSupabaseEnv } from "./config"

export async function createSupabaseServerClient() {
  if (!hasSupabaseEnv()) return null

  const cookieStore = await cookies()
  const { url, key } = getSupabaseConfig()

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // Server Components can't always write cookies during render.
        }
      },
    },
  })
}
