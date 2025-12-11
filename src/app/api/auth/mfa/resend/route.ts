import { NextResponse } from "next/server";
import { getPendingMfaSession } from "@/lib/auth";
import { generateEmailOtp } from "@/lib/otp";

export async function POST(req: Request) {
  try {
    // Get pending MFA session
    const mfaSession = await getPendingMfaSession();
    if (!mfaSession) {
      return NextResponse.json(
        { success: false, error: "Session expired. Please login again." },
        { status: 401 }
      );
    }

    // Generate and send new OTP
    const success = await generateEmailOtp(mfaSession.uid, 'mfa', 600); // 10 minutes
    
    if (!success) {
      return NextResponse.json(
        { success: false, error: "Failed to send verification code" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "A new verification code has been sent to your email"
    });

  } catch (error) {
    console.error("MFA resend error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to resend code" },
      { status: 500 }
    );
  }
}
