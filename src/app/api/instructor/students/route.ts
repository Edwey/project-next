import { NextResponse } from "next/server";
import { getCurrentUserFromCookies, getCurrentInstructorId } from "@/lib/auth";
import { query } from "@/lib/db";

// GET /api/instructor/students
// - without search param: returns { sections, my_students }
// - with ?search=term: returns { results }
export async function GET(request: Request) {
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
        { success: true, data: { sections: [], my_students: [], results: [] } },
        { status: 200 }
      );
    }

    const url = new URL(request.url);
    const search = url.searchParams.get("search");

    // Search mode for quick-add dropdown
    if (search && search.trim() !== "") {
      const term = `%${search.trim()}%`;
      const results = await query<{
        id: number;
        student_id: string;
        first_name: string;
        last_name: string;
      }>(
        `SELECT DISTINCT
           s.id,
           s.student_id,
           s.first_name,
           s.last_name
         FROM students s
         JOIN enrollments e ON s.id = e.student_id
         JOIN course_sections cs ON e.course_section_id = cs.id
         JOIN users u ON s.user_id = u.id
         WHERE cs.instructor_id = ?
           AND e.status = 'enrolled'
           AND (
             s.student_id LIKE ?
             OR s.first_name LIKE ?
             OR s.last_name LIKE ?
             OR u.email LIKE ?
           )
         ORDER BY s.last_name, s.first_name
         LIMIT 50`,
        [instructorId, term, term, term, term]
      );

      return NextResponse.json({
        success: true,
        data: {
          results: results.map((s) => ({
            id: s.id,
            sid_code: s.student_id,
            first_name: s.first_name,
            last_name: s.last_name,
          })),
        },
      });
    }

    // Initial load: sections for dropdown + "my students" table
    const sections = await query<{
      id: number;
      course_code: string;
      course_name: string;
      section_name: string;
      semester_name: string;
      year_name: string;
      level_id: number | null;
    }>(
      `SELECT
         cs.id,
         c.course_code,
         c.course_name,
         cs.section_name,
         sem.semester_name,
         ay.year_name,
         c.level_id
       FROM course_sections cs
       JOIN courses c ON cs.course_id = c.id
       JOIN semesters sem ON cs.semester_id = sem.id
       JOIN academic_years ay ON cs.academic_year_id = ay.id
       WHERE cs.instructor_id = ?
       ORDER BY ay.year_name DESC, sem.start_date DESC, c.course_code`,
      [instructorId]
    );

    const students = await query<{
      id: number;
      student_id: string;
      first_name: string;
      last_name: string;
    }>(
      `SELECT DISTINCT
         s.id,
         s.student_id,
         s.first_name,
         s.last_name
       FROM students s
       JOIN enrollments e ON s.id = e.student_id
       JOIN course_sections cs ON e.course_section_id = cs.id
       WHERE cs.instructor_id = ? AND e.status = 'enrolled'
       ORDER BY s.last_name, s.first_name`,
      [instructorId]
    );

    return NextResponse.json({
      success: true,
      data: {
        sections: sections.map((s) => ({
          id: s.id,
          course_code: s.course_code,
          course_name: s.course_name,
          section_name: s.section_name,
          semester_name: s.semester_name,
          year_name: s.year_name,
          level_id: s.level_id,
        })),
        my_students: students.map((s) => ({
          id: s.id,
          sid_code: s.student_id,
          first_name: s.first_name,
          last_name: s.last_name,
        })),
      },
    });
  } catch (error) {
    console.error("/api/instructor/students error", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch students" },
      { status: 500 }
    );
  }
}

// POST /api/instructor/students
// For now, just acknowledge the action so the UI works without full SIMS logic.
export async function POST(request: Request) {
  try {
    const user = await getCurrentUserFromCookies();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const action = body?.action as string | undefined;

    return NextResponse.json({
      success: true,
      message:
        action === "manual_enroll"
          ? "Enrollment request accepted (stubbed; implement DB logic later)."
          : action === "invite"
          ? "Invite request accepted (stubbed; implement DB logic later)."
          : "Request received.",
    });
  } catch (error) {
    console.error("/api/instructor/students POST error", error);
    return NextResponse.json(
      { success: false, error: "Failed to process request" },
      { status: 500 }
    );
  }
}
