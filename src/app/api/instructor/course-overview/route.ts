import { NextResponse } from "next/server";
import { getCurrentUserFromCookies, getCurrentInstructorId } from "@/lib/auth";
import { query } from "@/lib/db";

export async function GET() {
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
        { success: true, data: { courses: [] } },
        { status: 200 }
      );
    }

    // Return section-level data with course details and pending grades
    const courses = await query<any>(
      `SELECT
        cs.id,
        cs.section_name,
        cs.schedule,
        cs.room,
        cs.capacity,
        cs.enrolled_count,
        c.course_code,
        c.course_name,
        sem.semester_name,
        ay.year_name,
        COALESCE(SUM(CASE WHEN e.final_grade IS NULL THEN 1 ELSE 0 END), 0) AS pending_grades
       FROM course_sections cs
       JOIN courses c ON cs.course_id = c.id
       JOIN semesters sem ON cs.semester_id = sem.id
       JOIN academic_years ay ON cs.academic_year_id = ay.id
       LEFT JOIN enrollments e ON cs.id = e.course_section_id
       WHERE cs.instructor_id = ?
       GROUP BY cs.id, cs.section_name, cs.schedule, cs.room, cs.capacity, cs.enrolled_count,
                c.course_code, c.course_name, sem.semester_name, ay.year_name
       ORDER BY ay.year_name DESC, sem.start_date DESC, c.course_code`,
      [instructorId]
    );

    return NextResponse.json({
      success: true,
      data: {
        courses: courses.map((c) => ({
          id: c.id,
          course_code: c.course_code,
          course_name: c.course_name,
          section_name: c.section_name,
          schedule: c.schedule,
          room: c.room,
          capacity: c.capacity,
          enrolled_count: c.enrolled_count,
          semester_name: c.semester_name,
          year_name: c.year_name,
          pending_grades: Number(c.pending_grades) || 0,
        })),
      },
    });
  } catch (error) {
    console.error("/api/instructor/course-overview error", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch course overview" },
      { status: 500 }
    );
  }
}
