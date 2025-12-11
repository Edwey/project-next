import { NextResponse, type NextRequest } from "next/server";
import { query } from "@/lib/db";

// Use a flexible context type to stay compatible with Next 16 RouteHandlerConfig.
export async function GET(_req: NextRequest, context: any) {
  try {
    const params = await (context?.params ?? {});
    const appId = Number(params.id);
    if (!appId || Number.isNaN(appId) || appId <= 0) {
      return NextResponse.json(
        { success: false, error: "Invalid application id" },
        { status: 400 }
      );
    }

    const apps = await query<{
      id: number;
      prospect_email: string;
      first_name: string;
      last_name: string;
      phone: string | null;
      program_id: number;
      program_name: string;
      wasse_aggregate: number | null;
      cutoff_aggregate: number | null;
      status: string;
      submitted_at: string;
      decided_at: string | null;
      decided_reason: string | null;
      offer_notes: string | null;
    }>(
      `SELECT
         a.id,
         a.prospect_email,
         a.first_name,
         a.last_name,
         a.phone,
         a.program_id,
         a.wasse_aggregate,
         a.status,
         a.submitted_at,
         a.decided_at,
         a.decided_reason,
         a.offer_notes,
         p.program_name,
         p.cutoff_aggregate
       FROM applications a
       JOIN programs p ON p.id = a.program_id
       WHERE a.id = ?
       LIMIT 1`,
      [appId]
    );

    const app = apps[0];
    if (!app) {
      return NextResponse.json(
        { success: false, error: "Application not found" },
        { status: 404 }
      );
    }

    const notesRows = await query<{
      id: number;
      created_at: string;
      new_values: string | null;
    }>(
      `SELECT id, created_at, new_values
       FROM system_logs
       WHERE entity_type = 'application' AND action = 'application_note' AND entity_id = ?
       ORDER BY created_at DESC`,
      [appId]
    );

    const notes = notesRows.map((row) => {
      let note = "";
      if (row.new_values) {
        try {
          const parsed = JSON.parse(row.new_values as unknown as string);
          if (parsed && typeof parsed.note === "string") {
            note = parsed.note;
          }
        } catch {
          // ignore JSON parse errors, fall back to empty
        }
      }
      return {
        id: row.id,
        created_at: row.created_at,
        note,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        application: app,
        notes,
      },
    });
  } catch (error) {
    console.error("/api/admin/admissions/[id] error", error);
    return NextResponse.json(
      { success: false, error: "Failed to load application detail" },
      { status: 500 }
    );
  }
}
