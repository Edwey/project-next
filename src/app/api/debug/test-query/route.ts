import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET() {
  try {
    // Test the exact query
    const result = await query(
      "SELECT COUNT(*) as count FROM course_sections WHERE instructor_id = ?",
      [1]
    );

    console.log("Raw result:", result);
    console.log("Result[0]:", result[0]);
    console.log("Result[0]?.count:", result[0]?.count);

    return NextResponse.json({
      raw_result: result,
      first_item: result[0],
      count_value: result[0]?.count,
    });
  } catch (error) {
    console.error("Test query error:", error);
    return NextResponse.json(
      { error: String(error), message: (error as any).message },
      { status: 500 }
    );
  }
}
