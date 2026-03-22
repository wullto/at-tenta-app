"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Exam, ExamSession } from "@/types/exam"
import { getSession, saveScore, setSession } from "@/lib/storage"
import { getTotalEarnedPoints, getCaseEarnedPoints } from "@/lib/scoring"
import { getSpecialtyTheme, specialtyName } from "@/lib/specialties"
import { getEffectiveSession } from "@/lib/session-utils"

async function persistSession(examId: string, session: ExamSession) {
  await fetch(`/api/exam-progress/${examId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(session),
  })
}

export default function ResultatView({
  exam,
  initialSession = null,
  persistRemotely = false,
}: {
  exam: Exam
  initialSession?: ExamSession | null
  persistRemotely?: boolean
}) {
  const router = useRouter()
  const effectiveSession = getEffectiveSession(exam.id, initialSession)
  const seedSession = effectiveSession
  const [answers] = useState<Record<string, string>>(() => seedSession?.answers ?? {})
  const [startedAt] = useState(seedSession?.startedAt ?? new Date().toISOString())
  const [scores, setScores] = useState<Record<string, number>>(() => seedSession?.scores ?? {})
  const [completedAt, setCompletedAt] = useState<string | undefined>(seedSession?.completedAt)
  const [openCases, setOpenCases] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(exam.cases.map((c) => [c.id, true]))
  )

  useEffect(() => {
    if (initialSession && !getSession(exam.id) && effectiveSession) {
      setSession(exam.id, initialSession)
    }
  }, [effectiveSession, exam.id, initialSession])

  async function syncSession(nextScores: Record<string, number>, nextCompletedAt = completedAt) {
    const nextSession: ExamSession = {
      examId: exam.id,
      answers,
      scores: nextScores,
      startedAt,
      completedAt: nextCompletedAt,
    }
    setSession(exam.id, nextSession)
    if (persistRemotely) {
      await persistSession(exam.id, nextSession)
    }
  }

  async function handleGoHome() {
    await syncSession(scores)
    router.push("/")
    router.refresh()
  }

  async function handleFinish() {
    const finishedAt = new Date().toISOString()
    setCompletedAt(finishedAt)
    await syncSession(scores, finishedAt)
    router.push("/")
    router.refresh()
  }

  function handleScore(questionId: string, score: number) {
    saveScore(exam.id, questionId, score)
    setScores((prev) => {
      const nextScores = { ...prev, [questionId]: score }
      const nextSession: ExamSession = {
        examId: exam.id,
        answers,
        scores: nextScores,
        startedAt,
        completedAt,
      }
      setSession(exam.id, nextSession)
      if (persistRemotely) {
        void persistSession(exam.id, nextSession)
      }
      return nextScores
    })
  }

  function toggleCase(caseId: string) {
    setOpenCases((prev) => ({ ...prev, [caseId]: !prev[caseId] }))
  }

  const totalEarned = getTotalEarnedPoints(scores)

  const durationMinutes =
    completedAt && startedAt
      ? Math.round((new Date(completedAt).getTime() - new Date(startedAt).getTime()) / 60000)
      : null

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Link href={`/tenta/${exam.id}`} className="text-sm text-blue-600 hover:underline mb-6 inline-block">
        ← Tillbaka
      </Link>

      <h1 className="text-2xl font-bold mb-1">Resultat</h1>
      <p className="text-gray-500 mb-6">{exam.title}</p>

      <div className="mb-6 flex flex-wrap gap-3">
        <Link
          href={`/tenta/${exam.id}/prov`}
          className="bg-blue-600 text-white px-5 py-3 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          Gör om tentan
        </Link>
        <button
          onClick={handleFinish}
          className="bg-slate-900 text-white px-5 py-3 rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors"
        >
          Avsluta och spara
        </button>
        <button
          onClick={handleGoHome}
          className="bg-gray-100 text-gray-700 px-5 py-3 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
        >
          Tillbaka till startsidan
        </button>
      </div>

      {/* Score summary */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-8">
        <div className="flex items-end gap-2 mb-4">
          <span className="text-4xl font-bold text-blue-600">{totalEarned}</span>
          <span className="text-xl text-gray-400 mb-1">/ {exam.totalPoints}</span>
          <span className="text-sm text-gray-500 mb-1.5 ml-1">poäng</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2 mb-4">
          <div
            className="bg-blue-500 h-2 rounded-full transition-all"
            style={{ width: `${Math.min((totalEarned / exam.totalPoints) * 100, 100)}%` }}
          />
        </div>
        {durationMinutes !== null && (
          <p className="text-sm text-gray-500 mb-4">Tid: {durationMinutes} min</p>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {exam.cases.map((c) => {
            const earned = getCaseEarnedPoints(exam, c.id, scores)
            const theme = getSpecialtyTheme(c.title)
            return (
              <div key={c.id} className={`${theme.card} rounded-lg border p-3 text-center`}>
                <div className="text-xs text-gray-500 mb-1 truncate">{c.title}</div>
                <div className="font-semibold text-sm">
                  {earned} / {c.points}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <p className="text-sm text-gray-500 mb-4">
        Läs igenom facit och sätt dina egna poäng per fråga. Tentan förblir pågående tills du väljer att avsluta och spara.
      </p>

      {/* Case-by-case review */}
      {exam.cases.map((c) => {
        const theme = getSpecialtyTheme(c.title)
        const specialty = specialtyName(c.title)
        return (
        <div key={c.id} className="mb-4">
          <button
            onClick={() => toggleCase(c.id)}
            className="w-full flex justify-between items-center border border-gray-200 rounded-xl bg-white px-5 py-4 transition-colors hover:bg-gray-50"
          >
            <div className="flex items-center gap-3">
              <div className="text-left">
                <span className="font-semibold block">{c.title}</span>
                <span className="text-xs text-gray-500">{specialty}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500">
                {getCaseEarnedPoints(exam, c.id, scores)} / {c.points} p
              </span>
              <span className="text-gray-400">{openCases[c.id] ? "▲" : "▼"}</span>
            </div>
          </button>

          {openCases[c.id] && (
            <div className="border border-t-0 border-gray-200 rounded-b-xl overflow-hidden bg-gray-50">
              {c.pages.map((page) =>
                page.questions.map((q) => (
                  <div key={q.id} className="border-t border-gray-100 p-5">
                    {/* Question */}
                    <p className="text-sm font-medium text-gray-800 mb-2">{q.text}</p>
                    {q.hint && <p className="text-xs text-gray-400 italic mb-3">{q.hint}</p>}
                    {q.imageUrl && (
                      <div className="mb-3">
                        <Image
                          src={q.imageUrl}
                          alt="Klinisk bild till frågan"
                          width={550}
                          height={400}
                          className="rounded-lg w-full h-auto"
                        />
                      </div>
                    )}

                    {/* User answer */}
                    <div className="bg-gray-50 rounded-lg p-3 mb-3">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Ditt svar</p>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">
                        {answers[q.id] || <span className="text-gray-400 italic">Inget svar</span>}
                      </p>
                    </div>

                    {/* Facit */}
                    <div className="bg-green-50 border border-green-100 rounded-lg p-3 mb-3">
                      <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-2">Facit</p>
                      <ul className="text-sm text-green-900 space-y-1">
                        {q.facit.map((f, i) => (
                          <li key={i} className="flex gap-2">
                            <span className="text-green-500 shrink-0">•</span>
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>
                      {q.facitExplanation && (
                        <p className="text-xs text-green-700 italic mt-2 pt-2 border-t border-green-100">
                          ({q.maxPoints} {q.maxPoints === 1 ? "poäng" : "poäng"}) {q.facitExplanation}
                        </p>
                      )}
                    </div>

                    {/* Score input */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">Poäng:</span>
                      {Array.from({ length: Math.round(q.maxPoints / (q.maxPoints % 1 !== 0 ? 0.5 : 1)) + 1 }, (_, i) => i * (q.maxPoints % 1 !== 0 ? 0.5 : 1)).map((pts) => (
                        <button
                          key={pts}
                          onClick={() => handleScore(q.id, pts)}
                          className={`w-8 h-8 text-sm rounded-lg border transition-colors ${
                            scores[q.id] === pts
                              ? "bg-slate-900 text-white border-slate-900"
                              : "bg-white text-gray-600 border-gray-200 hover:border-slate-400"
                          }`}
                        >
                          {pts}
                        </button>
                      ))}
                      <span className="text-xs text-gray-400">/ {q.maxPoints}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
        )
      })}

      <div className="mt-8 flex gap-3 pb-12">
        <Link
          href={`/tenta/${exam.id}/prov`}
          className="bg-blue-600 text-white px-5 py-3 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          Gör om tentan
        </Link>
        <button
          onClick={handleFinish}
          className="bg-slate-900 text-white px-5 py-3 rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors"
        >
          Avsluta och spara
        </button>
        <button
          onClick={handleGoHome}
          className="bg-gray-100 text-gray-700 px-5 py-3 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
        >
          Tillbaka till startsidan
        </button>
      </div>
    </div>
  )
}
