"use client"

import { useEffect, useState } from "react"
import { getSession } from "@/lib/storage"
import { getTotalEarnedPoints } from "@/lib/scoring"

interface Stats {
  completedCount: number
  inProgressCount: number
  averageEarnedPoints: number
  averagePercentage: number
}

function round(value: number) {
  return Math.round(value * 10) / 10
}

export default function DashboardStats({
  serverStats,
  examSummaries,
}: {
  serverStats: Stats
  examSummaries: { id: string; totalPoints: number }[]
}) {
  const hasServerData = serverStats.completedCount > 0 || serverStats.inProgressCount > 0
  const [stats, setStats] = useState<Stats>(serverStats)

  useEffect(() => {
    if (hasServerData) return

    const sessions = examSummaries
      .map((e) => ({ examId: e.id, totalPoints: e.totalPoints, session: getSession(e.id) }))
      .filter(({ session }) => session !== null)

    const completed = sessions.filter(({ session }) => !!session?.completedAt)
    const inProgress = sessions.filter(({ session }) => session && !session.completedAt)

    const totalEarned = completed.reduce((sum, { session }) => sum + getTotalEarnedPoints(session!.scores), 0)
    const totalPossible = completed.reduce((sum, { totalPoints }) => sum + totalPoints, 0)

    setStats({
      completedCount: completed.length,
      inProgressCount: inProgress.length,
      averageEarnedPoints: completed.length ? round(totalEarned / completed.length) : 0,
      averagePercentage: totalPossible ? round((totalEarned / totalPossible) * 100) : 0,
    })
  }, [hasServerData, examSummaries])

  const isEmpty = stats.completedCount === 0 && stats.inProgressCount === 0

  return (
    <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs uppercase tracking-wide text-slate-500">Klara tentor</p>
        <p className="mt-2 text-3xl font-semibold text-slate-900">{stats.completedCount}</p>
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
      {isEmpty && (
        <p className="col-span-full text-sm text-slate-400 pt-1">
          Välj en tenta nedan för att komma igång — statistiken dyker upp här när du är klar.
        </p>
      )}
    </div>
  )
}
