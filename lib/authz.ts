import { cookies } from "next/headers"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"

export interface AppUser {
  id: string
  email?: string
}

async function getDevUser(): Promise<AppUser | null> {
  if (process.env.NODE_ENV !== "development") return null

  const cookieStore = await cookies()
  const devLogin = cookieStore.get("dev-login")?.value
  if (devLogin !== "enabled") return null

  return {
    id: "00000000-0000-0000-0000-000000000001",
    email: "dev-admin@local.test",
  }
}

export async function getCurrentUser(): Promise<AppUser | null> {
  const devUser = await getDevUser()
  if (devUser) return devUser

  const supabase = await createSupabaseServerClient()
  if (!supabase) return null

  const {
    data: { user },
  } = await supabase.auth.getUser()

  return user
}

export async function isUserAllowed(email?: string | null) {
  if (process.env.NODE_ENV === "development" && email === "dev-admin@local.test") {
    return true
  }

  const normalizedEmail = email?.trim().toLowerCase()
  if (!normalizedEmail) return false

  try {
    const supabase = createSupabaseAdminClient()

    const { data, error } = await supabase
      .from("allowed_users")
      .select("email, is_active")
      .eq("email", normalizedEmail)
      .eq("is_active", true)
      .maybeSingle()

    if (error) return false
    return Boolean(data)
  } catch {
    return false
  }
}

export async function getAuthorizedUser() {
  const user = await getCurrentUser()
  if (!user) return null

  const isAllowed = await isUserAllowed(user.email)
  if (!isAllowed) return null

  return user
}
