import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET() {
  try {
    const levels = await query<{
      id: number;
      level_name: string;
      level_order: number;
    }>(
      `SELECT id, level_name, level_order
       FROM levels
       ORDER BY level_order`
    );

    return NextResponse.json({
      success: true,
      data: { levels },
    });
  } catch (error) {
    console.error("/api/admin/catalog/levels GET error", error);
    return NextResponse.json(
      { success: false, error: "Failed to load levels" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      action: "create" | "update" | "delete";
      id?: number;
      level_name?: string;
      level_order?: number;
    };

    const action = body.action || "create";

    if (action === "delete") {
      const id = Number(body.id || 0);
      if (!id || Number.isNaN(id)) {
        return NextResponse.json(
          { success: false, error: "Invalid level id" },
          { status: 400 }
        );
      }

      // Check for related courses or students
      const relatedCourses = await query<{ count: number }>(
        `SELECT COUNT(*) as count FROM courses WHERE level_id = ?`,
        [id]
      );

      const relatedStudents = await query<{ count: number }>(
        `SELECT COUNT(*) as count FROM students WHERE current_level_id = ?`,
        [id]
      );

      if (
        (relatedCourses[0]?.count ?? 0) > 0 ||
        (relatedStudents[0]?.count ?? 0) > 0
      ) {
        return NextResponse.json(
          {
            success: false,
            error: "Cannot delete level with existing courses or students.",
          },
          { status: 400 }
        );
      }

      await query("DELETE FROM levels WHERE id = ?", [id]);
      return NextResponse.json({ success: true });
    }

    const name = (body.level_name || "").trim();
    const order = Number(body.level_order || 0);

    if (!name || order <= 0) {
      return NextResponse.json(
        { success: false, error: "Name and order are required." },
        { status: 400 }
      );
    }

    if (action === "update") {
      const id = Number(body.id || 0);
      if (!id || Number.isNaN(id)) {
        return NextResponse.json(
          { success: false, error: "Invalid level id" },
          { status: 400 }
        );
      }

      await query(
        `UPDATE levels SET level_name = ?, level_order = ? WHERE id = ?`,
        [name, order, id]
      );

      return NextResponse.json({ success: true });
    }

    await query(
      `INSERT INTO levels (level_name, level_order, created_at)
       VALUES (?, ?, NOW())`,
      [name, order]
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("/api/admin/catalog/levels POST error", error);
    return NextResponse.json(
      { success: false, error: error.message ?? "Failed to save level" },
      { status: 500 }
    );
  }
}
