import { notFound, redirect } from "next/navigation"
import { getExamById, getExamIds } from "@/lib/exams"
import { getProgressForExam } from "@/lib/progress"
import { getAuthorizedUser } from "@/lib/authz"
import ExamFlow from "./ExamFlow"

export async function generateStaticParams() {
  const examIds = await getExamIds()
  return examIds.map((examId) => ({ examId }))
}

export default async function ProvPage({
  params,
  searchParams,
}: {
  params: Promise<{ examId: string }>
  searchParams: Promise<{ mode?: string }>
}) {
  const { examId } = await params
  const { mode } = await searchParams
  if (!examId.startsWith("2015")) {
    const authorizedUser = await getAuthorizedUser()
    if (!authorizedUser) redirect("/")
  }
  const exam = await getExamById(examId)
  if (!exam) notFound()
  const session = await getProgressForExam(examId)

  const showFacitPerQuestion = mode === "ovning"

  return (
    <ExamFlow
      key={exam.id}
      exam={exam}
      showFacitPerQuestion={showFacitPerQuestion}
      initialSession={session}
      persistRemotely={Boolean(session?.userId)}
    />
  )
}
