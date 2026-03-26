import { NextResponse } from "next/server"
import { getCurrentUser, isUserAllowed } from "@/lib/authz"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export async function DELETE() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  if (!(await isUserAllowed(user.email))) {
    return NextResponse.json({ ok: false, error: "User is not approved" }, { status: 403 })
  }

  const supabase =
    process.env.NODE_ENV === "development" && user.id === "00000000-0000-0000-0000-000000000001"
      ? createSupabaseAdminClient()
      : await createSupabaseServerClient()

  if (!supabase) {
    return NextResponse.json({ ok: false, error: "Supabase is not configured" }, { status: 503 })
  }

  const { error } = await supabase.from("user_exam_progress").delete().eq("user_id", user.id)

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
