import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    const deptId = Number(searchParams.get("department_id") || 0);
    const action = (searchParams.get("action") || "").trim();

    // Get linkable users (instructor role, not yet linked)
    if (action === "linkable_users") {
      const linkableUsers = await query(
        `SELECT u.id, u.username, u.email FROM users u 
         LEFT JOIN instructors i ON i.user_id = u.id 
         WHERE u.role='instructor' AND i.user_id IS NULL 
         ORDER BY u.username LIMIT 500`
      );
      return NextResponse.json({
        success: true,
        data: { linkableUsers },
      });
    }

    // Get unassigned students
    if (action === "unassigned_students") {
      const unassignedCount = await query<{ cnt: number }>(
        `SELECT COUNT(DISTINCT s.id) AS cnt FROM students s 
         LEFT JOIN student_advisors sa ON sa.student_id = s.id AND sa.is_active = 1 
         WHERE sa.instructor_id IS NULL`
      );
      const unassignedStudents = await query(
        `SELECT s.id, s.student_id, s.first_name, s.last_name, u.email AS email, d.dept_name, l.level_name
         FROM students s
         JOIN users u ON u.id = s.user_id
         JOIN departments d ON s.department_id=d.id
         JOIN levels l ON s.current_level_id=l.id
         LEFT JOIN student_advisors sa ON sa.student_id = s.id AND sa.is_active = 1
         WHERE sa.instructor_id IS NULL
         ORDER BY s.first_name, s.last_name
         LIMIT 500`
      );
      return NextResponse.json({
        success: true,
        data: {
          unassignedCount: unassignedCount[0]?.cnt ?? 0,
          unassignedStudents,
        },
      });
    }

    const departments = await query(
      `SELECT id, dept_name FROM departments ORDER BY dept_name`
    );

    const params: any[] = [];
    const where: string[] = [];

    if (q !== "") {
      const like = `%${q}%`;
      where.push("(i.first_name LIKE ? OR i.last_name LIKE ? OR u.email LIKE ?)");
      params.push(like, like, like);
    }
    if (deptId > 0) {
      where.push("i.department_id = ?");
      params.push(deptId);
    }

    const whereSql = where.length > 0 ? "WHERE " + where.join(" AND ") : "";

    const instructors = await query(
      `SELECT i.id, i.first_name, i.last_name, COALESCE(u.email, '') AS email, i.phone, i.department_id, 
              i.hire_date, COALESCE(d.dept_name, 'N/A') AS dept_name, COUNT(sa.id) AS advisee_count
       FROM instructors i
       LEFT JOIN departments d ON i.department_id = d.id
       LEFT JOIN users u ON i.user_id = u.id
       LEFT JOIN student_advisors sa ON sa.instructor_id = i.id AND sa.is_active = 1
       ${whereSql}
       GROUP BY i.id, i.first_name, i.last_name, u.email, i.phone, i.department_id, i.hire_date, d.dept_name
       ORDER BY i.first_name, i.last_name
       LIMIT 500`,
      where.length > 0 ? params : []
    );

    return NextResponse.json({
      success: true,
      data: { instructors, departments },
    });
  } catch (error) {
    console.error("/api/admin/academics/instructors GET error", error);
    return NextResponse.json(
      { success: false, error: "Failed to load instructors" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      action: "create" | "update" | "delete";
      id?: number;
      first_name?: string;
      last_name?: string;
      email?: string;
      phone?: string;
      department_id?: number;
      hire_date?: string;
      user_id?: number;
    };

    const action = body.action || "create";

    if (action === "delete") {
      const id = Number(body.id || 0);
      if (!id || Number.isNaN(id)) {
        return NextResponse.json(
          { success: false, error: "Invalid instructor id" },
          { status: 400 }
        );
      }

      const hasSections = await query<{ count: number }>(
        `SELECT COUNT(*) as count FROM course_sections WHERE instructor_id = ?`,
        [id]
      );

      if ((hasSections[0]?.count ?? 0) > 0) {
        return NextResponse.json(
          {
            success: false,
            error: "Cannot delete: instructor is assigned to sections.",
          },
          { status: 400 }
        );
      }

      await query("DELETE FROM instructors WHERE id = ?", [id]);
      return NextResponse.json({ success: true });
    }

    const firstName = (body.first_name || "").trim();
    const lastName = (body.last_name || "").trim();
    const phone = (body.phone || "").trim() || null;
    const deptId = Number(body.department_id || 0);
    const hireDate = (body.hire_date || "").trim();
    const userId = body.user_id ? Number(body.user_id) : null;

    if (!firstName || !lastName || !deptId) {
      return NextResponse.json(
        { success: false, error: "First name, last name, and department are required." },
        { status: 400 }
      );
    }

    if (action === "update") {
      const id = Number(body.id || 0);
      if (!id || Number.isNaN(id)) {
        return NextResponse.json(
          { success: false, error: "Invalid instructor id" },
          { status: 400 }
        );
      }

      await query(
        `UPDATE instructors SET first_name = ?, last_name = ?, phone = ?, department_id = ?, hire_date = ?, user_id = ? WHERE id = ?`,
        [firstName, lastName, phone, deptId, hireDate, userId, id]
      );

      return NextResponse.json({ success: true });
    }

    await query(
      `INSERT INTO instructors (first_name, last_name, phone, department_id, user_id, hire_date, created_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [firstName, lastName, phone, deptId, userId, hireDate]
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("/api/admin/academics/instructors POST error", error);
    return NextResponse.json(
      { success: false, error: error.message ?? "Failed to save instructor" },
      { status: 500 }
    );
  }
}
