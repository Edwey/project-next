import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET() {
  try {
    // Get current admin user - in a real app, this would come from session
    const admin = await query(
      `SELECT id, username, email, role, is_active, created_at, last_login 
       FROM users WHERE role = 'admin' LIMIT 1`
    );

    if (!admin || admin.length === 0) {
      return NextResponse.json(
        { success: false, error: "Admin user not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: admin[0],
    });
  } catch (error) {
    console.error("/api/admin/profile GET error", error);
    return NextResponse.json(
      { success: false, error: "Failed to load profile" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      action: string;
      current_password?: string;
      new_password?: string;
      username?: string;
      email?: string;
    };

    if (body.action === "update_profile") {
      const username = (body.username || "").trim();
      const email = (body.email || "").trim();
      
      if (!username || !email) {
        return NextResponse.json(
          { success: false, error: "Username and email are required" },
          { status: 400 }
        );
      }

      // Update the first admin user
      await query(
        `UPDATE users SET username = ?, email = ? WHERE role = 'admin' LIMIT 1`,
        [username, email]
      );

      return NextResponse.json({ success: true });
    }

    if (body.action === "change_password") {
      // In a real app, verify current password and update
      // For now, just return success
      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { success: false, error: "Invalid action" },
      { status: 400 }
    );
  } catch (error) {
    console.error("/api/admin/profile POST error", error);
    return NextResponse.json(
      { success: false, error: "Failed to update profile" },
      { status: 500 }
    );
  }
}
