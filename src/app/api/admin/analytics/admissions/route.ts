import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const programIdRaw = url.searchParams.get("programId") || "0";
    const yearRaw = url.searchParams.get("year") || "0";
    const status = (url.searchParams.get("status") || "").trim();

    const programId = Number(programIdRaw);
    const year = Number(yearRaw);

    const where: string[] = [];
    const params: any[] = [];

    if (!Number.isNaN(programId) && programId > 0) {
      where.push("a.program_id = ?");
      params.push(programId);
    }
    if (!Number.isNaN(year) && year > 0) {
      where.push("YEAR(a.submitted_at) = ?");
      params.push(year);
    }
    if (status !== "") {
      where.push("a.status = ?");
      params.push(status);
    }

    const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const statusCounts = await query<{
      status: string;
      total: number;
    }>(
      `SELECT a.status, COUNT(*) AS total
       FROM applications a
       ${whereClause}
       GROUP BY a.status`,
      params
    );

    const countsByStatus: Record<string, number> = {
      applied: 0,
      under_review: 0,
      offered: 0,
      accepted: 0,
      rejected: 0,
    };

    for (const row of statusCounts) {
      countsByStatus[row.status] = Number(row.total) || 0;
    }

    const totalApplications = Object.values(countsByStatus).reduce(
      (sum, v) => sum + v,
      0
    );

    const conversions = {
      review_rate:
        totalApplications > 0
          ? Number(
              ((countsByStatus["under_review"] / totalApplications) * 100).toFixed(1)
            )
          : null,
      offer_rate:
        totalApplications > 0
          ? Number(
              ((countsByStatus["offered"] / totalApplications) * 100).toFixed(1)
            )
          : null,
      accept_rate:
        totalApplications > 0
          ? Number(
              ((countsByStatus["accepted"] / totalApplications) * 100).toFixed(1)
            )
          : null,
    };

    const monthlyTrend = await query<{
      period: string;
      submitted: number;
      accepted: number;
    }>(
      `SELECT DATE_FORMAT(a.submitted_at, "%Y-%m") AS period,
              COUNT(*) AS submitted,
              SUM(CASE WHEN a.status = 'accepted' THEN 1 ELSE 0 END) AS accepted
       FROM applications a
       ${whereClause}
       GROUP BY period
       ORDER BY period DESC
       LIMIT 12`,
      params
    );

    const programBreakdown = await query<{
      program_name: string;
      total: number;
      accepted: number;
    }>(
      `SELECT p.program_name,
              COUNT(*) AS total,
              SUM(CASE WHEN a.status = 'accepted' THEN 1 ELSE 0 END) AS accepted
       FROM applications a
       JOIN programs p ON p.id = a.program_id
       ${whereClause}
       GROUP BY p.id, p.program_name
       ORDER BY total DESC`,
      params
    );

    const programs = await query<{ id: number; program_name: string }>(
      `SELECT id, program_name
       FROM programs
       ORDER BY program_name`
    );

    const years = await query<{ yr: number }>(
      `SELECT DISTINCT YEAR(submitted_at) AS yr
       FROM applications
       ORDER BY yr DESC`
    );

    return NextResponse.json({
      success: true,
      data: {
        filters: {
          programId: !Number.isNaN(programId) ? programId : 0,
          year: !Number.isNaN(year) ? year : 0,
          status,
        },
        countsByStatus,
        totalApplications,
        conversions,
        monthlyTrend,
        programBreakdown,
        programs,
        years,
      },
    });
  } catch (error) {
    console.error("/api/admin/analytics/admissions error", error);
    return NextResponse.json(
      { success: false, error: "Failed to load admissions analytics" },
      { status: 500 }
    );
  }
}