import { NextResponse } from "next/server";
import { getCurrentUserFromCookies } from "@/lib/auth";
import { query } from "@/lib/db";

export async function GET() {
  try {
    const user = await getCurrentUserFromCookies();
    if (!user || user.role !== "student") {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get student record
    const [student] = await query<{ id: number }>(
      `SELECT id FROM students WHERE user_id = ? LIMIT 1`,
      [user.id]
    );

    if (!student) {
      return NextResponse.json(
        { success: false, error: "Student profile not found" },
        { status: 404 }
      );
    }

    // Get fee payments
    const feePayments = await query<{
      id: number;
      amount: number;
      payment_date: string;
      status: string;
      scholarship_amount: number | null;
      notes: string | null;
      semester_name: string;
      year_name: string;
    }>(
      `SELECT
         fp.id,
         fp.amount,
         fp.payment_date,
         fp.status,
         fp.scholarship_amount,
         fp.notes,
         sem.semester_name,
         ay.year_name
       FROM fee_payments fp
       JOIN semesters sem ON fp.semester_id = sem.id
       JOIN academic_years ay ON fp.academic_year_id = ay.id
       WHERE fp.student_id = ?
       ORDER BY ay.year_name DESC, sem.start_date DESC`,
      [student.id]
    );

    // Get fee summary
    const [totalPaid] = await query<{ total_paid: number }>(
      `SELECT COALESCE(SUM(amount), 0) AS total_paid
       FROM fee_payments
       WHERE student_id = ? AND status = 'paid'`,
      [student.id]
    );

    const [totalPending] = await query<{ total_pending: number }>(
      `SELECT COALESCE(SUM(amount), 0) AS total_pending
       FROM fee_payments
       WHERE student_id = ? AND status = 'pending'`,
      [student.id]
    );

    return NextResponse.json({
      success: true,
      data: {
        feeSummary: {
          total_paid: Number(totalPaid?.total_paid || 0),
          total_pending: Number(totalPending?.total_pending || 0),
        },
        feePayments: feePayments.map((p) => ({
          id: p.id,
          amount: Number(p.amount),
          payment_date: p.payment_date,
          status: p.status,
          scholarship_amount: p.scholarship_amount ? Number(p.scholarship_amount) : null,
          notes: p.notes,
          semester_name: p.semester_name,
          year_name: p.year_name,
        })),
      },
    });
  } catch (error) {
    console.error("/api/student/fee-statement error", error);
    return NextResponse.json(
      { success: false, error: "Failed to load fee statement" },
      { status: 500 }
    );
  }
}

