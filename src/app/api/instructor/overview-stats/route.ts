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
    console.log("Overview stats - user.id:", user.id, "instructorId:", instructorId);
    if (!instructorId) {
      console.log("No instructor ID found for user:", user.id);
      return NextResponse.json({
        success: true,
        data: {
          stats: {
            section_count: 0,
            student_count: 0,
            pending_grades: 0,
          },
        },
      });
    }

    // Use single query like SIMS does with LEFT JOIN
    const stats = await query<any>(
      `SELECT
        COUNT(DISTINCT cs.id) AS section_count,
        COUNT(DISTINCT e.student_id) AS student_count,
        SUM(CASE WHEN e.final_grade IS NULL THEN 1 ELSE 0 END) AS pending_grades
       FROM course_sections cs
       LEFT JOIN enrollments e ON cs.id = e.course_section_id
       WHERE cs.instructor_id = ?`,
      [instructorId]
    );

    console.log("Stats query result:", stats);
    const statsRow = stats[0] || {};
    console.log("Stats row:", statsRow);

    return NextResponse.json({
      success: true,
      data: {
        stats: {
          section_count: Number(statsRow.section_count) || 0,
          student_count: Number(statsRow.student_count) || 0,
          pending_grades: Number(statsRow.pending_grades) || 0,
        },
      },
    });
  } catch (error) {
    console.error("/api/instructor/overview-stats error", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}

