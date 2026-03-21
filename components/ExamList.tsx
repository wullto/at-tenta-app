"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Exam } from "@/types/exam"
import { getSession } from "@/lib/storage"

type Status = "completed" | "in-progress"
type StatusMap = Record<string, Status>

export default function ExamList({
  exams,
  serverStatusMap = {},
}: {
  exams: Exam[]
  serverStatusMap?: StatusMap
}) {
  const [localStatusMap, setLocalStatusMap] = useState<StatusMap>({})

  // Group and sort years descending (newest first)
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
    const map: StatusMap = {}
    exams.forEach((exam) => {
      const session = getSession(exam.id)
      if (session?.completedAt) map[exam.id] = "completed"
      else if (session) map[exam.id] = "in-progress"
    })
    setLocalStatusMap(map)
  }, [exams])

  // Server data takes priority over localStorage
  const statusMap: StatusMap = { ...localStatusMap, ...serverStatusMap }

  function toggleYear(year: string) {
    setOpenYears((prev) => ({ ...prev, [year]: !prev[year] }))
  }

  return (
    <div className="mt-5 flex flex-col gap-3">
      {years.map((year) => {
        const group = examsByYear[year]
        const isOpen = !!openYears[year]
        const completedInYear = group.filter((e) => statusMap[e.id] === "completed").length

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
                  const status = statusMap[exam.id]
                  return (
                    <Link
                      key={exam.id}
                      href={`/tenta/${exam.id}`}
                      className="block rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-lg font-semibold text-slate-900">{exam.title}</h3>
                          <p className="mt-1 text-sm text-slate-500">{exam.date}</p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
                            {exam.totalPoints} poäng
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
                          <p className="text-xs text-slate-400">{exam.cases.length} fall</p>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {exam.cases.map((c) => (
                          <span key={c.id} className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-500">
                            {c.title}
                          </span>
                        ))}
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
