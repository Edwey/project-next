import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET() {
  try {
    // Check instructors
    const instructors = await query("SELECT COUNT(*) as count FROM instructors");
    const users = await query("SELECT COUNT(*) as count FROM users WHERE role = 'instructor'");
    const sections = await query("SELECT COUNT(*) as count FROM course_sections");
    const enrollments = await query("SELECT COUNT(*) as count FROM enrollments");
    const courses = await query("SELECT COUNT(*) as count FROM courses");
    const students = await query("SELECT COUNT(*) as count FROM students");

    // Get first instructor with sections
    const instructorWithSections = await query(
      `SELECT i.id, i.first_name, i.last_name, u.username, u.id as user_id,
              COUNT(cs.id) as section_count
       FROM instructors i
       JOIN users u ON i.user_id = u.id
       LEFT JOIN course_sections cs ON i.id = cs.instructor_id
       GROUP BY i.id, i.first_name, i.last_name, u.username, u.id
       ORDER BY section_count DESC
       LIMIT 10`
    );

    // Check kwame.mensah specifically
    const kwame = await query(
      `SELECT u.id, u.username, u.email, i.id as instructor_id, i.first_name, i.last_name,
              COUNT(cs.id) as section_count
       FROM users u
       LEFT JOIN instructors i ON u.id = i.user_id
       LEFT JOIN course_sections cs ON i.id = cs.instructor_id
       WHERE u.username = 'kwame.mensah'
       GROUP BY u.id, u.username, u.email, i.id, i.first_name, i.last_name`
    );

    // Get sample sections
    const sampleSections = await query(
      `SELECT cs.id, cs.section_name, c.course_code, c.course_name, i.first_name, i.last_name
       FROM course_sections cs
       JOIN courses c ON cs.course_id = c.id
       JOIN instructors i ON cs.instructor_id = i.id
       LIMIT 10`
    );

    return NextResponse.json({
      stats: {
        total_instructors: instructors[0]?.count || 0,
        total_instructor_users: users[0]?.count || 0,
        total_sections: sections[0]?.count || 0,
        total_enrollments: enrollments[0]?.count || 0,
        total_courses: courses[0]?.count || 0,
        total_students: students[0]?.count || 0,
      },
      kwame_mensah: kwame[0] || null,
      instructors_with_sections: instructorWithSections,
      sample_sections: sampleSections,
    });
  } catch (error) {
    console.error("DB check error:", error);
    return NextResponse.json(
      { error: String(error), message: (error as any).message },
      { status: 500 }
    );
  }
}
