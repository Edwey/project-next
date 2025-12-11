import { NextResponse, type NextRequest } from "next/server";
import { query } from "@/lib/db";

// Use a flexible context type so this stays compatible with
// Next 16's RouteHandlerConfig (which may wrap params in a Promise).
export async function POST(req: NextRequest, context: any) {
  try {
    const params = await (context?.params ?? {});
    const appId = Number(params.id);
    if (!appId || Number.isNaN(appId) || appId <= 0) {
      return NextResponse.json(
        { success: false, error: "Invalid application id" },
        { status: 400 }
      );
    }

    const body = (await req.json()) as { note?: string };
    const note = (body.note || "").trim();
    if (!note) {
      return NextResponse.json(
        { success: false, error: "Note is required" },
        { status: 400 }
      );
    }

    // For now we don't have authenticated user wiring in project-next admin,
    // so we log with a null user_id similar to how some system actions behave.
    await query(
      `INSERT INTO system_logs (user_id, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent)
       VALUES (NULL, 'application_note', 'application', ?, NULL, JSON_OBJECT('note', ?), NULL, NULL)`,
      [appId, note]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("/api/admin/admissions/[id]/notes error", error);
    return NextResponse.json(
      { success: false, error: "Failed to add note" },
      { status: 500 }
    );
  }
}
