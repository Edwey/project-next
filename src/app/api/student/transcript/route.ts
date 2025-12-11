import { NextResponse } from "next/server";
import { getCurrentUserFromCookies } from "@/lib/auth";
import { query } from "@/lib/db";

export async function GET() {
  try {
    const user = await getCurrentUserFromCookies();
    if (!user || user.role !== "student") {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get student record
    const [student] = await query<{
      id: number;
      student_id: string;
      first_name: string;
      last_name: string;
    }>(
      `SELECT id, student_id, first_name, last_name FROM students WHERE user_id = ? LIMIT 1`,
      [user.id]
    );

    if (!student) {
      return NextResponse.json(
        { success: false, error: "Student profile not found" },
        { status: 404 }
      );
    }

    // Get transcript
    const transcript = await query<{
      year_name: string;
      semester_name: string;
      course_code: string;
      course_name: string;
      credits: number;
      final_grade: string;
      grade_points: number | null;
      status: string;
    }>(
      `SELECT
         ay.year_name,
         sem.semester_name,
         c.course_code,
         c.course_name,
         c.credits,
         e.final_grade,
         e.grade_points,
         e.status
       FROM enrollments e
       JOIN course_sections cs ON e.course_section_id = cs.id
       JOIN courses c ON cs.course_id = c.id
       JOIN semesters sem ON e.semester_id = sem.id
       JOIN academic_years ay ON e.academic_year_id = ay.id
       WHERE e.student_id = ?
         AND e.final_grade IS NOT NULL
         AND e.id = (
           SELECT MAX(e2.id)
           FROM enrollments e2
           JOIN course_sections cs2 ON e2.course_section_id = cs2.id
           JOIN courses c2 ON cs2.course_id = c2.id
           WHERE e2.student_id = e.student_id
             AND e2.academic_year_id = e.academic_year_id
             AND e2.semester_id = e.semester_id
             AND c2.course_code = c.course_code
             AND e2.final_grade IS NOT NULL
         )
       ORDER BY ay.year_name, sem.semester_name, c.course_code`,
      [student.id]
    );

    // Get GPA summary
    const [gpaResult] = await query<{
      total_points: number | null;
      total_credits: number | null;
      total_courses: number | null;
    }>(
      `SELECT
         SUM(e.grade_points * c.credits) AS total_points,
         SUM(c.credits) AS total_credits,
         COUNT(DISTINCT c.id) AS total_courses
       FROM enrollments e
       JOIN course_sections cs ON e.course_section_id = cs.id
       JOIN courses c ON cs.course_id = c.id
       WHERE e.student_id = ?
         AND e.final_grade IS NOT NULL
         AND e.semester_id = (
           SELECT MAX(e2.semester_id)
           FROM enrollments e2
           WHERE e2.student_id = e.student_id
             AND e2.final_grade IS NOT NULL
         )`,
      [student.id]
    );

    let gpaSummary = null;
    if (gpaResult && gpaResult.total_credits && Number(gpaResult.total_credits) > 0) {
      const gpa = Number(gpaResult.total_points) / Number(gpaResult.total_credits);
      gpaSummary = {
        calculated_gpa: Math.round(gpa * 100) / 100,
        total_credits: Number(gpaResult.total_credits),
        total_courses: Number(gpaResult.total_courses),
      };
    }

    return NextResponse.json({
      success: true,
      data: {
        student: {
          student_id: student.student_id,
          first_name: student.first_name,
          last_name: student.last_name,
        },
        transcript: transcript.map((t) => ({
          year_name: t.year_name,
          semester_name: t.semester_name,
          course_code: t.course_code,
          course_name: t.course_name,
          credits: t.credits,
          final_grade: t.final_grade,
          grade_points: t.grade_points,
          status: t.status,
        })),
        gpaSummary,
      },
    });
  } catch (error) {
    console.error("/api/student/transcript error", error);
    return NextResponse.json(
      { success: false, error: "Failed to load transcript" },
      { status: 500 }
    );
  }
}

