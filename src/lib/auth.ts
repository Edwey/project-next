import { cookies } from "next/headers";
import { query } from "@/lib/db";

const SESSION_COOKIE_NAME = "um_session";
const SESSION_TTL_SECONDS = 60 * 60 * 8; // 8 hours

export type SessionPayload = {
  uid: number;
  role: string;
  exp: number;
};

export function signSession(userId: number, role: string): string {
  const payload: SessionPayload = {
    uid: userId,
    role,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  };
  const json = JSON.stringify(payload);
  const data = Buffer.from(json).toString("base64url");
  // For now we store an unsigned token (just base64url-encoded JSON).
  // This keeps things simple and compatible with both Node and Edge runtimes.
  return data;
}

export function parseSession(token: string | undefined): SessionPayload | null {
  if (!token) return null;
  const [data] = token.split(".");
  if (!data) return null;
  try {
    const json = Buffer.from(data, "base64url").toString("utf8");
    const payload = JSON.parse(json) as SessionPayload;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function getCurrentUserFromCookies() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const payload = parseSession(token);
  if (!payload) return null;

  const users = await query<{
    id: number;
    username: string;
    email: string;
    role: string;
    is_active: number;
  }>("SELECT id, username, email, role, is_active FROM users WHERE id = ? LIMIT 1", [
    payload.uid,
  ]);

  const user = users?.[0];
  if (!user || !user.is_active) return null;
  return user;
}

export async function getCurrentInstructorId(userId: number) {
  const rows = await query<{ id: number }>(
    "SELECT id FROM instructors WHERE user_id = ? LIMIT 1",
    [userId]
  );
  return rows[0]?.id ?? null;
}

export async function requireRole(role: "admin" | "instructor" | "student") {
  const user = await getCurrentUserFromCookies();
  if (!user) return { ok: false as const, error: "unauthenticated" };
  if (user.role !== role) return { ok: false as const, error: "forbidden" };
  return { ok: true as const, user };
}

export async function setSessionCookie(userId: number, role: string) {
  const token = signSession(userId, role);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
  });
}

// MFA session handling
const MFA_COOKIE_NAME = "um_mfa_pending";
const MFA_TTL_SECONDS = 15 * 60; // 15 minutes

export type MfaSessionPayload = {
  uid: number;
  started: number;
  exp: number;
};

export function signMfaSession(userId: number): string {
  const payload: MfaSessionPayload = {
    uid: userId,
    started: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + MFA_TTL_SECONDS,
  };
  const json = JSON.stringify(payload);
  const data = Buffer.from(json).toString("base64url");
  return data;
}

export function parseMfaSession(token: string | undefined): MfaSessionPayload | null {
  if (!token) return null;
  const [data] = token.split(".");
  if (!data) return null;
  try {
    const json = Buffer.from(data, "base64url").toString("utf8");
    const payload = JSON.parse(json) as MfaSessionPayload;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function setPendingMfaSession(userId: number) {
  const token = signMfaSession(userId);
  const cookieStore = await cookies();
  cookieStore.set(MFA_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: MFA_TTL_SECONDS,
  });
}

export async function getPendingMfaSession(): Promise<MfaSessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(MFA_COOKIE_NAME)?.value;
  return parseMfaSession(token);
}

export async function clearMfaSession() {
  const cookieStore = await cookies();
  cookieStore.set(MFA_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
  });
}
