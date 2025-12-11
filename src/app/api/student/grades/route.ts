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

    // Get current semester grades
    const currentGradesRaw = await query<{
      course_code: string;
      course_name: string;
      credits: number;
      section_name: string;
      instructor_name: string;
      assessment_type: string | null;
      assessment_name: string | null;
      score: number | null;
      max_score: number | null;
      weight: number | null;
      grade_date: string | null;
      final_grade: string | null;
    }>(
      `SELECT
         c.course_code,
         c.course_name,
         c.credits,
         cs.section_name,
         CONCAT(i.first_name, ' ', i.last_name) AS instructor_name,
         g.assessment_type,
         g.assessment_name,
         g.score,
         g.max_score,
         g.weight,
         g.grade_date,
         e.final_grade
       FROM enrollments e
       JOIN course_sections cs ON e.course_section_id = cs.id
       JOIN courses c ON cs.course_id = c.id
       JOIN instructors i ON cs.instructor_id = i.id
       LEFT JOIN grades g ON e.id = g.enrollment_id
       JOIN semesters sem ON e.semester_id = sem.id
       WHERE e.student_id = ? AND sem.is_current = 1
       ORDER BY c.course_code, g.grade_date DESC`,
      [student.id]
    );

    // Group by course
    const gradesByCourse: Record<
      string,
      {
        course_name: string;
        credits: number;
        section_name: string;
        instructor: string;
        final_grade: string | null;
        assessments: any[];
      }
    > = {};

    for (const row of currentGradesRaw) {
      if (!gradesByCourse[row.course_code]) {
        gradesByCourse[row.course_code] = {
          course_name: row.course_name,
          credits: row.credits,
          section_name: row.section_name,
          instructor: row.instructor_name,
          final_grade: row.final_grade,
          assessments: [],
        };
      }
      if (row.assessment_name) {
        gradesByCourse[row.course_code].assessments.push({
          assessment_type: row.assessment_type,
          assessment_name: row.assessment_name,
          score: row.score,
          max_score: row.max_score,
          weight: row.weight,
          grade_date: row.grade_date,
        });
      }
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
       ORDER BY ay.year_name DESC, sem.start_date DESC, c.course_code`,
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
        gradesByCourse: Object.entries(gradesByCourse).map(([code, data]) => ({
          course_code: code,
          ...data,
        })),
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
    console.error("/api/student/grades error", error);
    return NextResponse.json(
      { success: false, error: "Failed to load grades" },
      { status: 500 }
    );
  }
}

