import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const sectionId = Number(searchParams.get("section_id") || 0);

    const sectionsWithWL = await query(
      `SELECT cs.id, cs.section_name, c.course_code, c.course_name, COUNT(w.id) AS wl_count
       FROM waitlists w
       JOIN course_sections cs ON w.course_section_id = cs.id
       JOIN courses c ON cs.course_id = c.id
       GROUP BY cs.id, cs.section_name, c.course_code, c.course_name
       ORDER BY wl_count DESC, c.course_code`
    );

    let sectionMeta: any = null;
    let entries: any[] = [];

    if (sectionId > 0) {
      sectionMeta = await query(
        `SELECT cs.id, cs.section_name, cs.capacity,
                (SELECT COUNT(*) FROM enrollments e WHERE e.course_section_id = cs.id) AS enrolled_count,
                c.course_code, c.course_name
         FROM course_sections cs
         JOIN courses c ON cs.course_id = c.id
         WHERE cs.id = ?`,
        [sectionId]
      );

      entries = await query(
        `SELECT w.id, s.id AS student_id, s.student_id AS sid_code, s.first_name, s.last_name, w.requested_at
         FROM waitlists w
         JOIN students s ON w.student_id = s.id
         WHERE w.course_section_id = ?
         ORDER BY w.requested_at`,
        [sectionId]
      );
    }

    return NextResponse.json({
      success: true,
      data: { sectionsWithWL, sectionMeta: sectionMeta?.[0] || null, entries },
    });
  } catch (error) {
    console.error("/api/admin/academics/waitlists GET error", error);
    return NextResponse.json(
      { success: false, error: "Failed to load waitlists" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      action: "remove";
      waitlist_id?: number;
    };

    if (body.action === "remove") {
      const id = Number(body.waitlist_id || 0);
      if (!id || Number.isNaN(id)) {
        return NextResponse.json(
          { success: false, error: "Invalid waitlist id" },
          { status: 400 }
        );
      }

      await query("DELETE FROM waitlists WHERE id = ?", [id]);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { success: false, error: "Invalid action" },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("/api/admin/academics/waitlists POST error", error);
    return NextResponse.json(
      { success: false, error: error.message ?? "Failed to process request" },
      { status: 500 }
    );
  }
}
