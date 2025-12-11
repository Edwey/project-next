import { NextResponse } from "next/server";
import { getCurrentUserFromCookies } from "@/lib/auth";
import { query } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const user = await getCurrentUserFromCookies();
    if (!user || user.role !== "student") {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const courseCode = searchParams.get("course") || null;
    const attendanceDate = searchParams.get("date") || null;

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

    // Get available courses
    const availableCourses = await query<{
      course_code: string;
      course_name: string;
    }>(
      `SELECT DISTINCT
         c.course_code,
         c.course_name
       FROM enrollments e
       JOIN course_sections cs ON e.course_section_id = cs.id
       JOIN courses c ON cs.course_id = c.id
       JOIN semesters sem ON e.semester_id = sem.id
       WHERE e.student_id = ?
         AND sem.is_current = 1
       ORDER BY c.course_code`,
      [student.id]
    );

    // Build attendance summary query
    let summarySql = `SELECT
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
         AND sem.is_current = 1`;
    const summaryParams: any[] = [student.id];

    if (courseCode) {
      summarySql += " AND c.course_code = ?";
      summaryParams.push(courseCode);
    }

    if (attendanceDate) {
      summarySql += " AND a.attendance_date = ?";
      summaryParams.push(attendanceDate);
    }

    const [summary] = await query<{
      total_count: number;
      present_count: number;
      absent_count: number;
      late_count: number;
      excused_count: number;
    }>(summarySql, summaryParams);

    // Build attendance records query
    let recordsSql = `SELECT
         a.attendance_date,
         a.status,
         a.notes,
         c.course_code,
         c.course_name,
         cs.section_name,
         cs.schedule,
         CONCAT(i.first_name, ' ', i.last_name) AS instructor_name
       FROM attendance a
       JOIN enrollments e ON a.enrollment_id = e.id
       JOIN course_sections cs ON e.course_section_id = cs.id
       JOIN courses c ON cs.course_id = c.id
       JOIN instructors i ON cs.instructor_id = i.id
       JOIN semesters sem ON e.semester_id = sem.id
       WHERE e.student_id = ?
         AND sem.is_current = 1`;
    const recordsParams: any[] = [student.id];

    if (courseCode) {
      recordsSql += " AND c.course_code = ?";
      recordsParams.push(courseCode);
    }

    if (attendanceDate) {
      recordsSql += " AND a.attendance_date = ?";
      recordsParams.push(attendanceDate);
    }

    recordsSql += " ORDER BY a.attendance_date DESC, c.course_code, cs.section_name";

    const records = await query<{
      attendance_date: string;
      status: string;
      notes: string | null;
      course_code: string;
      course_name: string;
      section_name: string;
      schedule: string | null;
      instructor_name: string;
    }>(recordsSql, recordsParams);

    return NextResponse.json({
      success: true,
      data: {
        availableCourses: availableCourses.map((c) => ({
          course_code: c.course_code,
          course_name: c.course_name,
        })),
        summary: summary || {
          total_count: 0,
          present_count: 0,
          absent_count: 0,
          late_count: 0,
          excused_count: 0,
        },
        records: records.map((r) => ({
          attendance_date: r.attendance_date,
          status: r.status,
          notes: r.notes,
          course_code: r.course_code,
          course_name: r.course_name,
          section_name: r.section_name,
          schedule: r.schedule,
          instructor_name: r.instructor_name,
        })),
      },
    });
  } catch (error) {
    console.error("/api/student/attendance error", error);
    return NextResponse.json(
      { success: false, error: "Failed to load attendance" },
      { status: 500 }
    );
  }
}

