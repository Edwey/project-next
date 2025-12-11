import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const semesterId = Number(searchParams.get("semester_id") || 0);

    const semesters = await query(
      `SELECT s.id, s.semester_name, ay.year_name
       FROM semesters s
       JOIN academic_years ay ON ay.id = s.academic_year_id
       ORDER BY ay.start_date DESC, s.start_date DESC`
    );

    let sections: any[] = [];
    if (semesterId > 0) {
      sections = await query(
        `SELECT cs.id, cs.section_name, cs.capacity,
                (SELECT COUNT(*) FROM enrollments e WHERE e.course_section_id = cs.id AND e.status = 'enrolled') AS enrolled_count,
                c.course_code, c.course_name, CONCAT(i.first_name, ' ', i.last_name) AS instructor_name,
                ay.id AS ay_id, s.id AS sem_id
         FROM course_sections cs
         JOIN courses c ON c.id = cs.course_id
         JOIN instructors i ON i.id = cs.instructor_id
         JOIN semesters s ON s.id = cs.semester_id
         JOIN academic_years ay ON ay.id = cs.academic_year_id
         WHERE cs.semester_id = ?
         ORDER BY c.course_code, cs.section_name`,
        [semesterId]
      );
    }

    return NextResponse.json({
      success: true,
      data: { semesters, sections },
    });
  } catch (error) {
    console.error("/api/admin/academics/enrollments GET error", error);
    return NextResponse.json(
      { success: false, error: "Failed to load enrollments" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      action: string;
      section_id?: number;
    };

    // Placeholder for future enrollment actions
    return NextResponse.json(
      { success: false, error: "Action not implemented" },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("/api/admin/academics/enrollments POST error", error);
    return NextResponse.json(
      { success: false, error: error.message ?? "Failed to process request" },
      { status: 500 }
    );
  }
}
