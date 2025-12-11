import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const academicYearId = Number(body.academicYearId ?? 0);
    const semesterId = Number(body.semesterId ?? 0);

    if (!academicYearId && !semesterId) {
      return NextResponse.json(
        { success: false, error: "academicYearId or semesterId is required" },
        { status: 400 }
      );
    }

    const conn = await query("SELECT 1");
    // Use raw queries via the pool; small helper since query() already uses pool

    if (academicYearId) {
      await query("UPDATE academic_years SET is_current = 0");
      await query("UPDATE academic_years SET is_current = 1 WHERE id = ?", [
        academicYearId,
      ]);
    }

    if (semesterId) {
      await query("UPDATE semesters SET is_current = 0");
      await query("UPDATE semesters SET is_current = 1 WHERE id = ?", [
        semesterId,
      ]);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("/api/admin/set-term error", error);
    return NextResponse.json(
      { success: false, error: "Failed to update current term" },
      { status: 500 }
    );
  }
}
