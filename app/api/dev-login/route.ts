import { NextResponse } from "next/server"

const DEV_LOGIN_CODE = process.env.DEV_LOGIN_CODE ?? "ADMIN123"

export async function POST(request: Request) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ ok: false, error: "Not available" }, { status: 404 })
  }

  const body = await request.json()
  const code = String(body.code ?? "").trim()

  if (code !== DEV_LOGIN_CODE) {
    return NextResponse.json({ ok: false, error: "Invalid code" }, { status: 401 })
  }

  const response = NextResponse.json({ ok: true })
  response.cookies.set("dev-login", "enabled", {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
  })
  return response
}
