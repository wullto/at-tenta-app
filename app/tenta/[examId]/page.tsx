import Link from "next/link"
import { notFound } from "next/navigation"
import { getExamById, getExamIds } from "@/lib/exams"
import ModeSelector from "./ModeSelector"

export async function generateStaticParams() {
  const examIds = await getExamIds()
  return examIds.map((examId) => ({ examId }))
}

export default async function TentaIntroPage({ params }: { params: Promise<{ examId: string }> }) {
  const { examId } = await params
  const exam = await getExamById(examId)
  if (!exam) notFound()

  const totalQuestions = exam.cases.flatMap((c) => c.pages.flatMap((p) => p.questions)).length

  return (
    <main className="max-w-2xl mx-auto px-4 py-12">
      <Link href="/" className="text-sm text-blue-600 hover:underline mb-8 inline-block">
        ← Tillbaka
      </Link>

      <h1 className="text-2xl font-bold mb-1">{exam.title}</h1>
      <p className="text-gray-500 mb-8">{exam.date}</p>

      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
        <h2 className="font-semibold mb-4">Tentainformation</h2>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-gray-500">Totalpoäng</dt>
            <dd className="font-medium">{exam.totalPoints} p</dd>
          </div>
          <div>
            <dt className="text-gray-500">Antal fall</dt>
            <dd className="font-medium">{exam.cases.length}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Antal frågor</dt>
            <dd className="font-medium">{totalQuestions}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Poäng per fall</dt>
            <dd className="font-medium">{exam.cases[0]?.points} p / fall</dd>
          </div>
        </dl>
      </div>

      <div className="mb-8">
        <h2 className="font-semibold mb-3">Välj läge</h2>
        <ModeSelector examId={examId} />
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
