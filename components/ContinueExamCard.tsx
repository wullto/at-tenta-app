"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { getClearedAt, getSession, subscribeToSessionChanges } from "@/lib/storage"
import { countAnsweredAnswers, getSessionTimestamp } from "@/lib/session-utils"

type ExamSummary = {
  id: string
  title: string
  date: string
  totalQuestions: number
}

type ServerInProgress = {
  examId: string
  answeredQuestions: number
  updatedAt: string
}

type ContinueCandidate = {
  examId: string
  title: string
  date: string
  totalQuestions: number
  answeredQuestions: number
  updatedAt: string
  mode?: "tenta" | "ovning"
}

function examLabel(date: string): string {
  const d = new Date(date + "T12:00:00")
  const s = d.toLocaleDateString("sv-SE", { month: "long", year: "numeric" })
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function buildCandidate(
  exams: ExamSummary[],
  serverInProgress: ServerInProgress[],
  hasAccess: boolean
) {
  const examMap = new Map(
    exams
      .filter((exam) => hasAccess || exam.id.startsWith("2015"))
      .map((exam) => [exam.id, exam])
  )

  const candidates = new Map<string, ContinueCandidate>()

  serverInProgress.forEach((item) => {
    const exam = examMap.get(item.examId)
    if (!exam) return
    const clearedAt = getClearedAt(item.examId)
    if (clearedAt) {
      const clearedTimestamp = new Date(clearedAt).getTime()
      const serverTimestamp = new Date(item.updatedAt).getTime()
      if (!Number.isNaN(clearedTimestamp) && !Number.isNaN(serverTimestamp) && clearedTimestamp >= serverTimestamp) {
        return
      }
    }

    candidates.set(item.examId, {
      examId: item.examId,
      title: exam.title,
      date: exam.date,
      totalQuestions: exam.totalQuestions,
      answeredQuestions: item.answeredQuestions,
      updatedAt: item.updatedAt,
    })
  })

  examMap.forEach((exam) => {
    const session = getSession(exam.id)
    if (!session || session.completedAt) return

    const candidate: ContinueCandidate = {
      examId: exam.id,
      title: exam.title,
      date: exam.date,
      totalQuestions: exam.totalQuestions,
      answeredQuestions: countAnsweredAnswers(session.answers),
      updatedAt: session.updatedAt ?? session.startedAt,
      mode: session.mode,
    }

    const current = candidates.get(exam.id)
    if (!current || getSessionTimestamp(candidate) >= getSessionTimestamp(current)) {
      candidates.set(exam.id, candidate)
    }
  })

  return [...candidates.values()].sort((a, b) => getSessionTimestamp(b) - getSessionTimestamp(a))[0] ?? null
}

function buildServerCandidate(
  exams: ExamSummary[],
  serverInProgress: ServerInProgress[],
  hasAccess: boolean
) {
  const examMap = new Map(
    exams
      .filter((exam) => hasAccess || exam.id.startsWith("2015"))
      .map((exam) => [exam.id, exam])
  )

  return serverInProgress
    .map((item) => {
      const exam = examMap.get(item.examId)
      if (!exam) return null
      const clearedAt = getClearedAt(item.examId)
      if (clearedAt) {
        const clearedTimestamp = new Date(clearedAt).getTime()
        const serverTimestamp = new Date(item.updatedAt).getTime()
        if (!Number.isNaN(clearedTimestamp) && !Number.isNaN(serverTimestamp) && clearedTimestamp >= serverTimestamp) {
          return null
        }
      }

      return {
        examId: item.examId,
        title: exam.title,
        date: exam.date,
        totalQuestions: exam.totalQuestions,
        answeredQuestions: item.answeredQuestions,
        updatedAt: item.updatedAt,
      }
    })
    .filter((candidate): candidate is ContinueCandidate => candidate !== null)
    .sort((a, b) => getSessionTimestamp(b) - getSessionTimestamp(a))[0] ?? null
}

export default function ContinueExamCard({
  exams,
  serverInProgress,
  hasAccess,
}: {
  exams: ExamSummary[]
  serverInProgress: ServerInProgress[]
  hasAccess: boolean
}) {
  const [candidate, setCandidate] = useState<ContinueCandidate | null>(() =>
    buildServerCandidate(exams, serverInProgress, hasAccess)
  )

  useEffect(() => {
    const refresh = () => {
      setCandidate(buildCandidate(exams, serverInProgress, hasAccess))
    }

    refresh()
    return subscribeToSessionChanges(refresh)
  }, [exams, serverInProgress, hasAccess])

  if (!candidate) return null

  const href = `/tenta/${candidate.examId}`

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Fortsätt pågående tenta</p>
      <h2 className="mt-2 text-xl font-semibold text-slate-900">{candidate.title}</h2>
      <p className="mt-1 text-sm text-slate-500">{examLabel(candidate.date)}</p>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Link
          href={href}
          className="inline-flex items-center rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
        >
          Fortsätt där du slutade
        </Link>
      </div>
    </div>
  )
}
