import { ExamSession, ExamAnswers, ExamScores } from "@/types/exam"

const SESSION_KEY = (examId: string) => `exam-session-${examId}`

export function createEmptySession(examId: string): ExamSession {
  return {
    examId,
    answers: {},
    scores: {},
    startedAt: new Date().toISOString(),
  }
}

export function getSession(examId: string): ExamSession | null {
  if (typeof window === "undefined") return null
  const raw = localStorage.getItem(SESSION_KEY(examId))
  return raw ? JSON.parse(raw) : null
}

export function setSession(examId: string, session: ExamSession) {
  if (typeof window === "undefined") return
  localStorage.setItem(SESSION_KEY(examId), JSON.stringify(session))
}

export function saveAnswer(examId: string, questionId: string, answer: string) {
  const session = getSession(examId) ?? createEmptySession(examId)
  session.answers[questionId] = answer
  setSession(examId, session)
}

export function saveScore(examId: string, questionId: string, score: number) {
  const session = getSession(examId)
  if (!session) return
  session.scores[questionId] = score
  setSession(examId, session)
}

export function completeExam(examId: string) {
  const session = getSession(examId)
  if (!session) return
  session.completedAt = new Date().toISOString()
  setSession(examId, session)
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
