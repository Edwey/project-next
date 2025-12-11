import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    const deptId = Number(searchParams.get("department_id") || 0);
    const levelId = Number(searchParams.get("level_id") || 0);
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const perPage = 25;
    const offset = (page - 1) * perPage;

    const departments = await query(
      `SELECT id, dept_name FROM departments ORDER BY dept_name`
    );

    const levels = await query(
      `SELECT id, level_name FROM levels ORDER BY level_order`
    );

    const params: any[] = [];
    const where: string[] = [];

    if (q !== "") {
      const like = `%${q}%`;
      where.push("(s.student_id LIKE ? OR s.first_name LIKE ? OR s.last_name LIKE ? OR s.email LIKE ?)");
      params.push(like, like, like, like);
    }
    if (deptId > 0) {
      where.push("s.department_id = ?");
      params.push(deptId);
    }
    if (levelId > 0) {
      where.push("s.current_level_id = ?");
      params.push(levelId);
    }

    const whereSql = where.length > 0 ? "WHERE " + where.join(" AND ") : "";

    const totalResult = await query<{ count: number }>(
      `SELECT COUNT(*) as count FROM students s ${whereSql}`,
      where.length > 0 ? params : []
    );
    const total = totalResult[0]?.count ?? 0;

    const students = await query(
      `SELECT s.id, s.student_id, s.first_name, s.last_name, COALESCE(u.email, '') AS email, s.phone, 
              s.current_level_id, s.department_id, s.status, 
              COALESCE(d.dept_name, 'N/A') AS dept_name, 
              COALESCE(l.level_name, 'N/A') AS level_name
       FROM students s
       LEFT JOIN departments d ON s.department_id = d.id
       LEFT JOIN levels l ON s.current_level_id = l.id
       LEFT JOIN users u ON s.user_id = u.id
       ${whereSql}
       ORDER BY s.first_name, s.last_name
       LIMIT ? OFFSET ?`,
      [...(where.length > 0 ? params : []), perPage, offset]
    );

    return NextResponse.json({
      success: true,
      data: { students, departments, levels, total, page, perPage },
    });
  } catch (error) {
    console.error("/api/admin/academics/students GET error", error);
    return NextResponse.json(
      { success: false, error: "Failed to load students" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      action: "create" | "update" | "delete";
      id?: number;
      student_id?: string;
      first_name?: string;
      last_name?: string;
      email?: string;
      phone?: string;
      current_level_id?: number;
      department_id?: number;
      status?: string;
    };

    const action = body.action || "create";

    if (action === "delete") {
      const id = Number(body.id || 0);
      if (!id || Number.isNaN(id)) {
        return NextResponse.json(
          { success: false, error: "Invalid student id" },
          { status: 400 }
        );
      }

      const hasEnroll = await query<{ count: number }>(
        `SELECT COUNT(*) as count FROM enrollments WHERE student_id = ?`,
        [id]
      );

      if ((hasEnroll[0]?.count ?? 0) > 0) {
        return NextResponse.json(
          {
            success: false,
            error: "Cannot delete: student has enrollments.",
          },
          { status: 400 }
        );
      }

      await query("DELETE FROM students WHERE id = ?", [id]);
      return NextResponse.json({ success: true });
    }

    const studentId = (body.student_id || "").trim();
    const firstName = (body.first_name || "").trim();
    const lastName = (body.last_name || "").trim();
    const email = (body.email || "").trim();
    const phone = (body.phone || "").trim() || null;
    const levelId = Number(body.current_level_id || 0);
    const deptId = Number(body.department_id || 0);
    const status = ["active", "graduated", "withdrawn", "suspended"].includes(
      body.status || ""
    )
      ? body.status
      : "active";

    if (!firstName || !lastName || !levelId || !deptId) {
      return NextResponse.json(
        { success: false, error: "First name, last name, level, and department are required." },
        { status: 400 }
      );
    }

    if (action === "update") {
      const id = Number(body.id || 0);
      if (!id || Number.isNaN(id)) {
        return NextResponse.json(
          { success: false, error: "Invalid student id" },
          { status: 400 }
        );
      }

      await query(
        `UPDATE students SET student_id = ?, first_name = ?, last_name = ?, email = ?, phone = ?, current_level_id = ?, department_id = ?, status = ? WHERE id = ?`,
        [studentId, firstName, lastName, email, phone, levelId, deptId, status, id]
      );

      return NextResponse.json({ success: true });
    }

    await query(
      `INSERT INTO students (student_id, first_name, last_name, email, phone, current_level_id, department_id, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [studentId, firstName, lastName, email, phone, levelId, deptId, status]
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("/api/admin/academics/students POST error", error);
    return NextResponse.json(
      { success: false, error: error.message ?? "Failed to save student" },
      { status: 500 }
    );
  }
}
