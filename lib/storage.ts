import { ExamSession, ExamAnswers, ExamScores } from "@/types/exam"

const SESSION_KEY = (examId: string) => `exam-session-${examId}`

export function getSession(examId: string): ExamSession | null {
  if (typeof window === "undefined") return null
  const raw = localStorage.getItem(SESSION_KEY(examId))
  return raw ? JSON.parse(raw) : null
}

export function saveAnswer(examId: string, questionId: string, answer: string) {
  const session = getSession(examId) ?? {
    examId,
    answers: {},
    scores: {},
    startedAt: new Date().toISOString(),
  }
  session.answers[questionId] = answer
  localStorage.setItem(SESSION_KEY(examId), JSON.stringify(session))
}

export function saveScore(examId: string, questionId: string, score: number) {
  const session = getSession(examId)
  if (!session) return
  session.scores[questionId] = score
  localStorage.setItem(SESSION_KEY(examId), JSON.stringify(session))
}

export function completeExam(examId: string) {
  const session = getSession(examId)
  if (!session) return
  session.completedAt = new Date().toISOString()
  localStorage.setItem(SESSION_KEY(examId), JSON.stringify(session))
}

export function clearSession(examId: string) {
  localStorage.removeItem(SESSION_KEY(examId))
}

export function getAnswers(examId: string): ExamAnswers {
  return getSession(examId)?.answers ?? {}
}

export function getScores(examId: string): ExamScores {
  return getSession(examId)?.scores ?? {}
}
