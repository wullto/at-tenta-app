"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

interface ModeSelectorProps {
  examId: string
}

export default function ModeSelector({ examId }: ModeSelectorProps) {
  const router = useRouter()
  const [selected, setSelected] = useState<"tenta" | "ovning">("tenta")

  function handleStart() {
    router.push(`/tenta/${examId}/prov?mode=${selected}`)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <button
          onClick={() => setSelected("tenta")}
          className={`text-left rounded-xl border p-4 transition-all ${
            selected === "tenta"
              ? "border-blue-500 bg-blue-50 ring-2 ring-blue-300"
              : "border-gray-200 bg-white hover:border-gray-300"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
              selected === "tenta" ? "border-blue-600" : "border-gray-300"
            }`}>
              {selected === "tenta" && <div className="w-2 h-2 bg-blue-600 rounded-full" />}
            </div>
            <div>
              <p className="font-semibold text-sm">Tentasimuleringsläge</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Inget facit visas under tentans gång — precis som en riktig tenta
              </p>
            </div>
          </div>
        </button>

        <button
          onClick={() => setSelected("ovning")}
          className={`text-left rounded-xl border p-4 transition-all ${
            selected === "ovning"
              ? "border-green-500 bg-green-50 ring-2 ring-green-300"
              : "border-gray-200 bg-white hover:border-gray-300"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
              selected === "ovning" ? "border-green-600" : "border-gray-300"
            }`}>
              {selected === "ovning" && <div className="w-2 h-2 bg-green-600 rounded-full" />}
            </div>
            <div>
              <p className="font-semibold text-sm">Övningsläge</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Visa facit och sätt poäng direkt efter varje fråga
              </p>
            </div>
          </div>
        </button>
      </div>

      <button
        onClick={handleStart}
        className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors w-fit"
      >
        Starta tenta →
      </button>
    </div>
  )
}
