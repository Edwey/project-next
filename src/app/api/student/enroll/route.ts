import { NextResponse } from "next/server";
import { getCurrentUserFromCookies } from "@/lib/auth";
import { query } from "@/lib/db";

export async function GET() {
  try {
    const user = await getCurrentUserFromCookies();
    if (!user || user.role !== "student") {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get student profile
    const [student] = await query<{
      id: number;
      student_id: string;
      first_name: string;
      last_name: string;
      dept_name: string;
      level_name: string;
      department_id: number;
    }>(
      `SELECT s.id, s.student_id, s.first_name, s.last_name, d.dept_name, l.level_name, s.department_id
       FROM students s
       LEFT JOIN departments d ON s.department_id = d.id
       LEFT JOIN levels l ON s.current_level_id = l.id
       WHERE s.user_id = ? LIMIT 1`,
      [user.id]
    );

    if (!student) {
      return NextResponse.json(
        { success: false, error: "Student profile not found" },
        { status: 404 }
      );
    }

    // Get current academic period
    const [currentPeriod] = await query<{
      semester_id: number;
      academic_year_id: number;
      semester_name: string;
      year_name: string;
    }>(
      `SELECT
         sem.id AS semester_id,
         ay.id AS academic_year_id,
         sem.semester_name,
         ay.year_name
       FROM semesters sem
       JOIN academic_years ay ON sem.academic_year_id = ay.id
       WHERE sem.is_current = 1
       LIMIT 1`
    );

    // Get current enrollments
    const currentEnrollments = await query<{
      id: number;
      course_code: string;
      course_name: string;
      credits: number;
      section_name: string;
    }>(
      `SELECT
         e.id,
         c.course_code,
         c.course_name,
         c.credits,
         cs.section_name
       FROM enrollments e
       JOIN course_sections cs ON e.course_section_id = cs.id
       JOIN courses c ON cs.course_id = c.id
       JOIN semesters sem ON e.semester_id = sem.id
       WHERE e.student_id = ?
         AND sem.is_current = 1
       ORDER BY c.course_code`,
      [student.id]
    );

    // Get available sections for student's department
    let sections: any[] = [];
    if (currentPeriod && student.department_id) {
      sections = await query<{
        id: number;
        section_name: string;
        schedule: string | null;
        room: string | null;
        capacity: number;
        enrolled_count: number;
        course_code: string;
        course_name: string;
        credits: number;
        instructor_name: string;
      }>(
        `SELECT
           cs.id,
           cs.section_name,
           cs.schedule,
           cs.room,
           cs.capacity,
           cs.enrolled_count,
           c.course_code,
           c.course_name,
           c.credits,
           CONCAT(i.first_name, ' ', i.last_name) AS instructor_name
         FROM course_sections cs
         JOIN courses c ON cs.course_id = c.id
         JOIN instructors i ON cs.instructor_id = i.id
         WHERE c.department_id = ?
           AND cs.semester_id = ?
           AND cs.academic_year_id = ?
         ORDER BY c.course_code, cs.section_name`,
        [student.department_id, currentPeriod.semester_id, currentPeriod.academic_year_id]
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        student: {
          student_id: student.student_id,
          first_name: student.first_name,
          last_name: student.last_name,
          dept_name: student.dept_name,
          level_name: student.level_name,
        },
        currentPeriod: currentPeriod || null,
        currentEnrollments: currentEnrollments.map((e) => ({
          id: e.id,
          course_code: e.course_code,
          course_name: e.course_name,
          credits: e.credits,
          section_name: e.section_name,
        })),
        sections: sections.map((s) => ({
          id: s.id,
          section_name: s.section_name,
          schedule: s.schedule,
          room: s.room,
          capacity: s.capacity,
          enrolled_count: s.enrolled_count,
          course_code: s.course_code,
          course_name: s.course_name,
          credits: s.credits,
          instructor_name: s.instructor_name,
        })),
      },
    });
  } catch (error) {
    console.error("/api/student/enroll GET error", error);
    return NextResponse.json(
      { success: false, error: "Failed to load enrollment data" },
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
    const { section_id } = body;

    if (!section_id || typeof section_id !== "number") {
      return NextResponse.json(
        { success: false, error: "Invalid section ID" },
        { status: 400 }
      );
    }

    // Get student record
    const [student] = await query<{
      id: number;
      current_level_id: number | null;
      program_id: number | null;
      department_id: number;
    }>(
      `SELECT s.id, s.current_level_id, s.program_id, s.department_id
       FROM students s
       WHERE s.user_id = ? LIMIT 1`,
      [user.id]
    );

    if (!student) {
      return NextResponse.json(
        { success: false, error: "Student profile not found" },
        { status: 404 }
      );
    }

    // Get current academic period
    const [currentPeriod] = await query<{
      semester_id: number;
      academic_year_id: number;
      start_date: string | null;
      end_date: string | null;
      registration_deadline: string | null;
    }>(
      `SELECT
         sem.id AS semester_id,
         ay.id AS academic_year_id,
         sem.start_date,
         sem.end_date,
         sem.registration_deadline
       FROM semesters sem
       JOIN academic_years ay ON sem.academic_year_id = ay.id
       WHERE sem.is_current = 1
       LIMIT 1`
    );

    if (!currentPeriod) {
      return NextResponse.json(
        { success: false, error: "Enrollment is currently closed." },
        { status: 400 }
      );
    }

    // Check if already enrolled
    const [existing] = await query<{ id: number }>(
      `SELECT id FROM enrollments
       WHERE student_id = ? AND course_section_id = ? AND semester_id = ?`,
      [student.id, section_id, currentPeriod.semester_id]
    );

    if (existing) {
      return NextResponse.json(
        { success: false, error: "You are already enrolled in this section." },
        { status: 400 }
      );
    }

    // Load section details
    const [section] = await query<{
      id: number;
      capacity: number;
      enrolled_count: number;
      semester_id: number;
      academic_year_id: number;
      course_id: number;
      course_code: string;
      level_id: number | null;
      prerequisites: string | null;
      start_date: string | null;
      end_date: string | null;
      registration_deadline: string | null;
    }>(
      `SELECT
         cs.id,
         cs.capacity,
         cs.enrolled_count,
         cs.semester_id,
         cs.academic_year_id,
         c.id AS course_id,
         c.course_code,
         c.level_id,
         c.prerequisites,
         sem.start_date,
         sem.end_date,
         sem.registration_deadline
       FROM course_sections cs
       JOIN courses c ON c.id = cs.course_id
       JOIN semesters sem ON sem.id = cs.semester_id
       WHERE cs.id = ?
       LIMIT 1`,
      [section_id]
    );

    if (!section) {
      return NextResponse.json(
        { success: false, error: "Selected section was not found." },
        { status: 404 }
      );
    }

    if (
      section.semester_id !== currentPeriod.semester_id ||
      section.academic_year_id !== currentPeriod.academic_year_id
    ) {
      return NextResponse.json(
        { success: false, error: "Section does not belong to the selected term." },
        { status: 400 }
      );
    }

    // Check enrollment window
    const today = new Date().toISOString().split("T")[0];
    if (section.start_date && today < section.start_date) {
      return NextResponse.json(
        { success: false, error: "Enrollment has not opened yet for this term." },
        { status: 400 }
      );
    }

    const closeDate = section.registration_deadline || section.end_date || null;
    if (closeDate && today > closeDate) {
      return NextResponse.json(
        { success: false, error: "Enrollment is closed for this term." },
        { status: 400 }
      );
    }

    // Level check
    if (section.level_id && student.current_level_id) {
      const [studentLevel] = await query<{ level_order: number }>(
        `SELECT level_order FROM levels WHERE id = ? LIMIT 1`,
        [student.current_level_id]
      );
      const [courseLevel] = await query<{ level_order: number }>(
        `SELECT level_order FROM levels WHERE id = ? LIMIT 1`,
        [section.level_id]
      );

      if (studentLevel && courseLevel && studentLevel.level_order !== courseLevel.level_order) {
        return NextResponse.json(
          { success: false, error: "You can only enroll in courses that match your current level." },
          { status: 400 }
        );
      }
    }

    // Prerequisites check
    if (section.prerequisites) {
      const requiredCodes = section.prerequisites
        .split(",")
        .map((c: string) => c.trim().toUpperCase())
        .filter((c: string) => c.length > 0);

      if (requiredCodes.length > 0) {
        const completed = await query<{ code: string }>(
          `SELECT DISTINCT UPPER(c.course_code) AS code
           FROM enrollments e
           JOIN course_sections cs ON e.course_section_id = cs.id
           JOIN courses c ON cs.course_id = c.id
           WHERE e.student_id = ? AND e.final_grade IS NOT NULL`,
          [student.id]
        );

        const completedCodes = completed.map((c) => c.code);
        const missing = requiredCodes.filter((c: string) => !completedCodes.includes(c));

        if (missing.length > 0) {
          return NextResponse.json(
            { success: false, error: `Missing prerequisites: ${missing.join(", ")}.` },
            { status: 400 }
          );
        }
      }
    }

    // Program-specific prerequisites
    if (student.program_id) {
      const programPrereqs = await query<{
        prereq_course_id: number;
        course_code: string;
      }>(
        `SELECT cp.prereq_course_id, prereq.course_code
         FROM course_prerequisites cp
         JOIN program_courses pc ON pc.course_id = cp.course_id
         JOIN courses prereq ON prereq.id = cp.prereq_course_id
         WHERE cp.course_id = ? AND pc.program_id = ?
         ORDER BY prereq.course_code`,
        [section.course_id, student.program_id]
      );

      if (programPrereqs.length > 0) {
        const completedCourseIds = await query<{ course_id: number }>(
          `SELECT DISTINCT cs.course_id
           FROM enrollments e
           JOIN course_sections cs ON cs.id = e.course_section_id
           WHERE e.student_id = ? AND e.final_grade IS NOT NULL`,
          [student.id]
        );

        const completedIds = new Set(completedCourseIds.map((c) => c.course_id));
        const missingProgramPrereqs = programPrereqs
          .filter((p) => !completedIds.has(p.prereq_course_id))
          .map((p) => p.course_code);

        if (missingProgramPrereqs.length > 0) {
          return NextResponse.json(
            {
              success: false,
              error: `Missing prerequisite courses for your program: ${missingProgramPrereqs.join(", ")}.`,
            },
            { status: 400 }
          );
        }
      }
    }

    // Capacity / waitlist check
    if (section.enrolled_count >= section.capacity) {
      // Check if already on waitlist
      const [waitlist] = await query<{ id: number }>(
        `SELECT id FROM waitlists WHERE student_id = ? AND course_section_id = ? LIMIT 1`,
        [student.id, section_id]
      );

      if (waitlist) {
        return NextResponse.json(
          {
            success: true,
            message: "Section is full. You are already on the waitlist for this section.",
          },
          { status: 200 }
        );
      }

      // Add to waitlist
      await query(
        `INSERT INTO waitlists (student_id, course_section_id, requested_at) VALUES (?, ?, NOW())`,
        [student.id, section_id]
      );

      // Send notification
      await query(
        `INSERT INTO notifications (user_id, title, message, type, is_read, created_at)
         VALUES (?, ?, ?, 'warning', 0, NOW())`,
        [
          user.id,
          "Added to waitlist",
          `You have been added to the waitlist for ${section.course_code} - Section ${section_id}.`,
        ]
      );

      return NextResponse.json(
        {
          success: true,
          message: "Section is full. You have been added to the waitlist.",
        },
        { status: 200 }
      );
    }

    // Create enrollment
    await query(
      `INSERT INTO enrollments (student_id, course_section_id, semester_id, academic_year_id, status, enrollment_date)
       VALUES (?, ?, ?, ?, 'enrolled', NOW())`,
      [student.id, section_id, currentPeriod.semester_id, currentPeriod.academic_year_id]
    );

    await query(`UPDATE course_sections SET enrolled_count = enrolled_count + 1 WHERE id = ?`, [
      section_id,
    ]);

    // Send notification
    await query(
      `INSERT INTO notifications (user_id, title, message, type, is_read, created_at)
       VALUES (?, ?, ?, 'success', 0, NOW())`,
      [
        user.id,
        "Enrollment confirmed",
        `You are enrolled in ${section.course_code} - Section ${section_id}.`,
      ]
    );

    return NextResponse.json({
      success: true,
      message: "Enrolled successfully.",
    });
  } catch (error: any) {
    console.error("/api/student/enroll POST error", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to enroll" },
      { status: 500 }
    );
  }
}

