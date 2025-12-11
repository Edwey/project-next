import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const programIdRaw = url.searchParams.get("programId") || "0";
    const programId = Number(programIdRaw);

    const programs = await query<{
      id: number;
      program_code: string;
      program_name: string;
    }>(
      `SELECT id, program_code, program_name
       FROM programs
       ORDER BY program_code`
    );

    let effectiveProgramId = programId;
    if ((!effectiveProgramId || Number.isNaN(effectiveProgramId)) && programs.length) {
      effectiveProgramId = programs[0].id;
    }

    let programCourses: {
      id: number;
      term_number: number | null;
      required: number;
      course_id: number;
      course_code: string;
      course_name: string;
      credits: number;
    }[] = [];
    const programCourseIds = new Set<number>();

    if (effectiveProgramId && !Number.isNaN(effectiveProgramId)) {
      programCourses = await query<{
        id: number;
        term_number: number | null;
        required: number;
        course_id: number;
        course_code: string;
        course_name: string;
        credits: number;
      }>(
        `SELECT pc.id, pc.term_number, pc.required, pc.course_id,
                c.course_code, c.course_name, c.credits
         FROM program_courses pc
         JOIN courses c ON pc.course_id = c.id
         WHERE pc.program_id = ?
         ORDER BY COALESCE(pc.term_number, 999), c.course_code`,
        [effectiveProgramId]
      );

      for (const row of programCourses) {
        programCourseIds.add(row.course_id);
      }
    }

    const allCourses = await query<{
      id: number;
      course_code: string;
      course_name: string;
      credits: number;
    }>(
      `SELECT id, course_code, course_name, credits
       FROM courses
       ORDER BY course_code`
    );

    let prerequisites: {
      id: number;
      course_id: number;
      prereq_course_id: number;
      course_code: string;
      course_name: string;
      prereq_code: string;
      prereq_name: string;
    }[] = [];

    if (effectiveProgramId && !Number.isNaN(effectiveProgramId)) {
      prerequisites = await query<{
        id: number;
        course_id: number;
        prereq_course_id: number;
        course_code: string;
        course_name: string;
        prereq_code: string;
        prereq_name: string;
      }>(
        `SELECT cp.id, cp.course_id, cp.prereq_course_id,
                c.course_code AS course_code, c.course_name AS course_name,
                prereq.course_code AS prereq_code, prereq.course_name AS prereq_name
         FROM course_prerequisites cp
         JOIN courses c ON cp.course_id = c.id
         JOIN courses prereq ON cp.prereq_course_id = prereq.id
         WHERE cp.course_id IN (SELECT course_id FROM program_courses WHERE program_id = ?)
         ORDER BY c.course_code, prereq.course_code`,
        [effectiveProgramId]
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        programs,
        programId: effectiveProgramId || 0,
        programCourses,
        allCourses,
        programCourseIds: Array.from(programCourseIds),
        prerequisites,
      },
    });
  } catch (error) {
    console.error("/api/admin/catalog/requirements GET error", error);
    return NextResponse.json(
      { success: false, error: "Failed to load program requirements" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as
      | {
          action: "add_program_course";
          program_id: number;
          course_id: number;
          term_number?: string | null;
          required?: boolean;
        }
      | {
          action: "delete_program_course";
          program_course_id: number;
          program_id: number;
        }
      | {
          action: "add_course_prereq";
          course_id: number;
          prereq_course_id: number;
          program_id: number;
        }
      | {
          action: "delete_course_prereq";
          prereq_id: number;
          program_id: number;
        };

    const action = body.action;

    if (action === "add_program_course") {
      const programId = Number(body.program_id || 0);
      const courseId = Number(body.course_id || 0);
      const termRaw = (body.term_number ?? "").toString().trim();
      const requiredFlag = body.required ? 1 : 0;

      if (!programId || !courseId) {
        return NextResponse.json(
          { success: false, error: "Program and course are required." },
          { status: 400 }
        );
      }

      let termValue: number | null = null;
      if (termRaw !== "") {
        const termNum = Number(termRaw);
        if (!Number.isInteger(termNum) || termNum <= 0) {
          return NextResponse.json(
            {
              success: false,
              error: "Term number must be a positive integer.",
            },
            { status: 400 }
          );
        }
        termValue = termNum;
      }

      try {
        await query(
          `INSERT INTO program_courses (program_id, course_id, term_number, required, created_at)
           VALUES (?, ?, ?, ?, NOW())`,
          [programId, courseId, termValue, requiredFlag]
        );
      } catch (e: any) {
        const msg = String(e?.message || "");
        if (/duplicate/i.test(msg) || /unique/i.test(msg)) {
          return NextResponse.json(
            {
              success: false,
              error: "That course is already part of the program requirements.",
            },
            { status: 400 }
          );
        }
        console.error("add_program_course error", e);
        return NextResponse.json(
          { success: false, error: "Failed to add course requirement." },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true });
    }

    if (action === "delete_program_course") {
      const id = Number((body as any).program_course_id || 0);
      if (!id || Number.isNaN(id)) {
        return NextResponse.json(
          { success: false, error: "Invalid requirement selected." },
          { status: 400 }
        );
      }
      await query("DELETE FROM program_courses WHERE id = ?", [id]);
      return NextResponse.json({ success: true });
    }

    if (action === "add_course_prereq") {
      const courseId = Number((body as any).course_id || 0);
      const prereqCourseId = Number((body as any).prereq_course_id || 0);

      if (!courseId || !prereqCourseId) {
        return NextResponse.json(
          { success: false, error: "Course and prerequisite are required." },
          { status: 400 }
        );
      }
      if (courseId === prereqCourseId) {
        return NextResponse.json(
          { success: false, error: "A course cannot be its own prerequisite." },
          { status: 400 }
        );
      }

      try {
        await query(
          `INSERT INTO course_prerequisites (course_id, prereq_course_id, created_at)
           VALUES (?, ?, NOW())`,
          [courseId, prereqCourseId]
        );
      } catch (e: any) {
        const msg = String(e?.message || "");
        if (/duplicate/i.test(msg) || /unique/i.test(msg)) {
          return NextResponse.json(
            { success: false, error: "That prerequisite already exists." },
            { status: 400 }
          );
        }
        console.error("add_course_prereq error", e);
        return NextResponse.json(
          { success: false, error: "Failed to add prerequisite." },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true });
    }

    if (action === "delete_course_prereq") {
      const id = Number((body as any).prereq_id || 0);
      if (!id || Number.isNaN(id)) {
        return NextResponse.json(
          { success: false, error: "Invalid prerequisite selected." },
          { status: 400 }
        );
      }
      await query("DELETE FROM course_prerequisites WHERE id = ?", [id]);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { success: false, error: "Unknown action" },
      { status: 400 }
    );
  } catch (error) {
    console.error("/api/admin/catalog/requirements POST error", error);
    return NextResponse.json(
      { success: false, error: "Failed to update program requirements" },
      { status: 500 }
    );
  }
}
