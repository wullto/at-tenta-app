import { Exam, ExamScores } from "@/types/exam"

export function getTotalMaxPoints(exam: Exam): number {
  return exam.totalPoints
}

export function getTotalEarnedPoints(scores: ExamScores): number {
  return Object.values(scores).reduce((sum, s) => sum + s, 0)
}

export function getCaseMaxPoints(exam: Exam, caseId: string): number {
  const c = exam.cases.find((c) => c.id === caseId)
  return c?.points ?? 0
}

export function getCaseEarnedPoints(exam: Exam, caseId: string, scores: ExamScores): number {
  const c = exam.cases.find((c) => c.id === caseId)
  if (!c) return 0
  return c.pages
    .flatMap((p) => p.questions)
    .reduce((sum, q) => sum + (scores[q.id] ?? 0), 0)
}

export function getAllQuestions(exam: Exam) {
  return exam.cases.flatMap((c) =>
    c.pages.flatMap((p) => p.questions.map((q) => ({ ...q, caseId: c.id, caseTitle: c.title })))
  )
}
