"use client"

import { useEffect, useState } from "react"
import { getClearedAt, getSession, subscribeToSessionChanges } from "@/lib/storage"
import { getTotalEarnedPoints } from "@/lib/scoring"
import { getSpecialtyTheme, specialtyKey, specialtyLabel, specialtyName } from "@/lib/specialties"
import { getSessionTimestamp } from "@/lib/session-utils"

interface Stats {
  completedCount: number
  inProgressCount: number
  averageEarnedPoints: number
  averagePercentage: number
  totalExamCount: number
}

type AreaAverage = { label: string; percentage: number }

type ExamSummaryCase = {
  title: string
  points: number
  questionIds: string[]
}

type ServerProgress = {
  examId: string
  scores: Record<string, number>
  completedAt?: string
  updatedAt: string
}

function round(value: number) {
  return Math.round(value * 10) / 10
}

function buildLocalDashboard(
  examSummaries: { id: string; totalPoints: number; cases: ExamSummaryCase[] }[],
  totalExamCount: number,
  serverProgressRows: ServerProgress[]
) {
  const serverProgressMap = new Map(serverProgressRows.map((row) => [row.examId, row]))
  const sessions = examSummaries
    .map((exam) => {
      const localSession = getSession(exam.id)
      const serverSession = serverProgressMap.get(exam.id)

      if (localSession) {
        return { exam, session: localSession }
      }

      if (!serverSession) {
        return { exam, session: null }
      }

      const clearedAt = getClearedAt(exam.id)
      if (clearedAt) {
        const clearedTimestamp = new Date(clearedAt).getTime()
        const serverTimestamp = getSessionTimestamp(serverSession)
        if (!Number.isNaN(clearedTimestamp) && clearedTimestamp >= serverTimestamp) {
          return { exam, session: null }
        }
      }

      return {
        exam,
        session: {
          examId: serverSession.examId,
          answers: {},
          scores: serverSession.scores,
          startedAt: serverSession.updatedAt,
          updatedAt: serverSession.updatedAt,
          completedAt: serverSession.completedAt,
        },
      }
    })
    .filter(({ session }) => session !== null)

  const completed = sessions.filter(({ session }) => !!session?.completedAt)
  const inProgress = sessions.filter(({ session }) => session && !session.completedAt)

  const totalEarned = completed.reduce((sum, { session }) => sum + getTotalEarnedPoints(session!.scores), 0)
  const totalPossible = completed.reduce((sum, { exam }) => sum + exam.totalPoints, 0)

  const areaTotals = new Map<string, { label: string; earned: number; possible: number }>()
  for (const { exam, session } of completed) {
    for (const c of exam.cases) {
      const key = specialtyKey(c.title)
      const earned = c.questionIds.reduce((sum, qid) => sum + (session!.scores[qid] ?? 0), 0)
      const current = areaTotals.get(key) ?? {
        label: specialtyLabel(c.title),
        earned: 0,
        possible: 0,
      }
      current.earned += earned
      current.possible += c.points
      areaTotals.set(key, current)
    }
  }

  return {
    stats: {
      completedCount: completed.length,
      inProgressCount: inProgress.length,
      averageEarnedPoints: completed.length ? round(totalEarned / completed.length) : 0,
      averagePercentage: totalPossible ? round((totalEarned / totalPossible) * 100) : 0,
      totalExamCount,
    },
    areaAverages: [...areaTotals.values()].map((totals) => ({
      label: totals.label,
      percentage: totals.possible ? round((totals.earned / totals.possible) * 100) : 0,
    })),
  }
}

export default function DashboardStats({
  serverStats,
  examSummaries,
  areaAverages: serverAreaAverages,
  serverProgressRows,
}: {
  serverStats: Stats
  examSummaries: { id: string; totalPoints: number; cases: ExamSummaryCase[] }[]
  areaAverages: AreaAverage[]
  serverProgressRows: ServerProgress[]
}) {
  const [localDashboard, setLocalDashboard] = useState(() => ({
    stats: serverStats,
    areaAverages: serverAreaAverages,
  }))

  useEffect(() => {
    const refresh = () => {
      setLocalDashboard(buildLocalDashboard(examSummaries, serverStats.totalExamCount, serverProgressRows))
    }

    refresh()
    return subscribeToSessionChanges(refresh)
  }, [examSummaries, serverProgressRows, serverStats.totalExamCount])

  const stats = localDashboard.stats
  const areaAverages = localDashboard.areaAverages
  const displayAreaAverages = areaAverages.map((a) => ({ ...a, label: specialtyLabel(a.label) }))

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Klara tentor</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">
            {stats.completedCount}
            <span className="text-lg font-normal text-slate-400">/{stats.totalExamCount}</span>
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Pågående</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{stats.inProgressCount}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Snittpoäng</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{stats.averageEarnedPoints}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Snitt i procent</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{stats.averagePercentage}%</p>
        </div>
      </div>

      {displayAreaAverages.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Snitt per ämnesområde</p>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {displayAreaAverages.map((area) => (
              <div key={area.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <span
                  className={`inline-flex max-w-full whitespace-normal break-words rounded-full px-2.5 py-1 text-[11px] font-medium leading-4 ${getSpecialtyTheme(area.label).badgeStrong}`}
                >
                  {area.label}
                </span>
                <p className="mt-3 text-3xl font-semibold text-slate-900">{area.percentage}%</p>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}
