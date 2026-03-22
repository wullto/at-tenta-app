import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { getExamById, getExamIds } from "@/lib/exams"
import { getAuthorizedUser } from "@/lib/authz"
import { getProgressForExam } from "@/lib/progress"
import ModeSelector from "./ModeSelector"
import ClearExamButton from "@/components/ClearExamButton"
import ResumeExamPanel from "@/components/ResumeExamPanel"
import ExamProgressBar from "@/components/ExamProgressBar"
import { getSpecialtyTheme, specialtyName } from "@/lib/specialties"
import { getTotalQuestionCount } from "@/lib/session-utils"

export async function generateStaticParams() {
  const examIds = await getExamIds()
  return examIds.map((examId) => ({ examId }))
}

export default async function TentaIntroPage({ params }: { params: Promise<{ examId: string }> }) {
  const { examId } = await params
  if (!examId.startsWith("2015")) {
    const authorizedUser = await getAuthorizedUser()
    if (!authorizedUser) redirect("/")
  }
  const exam = await getExamById(examId)
  if (!exam) notFound()
  const progress = await getProgressForExam(examId)
  const totalQuestions = getTotalQuestionCount(exam)

  return (
    <main className="max-w-2xl mx-auto px-4 py-12">
      <Link href="/" className="text-sm text-blue-600 hover:underline mb-8 inline-block">
        ← Tillbaka
      </Link>

      <h1 className="text-2xl font-bold mb-1">{exam.title}</h1>
      <p className="text-gray-500 mb-8">{exam.date}</p>

      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
        <h2 className="font-semibold mb-4">Tentaöversikt</h2>

        <ExamProgressBar examId={examId} totalQuestions={totalQuestions} serverSession={progress} />

        <div className="flex flex-wrap gap-2">
          {exam.cases.map((examCase) => {
            const name = specialtyName(examCase.title)
            return (
              <span
                key={examCase.id}
                className={`rounded-full px-3 py-1 text-xs font-medium ${getSpecialtyTheme(name).badgeStrong}`}
              >
                {name}
              </span>
            )
          })}
        </div>
      </div>

      <div className="mb-8">
        <ResumeExamPanel examId={examId} totalQuestions={totalQuestions} serverSession={progress} />
        <ModeSelector examId={examId} serverSession={progress} />
        <ClearExamButton examId={examId} serverSession={progress} />
      </div>

      <div>
        <Link
          href={`/tenta/${examId}/resultat`}
          className="text-sm text-gray-500 hover:text-gray-700 underline underline-offset-2"
        >
          Se facit direkt (utan att göra tentan)
        </Link>
      </div>
    </main>
  )
}
