"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Stats = {
  section_count: number;
  student_count: number;
  pending_grades: number;
};

type Section = {
  id: number;
  course_code: string;
  course_name: string;
  section_name: string;
  semester_name: string;
  year_name: string;
  schedule: string;
};

type Advisee = {
  student_id: string;
  first_name: string;
  last_name: string;
  email: string;
};

export default function InstructorDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [advisees, setAdvisees] = useState<Advisee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      setLoading(true);
      setError(null);
      const [statsRes, sectionsRes, adviseesRes] = await Promise.all([
        fetch("/api/instructor/overview-stats"),
        fetch("/api/instructor/sections"),
        fetch("/api/instructor/advisees"),
      ]);

      const statsJson = await statsRes.json();
      const sectionsJson = await sectionsRes.json();
      const adviseesJson = await adviseesRes.json();

      if (statsJson.success) setStats(statsJson.data.stats);
      if (sectionsJson.success) setSections(sectionsJson.data.sections?.slice(0, 5) || []);
      if (adviseesJson.success) setAdvisees(adviseesJson.data.advisees?.slice(0, 5) || []);
    } catch (err: any) {
      setError(err.message || "Unexpected error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Welcome back!</h1>
        <p className="text-zinc-600 mt-1">Manage your courses, grades, and advisees</p>
      </header>

      {error && <p className="text-sm text-red-600">Error: {error}</p>}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-zinc-200 bg-white p-6">
          <h3 className="text-sm font-medium text-zinc-500">Active Sections</h3>
          <p className="mt-2 text-3xl font-bold">{stats?.section_count ?? 0}</p>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white p-6">
          <h3 className="text-sm font-medium text-zinc-500">Total Students</h3>
          <p className="mt-2 text-3xl font-bold">{stats?.student_count ?? 0}</p>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white p-6">
          <h3 className="text-sm font-medium text-zinc-500">Pending Grades</h3>
          <p className="mt-2 text-3xl font-bold">{stats?.pending_grades ?? 0}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-zinc-200 bg-white p-6">
          <h2 className="text-lg font-semibold mb-4">Your Sections</h2>
          {loading ? (
            <p className="text-sm text-zinc-500">Loading...</p>
          ) : sections.length === 0 ? (
            <p className="text-sm text-zinc-500">No sections assigned.</p>
          ) : (
            <div className="space-y-2">
              {sections.map((s) => (
                <div key={s.id} className="border rounded-lg p-3">
                  <p className="font-medium text-sm">{s.course_code} - {s.course_name}</p>
                  <p className="text-xs text-zinc-500">Section {s.section_name} · {s.semester_name} {s.year_name}</p>
                  <p className="text-xs text-zinc-500">{s.schedule}</p>
                </div>
              ))}
              <Link href="/instructor/courses" className="text-sm text-blue-600 hover:underline mt-2 block">
                View all courses →
              </Link>
            </div>
          )}
        </section>

        <section className="rounded-lg border border-zinc-200 bg-white p-6">
          <h2 className="text-lg font-semibold mb-4">Your Advisees</h2>
          {loading ? (
            <p className="text-sm text-zinc-500">Loading...</p>
          ) : advisees.length === 0 ? (
            <p className="text-sm text-zinc-500">No advisees assigned.</p>
          ) : (
            <div className="space-y-2">
              {advisees.map((a, idx) => (
                <div key={idx} className="border rounded-lg p-3">
                  <p className="font-medium text-sm">{a.first_name} {a.last_name}</p>
                  <p className="text-xs text-zinc-500">ID: {a.student_id}</p>
                  <p className="text-xs text-zinc-500">{a.email}</p>
                </div>
              ))}
              <Link href="/instructor/advising" className="text-sm text-blue-600 hover:underline mt-2 block">
                Manage advisees →
              </Link>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
