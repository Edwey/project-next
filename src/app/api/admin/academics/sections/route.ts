import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const deptId = Number(searchParams.get("department_id") || 0);
    const yearId = Number(searchParams.get("year_id") || 0);
    const semesterId = Number(searchParams.get("semester_id") || 0);
    const instructorId = Number(searchParams.get("instructor_id") || 0);
    const courseId = Number(searchParams.get("course_id") || 0);
    const q = (searchParams.get("q") || "").trim();

    const departments = await query(
      `SELECT id, dept_name FROM departments ORDER BY dept_name`
    );

    const years = await query(
      `SELECT id, year_name FROM academic_years ORDER BY start_date DESC`
    );

    const instructors = await query(
      `SELECT id, CONCAT(first_name, ' ', last_name) AS name FROM instructors ORDER BY first_name, last_name`
    );

    let courses: any[] = [];
    if (deptId > 0) {
      courses = await query(
        `SELECT id, course_code, course_name FROM courses WHERE department_id = ? ORDER BY course_code`,
        [deptId]
      );
    } else {
      courses = await query(
        `SELECT id, course_code, course_name FROM courses ORDER BY course_code`
      );
    }

    let semesters: any[] = [];
    if (yearId > 0) {
      semesters = await query(
        `SELECT id, semester_name FROM semesters WHERE academic_year_id = ? ORDER BY start_date`,
        [yearId]
      );
    }

    // Build sections query with filters
    const params: any[] = [];
    const where: string[] = [];

    if (deptId > 0) {
      where.push("c.department_id = ?");
      params.push(deptId);
    }
    if (yearId > 0) {
      where.push("cs.academic_year_id = ?");
      params.push(yearId);
    }
    if (semesterId > 0) {
      where.push("cs.semester_id = ?");
      params.push(semesterId);
    }
    if (instructorId > 0) {
      where.push("cs.instructor_id = ?");
      params.push(instructorId);
    }
    if (courseId > 0) {
      where.push("cs.course_id = ?");
      params.push(courseId);
    }
    if (q !== "") {
      const like = `%${q}%`;
      where.push(
        "(c.course_code LIKE ? OR c.course_name LIKE ? OR cs.section_name LIKE ? OR i.first_name LIKE ? OR i.last_name LIKE ?)"
      );
      params.push(like, like, like, like, like);
    }

    const whereSql = where.length > 0 ? "WHERE " + where.join(" AND ") : "";

    const sections = await query(
      `SELECT cs.id, cs.section_name, cs.schedule, cs.room, cs.capacity,
              c.course_code, c.course_name, d.dept_name,
              CONCAT(i.first_name, ' ', i.last_name) AS instructor_name,
              sem.semester_name, ay.year_name,
              (SELECT COUNT(e.id) FROM enrollments e WHERE e.course_section_id = cs.id) AS enrolled
       FROM course_sections cs
       JOIN courses c ON cs.course_id = c.id
       JOIN departments d ON c.department_id = d.id
       JOIN instructors i ON cs.instructor_id = i.id
       JOIN semesters sem ON cs.semester_id = sem.id
       JOIN academic_years ay ON cs.academic_year_id = ay.id
       ${whereSql}
       ORDER BY ay.year_name DESC, sem.semester_name, c.course_code, cs.section_name
       LIMIT 500`,
      params
    );

    return NextResponse.json({
      success: true,
      data: { sections, departments, years, instructors, courses, semesters },
    });
  } catch (error) {
    console.error("/api/admin/academics/sections GET error", error);
    return NextResponse.json(
      { success: false, error: "Failed to load sections" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      action: "create" | "update" | "delete";
      id?: number;
      course_id?: number;
      section_name?: string;
      instructor_id?: number;
      schedule?: string | null;
      room?: string | null;
      capacity?: number;
      semester_id?: number;
      academic_year_id?: number;
    };

    const action = body.action || "create";

    if (action === "delete") {
      const id = Number(body.id || 0);
      if (!id || Number.isNaN(id)) {
        return NextResponse.json(
          { success: false, error: "Invalid section id" },
          { status: 400 }
        );
      }

      const hasEnroll = await query<{ count: number }>(
        `SELECT COUNT(*) as count FROM enrollments WHERE course_section_id = ?`,
        [id]
      );

      if ((hasEnroll[0]?.count ?? 0) > 0) {
        return NextResponse.json(
          {
            success: false,
            error: "Cannot delete: section has enrollments.",
          },
          { status: 400 }
        );
      }

      await query("DELETE FROM course_sections WHERE id = ?", [id]);
      return NextResponse.json({ success: true });
    }

    const courseId = Number(body.course_id || 0);
    const sectionName = (body.section_name || "").trim();
    const instructorId = Number(body.instructor_id || 0);
    const schedule = (body.schedule || "").trim() || null;
    const room = (body.room || "").trim() || null;
    const capacity = Number(body.capacity || 0);
    const semesterId = Number(body.semester_id || 0);
    const yearId = Number(body.academic_year_id || 0);

    if (!courseId || !sectionName || !instructorId || capacity <= 0 || !semesterId || !yearId) {
      return NextResponse.json(
        { success: false, error: "All required fields must be provided." },
        { status: 400 }
      );
    }

    if (action === "update") {
      const id = Number(body.id || 0);
      if (!id || Number.isNaN(id)) {
        return NextResponse.json(
          { success: false, error: "Invalid section id" },
          { status: 400 }
        );
      }

      await query(
        `UPDATE course_sections SET course_id = ?, section_name = ?, instructor_id = ?, schedule = ?, room = ?, capacity = ?, semester_id = ?, academic_year_id = ? WHERE id = ?`,
        [courseId, sectionName, instructorId, schedule, room, capacity, semesterId, yearId, id]
      );

      return NextResponse.json({ success: true });
    }

    await query(
      `INSERT INTO course_sections (course_id, section_name, instructor_id, schedule, room, capacity, semester_id, academic_year_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [courseId, sectionName, instructorId, schedule, room, capacity, semesterId, yearId]
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("/api/admin/academics/sections POST error", error);
    return NextResponse.json(
      { success: false, error: error.message ?? "Failed to save section" },
      { status: 500 }
    );
  }
}
