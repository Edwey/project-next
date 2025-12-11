import { NextResponse } from "next/server";
import { getCurrentUserFromCookies, getCurrentInstructorId } from "@/lib/auth";
import { query } from "@/lib/db";

// GET:
//  - without section_id: list sections with waitlists for this instructor
//  - with section_id: return section meta + waitlist entries
export async function GET(request: Request) {
  try {
    const user = await getCurrentUserFromCookies();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const instructorId = await getCurrentInstructorId(user.id);
    if (!instructorId) {
      return NextResponse.json(
        { success: true, data: { sections: [] } },
        { status: 200 }
      );
    }

    const url = new URL(request.url);
    const sectionIdParam = url.searchParams.get("section_id");

    if (!sectionIdParam) {
      // Sections owned by instructor that have waitlists
      const sections = await query<{
        id: number;
        section_name: string;
        course_code: string;
        course_name: string;
        wl_count: number;
      }>(
        `SELECT cs.id,
                cs.section_name,
                c.course_code,
                c.course_name,
                COUNT(w.id) AS wl_count
         FROM course_sections cs
         JOIN instructors i ON cs.instructor_id = i.id
         JOIN courses c ON cs.course_id = c.id
         LEFT JOIN waitlists w ON w.course_section_id = cs.id
         WHERE i.id = ?
         GROUP BY cs.id, cs.section_name, c.course_code, c.course_name
         HAVING wl_count > 0
         ORDER BY wl_count DESC, c.course_code`,
        [instructorId]
      );

      return NextResponse.json({
        success: true,
        data: {
          sections: sections.map((s) => ({
            id: s.id,
            section_name: s.section_name,
            course_code: s.course_code,
            course_name: s.course_name,
            wl_count: Number(s.wl_count) || 0,
          })),
        },
      });
    }

    const sectionId = Number(sectionIdParam);
    if (!Number.isInteger(sectionId) || sectionId <= 0) {
      return NextResponse.json(
        { success: false, error: "Invalid section_id" },
        { status: 400 }
      );
    }

    // Ensure the section belongs to this instructor
    const sectionMetaRows = await query<{
      id: number;
      section_name: string;
      capacity: number;
      enrolled_count: number;
      course_code: string;
      course_name: string;
    }>(
      `SELECT cs.id,
              cs.section_name,
              cs.capacity,
              cs.enrolled_count,
              c.course_code,
              c.course_name
       FROM course_sections cs
       JOIN courses c ON cs.course_id = c.id
       WHERE cs.id = ? AND cs.instructor_id = ?
       LIMIT 1`,
      [sectionId, instructorId]
    );

    if (!sectionMetaRows.length) {
      return NextResponse.json(
        { success: false, error: "Section not found" },
        { status: 404 }
      );
    }

    const sectionMeta = sectionMetaRows[0];

    const entries = await query<{
      id: number;
      first_name: string;
      last_name: string;
      sid_code: string;
      requested_at: string;
    }>(
      `SELECT w.id,
              s.first_name,
              s.last_name,
              s.student_id AS sid_code,
              w.requested_at
       FROM waitlists w
       JOIN students s ON w.student_id = s.id
       WHERE w.course_section_id = ?
       ORDER BY w.requested_at ASC, w.id ASC`,
      [sectionId]
    );

    return NextResponse.json({
      success: true,
      data: {
        section: {
          id: sectionMeta.id,
          section_name: sectionMeta.section_name,
          capacity: sectionMeta.capacity,
          enrolled_count: sectionMeta.enrolled_count,
          course_code: sectionMeta.course_code,
          course_name: sectionMeta.course_name,
        },
        entries: entries.map((e) => ({
          id: e.id,
          first_name: e.first_name,
          last_name: e.last_name,
          sid_code: e.sid_code,
          requested_at: e.requested_at,
        })),
      },
    });
  } catch (error) {
    console.error("/api/instructor/waitlists GET error", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch waitlists" },
      { status: 500 }
    );
  }
}

// POST: promote next student or remove a waitlist entry
export async function POST(request: Request) {
  try {
    const user = await getCurrentUserFromCookies();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const instructorId = await getCurrentInstructorId(user.id);
    if (!instructorId) {
      return NextResponse.json(
        { success: false, error: "Instructor not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const action: string = body.action;
    const sectionId: number = Number(body.section_id);

    if (!Number.isInteger(sectionId) || sectionId <= 0) {
      return NextResponse.json(
        { success: false, error: "section_id is required" },
        { status: 400 }
      );
    }

    // Ensure section belongs to this instructor and get meta
    const [section] = await query<{
      id: number;
      capacity: number;
      enrolled_count: number;
      semester_id: number;
      academic_year_id: number;
    }>(
      `SELECT id, capacity, enrolled_count, semester_id, academic_year_id
       FROM course_sections
       WHERE id = ? AND instructor_id = ?
       LIMIT 1`,
      [sectionId, instructorId]
    );

    if (!section) {
      return NextResponse.json(
        { success: false, error: "Section not found" },
        { status: 404 }
      );
    }

    if (action === "remove_entry") {
      const waitlistId: number = Number(body.waitlist_id);
      if (!Number.isInteger(waitlistId) || waitlistId <= 0) {
        return NextResponse.json(
          { success: false, error: "waitlist_id is required" },
          { status: 400 }
        );
      }

      await query(
        "DELETE FROM waitlists WHERE id = ? AND course_section_id = ?",
        [waitlistId, sectionId]
      );

      return NextResponse.json({
        success: true,
        message: "Removed from waitlist",
      });
    }

    if (action === "promote_next") {
      // Check capacity
      if (section.enrolled_count >= section.capacity) {
        return NextResponse.json(
          { success: false, error: "No available seats in this section" },
          { status: 400 }
        );
      }

      // Find next waitlisted student
      const [next] = await query<{
        id: number;
        student_id: number;
      }>(
        `SELECT w.id, w.student_id
         FROM waitlists w
         WHERE w.course_section_id = ?
         ORDER BY w.requested_at ASC, w.id ASC
         LIMIT 1`,
        [sectionId]
      );

      if (!next) {
        return NextResponse.json(
          { success: false, error: "No students on waitlist" },
          { status: 400 }
        );
      }

      // Ensure not already enrolled
      const existingEnrollment = await query<{
        id: number;
      }>(
        `SELECT id
         FROM enrollments
         WHERE student_id = ? AND course_section_id = ?
         LIMIT 1`,
        [next.student_id, sectionId]
      );

      if (!existingEnrollment.length) {
        // Create enrollment record
        await query(
          `INSERT INTO enrollments
             (student_id, course_section_id, enrollment_date, status, semester_id, academic_year_id, created_at)
           VALUES (?, ?, CURDATE(), 'enrolled', ?, ?, NOW())`,
          [
            next.student_id,
            sectionId,
            section.semester_id,
            section.academic_year_id,
          ]
        );

        // Increment enrolled_count safely
        await query(
          `UPDATE course_sections
           SET enrolled_count = LEAST(enrolled_count + 1, capacity)
           WHERE id = ?`,
          [sectionId]
        );
      }

      // Remove from waitlist
      await query("DELETE FROM waitlists WHERE id = ?", [next.id]);

      // Optionally notify the student
      const [stuUser] = await query<{ user_id: number }>(
        "SELECT user_id FROM students WHERE id = ? LIMIT 1",
        [next.student_id]
      );

      if (stuUser) {
        await query(
          `INSERT INTO notifications (user_id, title, message, type, created_at)
           VALUES (?, ?, ?, 'success', NOW())`,
          [
            stuUser.user_id,
            "Waitlist promotion",
            "A seat opened and you have been auto-enrolled from the waitlist.",
          ]
        );
      }

      return NextResponse.json({
        success: true,
        message: "Promoted next student from waitlist",
      });
    }

    return NextResponse.json(
      { success: false, error: "Unsupported action" },
      { status: 400 }
    );
  } catch (error) {
    console.error("/api/instructor/waitlists POST error", error);
    return NextResponse.json(
      { success: false, error: "Failed to modify waitlists" },
      { status: 500 }
    );
  }
}
