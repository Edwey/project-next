import { NextResponse } from "next/server";
import { getCurrentUserFromCookies, getCurrentInstructorId } from "@/lib/auth";
import { query } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUserFromCookies();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const sectionIdParam = url.searchParams.get("section_id");

    if (!sectionIdParam) {
      return NextResponse.json(
        { success: false, error: "section_id required" },
        { status: 400 }
      );
    }

    const sectionId = Number(sectionIdParam);
    if (!Number.isInteger(sectionId) || sectionId <= 0) {
      return NextResponse.json(
        { success: false, error: "Invalid section_id" },
        { status: 400 }
      );
    }

    const instructorId = await getCurrentInstructorId(user.id);
    if (!instructorId) {
      return NextResponse.json(
        { success: false, error: "Instructor not found" },
        { status: 404 }
      );
    }

    // Verify instructor owns this section
    const section = await query<{ id: number }>(
      "SELECT id FROM course_sections WHERE id = ? AND instructor_id = ? LIMIT 1",
      [sectionId, instructorId]
    );

    if (!section.length) {
      return NextResponse.json(
        { success: false, error: "Section not found" },
        { status: 404 }
      );
    }

    // Get enrollments with grades for this section (mirrors SIMS get_section_enrollments)
    const enrollments = await query<{
      id: number;
      student_id: number;
      final_grade: string | null;
      grade_points: number | null;
      student_number: string;
      first_name: string;
      last_name: string;
      email: string;
    }>(
      `SELECT 
         e.id,
         e.student_id,
         e.final_grade,
         e.grade_points,
         s.student_id AS student_number,
         s.first_name,
         s.last_name,
         u.email
       FROM enrollments e
       JOIN students s ON e.student_id = s.id
       JOIN users u ON s.user_id = u.id
       WHERE e.course_section_id = ? AND e.status = 'enrolled'
       ORDER BY s.last_name, s.first_name`,
      [sectionId]
    );

    return NextResponse.json({
      success: true,
      data: {
        enrollments: enrollments.map((e) => ({
          enrollment_id: e.id,
          student_id: e.student_number,
          first_name: e.first_name,
          last_name: e.last_name,
          email: e.email,
          final_grade: e.final_grade,
          // Ensure this is always a number or null for the client
          grade_points:
            e.grade_points === null || e.grade_points === undefined
              ? null
              : Number(e.grade_points),
        })),
      },
    });
  } catch (error) {
    console.error("/api/instructor/gradebook error", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch gradebook" },
      { status: 500 }
    );
  }
}
