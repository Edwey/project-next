import { NextResponse } from "next/server";
import { getCurrentUserFromCookies, getCurrentInstructorId } from "@/lib/auth";
import { query } from "@/lib/db";

export async function GET() {
  try {
    const user = await getCurrentUserFromCookies();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const instructorId = await getCurrentInstructorId(user.id);
    if (!instructorId) {
      return NextResponse.json(
        { success: false, error: "Instructor profile not found" },
        { status: 404 }
      );
    }

    const instructors = await query<{
      id: number;
      first_name: string;
      last_name: string;
      phone: string | null;
      department_id: number;
      hire_date: string;
    }>(
      "SELECT id, first_name, last_name, phone, department_id, hire_date FROM instructors WHERE id = ? LIMIT 1",
      [instructorId]
    );

    const instructor = instructors[0];
    if (!instructor) {
      return NextResponse.json(
        { success: false, error: "Instructor not found" },
        { status: 404 }
      );
    }

    // Get department name
    const departments = await query<{ dept_name: string }>(
      "SELECT dept_name FROM departments WHERE id = ? LIMIT 1",
      [instructor.department_id]
    );

    return NextResponse.json({
      success: true,
      data: {
        profile: {
          first_name: instructor.first_name,
          last_name: instructor.last_name,
          dept_name: departments[0]?.dept_name || null,
          hire_date: instructor.hire_date,
          username: user.username,
          email: user.email,
          phone: instructor.phone,
          mfa_email_enabled: false, // Default to false if not available
        },
      }
    });
  } catch (error) {
    console.error("/api/instructor/profile error", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch profile" },
      { status: 500 }
    );
  }
}
