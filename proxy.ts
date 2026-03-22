import { NextRequest, NextResponse } from "next/server"
import { verifyValue } from "./lib/auth"

export function proxy(request: NextRequest) {
  const signed = request.cookies.get("username")?.value
  const username = signed ? verifyValue(signed) : null
  const { pathname } = request.nextUrl

  if (pathname.startsWith("/dashboard") && !username) {
    return NextResponse.redirect(new URL("/signin", request.url))
  }

  if ((pathname === "/signin" || pathname === "/signup") && username) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/dashboard/:path*", "/signin", "/signup"]
}
