import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const filter = (searchParams.get("filter") || "all").trim();

    let where = "";
    if (filter === "unread") {
      where = "WHERE eo.sent_at IS NULL";
    } else if (filter === "read") {
      where = "WHERE eo.sent_at IS NOT NULL";
    }

    const totalResult = await query<{ count: number }>(
      `SELECT COUNT(*) as count FROM email_outbox eo ${where}`
    );
    const total = totalResult[0]?.count ?? 0;

    const unreadResult = await query<{ count: number }>(
      `SELECT COUNT(*) as count FROM email_outbox WHERE sent_at IS NULL`
    );
    const unread = unreadResult[0]?.count ?? 0;

    const notifications = await query(
      `SELECT eo.id, eo.to_user_id, eo.subject, eo.body, 
              IF(eo.sent_at IS NULL, 0, 1) as is_read, eo.created_at, u.username
       FROM email_outbox eo
       LEFT JOIN users u ON eo.to_user_id = u.id
       ${where}
       ORDER BY eo.created_at DESC
       LIMIT 100`
    );

    return NextResponse.json({
      success: true,
      data: { notifications, total, unread },
    });
  } catch (error) {
    console.error("/api/admin/notifications GET error", error);
    return NextResponse.json(
      { success: false, error: "Failed to load notifications" },
      { status: 500 }
    );
  }
}
