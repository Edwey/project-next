import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { setSessionCookie, setPendingMfaSession } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { generateEmailOtp } from "@/lib/otp";

// Helper to get error message from unknown error type
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

export async function POST(req: Request) {
  try {
    // Parse request body
    let body;
    try {
      body = await req.json();
    } catch (e) {
      console.error('Failed to parse request body:', e);
      return NextResponse.json(
        { success: false, error: 'Invalid request body' },
        { status: 400 }
      );
    }

    const { usernameOrEmail, password } = body as {
      usernameOrEmail?: string;
      password?: string;
    };

    console.log('Login attempt:', { usernameOrEmail: usernameOrEmail?.substring(0, 3) + '***' });

    // Validate input
    if (!usernameOrEmail || !password) {
      return NextResponse.json(
        { success: false, error: "Username/email and password are required" },
        { status: 400 }
      );
    }

    const identifier = usernameOrEmail.trim();
    
    try {
      // Query user from database
      console.log('Querying user from database...');
      const users = await query<{
        id: number;
        username: string;
        email: string;
        password_hash: string;
        role: string;
        is_active: number;
        mfa_email_enabled: number;
      }>(
        "SELECT id, username, email, password_hash, role, is_active, mfa_email_enabled FROM users WHERE (username = ? OR email = ?) LIMIT 1",
        [identifier, identifier]
      );

      console.log('Database query result:', { userCount: users.length });

      const user = users[0];
      if (!user) {
        console.log('No user found with identifier:', identifier);
        return NextResponse.json(
          { success: false, error: "Invalid credentials" },
          { status: 401 }
        );
      }

      if (!user.is_active) {
        console.log('User account is not active:', user.id);
        return NextResponse.json(
          { success: false, error: "Account is disabled" },
          { status: 401 }
        );
      }

      // Verify password
      console.log('Verifying password...');
      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) {
        console.log('Invalid password for user:', user.id);
        return NextResponse.json(
          { success: false, error: "Invalid credentials" },
          { status: 401 }
        );
      }

      // Check if MFA is enabled for this user
      if (user.mfa_email_enabled === 1) {
        // Generate and send OTP
        await generateEmailOtp(user.id, 'mfa', 600); // 10 minutes
        
        // Store pending MFA in session
        await setPendingMfaSession(user.id);
        
        return NextResponse.json({
          success: true,
          requiresMfa: true,
          message: "A verification code has been sent to your email"
        });
      }

      // Set session cookie for non-MFA users
      console.log('Login successful, setting session for user:', user.id);
      await setSessionCookie(user.id, user.role);

      return NextResponse.json({
        success: true,
        data: { 
          id: user.id, 
          username: user.username, 
          email: user.email, 
          role: user.role 
        },
      });
    } catch (dbError) {
      console.error('Database error during login:', dbError);
      throw dbError; // Will be caught by the outer catch
    }
  } catch (error) {
    const errorMessage = getErrorMessage(error);
    console.error("Login error:", errorMessage);
    
    return NextResponse.json(
      { 
        success: false, 
        error: "Login failed",
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      },
      { status: 500 }
    );
  }
}
