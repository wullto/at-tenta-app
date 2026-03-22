export interface Question {
  id: string
  text: string
  maxPoints: number
  hint?: string
  facit: string[]
  facitExplanation?: string
  imageUrl?: string
  tags?: string[]
}

export interface Page {
  id: string
  context?: string
  contextImageUrl?: string
  questions: Question[]
}

export interface Case {
  id: string
  number: number
  title: string
  points: number
  intro: string
  pages: Page[]
}

export interface Exam {
  id: string
  title: string
  date: string
  totalPoints: number
  cases: Case[]
}

export interface ExamAnswers {
  [questionId: string]: string
}

export interface ExamScores {
  [questionId: string]: number
}

export interface ExamSession {
  examId: string
  answers: ExamAnswers
  scores: ExamScores
  startedAt: string
  updatedAt?: string
  completedAt?: string
  currentStepIndex?: number
  mode?: "tenta" | "ovning"
}
