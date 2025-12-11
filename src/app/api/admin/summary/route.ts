import { NextResponse } from "next/server";
import { query } from "@/lib/db";

type AdminSummaryStats = {
  usersTotal: number;
  usersAdmin: number;
  usersInstructor: number;
  usersStudent: number;
  departments: number;
  courses: number;
  levels: number;
  academicYears: number;
  semesters: number;
};

type AdminDashboardResponse = {
  stats: AdminSummaryStats;
  currentYear: {
    id: number;
    year_name: string;
    start_date: string;
    end_date: string;
  } | null;
  currentSemester: {
    id: number;
    semester_name: string;
    academic_year_id: number;
  } | null;
  yearsAll: { id: number; year_name: string }[];
  semestersForYear: { id: number; semester_name: string }[];
  recentLogs: {
    id: number;
    action: string;
    entity_type: string | null;
    entity_id: number | null;
    created_at: string;
    username: string | null;
  }[];
  topCourses: {
    id: number;
    course_code: string;
    course_name: string;
    enrolled: number;
  }[];
  unassignedCount: number;
};

export async function GET() {
  try {
    const [statsRow] = await query<AdminSummaryStats>(
      `SELECT
        (SELECT COUNT(*) FROM users) AS usersTotal,
        (SELECT COUNT(*) FROM users WHERE role = 'admin') AS usersAdmin,
        (SELECT COUNT(*) FROM users WHERE role = 'instructor') AS usersInstructor,
        (SELECT COUNT(*) FROM users WHERE role = 'student') AS usersStudent,
        (SELECT COUNT(*) FROM departments) AS departments,
        (SELECT COUNT(*) FROM courses) AS courses,
        (SELECT COUNT(*) FROM levels) AS levels,
        (SELECT COUNT(*) FROM academic_years) AS academicYears,
        (SELECT COUNT(*) FROM semesters) AS semesters
      `
    );

    const [currentYear] = await query<{
      id: number;
      year_name: string;
      start_date: string;
      end_date: string;
    }>(
      `SELECT id, year_name, start_date, end_date
       FROM academic_years
       WHERE is_current = 1
       LIMIT 1`
    );

    const [currentSemester] = await query<{
      id: number;
      semester_name: string;
      academic_year_id: number;
    }>(
      `SELECT id, semester_name, academic_year_id
       FROM semesters
       WHERE is_current = 1
       LIMIT 1`
    );

    const yearsAll = await query<{ id: number; year_name: string }>(
      `SELECT id, year_name
       FROM academic_years
       ORDER BY start_date DESC`
    );

    const semestersForYear = currentYear
      ? await query<{ id: number; semester_name: string }>(
          `SELECT id, semester_name
           FROM semesters
           WHERE academic_year_id = ?
           ORDER BY id`,
          [currentYear.id]
        )
      : [];

    const recentLogs = await query<{
      id: number;
      action: string;
      entity_type: string | null;
      entity_id: number | null;
      created_at: string;
      username: string | null;
    }>(
      `SELECT l.id, l.action, l.entity_type, l.entity_id, l.created_at, u.username
       FROM system_logs l
       LEFT JOIN users u ON l.user_id = u.id
       ORDER BY l.created_at DESC
       LIMIT 8`
    );

    const topCourses = await query<{
      id: number;
      course_code: string;
      course_name: string;
      enrolled: number;
    }>(
      `SELECT c.id, c.course_code, c.course_name, COUNT(e.id) AS enrolled
       FROM courses c
       LEFT JOIN course_sections cs ON cs.course_id = c.id
       LEFT JOIN enrollments e ON e.course_section_id = cs.id
       LEFT JOIN semesters sem ON sem.id = e.semester_id
       WHERE sem.is_current = 1
       GROUP BY c.id, c.course_code, c.course_name
       ORDER BY enrolled DESC
       LIMIT 5`
    );

    const [unassignedRow] = await query<{ cnt: number }>(
      `SELECT COUNT(s.id) AS cnt
       FROM students s
       LEFT JOIN student_advisors sa
         ON sa.student_id = s.id AND sa.is_active = 1
       WHERE sa.id IS NULL`
    );

    const payload: AdminDashboardResponse = {
      stats: statsRow,
      currentYear: currentYear ?? null,
      currentSemester: currentSemester ?? null,
      yearsAll,
      semestersForYear,
      recentLogs,
      topCourses,
      unassignedCount: unassignedRow?.cnt ?? 0,
    };

    return NextResponse.json({ success: true, data: payload });
  } catch (error) {
    console.error("/api/admin/summary error", error);
    return NextResponse.json(
      { success: false, error: "Failed to load admin summary" },
      { status: 500 }
    );
  }
}
