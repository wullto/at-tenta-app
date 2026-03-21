import { notFound } from "next/navigation"
import { getExamById, getExamIds } from "@/lib/exams"
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
  const exam = await getExamById(examId)
  if (!exam) notFound()

  const showFacitPerQuestion = mode === "ovning"

  return <ExamFlow key={exam.id} exam={exam} showFacitPerQuestion={showFacitPerQuestion} />
}
