import { NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { getCurrentUser, isUserAllowed } from "@/lib/authz"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"

export async function POST(request: Request, { params }: { params: Promise<{ examId: string }> }) {
  const { examId } = await params
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

  const body = await request.json()
  const payload = {
    user_id: user.id,
    exam_id: examId,
    answers: body.answers ?? {},
    scores: body.scores ?? {},
    started_at: body.startedAt ?? new Date().toISOString(),
    completed_at: body.completedAt ?? null,
    updated_at: new Date().toISOString(),
  }

  const { error } = await supabase.from("user_exam_progress").upsert(payload, {
    onConflict: "user_id,exam_id",
  })

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
