import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const programs = await query<{
      id: number;
      program_name: string;
      program_code: string;
      department_id: number;
      dept_name: string;
    }>(
      `SELECT p.id, p.program_name, p.program_code, p.department_id, d.dept_name
       FROM programs p
       JOIN departments d ON p.department_id = d.id
       ORDER BY p.program_name`
    );

    return NextResponse.json({
      success: true,
      programs: programs.map(p => ({
        id: p.id,
        program_name: p.program_name,
        program_code: p.program_code,
        department_name: p.dept_name,
      })),
    });
  } catch (error) {
    console.error('Error fetching programs:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch programs' },
      { status: 500 }
    );
  }
}
