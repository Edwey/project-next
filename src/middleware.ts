import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PROTECTED_PREFIXES = ["/admin", "/instructor", "/student"];

type SessionPayload = {
  uid: number;
  role: string;
  exp: number;
};

// Lightweight parser for the `um_session` cookie used only in Edge middleware.
// It mirrors the structure from src/lib/auth.ts but does NOT verify the HMAC
// signature, because Node's `crypto` is not available in the Edge runtime.
function parseSessionFromCookie(token: string | undefined): SessionPayload | null {
  if (!token) return null;
  const [data] = token.split(".");
  if (!data) return null;

  try {
    // Base64url decode
    const base64 = data.replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(base64);
    const payload = JSON.parse(json) as SessionPayload;

    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (!PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const token = req.cookies.get("um_session")?.value;
  const payload = parseSessionFromCookie(token);

  if (!payload) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith("/admin") && payload.role !== "admin") {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith("/instructor") && payload.role !== "instructor") {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith("/student") && payload.role !== "student") {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/instructor/:path*", "/student/:path*"],
};
