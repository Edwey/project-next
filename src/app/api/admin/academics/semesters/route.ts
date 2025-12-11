import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const yearId = Number(searchParams.get("year_id") || 0);

    const years = await query<{
      id: number;
      year_name: string;
      start_date: string;
      end_date: string;
    }>(
      `SELECT id, year_name, start_date, end_date
       FROM academic_years
       ORDER BY start_date DESC`
    );

    let semesters: any[] = [];
    if (yearId > 0) {
      semesters = await query(
        `SELECT id, academic_year_id, semester_name, start_date, end_date, 
                registration_deadline, exam_period_start, exam_period_end, notes, is_current
         FROM semesters
         WHERE academic_year_id = ?
         ORDER BY start_date`,
        [yearId]
      );
    }

    return NextResponse.json({
      success: true,
      data: { years, semesters },
    });
  } catch (error) {
    console.error("/api/admin/academics/semesters GET error", error);
    return NextResponse.json(
      { success: false, error: "Failed to load semesters" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      action: "create" | "update" | "delete";
      id?: number;
      academic_year_id?: number;
      semester_name?: string;
      start_date?: string;
      end_date?: string;
      registration_deadline?: string | null;
      exam_period_start?: string | null;
      exam_period_end?: string | null;
      notes?: string | null;
      is_current?: boolean;
    };

    const action = body.action || "create";

    if (action === "delete") {
      const id = Number(body.id || 0);
      if (!id || Number.isNaN(id)) {
        return NextResponse.json(
          { success: false, error: "Invalid semester id" },
          { status: 400 }
        );
      }

      // Check for related course sections or enrollments
      const related = await query<{ sec_count: number; enr_count: number }>(
        `SELECT 
          (SELECT COUNT(*) FROM course_sections WHERE semester_id = ?) AS sec_count,
          (SELECT COUNT(*) FROM enrollments WHERE semester_id = ?) AS enr_count`,
        [id, id]
      );

      if (
        (related[0]?.sec_count ?? 0) > 0 ||
        (related[0]?.enr_count ?? 0) > 0
      ) {
        return NextResponse.json(
          {
            success: false,
            error: "Cannot delete: semester has sections or enrollments.",
          },
          { status: 400 }
        );
      }

      await query("DELETE FROM semesters WHERE id = ?", [id]);
      return NextResponse.json({ success: true });
    }

    const yearId = Number(body.academic_year_id || 0);
    const name = (body.semester_name || "").trim();
    const startDate = (body.start_date || "").trim();
    const endDate = (body.end_date || "").trim();
    const regDeadline = (body.registration_deadline || "").trim() || null;
    const examStart = (body.exam_period_start || "").trim() || null;
    const examEnd = (body.exam_period_end || "").trim() || null;
    const notes = (body.notes || "").trim() || null;
    const isCurrent = body.is_current ? 1 : 0;

    if (!yearId || !name || !startDate || !endDate) {
      return NextResponse.json(
        { success: false, error: "All required fields must be provided." },
        { status: 400 }
      );
    }

    if (action === "update") {
      const id = Number(body.id || 0);
      if (!id || Number.isNaN(id)) {
        return NextResponse.json(
          { success: false, error: "Invalid semester id" },
          { status: 400 }
        );
      }

      await query(
        `UPDATE semesters SET semester_name = ?, start_date = ?, end_date = ?, 
                registration_deadline = ?, exam_period_start = ?, exam_period_end = ?, notes = ?, is_current = ?
         WHERE id = ?`,
        [name, startDate, endDate, regDeadline, examStart, examEnd, notes, isCurrent, id]
      );

      return NextResponse.json({ success: true });
    }

    await query(
      `INSERT INTO semesters (academic_year_id, semester_name, start_date, end_date, 
              registration_deadline, exam_period_start, exam_period_end, notes, is_current, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [yearId, name, startDate, endDate, regDeadline, examStart, examEnd, notes, isCurrent]
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("/api/admin/academics/semesters POST error", error);
    return NextResponse.json(
      { success: false, error: error.message ?? "Failed to save semester" },
      { status: 500 }
    );
  }
}
