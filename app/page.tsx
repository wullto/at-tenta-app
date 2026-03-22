import { getAllExams } from "@/lib/exams"
import AuthPanel from "@/components/AuthPanel"
import ExamList from "@/components/ExamList"
import ContinueExamCard from "@/components/ContinueExamCard"
import MyStatisticsCard from "@/components/MyStatisticsCard"
import { buildDashboardStats, getAllProgress } from "@/lib/progress"
import { getAuthorizedUser, getCurrentUser } from "@/lib/authz"
import { hasSupabaseEnv } from "@/lib/supabase/config"
import { countAnsweredAnswers, getTotalQuestionCount } from "@/lib/session-utils"

export default async function Home() {
  const allExams = await getAllExams()
  const [user, authorizedUser, progressRows] = await Promise.all([getCurrentUser(), getAuthorizedUser(), getAllProgress()])
  const dashboard = buildDashboardStats(allExams, progressRows)
  const isSupabaseEnabled = hasSupabaseEnv()

  const serverProgressMap = Object.fromEntries(
    progressRows.map((row) => [row.examId, {
      status: (row.completedAt ? "completed" : "in-progress") as "completed" | "in-progress",
      scores: row.scores,
      updatedAt: row.updatedAt,
    }])
  )
  const examSummaries = allExams.map((e) => ({
    id: e.id,
    title: e.title,
    date: e.date,
    totalPoints: e.totalPoints,
    totalQuestions: getTotalQuestionCount(e),
    cases: e.cases.map((c) => ({
      title: c.title,
      points: c.points,
      questionIds: c.pages.flatMap((p) => p.questions.map((q) => q.id)),
    })),
  }))
  const serverInProgress = progressRows
    .filter((row) => !row.completedAt)
    .map((row) => ({
      examId: row.examId,
      answeredQuestions: countAnsweredAnswers(row.answers),
      updatedAt: row.updatedAt,
    }))

  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      <div className="grid gap-8 lg:grid-cols-[1.4fr_0.8fr]">
        <section>
          <div className="rounded-[28px] bg-[linear-gradient(135deg,#0f172a_0%,#1e3a8a_55%,#93c5fd_140%)] p-8 text-white shadow-xl">
            <p className="text-sm uppercase tracking-[0.22em] text-blue-100">AT-tenta</p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight">Träna, spara och följ din utveckling</h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-blue-50/90">
              Välj en tenta att öva på. Om du loggar in sparas svar och poäng i databasen så att du kan fortsätta
              senare och få statistik på startsidan.
            </p>
          </div>

          <MyStatisticsCard
            serverStats={{
              completedCount: dashboard.completedCount,
              inProgressCount: dashboard.inProgressCount,
              averageEarnedPoints: dashboard.averageEarnedPoints,
              averagePercentage: dashboard.averagePercentage,
              totalExamCount: allExams.length,
            }}
            examSummaries={examSummaries}
            areaAverages={dashboard.areaAverages}
            serverProgressRows={progressRows.map((row) => ({
              examId: row.examId,
              scores: row.scores,
              completedAt: row.completedAt,
              updatedAt: row.updatedAt,
            }))}
            recentResults={dashboard.recentExams}
          />
        </section>

        <section className="space-y-5">
          <AuthPanel userEmail={user?.email} enabled={isSupabaseEnabled} hasAccess={Boolean(authorizedUser)} />
          <ContinueExamCard exams={examSummaries} serverInProgress={serverInProgress} hasAccess={Boolean(authorizedUser)} />
        </section>
      </div>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-slate-900">Tentor</h2>

        <ExamList exams={allExams} serverProgressMap={serverProgressMap} hasAccess={Boolean(authorizedUser)} />
      </section>
    </main>
  )
}
