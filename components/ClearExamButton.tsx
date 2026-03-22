"use client"

import { useEffect, useState } from "react"
import { ExamSession } from "@/types/exam"
import { clearSession, subscribeToSessionChanges } from "@/lib/storage"
import { getEffectiveSession } from "@/lib/session-utils"

export default function ClearExamButton({
  examId,
  serverSession = null,
}: {
  examId: string
  serverSession?: ExamSession | null
}) {
  const [session, setSession] = useState<ExamSession | null>(null)
  const [clearing, setClearing] = useState(false)

  useEffect(() => {
    const refresh = () => {
      setSession(getEffectiveSession(examId, serverSession))
    }

    refresh()
    return subscribeToSessionChanges(refresh)
  }, [examId, serverSession])

  const hasProgress = Boolean(session)
  const status = session ? (session.completedAt ? "completed" : "in-progress") : null

  if (clearing || !hasProgress) return null

  async function handleClear() {
    if (!confirm("Rensa alla svar och poäng för den här tentan? Det går inte att ångra.")) return

    setClearing(true)
    clearSession(examId)

    await fetch(`/api/exam-progress/${examId}`, { method: "DELETE" }).catch(() => {
      // Ignore errors — user may not be authenticated
    })

    setSession(null)
    setClearing(false)
    window.location.reload()
  }

  return (
    <div className="mt-6 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="text-sm">
        <span className="text-slate-600">Status: </span>
        {status === "completed" ? (
          <span className="font-medium text-green-700">Avslutad</span>
        ) : (
          <span className="font-medium text-amber-700">Pågående</span>
        )}
      </div>
      <button
        onClick={handleClear}
        className="text-xs text-slate-500 hover:text-red-600 underline underline-offset-2 transition-colors"
      >
        Rensa och börja om
      </button>
    </div>
  )
}
