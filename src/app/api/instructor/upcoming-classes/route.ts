import { NextResponse } from "next/server";
import { getCurrentUserFromCookies, getCurrentInstructorId } from "@/lib/auth";
import { query } from "@/lib/db";

type UpcomingClassRow = {
  id: number;
  course_code: string;
  course_name: string;
  section_name: string;
  schedule: string | null;
};

// Lightweight endpoint returning a small list of upcoming classes
// for the instructor's dashboard, similar in spirit to the PHP
// instructor/dashboard.php \"Upcoming Classes\" card.
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
        { success: true, data: { classes: [] } },
        { status: 200 }
      );
    }

    const rows = await query<UpcomingClassRow>(
      `SELECT
         cs.id,
         cs.section_name,
         cs.schedule,
         c.course_code,
         c.course_name
       FROM course_sections cs
       JOIN courses c ON cs.course_id = c.id
       WHERE cs.instructor_id = ?
       ORDER BY cs.id ASC
       LIMIT 8`,
      [instructorId]
    );

    return NextResponse.json({
      success: true,
      data: {
        classes: rows.map((r) => ({
          id: r.id,
          course_code: r.course_code,
          course_name: r.course_name,
          section_name: r.section_name,
          schedule: r.schedule,
        })),
      },
    });
  } catch (error) {
    console.error("/api/instructor/upcoming-classes error", error);
    return NextResponse.json(
      { success: false, error: "Failed to load upcoming classes" },
      { status: 500 }
    );
  }
}
