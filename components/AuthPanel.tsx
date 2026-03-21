"use client"

import { useState, useTransition } from "react"
import { createSupabaseBrowserClient } from "@/lib/supabase/client"

interface AuthPanelProps {
  userEmail?: string
  enabled: boolean
  hasAccess?: boolean
}

export default function AuthPanel({ userEmail, enabled, hasAccess = false }: AuthPanelProps) {
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState<string | null>(null)
  const [allowRequest, setAllowRequest] = useState(false)
  const [isPending, startTransition] = useTransition()

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!email) return

    if (email === "ADMIN123") {
      const response = await fetch("/api/dev-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: email }),
      })
      const result = await response.json()
      if (!response.ok) {
        setMessage(result.error ?? "Dev-inloggning misslyckades.")
        return
      }
      window.location.reload()
      return
    }

    const response = await fetch("/api/auth/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    })

    const result = await response.json()
    if (!response.ok) {
      if (result.error === "not_allowed") {
        setAllowRequest(true)
        setMessage("Den här e-postadressen är inte godkänd ännu.")
        return
      }
      setMessage(result.error ?? "Inloggning misslyckades.")
      return
    }

    setAllowRequest(false)
    setMessage("Inloggningslänk skickad till din e-post.")
  }

  async function handleRequestAccess() {
    if (!email) return

    const response = await fetch("/api/access-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    })
    const result = await response.json()

    if (!response.ok) {
      setMessage(result.error ?? "Kunde inte skapa förfrågan.")
      return
    }

    setAllowRequest(false)
    setMessage("Förfrågan skickad. Lägg till adressen i `allowed_users` om du vill ge åtkomst.")
  }

  function handleSignOut() {
    startTransition(async () => {
      await fetch("/api/dev-logout", { method: "POST" })
      const supabase = createSupabaseBrowserClient()
      if (supabase) {
        await supabase.auth.signOut()
      }
      window.location.reload()
    })
  }

  if (!enabled) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
        Lägg till `NEXT_PUBLIC_SUPABASE_URL` och `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` för att aktivera inloggning,
        databassparning och dashboard.
      </div>
    )
  }

  if (userEmail) {
    return (
      <div className={`rounded-2xl border p-5 ${hasAccess ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
        <p className={`text-sm font-medium ${hasAccess ? "text-emerald-900" : "text-amber-900"}`}>Inloggad som {userEmail}</p>
        <p className={`mt-1 text-sm ${hasAccess ? "text-emerald-700" : "text-amber-800"}`}>
          {hasAccess
            ? "Din progress sparas nu i databasen och används i dashboarden."
            : "Kontot är inte godkänt ännu. Be administratören lägga till din e-post i whitelist innan progress sparas."}
        </p>
        <button
          onClick={handleSignOut}
          disabled={isPending}
          className={`mt-4 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-60 ${
            hasAccess ? "bg-emerald-700 hover:bg-emerald-800" : "bg-amber-700 hover:bg-amber-800"
          }`}
        >
          Logga ut
        </button>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-base font-semibold text-slate-900">Spara din progress</h2>
      <p className="mt-1 text-sm text-slate-600">Logga in med e-postlänk för att synka tentor och få statistik.</p>
      <p className="mt-1 text-xs text-slate-400">I lokal utveckling kan du också skriva `ADMIN123` för dev-inloggning.</p>
      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3 sm:flex-row">
        <input
          type="text"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="din@mail.se eller ADMIN123"
          className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
          autoCapitalize="none"
          autoCorrect="off"
        />
        <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
          Skicka länk
        </button>
      </form>
      {allowRequest && (
        <button
          onClick={handleRequestAccess}
          className="mt-3 rounded-lg bg-amber-100 px-4 py-2 text-sm font-medium text-amber-900 hover:bg-amber-200"
        >
          Begär tillgång
        </button>
      )}
      {message && <p className="mt-3 text-sm text-slate-600">{message}</p>}
    </div>
  )
}
