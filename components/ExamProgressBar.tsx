"use client"

import { useEffect, useState } from "react"
import { ExamSession } from "@/types/exam"
import { subscribeToSessionChanges } from "@/lib/storage"
import { countAnsweredAnswers, getEffectiveSession } from "@/lib/session-utils"

export default function ExamProgressBar({
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

  const answered = session ? countAnsweredAnswers(session.answers) : 0
  const percentage = totalQuestions ? Math.round((answered / totalQuestions) * 100) : 0

  return (
    <div className="mb-5">
      <p className="text-sm text-gray-500 mb-2">
        {answered} av {totalQuestions} frågor besvarade
      </p>
      <div className="w-full bg-gray-100 rounded-full h-2">
        <div
          className="bg-blue-500 h-2 rounded-full transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}
