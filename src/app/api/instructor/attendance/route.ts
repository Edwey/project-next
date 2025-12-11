import { NextResponse } from "next/server";
import { getCurrentUserFromCookies, getCurrentInstructorId } from "@/lib/auth";
import { query } from "@/lib/db";

// GET: Fetch attendance records for a section on a given date
// Mirrors SIMS get_section_attendance_records and supports the
// data shape expected by src/app/instructor/attendance/page.tsx.
export async function GET(request: Request) {
  try {
    const user = await getCurrentUserFromCookies();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const sectionIdParam = url.searchParams.get("section_id");
    const dateParam = url.searchParams.get("date");

    if (!sectionIdParam) {
      return NextResponse.json(
        { success: false, error: "section_id required" },
        { status: 400 }
      );
    }

    const sectionId = Number(sectionIdParam);
    if (!Number.isInteger(sectionId) || sectionId <= 0) {
      return NextResponse.json(
        { success: false, error: "Invalid section_id" },
        { status: 400 }
      );
    }

    const instructorId = await getCurrentInstructorId(user.id);
    if (!instructorId) {
      return NextResponse.json(
        { success: false, error: "Instructor not found" },
        { status: 404 }
      );
    }

    // Verify instructor owns this section
    const section = await query<{
      id: number;
    }>(
      "SELECT id FROM course_sections WHERE id = ? AND instructor_id = ? LIMIT 1",
      [sectionId, instructorId]
    );

    if (!section.length) {
      return NextResponse.json(
        { success: false, error: "Section not found" },
        { status: 404 }
      );
    }

    // Default to today's date if no date specified
    const attendanceDate =
      dateParam && dateParam.trim() !== ""
        ? dateParam
        : new Date().toISOString().split("T")[0];

    // Fetch enrollments and any existing attendance record for that date
    const records = await query<{
      enrollment_id: number;
      student_id: string;
      first_name: string;
      last_name: string;
      status: string | null;
      notes: string | null;
    }>(
      `SELECT
         e.id AS enrollment_id,
         s.student_id,
         s.first_name,
         s.last_name,
         a.status,
         a.notes
       FROM enrollments e
       JOIN students s ON e.student_id = s.id
       LEFT JOIN attendance a
         ON a.enrollment_id = e.id
        AND a.attendance_date = ?
       WHERE e.course_section_id = ?
       ORDER BY s.last_name, s.first_name`,
      [attendanceDate, sectionId]
    );

    return NextResponse.json({
      success: true,
      data: {
        date: attendanceDate,
        records: records.map((r) => ({
          enrollment_id: r.enrollment_id,
          student_id: r.student_id,
          first_name: r.first_name,
          last_name: r.last_name,
          status: r.status,
          notes: r.notes,
        })),
      },
    });
  } catch (error) {
    console.error("/api/instructor/attendance GET error", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch attendance" },
      { status: 500 }
    );
  }
}

// POST: Upsert attendance records for a section and date
// Mirrors SIMS upsert_attendance_record behavior.
export async function POST(request: Request) {
  try {
    const user = await getCurrentUserFromCookies();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const sectionId = Number(body.section_id);
    const attendanceDate: string = body.attendance_date;
    const attendance: Record<number, string> = body.attendance || {};
    const notes: Record<number, string> = body.notes || {};

    if (!Number.isInteger(sectionId) || sectionId <= 0) {
      return NextResponse.json(
        { success: false, error: "section_id is required" },
        { status: 400 }
      );
    }

    if (!attendanceDate) {
      return NextResponse.json(
        { success: false, error: "attendance_date is required" },
        { status: 400 }
      );
    }

    const instructorId = await getCurrentInstructorId(user.id);
    if (!instructorId) {
      return NextResponse.json(
        { success: false, error: "Instructor not found" },
        { status: 404 }
      );
    }

    // Verify section belongs to instructor
    const section = await query<{
      id: number;
    }>(
      "SELECT id FROM course_sections WHERE id = ? AND instructor_id = ? LIMIT 1",
      [sectionId, instructorId]
    );

    if (!section.length) {
      return NextResponse.json(
        { success: false, error: "Section not found" },
        { status: 404 }
      );
    }

    const enrollmentIds = Object.keys(attendance).map((id) => Number(id));
    if (!enrollmentIds.length) {
      return NextResponse.json({
        success: true,
        message: "No attendance updates submitted",
      });
    }

    // Upsert attendance per enrollment_id + date
    for (const enrollmentId of enrollmentIds) {
      if (!Number.isInteger(enrollmentId) || enrollmentId <= 0) continue;

      const status = attendance[enrollmentId];
      const note = notes[enrollmentId] ?? null;

      // Basic validation: only allow known statuses
      const allowed = ["present", "absent", "late", "excused"];
      const normalizedStatus =
        typeof status === "string" && allowed.includes(status)
          ? status
          : "present";

      await query(
        `INSERT INTO attendance (enrollment_id, attendance_date, status, notes, marked_by, created_at)
         VALUES (?, ?, ?, ?, ?, NOW())
         ON DUPLICATE KEY UPDATE status = VALUES(status), notes = VALUES(notes), marked_by = VALUES(marked_by)`,
        [enrollmentId, attendanceDate, normalizedStatus, note, instructorId]
      );
    }

    return NextResponse.json({
      success: true,
      message: "Attendance saved",
    });
  } catch (error) {
    console.error("/api/instructor/attendance POST error", error);
    return NextResponse.json(
      { success: false, error: "Failed to save attendance" },
      { status: 500 }
    );
  }
}
