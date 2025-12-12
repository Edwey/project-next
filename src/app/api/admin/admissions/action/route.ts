import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import crypto from "node:crypto";

export const runtime = "nodejs";

const ALLOWED_ACTIONS = [
  "under_review",
  "offer",
  "accept",
  "reject",
] as const;

type Action = (typeof ALLOWED_ACTIONS)[number];

type ActionRequest = {
  ids: number[]; // one or many application IDs
  action: Action;
  offerNotes?: string | null;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ActionRequest;
    const { ids, action, offerNotes } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { success: false, error: "No application IDs provided" },
        { status: 400 }
      );
    }

    if (!ALLOWED_ACTIONS.includes(action as Action)) {
      return NextResponse.json(
        { success: false, error: "Invalid action" },
        { status: 400 }
      );
    }

    const cleanIds = Array.from(new Set(ids.map(Number).filter((id) => id > 0)));
    if (cleanIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "No valid application IDs provided" },
        { status: 400 }
      );
    }

    let ok = 0;
    let fail = 0;
    const acceptedCredentials: {
      appId: number;
      email: string;
      username: string;
      tempPassword: string;
    }[] = [];

    for (const appId of cleanIds) {
      try {
        if (action === "offer") {
          await handleOffer(appId, offerNotes ?? "Congratulations - Offer of Admission");
          ok++;
        } else if (action === "accept") {
          const creds = await handleAccept(appId);
          if (creds) {
            acceptedCredentials.push(creds);
          }
          ok++;
        } else {
          await handleSimpleStatus(appId, action);
          ok++;
        }
      } catch (e) {
        console.error("admissions action failed for", appId, e);
        fail++;
      }
    }

    return NextResponse.json({
      success: true,
      ok,
      fail,
      acceptedCredentials,
    });
  } catch (error) {
    console.error("/api/admin/admissions/action error", error);
    return NextResponse.json(
      { success: false, error: "Failed to perform admissions action" },
      { status: 500 }
    );
  }
}

async function handleSimpleStatus(appId: number, action: Action) {
  // Map actions that are not offer/accept to DB statuses
  let status: string;
  if (action === "under_review") status = "under_review";
  else if (action === "reject") status = "rejected";
  else throw new Error("Invalid simple status action");

  await query(
    "UPDATE applications SET status = ?, decided_at = NOW() WHERE id = ?",
    [status, appId]
  );
}

async function handleOffer(appId: number, offerNotes: string) {
  await query(
    "UPDATE applications SET status = 'offered', offer_notes = ?, decided_at = NOW() WHERE id = ?",
    [offerNotes, appId]
  );

  const [app] = await query<{
    prospect_email: string;
    first_name: string;
    last_name: string;
  }>("SELECT prospect_email, first_name, last_name FROM applications WHERE id = ? LIMIT 1", [
    appId,
  ]);

  if (!app) return;

  // For now we just log; you can later hook this into your mail system
  console.log(
    `Offer email would be sent to ${app.prospect_email} for application ${appId} with notes: ${offerNotes}`
  );
}

async function handleAccept(appId: number) {
  const [app] = await query<{
    id: number;
    prospect_email: string;
    first_name: string;
    last_name: string;
    phone: string | null;
    program_id: number;
    department_id: number | null;
  }>(
    `SELECT a.id, a.prospect_email, a.first_name, a.last_name, a.phone, a.program_id, p.department_id
     FROM applications a
     JOIN programs p ON a.program_id = p.id
     WHERE a.id = ?
     LIMIT 1`,
    [appId]
  );

  if (!app) {
    throw new Error("Application not found");
  }

  // Ensure user account
  const existingUsers = await query<{ id: number; username: string }>(
    "SELECT id, username FROM users WHERE email = ? LIMIT 1",
    [app.prospect_email]
  );
  let userId: number;
  let username: string;
  let tempPass: string;

  if (existingUsers.length === 0) {
    const baseUsername = buildBaseUsername(app.prospect_email);
    username = await generateUniqueUsername(baseUsername);
    tempPass = generateTemporaryPassword(12);

    await query(
      "INSERT INTO users (username, email, password_hash, role, is_active, must_change_password, created_at) VALUES (?, ?, ?, 'student', 1, 1, NOW())",
      [username, app.prospect_email, hashPassword(tempPass)]
    );

    const [idRow] = await query<{ id: number }>(
      "SELECT id FROM users WHERE email = ? ORDER BY id DESC LIMIT 1",
      [app.prospect_email]
    );
    if (!idRow) throw new Error("Failed to create user");
    userId = idRow.id;

    await query(
      "INSERT INTO email_outbox (to_user_id, subject, body, template, created_at) VALUES (?, ?, ?, ?, NOW())",
      [
        userId,
        "Offer Accepted - Account Created",
        `Your application has been accepted. Your account has been created. Username: ${username}. Temporary password: ${tempPass}`,
        "admissions_accept",
      ]
    );
  } else {
    userId = existingUsers[0].id;
    username = existingUsers[0].username;
    tempPass = generateTemporaryPassword(12);

    await query(
      "UPDATE users SET password_hash = ?, must_change_password = 1 WHERE id = ?",
      [hashPassword(tempPass), userId]
    );
  }

  // Ensure student record
  const existingStudent = await query<{ id: number }>(
    "SELECT id FROM students WHERE user_id = ? LIMIT 1",
    [userId]
  );

  if (existingStudent.length === 0) {
    const levelRows = await query<{ id: number }>(
      "SELECT id FROM levels ORDER BY level_order LIMIT 1"
    );
    const levelId = levelRows[0]?.id ?? 1;

    const totalStudentsRows = await query<{ c: number }>(
      "SELECT COUNT(*) AS c FROM students"
    );
    const sequence = (totalStudentsRows[0]?.c ?? 0) + 1;
    const studId = generateStudentId(sequence);

    let deptId = app.department_id ?? null;
    if (!deptId || deptId <= 0) {
      const deptRows = await query<{ id: number }>(
        "SELECT id FROM departments LIMIT 1"
      );
      deptId = deptRows[0]?.id ?? 1;
    }

    await query(
      `INSERT INTO students (student_id, first_name, last_name, email, phone, date_of_birth, address, current_level_id, user_id, department_id, program_id, enrollment_date, status, gpa, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, NULL, NULL, ?, ?, ?, ?, CURDATE(), 'active', 0.00, NOW(), NOW())`,
      [
        studId,
        app.first_name,
        app.last_name,
        app.prospect_email,
        app.phone,
        levelId,
        userId,
        deptId,
        app.program_id,
      ]
    );
  }

  await query(
    "UPDATE applications SET status = 'accepted', decided_at = NOW() WHERE id = ?",
    [appId]
  );

  return {
    appId,
    email: app.prospect_email,
    username,
    tempPassword: tempPass,
  };
}

function buildBaseUsername(email: string): string {
  const localPart = email.split("@")[0] ?? "student";
  const cleaned = localPart.toLowerCase().replace(/[^a-z0-9_]+/g, "");
  return cleaned || "student";
}

async function generateUniqueUsername(base: string): Promise<string> {
  let username = base;
  let tryCount = 1;

  while (true) {
    const rows = await query<{ id: number }>(
      "SELECT id FROM users WHERE username = ? LIMIT 1",
      [username]
    );
    if (rows.length === 0) return username;
    tryCount += 1;
    username = `${base}${tryCount}`;
  }
}

function generateTemporaryPassword(length: number): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  let out = "";
  for (let i = 0; i < length; i++) {
    const idx = Math.floor(Math.random() * chars.length);
    out += chars[idx];
  }
  return out;
}

function generateStudentId(sequence: number): string {
  const year = new Date().getFullYear().toString().slice(-2);
  const seq = String(sequence).padStart(4, "0");
  return `ST${year}${seq}`;
}

function hashPassword(plain: string): string {
  // NOTE: This uses a simple SHA-256 hash. In the real system, PHP uses password_hash;
  // for a full migration you would align algorithms, but this is enough to keep
  // project-next behavior consistent within itself.
  return crypto.createHash("sha256").update(plain).digest("hex");
}
