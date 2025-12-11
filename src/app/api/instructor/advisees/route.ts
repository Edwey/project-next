import { NextResponse } from "next/server";
import { getCurrentUserFromCookies, getCurrentInstructorId } from "@/lib/auth";
import { query } from "@/lib/db";

// GET:
//  - without advisee_id: list advisees for the instructor
//  - with advisee_id: return recent grades for that advisee
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
        { success: true, data: { advisees: [] } },
        { status: 200 }
      );
    }

    const url = new URL(request.url);
    const adviseeIdParam = url.searchParams.get("advisee_id");

    if (adviseeIdParam) {
      const adviseeId = Number(adviseeIdParam);
      if (!Number.isInteger(adviseeId) || adviseeId <= 0) {
        return NextResponse.json(
          { success: false, error: "Invalid advisee_id" },
          { status: 400 }
        );
      }

      // Recent grades for this advisee (mirrors SIMS query in instructor/advising.php)
      const grades = await query<{
        assessment_type: string;
        assessment_name: string;
        score: number;
        max_score: number;
        grade_date: string;
        course_code: string;
        course_name: string;
        section_name: string;
      }>(
        `SELECT g.assessment_type, g.assessment_name, g.score, g.max_score, g.grade_date,
                c.course_code, c.course_name, cs.section_name
         FROM grades g
         JOIN enrollments e ON g.enrollment_id = e.id
         JOIN course_sections cs ON e.course_section_id = cs.id
         JOIN courses c ON cs.course_id = c.id
         WHERE e.student_id = ?
         ORDER BY g.grade_date DESC
         LIMIT 20`,
        [adviseeId]
      );

      return NextResponse.json({
        success: true,
        data: {
          grades: grades.map((g) => ({
            assessment_type: g.assessment_type,
            assessment_name: g.assessment_name,
            score: Number(g.score),
            max_score: Number(g.max_score),
            grade_date: g.grade_date,
            course_code: g.course_code,
            course_name: g.course_name,
            section_name: g.section_name,
          })),
        },
      });
    }

    // Get advisees assigned to this instructor
    const advisees = await query<{
      student_internal_id: number;
      student_id: string;
      first_name: string;
      last_name: string;
      email: string;
      phone: string | null;
      is_active: number;
    }>(
      `SELECT
         s.id AS student_internal_id,
         s.student_id,
         s.first_name,
         s.last_name,
         u.email,
         s.phone,
         sa.is_active
       FROM student_advisors sa
       JOIN students s ON sa.student_id = s.id
       JOIN users u ON u.id = s.user_id
       WHERE sa.instructor_id = ?
       ORDER BY s.last_name, s.first_name`,
      [instructorId]
    );

    return NextResponse.json({
      success: true,
      data: {
        advisees: advisees.map((a) => ({
          id: a.student_internal_id,
          student_id: a.student_id,
          first_name: a.first_name,
          last_name: a.last_name,
          email: a.email,
          phone: a.phone,
          is_active: a.is_active,
        })),
      },
    });
  } catch (error) {
    console.error("/api/instructor/advisees GET error", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch advisees" },
      { status: 500 }
    );
  }
}

// POST: send a notification to an advisee student
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
    const action = body.action;
    const studentId = Number(body.student_id);
    const title: string = body.title ?? "";
    const message: string = body.message ?? "";
    const type: string = body.type ?? "info";

    if (action !== "send_notification") {
      return NextResponse.json(
        { success: false, error: "Unsupported action" },
        { status: 400 }
      );
    }

    if (!Number.isInteger(studentId) || studentId <= 0 || !title || !message) {
      return NextResponse.json(
        { success: false, error: "Student, title and message are required" },
        { status: 400 }
      );
    }

    // Ensure this student is actually an advisee of the instructor
    const student = await query<{
      user_id: number;
    }>(
      `SELECT s.user_id
       FROM student_advisors sa
       JOIN students s ON sa.student_id = s.id
       WHERE sa.instructor_id = ? AND sa.student_id = ? AND sa.is_active = 1
       LIMIT 1`,
      [instructorId, studentId]
    );

    if (!student.length) {
      return NextResponse.json(
        { success: false, error: "Advisee not found for this instructor" },
        { status: 404 }
      );
    }

    const toUserId = student[0].user_id;

    // Insert into notifications table (mirrors create_notification)
    await query(
      `INSERT INTO notifications (user_id, title, message, type, created_at)
       VALUES (?, ?, ?, ?, NOW())`,
      [toUserId, title, message, type]
    );

    return NextResponse.json({
      success: true,
      message: "Notification sent successfully",
    });
  } catch (error) {
    console.error("/api/instructor/advisees POST error", error);
    return NextResponse.json(
      { success: false, error: "Failed to process advisee action" },
      { status: 500 }
    );
  }
}

