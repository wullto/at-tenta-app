import Link from "next/link"
import { getAllExams } from "@/lib/exams"

export default async function Home() {
  const allExams = await getAllExams()

  return (
    <main className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-2">AT-tenta</h1>
      <p className="text-gray-500 mb-10">Välj en tenta att öva på</p>

      <div className="flex flex-col gap-4">
        {allExams.map((exam) => (
          <Link
            key={exam.id}
            href={`/tenta/${exam.id}`}
            className="block bg-white border border-gray-200 rounded-xl p-6 hover:border-blue-400 hover:shadow-sm transition-all"
          >
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-lg font-semibold">{exam.title}</h2>
                <p className="text-sm text-gray-500 mt-1">{exam.date}</p>
              </div>
              <div className="text-right">
                <span className="text-sm font-medium bg-blue-50 text-blue-700 px-3 py-1 rounded-full">
                  {exam.totalPoints} poäng
                </span>
                <p className="text-xs text-gray-400 mt-1">{exam.cases.length} fall</p>
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              {exam.cases.map((c) => (
                <span key={c.id} className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                  {c.title}
                </span>
              ))}
            </div>
          </Link>
        ))}
      </div>
    </main>
  )
}
