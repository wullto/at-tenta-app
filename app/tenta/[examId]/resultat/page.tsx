import { notFound } from "next/navigation"
import { getExamById, getExamIds } from "@/lib/exams"
import { getProgressForExam } from "@/lib/progress"
import ResultatView from "./ResultatView"

export async function generateStaticParams() {
  const examIds = await getExamIds()
  return examIds.map((examId) => ({ examId }))
}

export default async function ResultatPage({ params }: { params: Promise<{ examId: string }> }) {
  const { examId } = await params
  const exam = await getExamById(examId)
  if (!exam) notFound()
  const session = await getProgressForExam(examId)
  return <ResultatView key={exam.id} exam={exam} initialSession={session} persistRemotely={Boolean(session?.userId)} />
}
