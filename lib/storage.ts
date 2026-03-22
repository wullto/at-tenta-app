import { ExamSession, ExamAnswers, ExamScores } from "@/types/exam"

const SESSION_KEY = (examId: string) => `exam-session-${examId}`
const CLEARED_KEY = (examId: string) => `exam-session-cleared-${examId}`
const SESSION_CHANGE_EVENT = "exam-session-change"

function notifySessionChange() {
  if (typeof window === "undefined") return
  window.dispatchEvent(new Event(SESSION_CHANGE_EVENT))
}

function normalizeSession(session: ExamSession): ExamSession {
  return {
    ...session,
    updatedAt: session.updatedAt ?? session.completedAt ?? session.startedAt,
    currentStepIndex: session.currentStepIndex ?? 0,
    mode: session.mode ?? "tenta",
  }
}

export function subscribeToSessionChanges(onChange: () => void) {
  if (typeof window === "undefined") {
    return () => {}
  }

  const handleChange = () => onChange()
  window.addEventListener("storage", handleChange)
  window.addEventListener(SESSION_CHANGE_EVENT, handleChange)

  return () => {
    window.removeEventListener("storage", handleChange)
    window.removeEventListener(SESSION_CHANGE_EVENT, handleChange)
  }
}

export function createEmptySession(examId: string): ExamSession {
  const timestamp = new Date().toISOString()
  return {
    examId,
    answers: {},
    scores: {},
    startedAt: timestamp,
    updatedAt: timestamp,
    currentStepIndex: 0,
    mode: "tenta",
  }
}

export function getSession(examId: string): ExamSession | null {
  if (typeof window === "undefined") return null
  const raw = localStorage.getItem(SESSION_KEY(examId))
  return raw ? normalizeSession(JSON.parse(raw) as ExamSession) : null
}

export function setSession(examId: string, session: ExamSession) {
  if (typeof window === "undefined") return
  const nextSession = normalizeSession({
    ...session,
    updatedAt: new Date().toISOString(),
  })
  localStorage.setItem(SESSION_KEY(examId), JSON.stringify(nextSession))
  localStorage.removeItem(CLEARED_KEY(examId))
  notifySessionChange()
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
  if (typeof window === "undefined") return
  localStorage.removeItem(SESSION_KEY(examId))
  localStorage.setItem(CLEARED_KEY(examId), new Date().toISOString())
  notifySessionChange()
}

export function getClearedAt(examId: string) {
  if (typeof window === "undefined") return null
  return localStorage.getItem(CLEARED_KEY(examId))
}

export function getAnswers(examId: string): ExamAnswers {
  return getSession(examId)?.answers ?? {}
}

export function getScores(examId: string): ExamScores {
  return getSession(examId)?.scores ?? {}
}
