import { NextResponse } from "next/server";
import { query } from "@/lib/db";

const PAGE_SIZE_DEFAULT = 10;

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const status = url.searchParams.get("status") || "";
    const q = (url.searchParams.get("q") || "").trim();
    const programIdRaw = url.searchParams.get("programId");
    const pageRaw = url.searchParams.get("page") || "1";

    const page = Math.max(1, Number.isNaN(Number(pageRaw)) ? 1 : Number(pageRaw));
    const pageSize = PAGE_SIZE_DEFAULT;

    const where: string[] = [];
    const params: any[] = [];

    if (status) {
      where.push("a.status = ?");
      params.push(status);
    }

    if (programIdRaw) {
      const pid = Number(programIdRaw);
      if (!Number.isNaN(pid) && pid > 0) {
        where.push("a.program_id = ?");
        params.push(pid);
      }
    }

    if (q) {
      const like = `%${q}%`;
      where.push(
        "(a.first_name LIKE ? OR a.last_name LIKE ? OR a.prospect_email LIKE ? OR p.program_name LIKE ?)"
      );
      params.push(like, like, like, like);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const countRows = await query<{ total: number }>(
      `SELECT COUNT(*) AS total
       FROM applications a
       JOIN programs p ON p.id = a.program_id
       ${whereSql}`,
      params
    );
    const total = countRows[0]?.total ?? 0;
    const pages = total === 0 ? 1 : Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(page, pages);
    const offset = (safePage - 1) * pageSize;

    const rows = await query<{
      id: number;
      first_name: string;
      last_name: string;
      prospect_email: string;
      program_name: string;
      wasse_aggregate: number | null;
      cutoff_aggregate: number | null;
      status: string;
      decided_reason: string | null;
      submitted_at: string;
    }>(
      `SELECT
         a.id,
         a.first_name,
         a.last_name,
         a.prospect_email,
         a.wasse_aggregate,
         a.status,
         a.decided_reason,
         a.submitted_at,
         p.program_name,
         p.cutoff_aggregate
       FROM applications a
       JOIN programs p ON p.id = a.program_id
       ${whereSql}
       ORDER BY a.submitted_at DESC
       LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );

    const programs = await query<{ id: number; program_name: string }>(
      `SELECT id, program_name
       FROM programs
       ORDER BY program_name`
    );

    return NextResponse.json({
      success: true,
      data: {
        rows,
        total,
        pages,
        page: safePage,
        pageSize,
        filters: {
          status,
          q,
          programId: programIdRaw ? Number(programIdRaw) : null,
        },
        programs,
      },
    });
  } catch (error) {
    console.error("/api/admin/admissions error", error);
    return NextResponse.json(
      { success: false, error: "Failed to load admissions" },
      { status: 500 }
    );
  }
}
