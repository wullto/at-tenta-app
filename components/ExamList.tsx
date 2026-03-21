"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Exam } from "@/types/exam"
import { getSession } from "@/lib/storage"
import { getCaseEarnedPoints, getTotalEarnedPoints } from "@/lib/scoring"

type Status = "completed" | "in-progress"

type ExamProgress = {
  status: Status
  scores: Record<string, number>
}

type ProgressMap = Record<string, ExamProgress>

function examLabel(date: string): string {
  const d = new Date(date + "T12:00:00")
  return d.toLocaleDateString("sv-SE", { month: "long", year: "numeric" })
}

function specialtyName(caseTitle: string): string {
  const parts = caseTitle.split("–")
  return parts.length > 1 ? parts[parts.length - 1].trim() : caseTitle
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
  const [localProgressMap, setLocalProgressMap] = useState<ProgressMap>({})

  const examsByYear = exams.reduce((acc, exam) => {
    const year = exam.id.slice(0, 4)
    ;(acc[year] ??= []).push(exam)
    return acc
  }, {} as Record<string, Exam[]>)
  const years = Object.keys(examsByYear).sort((a, b) => b.localeCompare(a))

  const [openYears, setOpenYears] = useState<Record<string, boolean>>(() => ({
    [years[0]]: true,
  }))

  useEffect(() => {
    const map: ProgressMap = {}
    exams.forEach((exam) => {
      const session = getSession(exam.id)
      if (session) {
        map[exam.id] = {
          status: session.completedAt ? "completed" : "in-progress",
          scores: session.scores,
        }
      }
    })
    setLocalProgressMap(map)
  }, [exams])

  // Server data takes priority over localStorage
  const progressMap: ProgressMap = { ...localProgressMap, ...serverProgressMap }

  function toggleYear(year: string) {
    setOpenYears((prev) => ({ ...prev, [year]: !prev[year] }))
  }

  return (
    <div className="mt-5 flex flex-col gap-3">
      {years.map((year) => {
        const group = examsByYear[year]
        const isOpen = !!openYears[year]
        const completedInYear = group.filter((e) => progressMap[e.id]?.status === "completed").length

        return (
          <div key={year}>
            <button
              onClick={() => toggleYear(year)}
              className="w-full flex items-center justify-between px-2 py-2 rounded-xl hover:bg-slate-50 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <span className="text-lg font-semibold text-slate-800">{year}</span>
                {completedInYear > 0 && (
                  <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                    {completedInYear} / {group.length} avslutade
                  </span>
                )}
              </div>
              <span className="text-slate-400 text-sm transition-transform duration-200 group-hover:text-slate-600">
                {isOpen ? "▲" : "▼"}
              </span>
            </button>

            {isOpen && (
              <div className="mt-2 flex flex-col gap-3">
                {group.map((exam) => {
                  const isLocked = !hasAccess && !exam.id.startsWith("2015")
                  const progress = progressMap[exam.id]
                  const status = progress?.status
                  const scores = progress?.scores ?? {}
                  const hasProgress = !!progress
                  const totalEarned = hasProgress ? getTotalEarnedPoints(scores) : null

                  if (isLocked) {
                    return (
                      <div
                        key={exam.id}
                        className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm opacity-50 cursor-not-allowed"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="text-lg font-semibold text-slate-900">{examLabel(exam.date)}</h3>
                            <p className="mt-1 text-sm text-slate-500">{exam.date}</p>
                          </div>
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
                            Kräver godkänt konto
                          </span>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                          {exam.cases.map((c) => (
                            <span key={c.id} className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-400">
                              {specialtyName(c.title)}
                            </span>
                          ))}
                        </div>
                      </div>
                    )
                  }

                  return (
                    <Link
                      key={exam.id}
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
                            {hasProgress ? (
                              <>{totalEarned} / {exam.totalPoints} p</>
                            ) : (
                              <>{exam.totalPoints} p</>
                            )}
                          </span>
                          {status === "completed" && (
                            <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                              Avslutad
                            </span>
                          )}
                          {status === "in-progress" && (
                            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
                              Pågående
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {exam.cases.map((c) => {
                          const name = specialtyName(c.title)
                          if (!hasProgress) {
                            return (
                              <span key={c.id} className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-500">
                                {name}
                              </span>
                            )
                          }
                          const caseEarned = getCaseEarnedPoints(exam, c.id, scores)
                          return (
                            <span key={c.id} className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-600 font-medium">
                              {name}: {caseEarned}/{c.points}
                            </span>
                          )
                        })}
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
