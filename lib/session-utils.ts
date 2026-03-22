import { Exam, ExamSession } from "@/types/exam"
import { getClearedAt, getSession } from "@/lib/storage"

export function getSessionTimestamp(session: { updatedAt?: string; startedAt?: string } | null | undefined) {
  const raw = session?.updatedAt ?? session?.startedAt
  if (!raw) return 0

  const value = new Date(raw).getTime()
  return Number.isNaN(value) ? 0 : value
}

export function pickMostRecentSession<T extends Pick<ExamSession, "updatedAt" | "startedAt">>(
  sessions: Array<T | null | undefined>
): T | null {
  return sessions.reduce<T | null>((latest, session) => {
    if (!session) return latest
    if (!latest) return session
    return getSessionTimestamp(session) >= getSessionTimestamp(latest) ? session : latest
  }, null)
}

export function getEffectiveSession(examId: string, serverSession?: ExamSession | null) {
  const localSession = getSession(examId)
  const clearedAt = getClearedAt(examId)

  if (localSession) {
    return pickMostRecentSession([serverSession, localSession])
  }

  if (!serverSession) {
    return null
  }

  if (clearedAt) {
    const clearedTimestamp = new Date(clearedAt).getTime()
    const serverTimestamp = getSessionTimestamp(serverSession)
    if (!Number.isNaN(clearedTimestamp) && clearedTimestamp >= serverTimestamp) {
      return null
    }
  }

  return serverSession
}

export function countAnsweredAnswers(answers: Record<string, string>) {
  return Object.values(answers).filter((answer) => answer.trim().length > 0).length
}

export function getTotalQuestionCount(exam: Pick<Exam, "cases">) {
  return exam.cases.reduce((total, examCase) => (
    total + examCase.pages.reduce((pageTotal, page) => pageTotal + page.questions.length, 0)
  ), 0)
}

export function getResumeStepIndex(exam: Exam, session: Pick<ExamSession, "answers" | "scores" | "currentStepIndex">) {
  if (typeof session.currentStepIndex === "number" && session.currentStepIndex >= 0) {
    return session.currentStepIndex
  }

  const pages = exam.cases.flatMap((examCase, caseIndex) =>
    examCase.pages.map((page, pageIndex) => ({ caseIndex, pageIndex, page }))
  )

  let latestTouchedIndex = 0
  let foundTouchedPage = false

  pages.forEach(({ page }, index) => {
    const answeredCount = page.questions.filter((question) => {
      const answer = session.answers[question.id] ?? ""
      const hasScore = typeof session.scores[question.id] === "number"
      return answer.trim().length > 0 || hasScore
    }).length

    if (answeredCount > 0) {
      latestTouchedIndex = index
      foundTouchedPage = true
    }
  })

  if (!foundTouchedPage) return 0

  const latestPage = pages[latestTouchedIndex].page
  const latestPageCompleted = latestPage.questions.every((question) => {
    const answer = session.answers[question.id] ?? ""
    const hasScore = typeof session.scores[question.id] === "number"
    return answer.trim().length > 0 || hasScore
  })

  if (latestPageCompleted && latestTouchedIndex < pages.length - 1) {
    return latestTouchedIndex + 1
  }

  return latestTouchedIndex
}
