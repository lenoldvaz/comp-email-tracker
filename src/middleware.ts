import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { updateSession } from "@/lib/supabase/middleware"

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Allow auth routes, cron endpoints, and static files
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/cron") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico"
  ) {
    // Still refresh the session cookie if present
    const { supabaseResponse } = await updateSession(req)
    return supabaseResponse
  }

  const { user, supabaseResponse } = await updateSession(req)

  if (!user) {
    const loginUrl = new URL("/login", req.url)
    loginUrl.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(loginUrl)
  }

  return supabaseResponse
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
