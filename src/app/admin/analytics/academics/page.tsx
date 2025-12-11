"use client";

import { useEffect, useState } from "react";

type AnalyticsData = {
  totalStudents: number;
  totalInstructors: number;
  totalSections: number;
  totalEnrollments: number;
  enrollmentsByLevel: { level_name: string; count: number }[];
  enrollmentsByDept: { dept_name: string; count: number }[];
  topSections: {
    course_code: string;
    section_name: string;
    enrolled: number;
    capacity: number;
  }[];
};

export default function AcademicsAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch("/api/admin/analytics/academics");
        if (!res.ok) throw new Error("Failed to load analytics");
        const json = await res.json();
        if (!json.success) throw new Error(json.error ?? "Failed to load");
        setData(json.data as AnalyticsData);
      } catch (err: any) {
        setError(err.message ?? "Unexpected error");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="space-y-4">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">
          Academic Analytics
        </h1>
      </header>

      {error && <p className="text-sm text-red-600">Error: {error}</p>}

      {loading && <p className="text-sm text-zinc-500">Loading...</p>}

      {data && !loading && (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-zinc-200 bg-white p-4">
              <p className="text-xs text-zinc-500 mb-1">Total Students</p>
              <p className="text-2xl font-semibold">{data.totalStudents}</p>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-white p-4">
              <p className="text-xs text-zinc-500 mb-1">Total Instructors</p>
              <p className="text-2xl font-semibold">{data.totalInstructors}</p>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-white p-4">
              <p className="text-xs text-zinc-500 mb-1">Total Sections</p>
              <p className="text-2xl font-semibold">{data.totalSections}</p>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-white p-4">
              <p className="text-xs text-zinc-500 mb-1">Total Enrollments</p>
              <p className="text-2xl font-semibold">{data.totalEnrollments}</p>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="rounded-xl border border-zinc-200 bg-white p-4">
              <h2 className="mb-3 text-sm font-semibold">Enrollments by Level</h2>
              <div className="space-y-2">
                {data.enrollmentsByLevel.map((item) => (
                  <div key={item.level_name} className="flex justify-between text-sm">
                    <span>{item.level_name}</span>
                    <span className="font-medium">{item.count}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-xl border border-zinc-200 bg-white p-4">
              <h2 className="mb-3 text-sm font-semibold">Enrollments by Department</h2>
              <div className="space-y-2">
                {data.enrollmentsByDept.map((item) => (
                  <div key={item.dept_name} className="flex justify-between text-sm">
                    <span>{item.dept_name}</span>
                    <span className="font-medium">{item.count}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <section className="rounded-xl border border-zinc-200 bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold">Top Sections by Enrollment</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-left text-xs sm:text-sm">
                <thead className="border-b bg-zinc-50">
                  <tr className="text-zinc-500">
                    <th className="px-2 py-2">Course</th>
                    <th className="px-2 py-2">Section</th>
                    <th className="px-2 py-2">Enrolled</th>
                    <th className="px-2 py-2">Capacity</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topSections.map((s, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="px-2 py-2">{s.course_code}</td>
                      <td className="px-2 py-2">{s.section_name}</td>
                      <td className="px-2 py-2">{s.enrolled}</td>
                      <td className="px-2 py-2">{s.capacity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
