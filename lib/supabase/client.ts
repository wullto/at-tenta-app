"use client"

import { createBrowserClient } from "@supabase/ssr"
import { getSupabaseConfig, hasSupabaseEnv } from "./config"

export function createSupabaseBrowserClient() {
  if (!hasSupabaseEnv()) return null
  const { url, key } = getSupabaseConfig()
  return createBrowserClient(url, key)
}
