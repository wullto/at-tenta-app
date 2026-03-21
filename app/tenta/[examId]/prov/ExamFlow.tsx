"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Exam, Case, Page } from "@/types/exam"
import { saveAnswer, saveScore, getAnswers, getScores, completeExam } from "@/lib/storage"

interface ExamFlowProps {
  exam: Exam
  showFacitPerQuestion?: boolean
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

export default function ExamFlow({ exam, showFacitPerQuestion = false }: ExamFlowProps) {
  const router = useRouter()
  const steps = buildSteps(exam)
  const [stepIndex, setStepIndex] = useState(0)
  const [localAnswers, setLocalAnswers] = useState<Record<string, string>>(() => getAnswers(exam.id))
  const [localScores, setLocalScores] = useState<Record<string, number>>(() => getScores(exam.id))
  const [revealedFacit, setRevealedFacit] = useState<Record<string, boolean>>({})

  const current = steps[stepIndex]
  const currentCase: Case = exam.cases[current.caseIndex]
  const currentPage: Page = currentCase.pages[current.pageIndex]
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

  function handleScore(questionId: string, score: number) {
    saveScore(exam.id, questionId, score)
    setLocalScores((prev) => ({ ...prev, [questionId]: score }))
  }

  function handleNext() {
    currentPage.questions.forEach((q) => {
      saveAnswer(exam.id, q.id, localAnswers[q.id] ?? "")
    })

    if (isLastStep) {
      completeExam(exam.id)
      router.push(`/tenta/${exam.id}/resultat`)
    } else {
      setStepIndex((i) => i + 1)
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-600">{currentCase.title}</span>
        <span className="text-sm text-gray-400">
          Sida {stepIndex + 1} / {totalPages}
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-1.5 mb-8">
        <div
          className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Case intro (only on first page of each case) */}
      {isFirstPageOfCase && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 mb-6">
          <h2 className="font-semibold text-blue-900 mb-2">{currentCase.title}</h2>
          <p className="text-sm text-blue-800 whitespace-pre-wrap">{currentCase.intro}</p>
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
                <span className="text-xs text-gray-400 ml-3 shrink-0">{q.maxPoints} p</span>
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
                className="w-full border border-gray-200 rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-300 min-h-[100px]"
                placeholder="Skriv ditt svar här..."
                value={localAnswers[q.id] ?? ""}
                onChange={(e) => handleAnswerChange(q.id, e.target.value)}
              />

              {/* Facit toggle — bara i övningsläge */}
              {showFacitPerQuestion && (
                <div className="mt-3">
                  <button
                    onClick={() => handleToggleFacit(q.id)}
                    className="text-xs text-gray-400 hover:text-gray-600 underline underline-offset-2 transition-colors"
                  >
                    {isRevealed ? "Dölj facit" : "Visa facit"}
                  </button>
                </div>
              )}

              {/* Inline facit + scoring — bara i övningsläge och om avslöjad */}
              {showFacitPerQuestion && isRevealed && (
                <div className="mt-3 border-t border-gray-100 pt-3 flex flex-col gap-3">
                  <div className="bg-green-50 border border-green-100 rounded-lg p-3">
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
                        {q.facitExplanation}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">Sätt poäng:</span>
                    {Array.from({ length: q.maxPoints + 1 }, (_, i) => i).map((pts) => (
                      <button
                        key={pts}
                        onClick={() => handleScore(q.id, pts)}
                        className={`w-8 h-8 text-sm rounded-lg border transition-colors ${
                          localScores[q.id] === pts
                            ? "bg-blue-600 text-white border-blue-600"
                            : "bg-white text-gray-600 border-gray-200 hover:border-blue-400"
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
          className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          {isLastStep ? "Lämna in tenta →" : "Spara och fortsätt →"}
        </button>
      </div>
    </div>
  )
}
