import { NextResponse } from "next/server"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"

export async function POST(request: Request) {
  const body = await request.json()
  const email = String(body.email ?? "").trim().toLowerCase()

  if (!email) {
    return NextResponse.json({ ok: false, error: "Email is required" }, { status: 400 })
  }

  const supabase = createSupabaseAdminClient()
  const { error } = await supabase.from("access_requests").upsert(
    {
      email,
      status: "pending",
      requested_at: new Date().toISOString(),
    },
    {
      onConflict: "email",
    }
  )

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
