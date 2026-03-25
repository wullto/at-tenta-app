"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Exam, ExamSession } from "@/types/exam"
import { getClearedAt, subscribeToSessionChanges } from "@/lib/storage"
import { getTotalEarnedPoints } from "@/lib/scoring"
import { countAnsweredAnswers, getEffectiveSession, getTotalQuestionCount } from "@/lib/session-utils"

type Status = "completed" | "in-progress"

type ServerProgress = {
  status: Status
  scores: Record<string, number>
  updatedAt?: string
}

type ProgressMap = Record<string, ServerProgress>

function examLabel(date: string): string {
  const d = new Date(date + "T12:00:00")
  const s = d.toLocaleDateString("sv-SE", { month: "long", year: "numeric" })
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function ExamCard({
  exam,
  serverProgress,
  isLocked,
}: {
  exam: Exam
  serverProgress?: ServerProgress
  isLocked: boolean
}) {
  const [session, setSession] = useState<ExamSession | null>(null)
  const [clearedAt, setClearedAt] = useState<string | null>(null)

  useEffect(() => {
    const refresh = () => {
      setSession(getEffectiveSession(exam.id, null))
      setClearedAt(getClearedAt(exam.id))
    }
    refresh()
    return subscribeToSessionChanges(refresh)
  }, [exam.id])

  const totalQuestions = getTotalQuestionCount(exam)
  const answered = session ? countAnsweredAnswers(session.answers) : 0
  const pct = totalQuestions > 0 ? Math.round((answered / totalQuestions) * 100) : 0

  const effectiveServerProgress = (() => {
    if (!serverProgress || !clearedAt) return serverProgress
    const clearedTs = new Date(clearedAt).getTime()
    const serverTs = serverProgress.updatedAt ? new Date(serverProgress.updatedAt).getTime() : 0
    return clearedTs >= serverTs ? undefined : serverProgress
  })()

  const status = session
    ? session.completedAt ? "completed" : "in-progress"
    : effectiveServerProgress?.status
  const isCompleted = status === "completed"
  const scores = session?.scores ?? effectiveServerProgress?.scores ?? {}
  const totalEarned = isCompleted ? getTotalEarnedPoints(scores) : null
  const hasProgress = !!session || !!effectiveServerProgress

  if (isLocked) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm opacity-50 cursor-not-allowed">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">{examLabel(exam.date)}</h3>
            <p className="mt-1 text-sm text-slate-500">{exam.date}</p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
            Kräver godkänt konto
          </span>
        </div>
      </div>
    )
  }

  return (
    <Link
      href={`/tenta/${exam.id}`}
      className="block rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
    >
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{examLabel(exam.date)}</h3>
          <p className="mt-1 text-sm text-slate-500">{exam.date}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
            {isCompleted ? <>{totalEarned} / {exam.totalPoints} p</> : <>{exam.totalPoints} p</>}
          </span>
          {status === "completed" && (
            <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">Avslutad</span>
          )}
          {status === "in-progress" && (
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">Pågående</span>
          )}
        </div>
      </div>

      <div className="mt-4">
        {hasProgress && (
          <p className="text-sm text-gray-500 mb-2">
            {answered} av {totalQuestions} frågor besvarade
          </p>
        )}
        <div className="w-full bg-gray-100 rounded-full h-2">
          <div
            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </Link>
  )
}

export default function ExamList({
  exams,
  serverProgressMap = {},
  hasAccess = false,
}: {
  exams: Exam[]
  serverProgressMap?: ProgressMap
  hasAccess?: boolean
}) {
  const examsByYear = exams.reduce((acc, exam) => {
    const year = exam.id.slice(0, 4)
    ;(acc[year] ??= []).push(exam)
    return acc
  }, {} as Record<string, Exam[]>)
  const years = Object.keys(examsByYear).sort((a, b) => b.localeCompare(a))

  const [openYears, setOpenYears] = useState<Record<string, boolean>>(() => ({
    [years[0]]: true,
  }))

  function toggleYear(year: string) {
    setOpenYears((prev) => ({ ...prev, [year]: !prev[year] }))
  }

  return (
    <div className="mt-5 flex flex-col">
      {years.map((year, yearIndex) => {
        const group = examsByYear[year]
        const isOpen = !!openYears[year]

        return (
          <div key={year}>
            {yearIndex > 0 && <hr className="border-slate-200 mb-3" />}
            <button
              onClick={() => toggleYear(year)}
              className="w-full flex items-center justify-between px-2 py-2 rounded-xl hover:bg-slate-50 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <span className="text-lg font-semibold text-slate-800">{year}</span>
              </div>
              <span className="text-slate-400 text-sm transition-transform duration-200 group-hover:text-slate-600">
                {isOpen ? "▲" : "▼"}
              </span>
            </button>

            {isOpen && (
              <div className="mt-2 flex flex-col gap-3">
                {group.map((exam) => (
                  <ExamCard
                    key={exam.id}
                    exam={exam}
                    serverProgress={serverProgressMap[exam.id]}
                    isLocked={!hasAccess && !exam.id.startsWith("2015")}
                  />
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
