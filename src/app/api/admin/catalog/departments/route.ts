import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET() {
  try {
    const departments = await query<{
      id: number;
      dept_code: string;
      dept_name: string;
      dept_head: string | null;
      description: string | null;
    }>(
      `SELECT id, dept_code, dept_name, dept_head, description
       FROM departments
       ORDER BY dept_code`
    );

    return NextResponse.json({
      success: true,
      data: { departments },
    });
  } catch (error) {
    console.error("/api/admin/catalog/departments GET error", error);
    return NextResponse.json(
      { success: false, error: "Failed to load departments" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      action: "create" | "update" | "delete";
      id?: number;
      dept_code?: string;
      dept_name?: string;
      dept_head?: string | null;
      description?: string | null;
    };

    const action = body.action || "create";

    if (action === "delete") {
      const id = Number(body.id || 0);
      if (!id || Number.isNaN(id)) {
        return NextResponse.json(
          { success: false, error: "Invalid department id" },
          { status: 400 }
        );
      }

      // Check for related programs
      const relatedPrograms = await query<{ count: number }>(
        `SELECT COUNT(*) as count FROM programs WHERE department_id = ?`,
        [id]
      );

      if ((relatedPrograms[0]?.count ?? 0) > 0) {
        return NextResponse.json(
          {
            success: false,
            error: "Cannot delete department with existing programs.",
          },
          { status: 400 }
        );
      }

      await query("DELETE FROM departments WHERE id = ?", [id]);
      return NextResponse.json({ success: true });
    }

    const code = (body.dept_code || "").trim().toUpperCase();
    const name = (body.dept_name || "").trim();
    const head = (body.dept_head || "").trim() || null;
    const desc = (body.description || "").trim() || null;

    if (!code || !name) {
      return NextResponse.json(
        { success: false, error: "Code and name are required." },
        { status: 400 }
      );
    }

    if (action === "update") {
      const id = Number(body.id || 0);
      if (!id || Number.isNaN(id)) {
        return NextResponse.json(
          { success: false, error: "Invalid department id" },
          { status: 400 }
        );
      }

      await query(
        `UPDATE departments SET dept_code = ?, dept_name = ?, dept_head = ?, description = ? WHERE id = ?`,
        [code, name, head, desc, id]
      );

      return NextResponse.json({ success: true });
    }

    await query(
      `INSERT INTO departments (dept_code, dept_name, dept_head, description, created_at)
       VALUES (?, ?, ?, ?, NOW())`,
      [code, name, head, desc]
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("/api/admin/catalog/departments POST error", error);
    return NextResponse.json(
      { success: false, error: error.message ?? "Failed to save department" },
      { status: 500 }
    );
  }
}
