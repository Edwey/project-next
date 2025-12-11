import { NextResponse } from "next/server";
import { getPendingMfaSession, clearMfaSession, setSessionCookie } from "@/lib/auth";
import { verifyEmailOtp } from "@/lib/otp";
import { query } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const { code } = await req.json();

    if (!code || code.length !== 6) {
      return NextResponse.json(
        { success: false, error: "Invalid verification code" },
        { status: 400 }
      );
    }

    // Get pending MFA session
    const mfaSession = await getPendingMfaSession();
    if (!mfaSession) {
      return NextResponse.json(
        { success: false, error: "Session expired. Please login again." },
        { status: 401 }
      );
    }

    // Verify OTP
    const result = await verifyEmailOtp(mfaSession.uid, code, 'mfa');
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.message || "Invalid code" },
        { status: 400 }
      );
    }

    // Get user info
    const users = await query<{
      id: number;
      username: string;
      email: string;
      role: string;
    }>(
      "SELECT id, username, email, role FROM users WHERE id = ? LIMIT 1",
      [mfaSession.uid]
    );

    if (!users || users.length === 0) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 400 }
      );
    }

    const user = users?.[0];

    // Clear MFA session and set regular session
    await clearMfaSession();
    await setSessionCookie(user.id, user.role);

    return NextResponse.json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    console.error("MFA verification error:", error);
    return NextResponse.json(
      { success: false, error: "Verification failed" },
      { status: 500 }
    );
  }
}
