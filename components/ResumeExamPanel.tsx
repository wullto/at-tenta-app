"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ExamSession } from "@/types/exam"
import { subscribeToSessionChanges } from "@/lib/storage"
import { countAnsweredAnswers, getEffectiveSession } from "@/lib/session-utils"

export default function ResumeExamPanel({
  examId,
  totalQuestions,
  serverSession = null,
}: {
  examId: string
  totalQuestions: number
  serverSession?: ExamSession | null
}) {
  const [session, setSession] = useState<ExamSession | null>(null)

  useEffect(() => {
    const refresh = () => {
      setSession(getEffectiveSession(examId, serverSession))
    }

    refresh()
    return subscribeToSessionChanges(refresh)
  }, [examId, serverSession])

  if (!session || session.completedAt) return null

  const answeredQuestions = countAnsweredAnswers(session.answers)
  const href = `/tenta/${examId}/prov`

  return (
    <div className="mb-6 rounded-2xl border border-sky-200 bg-sky-50 p-5 shadow-sm">
      <p className="text-xs uppercase tracking-[0.18em] text-sky-700">Sparad progress</p>
      <h2 className="mt-2 text-lg font-semibold text-slate-900">Du har en pågående tenta</h2>
      <p className="mt-1 text-sm text-slate-600">
        {answeredQuestions} av {totalQuestions} frågor har sparats.
      </p>

      <div className="mt-4">
        <Link
          href={href}
          className="inline-flex items-center rounded-lg bg-sky-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-sky-800"
        >
          Fortsätt där du slutade
        </Link>
      </div>
    </div>
  )
}
