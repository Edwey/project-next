import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET() {
  try {
    // Placeholder - Finance module not in current schema
    // Return empty data structure for now
    return NextResponse.json({
      success: true,
      data: {
        totalRevenue: 0,
        pendingPayments: 0,
        completedPayments: 0,
        paymentsByStatus: [],
        recentPayments: [],
      },
    });
  } catch (error) {
    console.error("/api/admin/analytics/finance GET error", error);
    return NextResponse.json(
      { success: false, error: "Failed to load finance analytics" },
      { status: 500 }
    );
  }
}
