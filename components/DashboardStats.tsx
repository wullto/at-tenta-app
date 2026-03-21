"use client"

import { useEffect, useState } from "react"
import { getSession } from "@/lib/storage"
import { getTotalEarnedPoints } from "@/lib/scoring"

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

function round(value: number) {
  return Math.round(value * 10) / 10
}

const SPECIALTY_COLORS: Record<string, { card: string }> = {
  internmedicin: { card: "bg-blue-100 border-blue-300" },
  kirurgi:       { card: "bg-rose-100 border-rose-300" },
  allmänmedicin: { card: "bg-emerald-100 border-emerald-300" },
  psykiatri:     { card: "bg-violet-100 border-violet-300" },
}

function specialtyCardColor(name: string) {
  return SPECIALTY_COLORS[name.toLowerCase()]?.card ?? "bg-white border-slate-200"
}

function specialtyName(caseTitle: string): string {
  const parts = caseTitle.split("–")
  return parts.length > 1 ? parts[parts.length - 1].trim() : caseTitle
}

export default function DashboardStats({
  serverStats,
  examSummaries,
  areaAverages: serverAreaAverages,
}: {
  serverStats: Stats
  examSummaries: { id: string; totalPoints: number; cases: ExamSummaryCase[] }[]
  areaAverages: AreaAverage[]
}) {
  const hasServerData = serverStats.completedCount > 0 || serverStats.inProgressCount > 0
  const [stats, setStats] = useState<Stats>(serverStats)
  const [areaAverages, setAreaAverages] = useState<AreaAverage[]>(serverAreaAverages)

  useEffect(() => {
    if (hasServerData) return

    const sessions = examSummaries
      .map((e) => ({ exam: e, session: getSession(e.id) }))
      .filter(({ session }) => session !== null)

    const completed = sessions.filter(({ session }) => !!session?.completedAt)
    const inProgress = sessions.filter(({ session }) => session && !session.completedAt)

    const totalEarned = completed.reduce((sum, { session }) => sum + getTotalEarnedPoints(session!.scores), 0)
    const totalPossible = completed.reduce((sum, { exam }) => sum + exam.totalPoints, 0)

    // Per-area aggregation
    const areaTotals = new Map<string, { earned: number; possible: number }>()
    for (const { exam, session } of completed) {
      for (const c of exam.cases) {
        const name = specialtyName(c.title)
        const earned = c.questionIds.reduce((sum, qid) => sum + (session!.scores[qid] ?? 0), 0)
        const current = areaTotals.get(name) ?? { earned: 0, possible: 0 }
        current.earned += earned
        current.possible += c.points
        areaTotals.set(name, current)
      }
    }

    setStats({
      completedCount: completed.length,
      inProgressCount: inProgress.length,
      averageEarnedPoints: completed.length ? round(totalEarned / completed.length) : 0,
      averagePercentage: totalPossible ? round((totalEarned / totalPossible) * 100) : 0,
      totalExamCount: serverStats.totalExamCount,
    })

    setAreaAverages(
      [...areaTotals.entries()].map(([label, totals]) => ({
        label,
        percentage: totals.possible ? round((totals.earned / totals.possible) * 100) : 0,
      }))
    )
  }, [hasServerData, examSummaries, serverStats.totalExamCount])

  const isEmpty = stats.completedCount === 0 && stats.inProgressCount === 0

  // Map server area averages to use specialty name (strip "Fall X – " prefix)
  const displayAreaAverages = hasServerData
    ? serverAreaAverages.map((a) => ({ ...a, label: specialtyName(a.label) }))
    : areaAverages

  return (
    <div className="mt-8 space-y-4">
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
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {displayAreaAverages.map((area) => (
            <div key={area.label} className={`rounded-2xl border p-5 shadow-sm ${specialtyCardColor(area.label)}`}>
              <p className="text-xs uppercase tracking-wide text-slate-500">Snittpoäng – {area.label}</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">{area.percentage}%</p>
            </div>
          ))}
        </div>
      )}

    </div>
  )
}
