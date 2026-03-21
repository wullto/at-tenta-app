import { NextResponse } from "next/server"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { isUserAllowed } from "@/lib/authz"

export async function POST(request: Request) {
  const body = await request.json()
  const email = String(body.email ?? "").trim().toLowerCase()

  if (!email) {
    return NextResponse.json({ ok: false, error: "Email is required" }, { status: 400 })
  }

  if (!(await isUserAllowed(email))) {
    return NextResponse.json({ ok: false, error: "not_allowed" }, { status: 403 })
  }

  const supabase = createSupabaseAdminClient()
  const redirectTo = new URL("/auth/callback", request.url).toString()

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: redirectTo,
      shouldCreateUser: false,
    },
  })

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
