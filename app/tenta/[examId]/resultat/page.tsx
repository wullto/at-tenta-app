import { notFound } from "next/navigation"
import { getExamById, getExamIds } from "@/lib/exams"
import ResultatView from "./ResultatView"

export async function generateStaticParams() {
  const examIds = await getExamIds()
  return examIds.map((examId) => ({ examId }))
}

export default async function ResultatPage({ params }: { params: Promise<{ examId: string }> }) {
  const { examId } = await params
  const exam = await getExamById(examId)
  if (!exam) notFound()
  return <ResultatView key={exam.id} exam={exam} />
}
