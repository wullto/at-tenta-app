"use client"

import { useState } from "react"
import DashboardStats from "@/components/DashboardStats"
import RecentResultsCard from "@/components/RecentResultsCard"
import { clearSession } from "@/lib/storage"

type Stats = {
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

type RecentResult = {
  examId: string
  title: string
  completedAt?: string
  percentage: number
}

export default function MyStatisticsCard({
  serverStats,
  examSummaries,
  areaAverages,
  serverProgressRows,
  recentResults,
}: {
  serverStats: Stats
  examSummaries: { id: string; totalPoints: number; cases: ExamSummaryCase[] }[]
  areaAverages: AreaAverage[]
  serverProgressRows: ServerProgress[]
  recentResults: RecentResult[]
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [clearing, setClearing] = useState(false)

  async function handleClearAll() {
    if (!confirming) {
      setConfirming(true)
      return
    }
    setClearing(true)
    examSummaries.forEach((exam) => clearSession(exam.id))
    await fetch("/api/exam-progress", { method: "DELETE" }).catch(() => {})
    window.location.reload()
  }

  return (
    <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="flex w-full items-center justify-between text-left"
        aria-expanded={isOpen}
      >
        <h2 className="text-base font-semibold text-slate-900">Min statistik</h2>
        <span className="text-sm font-medium text-slate-500">{isOpen ? "Dolj" : "Visa"}</span>
      </button>

      {isOpen && (
        <div className="mt-4 space-y-6">
          <DashboardStats
            serverStats={serverStats}
            examSummaries={examSummaries}
            areaAverages={areaAverages}
            serverProgressRows={serverProgressRows}
          />
          <RecentResultsCard results={recentResults} />
          <div className="flex items-center justify-end gap-3">
            {confirming && (
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="text-sm text-slate-500 hover:text-slate-700"
              >
                Avbryt
              </button>
            )}
            <button
              type="button"
              onClick={handleClearAll}
              disabled={clearing}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                confirming
                  ? "bg-red-600 text-white hover:bg-red-700"
                  : "border border-slate-200 text-slate-600 hover:border-red-300 hover:text-red-600"
              } disabled:opacity-50`}
            >
              {clearing ? "Rensar…" : confirming ? "Ja, rensa allt" : "Rensa all historik"}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
