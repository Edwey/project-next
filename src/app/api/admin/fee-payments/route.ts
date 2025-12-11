import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const status = (searchParams.get("status") || "all").trim();

    let where = "";
    if (status !== "all") {
      where = `WHERE status = '${status}'`;
    }

    const totalResult = await query<{ count: number }>(
      `SELECT COUNT(*) as count FROM fee_payments ${where}`
    );
    const total = totalResult[0]?.count ?? 0;

    const totalAmountResult = await query<{ total: number }>(
      `SELECT COALESCE(SUM(amount), 0) as total FROM fee_payments ${where}`
    );
    const totalAmount = totalAmountResult[0]?.total ?? 0;

    const payments = await query(
      `SELECT fp.id, s.student_id, CONCAT(s.first_name, ' ', s.last_name) as student_name, 
              fp.amount, fp.status, fp.payment_date, fp.created_at
       FROM fee_payments fp
       JOIN students s ON fp.student_id = s.id
       ${where}
       ORDER BY fp.created_at DESC
       LIMIT 500`
    );

    return NextResponse.json({
      success: true,
      data: { payments, total, totalAmount },
    });
  } catch (error) {
    console.error("/api/admin/fee-payments GET error", error);
    return NextResponse.json(
      { success: false, error: "Failed to load payments" },
      { status: 500 }
    );
  }
}
