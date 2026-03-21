import Link from "next/link"
import { getAllExams } from "@/lib/exams"
import AuthPanel from "@/components/AuthPanel"
import { buildDashboardStats, getAllProgress } from "@/lib/progress"
import { getAuthorizedUser, getCurrentUser } from "@/lib/authz"
import { hasSupabaseEnv } from "@/lib/supabase/config"

export default async function Home() {
  const allExams = await getAllExams()
  const [user, authorizedUser, progressRows] = await Promise.all([getCurrentUser(), getAuthorizedUser(), getAllProgress()])
  const dashboard = buildDashboardStats(allExams, progressRows)
  const isSupabaseEnabled = hasSupabaseEnv()

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

          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-slate-500">Klara tentor</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">{dashboard.completedCount}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-slate-500">Pågående</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">{dashboard.inProgressCount}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-slate-500">Snittpoäng</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">{dashboard.averageEarnedPoints}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-slate-500">Snitt i procent</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">{dashboard.averagePercentage}%</p>
            </div>
          </div>
        </section>

        <section className="space-y-5">
          <AuthPanel userEmail={user?.email} enabled={isSupabaseEnabled} hasAccess={Boolean(authorizedUser)} />

          {dashboard.recentExams.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-base font-semibold text-slate-900">Senaste resultat</h2>
              <div className="mt-4 space-y-3">
                {dashboard.recentExams.map((item) => (
                  <div key={item.examId} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{item.title}</p>
                      <p className="text-xs text-slate-500">{item.completedAt?.slice(0, 10)}</p>
                    </div>
                    <p className="text-sm font-semibold text-slate-900">{item.percentage}%</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>

      {dashboard.areaAverages.length > 0 && (
        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Områdesöversikt</h2>
              <p className="text-sm text-slate-500">Genomsnittlig prestation per falltyp bland avslutade tentor.</p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {dashboard.areaAverages.map((area) => (
              <div key={area.label} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-4">
                  <p className="text-sm font-medium text-slate-800">{area.label}</p>
                  <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-sm">
                    {area.percentage}%
                  </span>
                </div>
                <div className="mt-4 h-2 rounded-full bg-slate-200">
                  <div className="h-2 rounded-full bg-slate-900" style={{ width: `${area.percentage}%` }} />
                </div>
                <p className="mt-2 text-xs text-slate-500">{area.completedExams} genomförda tentor</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-slate-900">Tentor</h2>
        <p className="mt-1 text-sm text-slate-500">Välj en tenta att öva på eller fortsätta.</p>

        <div className="mt-5 flex flex-col gap-4">
          {allExams.map((exam) => (
            <Link
              key={exam.id}
              href={`/tenta/${exam.id}`}
              className="block rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">{exam.title}</h3>
                  <p className="mt-1 text-sm text-slate-500">{exam.date}</p>
                </div>
                <div className="text-right">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
                    {exam.totalPoints} poäng
                  </span>
                  <p className="mt-1 text-xs text-slate-400">{exam.cases.length} fall</p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {exam.cases.map((c) => (
                  <span key={c.id} className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-500">
                    {c.title}
                  </span>
                ))}
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  )
}
