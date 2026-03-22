import { Exam, ExamSession } from "@/types/exam"
import { getCaseEarnedPoints, getTotalEarnedPoints } from "@/lib/scoring"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { getAuthorizedUser } from "@/lib/authz"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { specialtyKey, specialtyLabel } from "@/lib/specialties"

export interface StoredExamProgress extends ExamSession {
  userId: string
  updatedAt: string
}

type ProgressRow = {
  user_id: string
  exam_id: string
  answers: Record<string, string>
  scores: Record<string, number>
  started_at: string
  completed_at: string | null
  updated_at: string
}

function mapRowToSession(row: ProgressRow): StoredExamProgress {
  return {
    examId: row.exam_id,
    answers: row.answers ?? {},
    scores: row.scores ?? {},
    startedAt: row.started_at,
    completedAt: row.completed_at ?? undefined,
    updatedAt: row.updated_at,
    userId: row.user_id,
  }
}

export async function getProgressForExam(examId: string) {
  const user = await getAuthorizedUser()
  if (!user) return null

  const supabase =
    process.env.NODE_ENV === "development" && user.id === "00000000-0000-0000-0000-000000000001"
      ? createSupabaseAdminClient()
      : await createSupabaseServerClient()

  if (!supabase) return null

  const { data, error } = await supabase
    .from("user_exam_progress")
    .select("user_id, exam_id, answers, scores, started_at, completed_at, updated_at")
    .eq("user_id", user.id)
    .eq("exam_id", examId)
    .maybeSingle()

  if (error || !data) return null
  return mapRowToSession(data as ProgressRow)
}

export async function getAllProgress() {
  const user = await getAuthorizedUser()
  if (!user) return []

  const supabase =
    process.env.NODE_ENV === "development" && user.id === "00000000-0000-0000-0000-000000000001"
      ? createSupabaseAdminClient()
      : await createSupabaseServerClient()

  if (!supabase) return []

  const { data, error } = await supabase
    .from("user_exam_progress")
    .select("user_id, exam_id, answers, scores, started_at, completed_at, updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })

  if (error || !data) return []
  return (data as ProgressRow[]).map(mapRowToSession)
}

export interface DashboardStats {
  completedCount: number
  inProgressCount: number
  averageEarnedPoints: number
  averagePercentage: number
  areaAverages: Array<{ label: string; percentage: number; completedExams: number }>
  recentExams: Array<{ examId: string; title: string; completedAt?: string; percentage: number }>
}

function round(value: number) {
  return Math.round(value * 10) / 10
}

export function buildDashboardStats(exams: Exam[], progressRows: StoredExamProgress[]): DashboardStats {
  const examMap = new Map(exams.map((exam) => [exam.id, exam]))
  const completedRows = progressRows.filter((row) => row.completedAt && examMap.has(row.examId))
  const inProgressCount = progressRows.filter((row) => !row.completedAt).length

  const totalEarned = completedRows.reduce((sum, row) => sum + getTotalEarnedPoints(row.scores), 0)
  const totalPossible = completedRows.reduce((sum, row) => {
    const exam = examMap.get(row.examId)
    return sum + (exam?.totalPoints ?? 0)
  }, 0)

  const areaTotals = new Map<string, { label: string; earned: number; possible: number; count: number }>()
  for (const row of completedRows) {
    const exam = examMap.get(row.examId)
    if (!exam) continue

    for (const examCase of exam.cases) {
      const earned = getCaseEarnedPoints(exam, examCase.id, row.scores)
      const key = specialtyKey(examCase.title)
      const current = areaTotals.get(key) ?? {
        label: specialtyLabel(examCase.title),
        earned: 0,
        possible: 0,
        count: 0,
      }
      current.earned += earned
      current.possible += examCase.points
      current.count += 1
      areaTotals.set(key, current)
    }
  }

  return {
    completedCount: completedRows.length,
    inProgressCount,
    averageEarnedPoints: completedRows.length ? round(totalEarned / completedRows.length) : 0,
    averagePercentage: totalPossible ? round((totalEarned / totalPossible) * 100) : 0,
    areaAverages: [...areaTotals.values()]
      .map((totals) => ({
        label: totals.label,
        percentage: totals.possible ? round((totals.earned / totals.possible) * 100) : 0,
        completedExams: totals.count,
      }))
      .sort((a, b) => b.percentage - a.percentage),
    recentExams: completedRows.slice(0, 5).map((row) => {
      const exam = examMap.get(row.examId)!
      return {
        examId: row.examId,
        title: exam.title,
        completedAt: row.completedAt,
        percentage: round((getTotalEarnedPoints(row.scores) / exam.totalPoints) * 100),
      }
    }),
  }
}
