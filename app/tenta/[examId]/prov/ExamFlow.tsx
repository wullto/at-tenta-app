"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Exam, Case, ExamSession, Page } from "@/types/exam"
import { createEmptySession, getSession, saveAnswer, saveScore, setSession } from "@/lib/storage"
import { getSpecialtyTheme, specialtyName } from "@/lib/specialties"
import { getEffectiveSession, getResumeStepIndex } from "@/lib/session-utils"

interface ExamFlowProps {
  exam: Exam
  showFacitPerQuestion?: boolean
  initialSession?: ExamSession | null
  persistRemotely?: boolean
}

type StepType = { caseIndex: number; pageIndex: number }

function buildSteps(exam: Exam): StepType[] {
  const steps: StepType[] = []
  exam.cases.forEach((c, ci) => {
    c.pages.forEach((_, pi) => {
      steps.push({ caseIndex: ci, pageIndex: pi })
    })
  })
  return steps
}

async function persistSession(examId: string, session: ExamSession) {
  await fetch(`/api/exam-progress/${examId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(session),
  })
}

function buildSession(
  examId: string,
  startedAt: string,
  answers: Record<string, string>,
  scores: Record<string, number>,
  currentStepIndex: number,
  mode: "tenta" | "ovning",
  completedAt?: string
) {
  return {
    examId,
    answers,
    scores,
    startedAt,
    currentStepIndex,
    mode,
    completedAt,
  }
}

export default function ExamFlow({
  exam,
  showFacitPerQuestion = false,
  initialSession = null,
  persistRemotely = false,
}: ExamFlowProps) {
  const router = useRouter()
  const steps = buildSteps(exam)
  const effectiveSession = getEffectiveSession(exam.id, initialSession)
  const seedSession = effectiveSession ?? createEmptySession(exam.id)
  const initialStepIndex = Math.min(getResumeStepIndex(exam, seedSession), steps.length - 1)
  const isPracticeMode = showFacitPerQuestion || seedSession.mode === "ovning"
  const [stepIndex, setStepIndex] = useState(initialStepIndex)
  const [startedAt] = useState(seedSession.startedAt)
  const [localAnswers, setLocalAnswers] = useState<Record<string, string>>(seedSession.answers)
  const [localScores, setLocalScores] = useState<Record<string, number>>(seedSession.scores)
  const [revealedFacit, setRevealedFacit] = useState<Record<string, boolean>>({})
  const [showSaved, setShowSaved] = useState(false)

  useEffect(() => {
    if (initialSession && !getSession(exam.id) && effectiveSession) {
      setSession(exam.id, initialSession)
    }
  }, [effectiveSession, exam.id, initialSession])

  const current = steps[stepIndex]
  const currentCase: Case = exam.cases[current.caseIndex]
  const currentPage: Page = currentCase.pages[current.pageIndex]
  const currentTheme = getSpecialtyTheme(currentCase.title)
  const currentSpecialty = specialtyName(currentCase.title)
  const isFirstPageOfCase = current.pageIndex === 0
  const isLastStep = stepIndex === steps.length - 1

  const totalPages = steps.length
  const progress = Math.round(((stepIndex + 1) / totalPages) * 100)

  function handleAnswerChange(questionId: string, value: string) {
    setLocalAnswers((prev) => ({ ...prev, [questionId]: value }))
  }

  function handleToggleFacit(questionId: string) {
    setRevealedFacit((prev) => ({ ...prev, [questionId]: !prev[questionId] }))
  }

  async function syncSession(currentStepIndex: number, completedAt?: string) {
    const nextSession = buildSession(
      exam.id,
      startedAt,
      localAnswers,
      localScores,
      currentStepIndex,
      isPracticeMode ? "ovning" : "tenta",
      completedAt
    )
    setSession(exam.id, nextSession)
    if (persistRemotely) {
      await persistSession(exam.id, nextSession)
    }
    setShowSaved(true)
    setTimeout(() => setShowSaved(false), 2000)
  }

  async function handleGoHome() {
    if (!window.confirm("Vill du lämna tentan? Dina svar är sparade.")) return
    await syncSession(stepIndex)
    router.push("/")
    router.refresh()
  }

  async function handleGoToFacit() {
    await syncSession(stepIndex)
    router.push(`/tenta/${exam.id}/resultat`)
  }

  function handleScore(questionId: string, score: number) {
    saveScore(exam.id, questionId, score)
    setLocalScores((prev) => {
      const nextScores = { ...prev, [questionId]: score }
      const nextSession: ExamSession = buildSession(
        exam.id,
        startedAt,
        localAnswers,
        nextScores,
        stepIndex,
        isPracticeMode ? "ovning" : "tenta"
      )
      setSession(exam.id, nextSession)
      if (persistRemotely) {
        void persistSession(exam.id, nextSession)
      }
      return nextScores
    })
  }

  async function handleNext() {
    const hasEmptyAnswer = currentPage.questions.some((q) => !(localAnswers[q.id] ?? "").trim())
    if (hasEmptyAnswer) {
      if (!window.confirm("Du har inte fyllt i alla svar på den här sidan. Vill du fortsätta ändå?")) return
    }

    currentPage.questions.forEach((q) => {
      saveAnswer(exam.id, q.id, localAnswers[q.id] ?? "")
    })

    const nextStepIndex = isLastStep ? stepIndex : stepIndex + 1
    await syncSession(nextStepIndex)

    if (isLastStep) {
      router.push(`/tenta/${exam.id}/resultat`)
    } else {
      setStepIndex(nextStepIndex)
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="sticky top-4 z-20 mb-6 flex items-center justify-between gap-3">
        <button
          onClick={handleGoHome}
          className="rounded-lg bg-slate-100 px-5 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-200"
        >
          Hem
        </button>
        <span
          className={`text-xs font-medium text-green-600 transition-opacity duration-300 ${showSaved ? "opacity-100" : "opacity-0"}`}
        >
          Sparad ✓
        </span>
        <button
          onClick={handleGoToFacit}
          className="rounded-lg bg-slate-100 px-5 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-200"
        >
          Hoppa till facit →
        </button>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span className={`text-sm font-medium ${currentTheme.accentText}`}>{currentCase.title}</span>
        <span className="text-sm text-gray-400">
          Sida {stepIndex + 1} / {totalPages}
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-1.5 mb-8">
        <div
          className={`${currentTheme.accentFill} h-1.5 rounded-full transition-all duration-300`}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Case intro (only on first page of each case) */}
      {isFirstPageOfCase && (
        <div className={`rounded-xl border p-5 mb-6 ${currentTheme.panel}`}>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className={`font-semibold ${currentTheme.accentTextStrong}`}>{currentCase.title}</h2>
            <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${currentTheme.badgeStrong}`}>
              {currentSpecialty}
            </span>
          </div>
          <p className="text-sm whitespace-pre-wrap">{currentCase.intro}</p>
        </div>
      )}

      {/* New context for this page */}
      {(currentPage.context || currentPage.contextImageUrl) && (
        <div className="bg-gray-100 border border-gray-200 rounded-xl p-5 mb-6">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Ny information</p>
          {currentPage.context && (
            <p className="text-sm text-gray-800 whitespace-pre-wrap">{currentPage.context}</p>
          )}
          {currentPage.contextImageUrl && (
            <div className="mt-3">
              <Image
                src={currentPage.contextImageUrl}
                alt="Klinisk bild"
                width={550}
                height={400}
                className="rounded-lg w-full h-auto"
              />
            </div>
          )}
        </div>
      )}

      {/* Questions */}
      <div className="flex flex-col gap-6">
        {currentPage.questions.map((q) => {
          const isRevealed = !!revealedFacit[q.id]
          return (
            <div key={q.id} className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="flex justify-between items-start mb-3">
                <p className="text-sm font-medium text-gray-800 flex-1">{q.text}</p>
                <span className={`text-xs ml-3 shrink-0 ${currentTheme.accentText}`}>{q.maxPoints} p</span>
              </div>
              {q.hint && (
                <p className="text-xs text-gray-400 mb-3 italic">{q.hint}</p>
              )}
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
              <textarea
                className={`w-full border border-gray-200 rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 ${currentTheme.accentRing} min-h-[100px]`}
                placeholder="Skriv ditt svar här..."
                value={localAnswers[q.id] ?? ""}
                onChange={(e) => handleAnswerChange(q.id, e.target.value)}
              />

              {/* Facit toggle — bara i övningsläge */}
              {isPracticeMode && (
                <div className="mt-3">
                  <button
                    onClick={() => handleToggleFacit(q.id)}
                    className={`text-xs underline underline-offset-2 transition-colors ${currentTheme.accentText} ${currentTheme.accentTextHover}`}
                  >
                    {isRevealed ? "Dölj facit" : "Visa facit"}
                  </button>
                </div>
              )}

              {/* Inline facit + scoring — bara i övningsläge och om avslöjad */}
              {isPracticeMode && isRevealed && (
                <div className="mt-3 border-t border-gray-100 pt-3 flex flex-col gap-3">
                  <div className="bg-green-50 border border-green-100 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">Facit</p>
                      <span className="text-xs font-semibold text-green-700">{q.maxPoints} p</span>
                    </div>
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
                        {q.facitExplanation}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`text-xs ${currentTheme.accentText}`}>Sätt poäng:</span>
                    {Array.from({ length: Math.round(q.maxPoints / (q.maxPoints % 1 !== 0 ? 0.5 : 1)) + 1 }, (_, i) => i * (q.maxPoints % 1 !== 0 ? 0.5 : 1)).map((pts) => (
                      <button
                        key={pts}
                        onClick={() => handleScore(q.id, pts)}
                        className={`w-8 h-8 text-sm rounded-lg border transition-colors ${
                          localScores[q.id] === pts
                            ? `${currentTheme.accentBg} text-white ${currentTheme.accentBorder}`
                            : `bg-white text-gray-600 border-gray-200 ${currentTheme.accentBorderHover}`
                        }`}
                      >
                        {pts}
                      </button>
                    ))}
                    <span className="text-xs text-gray-400">/ {q.maxPoints}</span>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Navigation */}
      <div className="mt-8 flex justify-end">
        <button
          onClick={handleNext}
          className="rounded-lg bg-slate-900 px-6 py-3 font-medium text-white transition-colors hover:bg-slate-800"
        >
          {isLastStep ? "Lämna in tenta →" : "Spara och fortsätt →"}
        </button>
      </div>
    </div>
  )
}
