"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { clearSession, getSession } from "@/lib/storage"

export default function ClearExamButton({ examId }: { examId: string }) {
  const router = useRouter()
  const [hasProgress, setHasProgress] = useState(false)
  const [status, setStatus] = useState<"completed" | "in-progress" | null>(null)

  useEffect(() => {
    const session = getSession(examId)
    if (session) {
      setHasProgress(true)
      setStatus(session.completedAt ? "completed" : "in-progress")
    }
  }, [examId])

  if (!hasProgress) return null

  async function handleClear() {
    if (!confirm("Rensa alla svar och poäng för den här tentan? Det går inte att ångra.")) return

    clearSession(examId)

    await fetch(`/api/exam-progress/${examId}`, { method: "DELETE" }).catch(() => {
      // Ignore errors — user may not be authenticated
    })

    setHasProgress(false)
    setStatus(null)
    router.refresh()
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
