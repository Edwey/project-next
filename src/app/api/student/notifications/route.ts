import { NextResponse } from "next/server";
import { getCurrentUserFromCookies } from "@/lib/auth";
import { query } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const user = await getCurrentUserFromCookies();
    if (!user || user.role !== "student") {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const onlyUnread = searchParams.get("filter") === "unread";

    let sql = `SELECT
         n.id,
         n.title,
         n.message,
         n.type,
         n.is_read,
         n.created_at,
         n.sender_user_id,
         su.username AS sender_username
       FROM notifications n
       LEFT JOIN users su ON su.id = n.sender_user_id
       WHERE n.user_id = ?`;
    const params: any[] = [user.id];

    if (onlyUnread) {
      sql += " AND n.is_read = 0";
    }

    sql += " ORDER BY n.created_at DESC LIMIT 200";

    const notifications = await query<{
      id: number;
      title: string;
      message: string;
      type: string;
      is_read: number;
      created_at: string;
      sender_user_id: number | null;
      sender_username: string | null;
    }>(sql, params);

    return NextResponse.json({
      success: true,
      data: {
        notifications: notifications.map((n) => ({
          id: n.id,
          title: n.title,
          message: n.message,
          type: n.type,
          is_read: n.is_read === 1,
          created_at: n.created_at,
          sender_username: n.sender_username || "System",
        })),
      },
    });
  } catch (error) {
    console.error("/api/student/notifications GET error", error);
    return NextResponse.json(
      { success: false, error: "Failed to load notifications" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUserFromCookies();
    if (!user || user.role !== "student") {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { action, notification_id } = body;

    if (action === "mark_read" && notification_id) {
      await query(
        `UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?`,
        [notification_id, user.id]
      );
      return NextResponse.json({ success: true });
    }

    if (action === "mark_all_read") {
      await query(
        `UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0`,
        [user.id]
      );
      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { success: false, error: "Invalid action" },
      { status: 400 }
    );
  } catch (error) {
    console.error("/api/student/notifications POST error", error);
    return NextResponse.json(
      { success: false, error: "Failed to update notifications" },
      { status: 500 }
    );
  }
}

