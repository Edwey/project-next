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

    // Get current academic period
    const [currentPeriod] = await query<{
      semester_id: number;
      academic_year_id: number;
      semester_name: string;
      year_name: string;
    }>(
      `SELECT
         sem.id AS semester_id,
         ay.id AS academic_year_id,
         sem.semester_name,
         ay.year_name
       FROM semesters sem
       JOIN academic_years ay ON sem.academic_year_id = ay.id
       WHERE sem.is_current = 1
       LIMIT 1`
    );

    // Get current enrollments
    const enrollments = await query<{
      id: number;
      course_code: string;
      course_name: string;
      credits: number;
      section_name: string;
      schedule: string | null;
      room: string | null;
      capacity: number;
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
         cs.capacity,
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
      [student.student_internal_id]
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
      [student.student_internal_id]
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

    // Get GPA by term
    const gpaByTerm = await query<{
      year_name: string;
      semester_name: string;
      term_gpa: number | null;
      term_credits: number | null;
    }>(
      `SELECT
         ay.year_name,
         sem.semester_name,
         CASE
           WHEN SUM(c.credits) > 0 THEN SUM(e.grade_points * c.credits) / SUM(c.credits)
           ELSE NULL
         END AS term_gpa,
         SUM(c.credits) AS term_credits
       FROM enrollments e
       JOIN course_sections cs ON e.course_section_id = cs.id
       JOIN courses c ON cs.course_id = c.id
       JOIN semesters sem ON e.semester_id = sem.id
       JOIN academic_years ay ON e.academic_year_id = ay.id
       WHERE e.student_id = ?
         AND e.final_grade IS NOT NULL
       GROUP BY ay.id, sem.id, ay.year_name, sem.semester_name
       ORDER BY ay.year_name DESC, sem.start_date DESC`,
      [student.student_internal_id]
    );

    // Get recent grades
    const recentGrades = await query<{
      course_code: string;
      course_name: string;
      assessment_name: string;
      assessment_type: string;
      score: number;
      max_score: number;
      weight: number;
      grade_date: string;
    }>(
      `SELECT
         c.course_code,
         c.course_name,
         g.assessment_name,
         g.assessment_type,
         g.score,
         g.max_score,
         g.weight,
         g.grade_date
       FROM grades g
       JOIN enrollments e ON g.enrollment_id = e.id
       JOIN course_sections cs ON e.course_section_id = cs.id
       JOIN courses c ON cs.course_id = c.id
       WHERE e.student_id = ?
       ORDER BY g.grade_date DESC
       LIMIT 5`,
      [student.student_internal_id]
    );

    // Get attendance summary (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const [attendanceSummary] = await query<{
      total_count: number;
      present_count: number;
      absent_count: number;
      late_count: number;
      excused_count: number;
    }>(
      `SELECT
         COUNT(a.id) AS total_count,
         COUNT(CASE WHEN a.status = 'present' THEN 1 END) AS present_count,
         COUNT(CASE WHEN a.status = 'absent' THEN 1 END) AS absent_count,
         COUNT(CASE WHEN a.status = 'late' THEN 1 END) AS late_count,
         COUNT(CASE WHEN a.status = 'excused' THEN 1 END) AS excused_count
       FROM attendance a
       JOIN enrollments e ON a.enrollment_id = e.id
       JOIN course_sections cs ON e.course_section_id = cs.id
       JOIN courses c ON cs.course_id = c.id
       JOIN semesters sem ON e.semester_id = sem.id
       WHERE e.student_id = ?
         AND sem.is_current = 1
         AND a.attendance_date >= ?`,
      [student.student_internal_id, thirtyDaysAgo.toISOString().split("T")[0]]
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
          enrollment_date: student.enrollment_date,
          graduation_lock_at: student.graduation_lock_at,
        },
        currentPeriod: currentPeriod || null,
        enrollments: enrollments.map((e) => ({
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
        gpaSummary,
        gpaByTerm: gpaByTerm.map((t) => ({
          year_name: t.year_name,
          semester_name: t.semester_name,
          term_gpa: t.term_gpa ? Math.round(Number(t.term_gpa) * 100) / 100 : null,
          term_credits: Number(t.term_credits) || 0,
        })),
        recentGrades: recentGrades.map((g) => ({
          course_code: g.course_code,
          course_name: g.course_name,
          assessment_name: g.assessment_name,
          assessment_type: g.assessment_type,
          score: Number(g.score),
          max_score: Number(g.max_score),
          weight: Number(g.weight),
          grade_date: g.grade_date,
        })),
        attendanceSummary: attendanceSummary || {
          total_count: 0,
          present_count: 0,
          absent_count: 0,
          late_count: 0,
          excused_count: 0,
        },
      },
    });
  } catch (error) {
    console.error("/api/student/dashboard error", error);
    return NextResponse.json(
      { success: false, error: "Failed to load dashboard" },
      { status: 500 }
    );
  }
}

