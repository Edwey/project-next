import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET() {
  try {
    const years = await query<{
      id: number;
      year_name: string;
      start_date: string;
      end_date: string;
      is_current: number;
    }>(
      `SELECT id, year_name, start_date, end_date, is_current
       FROM academic_years
       ORDER BY start_date DESC`
    );

    return NextResponse.json({
      success: true,
      data: { years },
    });
  } catch (error) {
    console.error("/api/admin/academics/academic-years GET error", error);
    return NextResponse.json(
      { success: false, error: "Failed to load academic years" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      action: "create" | "update" | "delete";
      id?: number;
      year_name?: string;
      start_date?: string;
      end_date?: string;
      is_current?: boolean;
    };

    const action = body.action || "create";

    if (action === "delete") {
      const id = Number(body.id || 0);
      if (!id || Number.isNaN(id)) {
        return NextResponse.json(
          { success: false, error: "Invalid year id" },
          { status: 400 }
        );
      }

      // Check for related semesters
      const relatedSemesters = await query<{ count: number }>(
        `SELECT COUNT(*) as count FROM semesters WHERE academic_year_id = ?`,
        [id]
      );

      if ((relatedSemesters[0]?.count ?? 0) > 0) {
        return NextResponse.json(
          {
            success: false,
            error: "Cannot delete academic year with existing semesters.",
          },
          { status: 400 }
        );
      }

      await query("DELETE FROM academic_years WHERE id = ?", [id]);
      return NextResponse.json({ success: true });
    }

    const name = (body.year_name || "").trim();
    const startDate = (body.start_date || "").trim();
    const endDate = (body.end_date || "").trim();
    const isCurrent = body.is_current ? 1 : 0;

    if (!name || !startDate || !endDate) {
      return NextResponse.json(
        { success: false, error: "All fields are required." },
        { status: 400 }
      );
    }

    if (action === "update") {
      const id = Number(body.id || 0);
      if (!id || Number.isNaN(id)) {
        return NextResponse.json(
          { success: false, error: "Invalid year id" },
          { status: 400 }
        );
      }

      // If setting as current, unset others
      if (isCurrent) {
        await query("UPDATE academic_years SET is_current = 0");
      }

      await query(
        `UPDATE academic_years SET year_name = ?, start_date = ?, end_date = ?, is_current = ? WHERE id = ?`,
        [name, startDate, endDate, isCurrent, id]
      );

      return NextResponse.json({ success: true });
    }

    // If setting as current, unset others
    if (isCurrent) {
      await query("UPDATE academic_years SET is_current = 0");
    }

    await query(
      `INSERT INTO academic_years (year_name, start_date, end_date, is_current, created_at)
       VALUES (?, ?, ?, ?, NOW())`,
      [name, startDate, endDate, isCurrent]
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("/api/admin/academics/academic-years POST error", error);
    return NextResponse.json(
      { success: false, error: error.message ?? "Failed to save academic year" },
      { status: 500 }
    );
  }
}
