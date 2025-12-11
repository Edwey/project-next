import { NextResponse } from "next/server";
import { getCurrentUserFromCookies } from "@/lib/auth";
import { query } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function GET() {
  try {
    const user = await getCurrentUserFromCookies();
    if (!user || user.role !== "student") {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get student profile
    const [student] = await query<{
      student_internal_id: number;
      student_id: string;
      first_name: string;
      last_name: string;
      phone: string | null;
      address: string | null;
      date_of_birth: string | null;
      enrollment_date: string;
      graduation_lock_at: string | null;
      department_id: number;
      dept_code: string;
      dept_name: string;
      program_id: number;
      program_code: string;
      program_name: string;
      total_credits: number;
      level_name: string;
      level_order: number;
      username: string;
      user_email: string;
    }>(
      `SELECT
         s.id AS student_internal_id,
         s.student_id,
         s.first_name,
         s.last_name,
         s.phone,
         s.address,
         s.date_of_birth,
         s.enrollment_date,
         s.graduation_lock_at,
         d.id AS department_id,
         d.dept_code,
         d.dept_name,
         p.id AS program_id,
         p.program_code,
         p.program_name,
         p.total_credits,
         l.level_name,
         l.level_order,
         u.username,
         u.email AS user_email
       FROM students s
       JOIN users u ON s.user_id = u.id
       LEFT JOIN departments d ON s.department_id = d.id
       LEFT JOIN programs p ON s.program_id = p.id
       LEFT JOIN levels l ON s.current_level_id = l.id
       WHERE u.id = ?
       LIMIT 1`,
      [user.id]
    );

    if (!student) {
      return NextResponse.json(
        { success: false, error: "Student profile not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        student: {
          student_id: student.student_id,
          first_name: student.first_name,
          last_name: student.last_name,
          phone: student.phone,
          address: student.address,
          date_of_birth: student.date_of_birth,
          enrollment_date: student.enrollment_date,
          graduation_lock_at: student.graduation_lock_at,
          dept_name: student.dept_name,
          level_name: student.level_name,
          program_name: student.program_name,
          username: student.username,
          email: student.user_email,
        },
      },
    });
  } catch (error) {
    console.error("/api/student/profile GET error", error);
    return NextResponse.json(
      { success: false, error: "Failed to load profile" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUserFromCookies();
    if (!user || user.role !== "student") {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { action, email, phone, address, current_password, new_password, confirm_password } = body;

    if (action === "update_profile") {
      if (!email || !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
        return NextResponse.json(
          { success: false, error: "Please enter a valid email address." },
          { status: 400 }
        );
      }

      // Get student record
      const [student] = await query<{ id: number }>(
        `SELECT id FROM students WHERE user_id = ? LIMIT 1`,
        [user.id]
      );

      if (!student) {
        return NextResponse.json(
          { success: false, error: "Student profile not found" },
          { status: 404 }
        );
      }

      await query(`UPDATE students SET phone = ?, address = ? WHERE id = ?`, [
        phone || null,
        address || null,
        student.id,
      ]);
      await query(`UPDATE users SET email = ? WHERE id = ?`, [email, user.id]);

      return NextResponse.json({ success: true, message: "Profile updated successfully." });
    }

    if (action === "change_password") {
      if (!current_password || !new_password || !confirm_password) {
        return NextResponse.json(
          { success: false, error: "All password fields are required." },
          { status: 400 }
        );
      }

      if (new_password !== confirm_password) {
        return NextResponse.json(
          { success: false, error: "New password and confirmation do not match." },
          { status: 400 }
        );
      }

      if (new_password.length < 8) {
        return NextResponse.json(
          { success: false, error: "Password must be at least 8 characters long." },
          { status: 400 }
        );
      }

      // Get current password hash
      const [userRecord] = await query<{ password_hash: string }>(
        `SELECT password_hash FROM users WHERE id = ? LIMIT 1`,
        [user.id]
      );

      if (!userRecord) {
        return NextResponse.json(
          { success: false, error: "User not found" },
          { status: 404 }
        );
      }

      // Verify current password
      const isValid = await bcrypt.compare(current_password, userRecord.password_hash);
      if (!isValid) {
        return NextResponse.json(
          { success: false, error: "Current password is incorrect." },
          { status: 400 }
        );
      }

      // Update password
      const newPasswordHash = await bcrypt.hash(new_password, 10);
      await query(`UPDATE users SET password_hash = ? WHERE id = ?`, [newPasswordHash, user.id]);

      return NextResponse.json({ success: true, message: "Password changed successfully." });
    }

    return NextResponse.json(
      { success: false, error: "Invalid action" },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("/api/student/profile POST error", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update profile" },
      { status: 500 }
    );
  }
}

