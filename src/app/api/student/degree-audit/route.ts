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
      program_id: number | null;
      student_id: string;
      first_name: string;
      last_name: string;
      dept_name: string;
      level_name: string;
      program_name: string | null;
      total_credits: number | null;
    }>(
      `SELECT
         s.id,
         s.program_id,
         s.student_id,
         s.first_name,
         s.last_name,
         d.dept_name,
         l.level_name,
         p.program_name,
         p.total_credits
       FROM students s
       LEFT JOIN departments d ON s.department_id = d.id
       LEFT JOIN levels l ON s.current_level_id = l.id
       LEFT JOIN programs p ON s.program_id = p.id
       WHERE s.user_id = ? LIMIT 1`,
      [user.id]
    );

    if (!student) {
      return NextResponse.json(
        { success: false, error: "Student profile not found" },
        { status: 404 }
      );
    }

    if (!student.program_id) {
      return NextResponse.json({
        success: true,
        data: {
          student: {
            student_id: student.student_id,
            first_name: student.first_name,
            last_name: student.last_name,
            dept_name: student.dept_name,
            level_name: student.level_name,
            program_name: null,
          },
          progress: null,
          requirements: [],
        },
      });
    }

    // Get program requirements
    const requirements = await query<{
      course_id: number;
      course_code: string;
      course_name: string;
      credits: number;
      required: number;
    }>(
      `SELECT
         c.id AS course_id,
         c.course_code,
         c.course_name,
         c.credits,
         pc.required
       FROM program_courses pc
       JOIN courses c ON pc.course_id = c.id
       WHERE pc.program_id = ?
       ORDER BY c.course_code`,
      [student.program_id]
    );

    // Get completed course IDs
    const completedCourses = await query<{ course_id: number }>(
      `SELECT DISTINCT cs.course_id
       FROM enrollments e
       JOIN course_sections cs ON cs.id = e.course_section_id
       WHERE e.student_id = ? AND e.final_grade IS NOT NULL`,
      [student.id]
    );

    const completedIds = new Set(completedCourses.map((c) => c.course_id));

    // Calculate progress
    let requiredTotal = 0;
    let requiredCompleted = 0;
    let electiveCompleted = 0;
    const remainingRequired: any[] = [];
    const remainingElectives: any[] = [];

    for (const req of requirements) {
      const isRequired = req.required === 1;
      const isCompleted = completedIds.has(req.course_id);

      if (isRequired) {
        requiredTotal++;
        if (isCompleted) {
          requiredCompleted++;
        } else {
          remainingRequired.push(req);
        }
      } else {
        if (isCompleted) {
          electiveCompleted++;
        } else {
          remainingElectives.push(req);
        }
      }
    }

    const totalCompleted = requiredCompleted + electiveCompleted;
    const overallPercent =
      requirements.length > 0 ? Math.round((totalCompleted / requirements.length) * 100) : 0;
    const requiredPercent =
      requiredTotal > 0 ? Math.round((requiredCompleted / requiredTotal) * 100) : 0;

    return NextResponse.json({
      success: true,
      data: {
        student: {
          student_id: student.student_id,
          first_name: student.first_name,
          last_name: student.last_name,
          dept_name: student.dept_name,
          level_name: student.level_name,
          program_name: student.program_name,
          total_credits: student.total_credits,
        },
        progress: {
          total_courses: requirements.length,
          required_courses: requiredTotal,
          completed_courses: totalCompleted,
          required_completed: requiredCompleted,
          elective_completed: electiveCompleted,
          overall_percent: overallPercent,
          required_percent: requiredPercent,
        },
        requirements: requirements.map((r) => ({
          course_id: r.course_id,
          course_code: r.course_code,
          course_name: r.course_name,
          credits: r.credits,
          required: r.required === 1,
          completed: completedIds.has(r.course_id),
        })),
        remaining_required: remainingRequired,
        remaining_electives: remainingElectives,
      },
    });
  } catch (error) {
    console.error("/api/student/degree-audit error", error);
    return NextResponse.json(
      { success: false, error: "Failed to load degree audit" },
      { status: 500 }
    );
  }
}

