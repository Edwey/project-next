import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();

    const params: any[] = [];
    let where = "";

    if (q !== "") {
      where = "WHERE username LIKE ? OR email LIKE ?";
      const like = `%${q}%`;
      params.push(like, like);
    }

    const totalResult = await query<{ count: number }>(
      `SELECT COUNT(*) as count FROM users ${where}`,
      params
    );
    const total = totalResult[0]?.count ?? 0;

    const users = await query(
      `SELECT id, username, email, role, is_active, created_at FROM users ${where} ORDER BY created_at DESC LIMIT 500`,
      params
    );

    return NextResponse.json({
      success: true,
      data: { users, total },
    });
  } catch (error) {
    console.error("/api/admin/users GET error", error);
    return NextResponse.json(
      { success: false, error: "Failed to load users" },
      { status: 500 }
    );
  }
}
