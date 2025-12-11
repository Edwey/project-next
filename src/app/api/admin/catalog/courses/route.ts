import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET() {
  try {
    const courses = await query<{
      id: number;
      course_code: string;
      course_name: string;
      department_id: number;
      dept_name: string;
      level_id: number;
      level_name: string;
      credits: number;
      description: string | null;
      prerequisites: string | null;
    }>(
      `SELECT c.id, c.course_code, c.course_name, c.department_id, d.dept_name,
              c.level_id, l.level_name, c.credits, c.description, c.prerequisites
       FROM courses c
       JOIN departments d ON d.id = c.department_id
       JOIN levels l ON l.id = c.level_id
       ORDER BY c.course_code`
    );

    const departments = await query<{
      id: number;
      dept_name: string;
    }>(
      `SELECT id, dept_name FROM departments ORDER BY dept_name`
    );

    const levels = await query<{
      id: number;
      level_name: string;
    }>(
      `SELECT id, level_name FROM levels ORDER BY level_order`
    );

    return NextResponse.json({
      success: true,
      data: { courses, departments, levels },
    });
  } catch (error) {
    console.error("/api/admin/catalog/courses GET error", error);
    return NextResponse.json(
      { success: false, error: "Failed to load courses" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      action: "create" | "update" | "delete";
      id?: number;
      course_code?: string;
      course_name?: string;
      department_id?: number;
      level_id?: number;
      credits?: number;
      description?: string | null;
      prerequisites?: string | null;
    };

    const action = body.action || "create";

    if (action === "delete") {
      const id = Number(body.id || 0);
      if (!id || Number.isNaN(id)) {
        return NextResponse.json(
          { success: false, error: "Invalid course id" },
          { status: 400 }
        );
      }

      // Check for related sections
      const relatedSections = await query<{ count: number }>(
        `SELECT COUNT(*) as count FROM course_sections WHERE course_id = ?`,
        [id]
      );

      if ((relatedSections[0]?.count ?? 0) > 0) {
        return NextResponse.json(
          {
            success: false,
            error: "Cannot delete course with existing sections. Remove sections first.",
          },
          { status: 400 }
        );
      }

      await query("DELETE FROM courses WHERE id = ?", [id]);
      return NextResponse.json({ success: true });
    }

    const code = (body.course_code || "").trim();
    const name = (body.course_name || "").trim();
    const deptId = Number(body.department_id || 0);
    const levelId = Number(body.level_id || 0);
    const credits = Number(body.credits || 0);
    const desc = (body.description || "").trim() || null;
    const prereqs = (body.prerequisites || "").trim() || null;

    if (!code || !name || !deptId || !levelId || credits <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: "All fields are required and credits must be positive.",
        },
        { status: 400 }
      );
    }

    if (action === "update") {
      const id = Number(body.id || 0);
      if (!id || Number.isNaN(id)) {
        return NextResponse.json(
          { success: false, error: "Invalid course id" },
          { status: 400 }
        );
      }

      await query(
        `UPDATE courses SET course_code = ?, course_name = ?, department_id = ?, level_id = ?, credits = ?, description = ?, prerequisites = ? WHERE id = ?`,
        [code, name, deptId, levelId, credits, desc, prereqs, id]
      );

      return NextResponse.json({ success: true });
    }

    await query(
      `INSERT INTO courses (course_code, course_name, department_id, level_id, credits, description, prerequisites, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [code, name, deptId, levelId, credits, desc, prereqs]
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("/api/admin/catalog/courses POST error", error);
    return NextResponse.json(
      { success: false, error: error.message ?? "Failed to save course" },
      { status: 500 }
    );
  }
}
