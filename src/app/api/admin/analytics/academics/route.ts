import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET() {
  try {
    const totalStudents = await query<{ count: number }>(
      `SELECT COUNT(*) as count FROM students`
    );

    const totalInstructors = await query<{ count: number }>(
      `SELECT COUNT(*) as count FROM instructors`
    );

    const totalSections = await query<{ count: number }>(
      `SELECT COUNT(*) as count FROM course_sections`
    );

    const totalEnrollments = await query<{ count: number }>(
      `SELECT COUNT(*) as count FROM enrollments WHERE status = 'enrolled'`
    );

    const enrollmentsByLevel = await query(
      `SELECT l.level_name, COUNT(e.id) as count
       FROM enrollments e
       JOIN course_sections cs ON e.course_section_id = cs.id
       JOIN students s ON e.student_id = s.id
       JOIN levels l ON s.current_level_id = l.id
       WHERE e.status = 'enrolled'
       GROUP BY l.level_name
       ORDER BY l.level_order`
    );

    const enrollmentsByDept = await query(
      `SELECT d.dept_name, COUNT(e.id) as count
       FROM enrollments e
       JOIN course_sections cs ON e.course_section_id = cs.id
       JOIN students s ON e.student_id = s.id
       JOIN departments d ON s.department_id = d.id
       WHERE e.status = 'enrolled'
       GROUP BY d.dept_name
       ORDER BY count DESC`
    );

    const topSections = await query(
      `SELECT c.course_code, cs.section_name, 
              COUNT(e.id) as enrolled, cs.capacity
       FROM course_sections cs
       JOIN courses c ON cs.course_id = c.id
       LEFT JOIN enrollments e ON cs.id = e.course_section_id AND e.status = 'enrolled'
       GROUP BY cs.id, c.course_code, cs.section_name, cs.capacity
       ORDER BY enrolled DESC
       LIMIT 10`
    );

    return NextResponse.json({
      success: true,
      data: {
        totalStudents: totalStudents[0]?.count ?? 0,
        totalInstructors: totalInstructors[0]?.count ?? 0,
        totalSections: totalSections[0]?.count ?? 0,
        totalEnrollments: totalEnrollments[0]?.count ?? 0,
        enrollmentsByLevel,
        enrollmentsByDept,
        topSections,
      },
    });
  } catch (error) {
    console.error("/api/admin/analytics/academics GET error", error);
    return NextResponse.json(
      { success: false, error: "Failed to load analytics" },
      { status: 500 }
    );
  }
}
