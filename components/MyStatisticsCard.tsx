"use client"

import { useState } from "react"
import DashboardStats from "@/components/DashboardStats"
import RecentResultsCard from "@/components/RecentResultsCard"

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
        </div>
      )}
    </div>
  )
}
