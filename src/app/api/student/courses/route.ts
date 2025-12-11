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

    // Find the student record for this user
    const students = await query<{
      id: number;
      student_id: string;
      first_name: string;
      last_name: string;
      dept_name: string;
      level_name: string;
    }>(
      `SELECT s.id, s.student_id, s.first_name, s.last_name, d.dept_name, l.level_name
       FROM students s
       LEFT JOIN departments d ON s.department_id = d.id
       LEFT JOIN levels l ON s.current_level_id = l.id
       WHERE s.user_id = ? LIMIT 1`,
      [user.id]
    );

    const student = students[0];
    if (!student) {
      return NextResponse.json(
        { success: false, error: "Student profile not found" },
        { status: 404 }
      );
    }

    // Current enrollments (status enrolled, current semester)
    const currentEnrollments = await query<{
      id: number;
      course_code: string;
      course_name: string;
      credits: number;
      section_name: string;
      schedule: string | null;
      room: string | null;
      instructor_name: string;
      status: string;
      final_grade: string | null;
      semester_name: string;
      year_name: string;
    }>(
      `SELECT
         e.id,
         c.course_code,
         c.course_name,
         c.credits,
         cs.section_name,
         cs.schedule,
         cs.room,
         CONCAT(i.first_name, ' ', i.last_name) AS instructor_name,
         e.status,
         e.final_grade,
         sem.semester_name,
         ay.year_name
       FROM enrollments e
       JOIN course_sections cs ON e.course_section_id = cs.id
       JOIN courses c ON cs.course_id = c.id
       JOIN instructors i ON cs.instructor_id = i.id
       JOIN semesters sem ON e.semester_id = sem.id
       JOIN academic_years ay ON e.academic_year_id = ay.id
       WHERE e.student_id = ?
         AND sem.is_current = 1
       ORDER BY c.course_code`,
      [student.id]
    );

    // Completed enrollments (has final_grade)
    const completedEnrollments = await query<{
      id: number;
      course_code: string;
      course_name: string;
      credits: number;
      section_name: string;
      schedule: string | null;
      room: string | null;
      instructor_name: string;
      final_grade: string;
      grade_points: number | null;
      semester_name: string;
      year_name: string;
    }>(
      `SELECT
         e.id,
         c.course_code,
         c.course_name,
         c.credits,
         cs.section_name,
         cs.schedule,
         cs.room,
         CONCAT(i.first_name, ' ', i.last_name) AS instructor_name,
         e.final_grade,
         e.grade_points,
         sem.semester_name,
         ay.year_name
       FROM enrollments e
       JOIN course_sections cs ON e.course_section_id = cs.id
       JOIN courses c ON cs.course_id = c.id
       JOIN instructors i ON cs.instructor_id = i.id
       JOIN semesters sem ON e.semester_id = sem.id
       JOIN academic_years ay ON e.academic_year_id = ay.id
       WHERE e.student_id = ?
         AND e.final_grade IS NOT NULL
       ORDER BY ay.year_name DESC, sem.start_date DESC, c.course_code`,
      [student.id]
    );

    return NextResponse.json({
      success: true,
      data: {
        student: {
          student_id: student.student_id,
          first_name: student.first_name,
          last_name: student.last_name,
          dept_name: student.dept_name,
          level_name: student.level_name,
        },
        currentEnrollments: currentEnrollments.map((e) => ({
          id: e.id,
          course_code: e.course_code,
          course_name: e.course_name,
          credits: e.credits,
          section_name: e.section_name,
          schedule: e.schedule,
          room: e.room,
          instructor_name: e.instructor_name,
          status: e.status,
          final_grade: e.final_grade,
          semester_name: e.semester_name,
          year_name: e.year_name,
        })),
        completedEnrollments: completedEnrollments.map((e) => ({
          id: e.id,
          course_code: e.course_code,
          course_name: e.course_name,
          credits: e.credits,
          section_name: e.section_name,
          schedule: e.schedule,
          room: e.room,
          instructor_name: e.instructor_name,
          final_grade: e.final_grade,
          grade_points: e.grade_points,
          semester_name: e.semester_name,
          year_name: e.year_name,
        })),
      },
    });
  } catch (error) {
    console.error("/api/student/courses error", error);
    return NextResponse.json(
      { success: false, error: "Failed to load courses" },
      { status: 500 }
    );
  }
}

