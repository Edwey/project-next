import { NextResponse } from "next/server";
import { query } from "@/lib/db";

// GET: list programs with department name and all departments
export async function GET() {
  try {
    const programs = await query<{
      id: number;
      program_code: string;
      program_name: string;
      total_credits: number;
      department_id: number;
      dept_name: string;
    }>(
      `SELECT p.id, p.program_code, p.program_name, p.total_credits, p.department_id, d.dept_name
       FROM programs p
       JOIN departments d ON d.id = p.department_id
       ORDER BY p.program_name`
    );

    const departments = await query<{
      id: number;
      dept_name: string;
    }>(
      `SELECT id, dept_name
       FROM departments
       ORDER BY dept_name`
    );

    return NextResponse.json({
      success: true,
      data: {
        programs,
        departments,
      },
    });
  } catch (error) {
    console.error("/api/admin/catalog/programs GET error", error);
    return NextResponse.json(
      { success: false, error: "Failed to load programs" },
      { status: 500 }
    );
  }
}

// POST: create / update / delete
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      action: "create" | "update" | "delete";
      id?: number;
      program_code?: string;
      program_name?: string;
      department_id?: number;
      total_credits?: number;
    };

    const action = body.action || "create";

    if (action === "delete") {
      const id = Number(body.id || 0);
      if (!id || Number.isNaN(id)) {
        return NextResponse.json(
          { success: false, error: "Invalid program id" },
          { status: 400 }
        );
      }

      // Basic safety checks: prevent delete if there are related records
      const relatedCounts = await query<{
        applications: number;
        students: number;
        requirements: number;
      }>(
        `SELECT
           (SELECT COUNT(*) FROM applications WHERE program_id = ?) AS applications,
           (SELECT COUNT(*) FROM students WHERE program_id = ?) AS students,
           (SELECT COUNT(*) FROM program_courses WHERE program_id = ?) AS requirements`,
        [id, id, id]
      );

      const rel = relatedCounts[0];
      if (rel && (rel.applications > 0 || rel.students > 0 || rel.requirements > 0)) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Cannot delete program with existing requirements, applications, or students.",
          },
          { status: 400 }
        );
      }

      await query("DELETE FROM programs WHERE id = ?", [id]);

      return NextResponse.json({
        success: true,
        message: "Program deleted.",
      });
    }

    // create or update
    const code = (body.program_code || "").trim();
    const name = (body.program_name || "").trim();
    const departmentId = Number(body.department_id || 0);
    const totalCredits = Number(body.total_credits || 0);

    if (!code || !name || !departmentId || totalCredits <= 0) {
      return NextResponse.json(
        { success: false, error: "All fields are required and must be valid." },
        { status: 400 }
      );
    }

    if (action === "update") {
      const id = Number(body.id || 0);
      if (!id || Number.isNaN(id)) {
        return NextResponse.json(
          { success: false, error: "Invalid program id" },
          { status: 400 }
        );
      }

      await query(
        `UPDATE programs
         SET program_code = ?, program_name = ?, department_id = ?, total_credits = ?
         WHERE id = ?`,
        [code, name, departmentId, totalCredits, id]
      );

      return NextResponse.json({ success: true, message: "Program updated." });
    }

    // create
    await query(
      `INSERT INTO programs (program_code, program_name, department_id, total_credits)
       VALUES (?, ?, ?, ?)`,
      [code, name, departmentId, totalCredits]
    );

    return NextResponse.json({ success: true, message: "Program created." });
  } catch (error: any) {
    console.error("/api/admin/catalog/programs POST error", error);
    return NextResponse.json(
      { success: false, error: error.message ?? "Failed to save program" },
      { status: 500 }
    );
  }
}
