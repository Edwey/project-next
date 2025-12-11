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
        { success: true, data: { sections: [] } },
        { status: 200 }
      );
    }

    // Match SIMS query exactly
    const sections = await query<any>(
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
        ay.year_name
       FROM course_sections cs
       JOIN courses c ON cs.course_id = c.id
       JOIN semesters sem ON cs.semester_id = sem.id
       JOIN academic_years ay ON cs.academic_year_id = ay.id
       WHERE cs.instructor_id = ?
       ORDER BY ay.year_name DESC, sem.start_date DESC, c.course_code`,
      [instructorId]
    );

    return NextResponse.json({
      success: true,
      data: {
        // Match the shape expected by src/app/instructor/page.tsx
        sections: sections.map((s) => ({
          id: s.id,
          course_code: s.course_code,
          course_name: s.course_name,
          section_name: s.section_name,
          schedule: s.schedule,
          room: s.room,
          capacity: s.capacity,
          enrolled_count: s.enrolled_count,
          semester_name: s.semester_name,
          year_name: s.year_name,
        })),
      },
    });
  } catch (error) {
    console.error("/api/instructor/sections error", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch sections" },
      { status: 500 }
    );
  }
}
