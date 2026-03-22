"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ExamSession } from "@/types/exam"
import { subscribeToSessionChanges } from "@/lib/storage"
import { getEffectiveSession } from "@/lib/session-utils"

export default function ModeSelector({
  examId,
  serverSession = null,
}: {
  examId: string
  serverSession?: ExamSession | null
}) {
  const router = useRouter()
  const [session, setSession] = useState<ExamSession | null>(null)

  useEffect(() => {
    const refresh = () => {
      setSession(getEffectiveSession(examId, serverSession))
    }

    refresh()
    return subscribeToSessionChanges(refresh)
  }, [examId, serverSession])

  if (session && !session.completedAt) {
    return null
  }

  return (
    <button
      onClick={() => router.push(`/tenta/${examId}/prov`)}
      className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
    >
      Starta tenta →
    </button>
  )
}
