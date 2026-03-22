"use client"

import { useEffect, useMemo, useState } from "react"
import { getClearedAt, subscribeToSessionChanges } from "@/lib/storage"

type RecentResult = {
  examId: string
  title: string
  completedAt?: string
  percentage: number
}

function wasClearedAfterResult(result: RecentResult) {
  const clearedAt = getClearedAt(result.examId)
  if (!clearedAt || !result.completedAt) return false

  const clearedTimestamp = new Date(clearedAt).getTime()
  const completedTimestamp = new Date(result.completedAt).getTime()

  if (Number.isNaN(clearedTimestamp) || Number.isNaN(completedTimestamp)) {
    return false
  }

  return clearedTimestamp >= completedTimestamp
}

export default function RecentResultsCard({ results }: { results: RecentResult[] }) {
  const [sessionVersion, setSessionVersion] = useState(0)

  useEffect(() => {
    return subscribeToSessionChanges(() => {
      setSessionVersion((version) => version + 1)
    })
  }, [])

  const visibleResults = useMemo(() => {
    void sessionVersion
    return results.filter((result) => !wasClearedAfterResult(result))
  }, [results, sessionVersion])

  if (visibleResults.length === 0) return null

  return (
    <div className="space-y-3">
      <h3 className="text-xs uppercase tracking-[0.18em] text-slate-500">Senaste resultat</h3>
      <div className="space-y-3">
        {visibleResults.map((item) => (
          <div key={item.examId} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-slate-900">{item.title}</p>
              <p className="text-xs text-slate-500">{item.completedAt?.slice(0, 10)}</p>
            </div>
            <p className="text-sm font-semibold text-slate-900">{item.percentage}%</p>
          </div>
        ))}
      </div>
    </div>
  )
}
