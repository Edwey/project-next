"use client";

import { useEffect, useState } from "react";
import { formatDate, formatDateOnly } from "@/lib/date-format";

type AdminSummaryStats = {
  usersTotal: number;
  usersAdmin: number;
  usersInstructor: number;
  usersStudent: number;
  departments: number;
  courses: number;
  levels: number;
  academicYears: number;
  semesters: number;
};

type AdminDashboardResponse = {
  stats: AdminSummaryStats;
  currentYear: {
    id: number;
    year_name: string;
    start_date: string;
    end_date: string;
  } | null;
  currentSemester: {
    id: number;
    semester_name: string;
    academic_year_id: number;
  } | null;
  yearsAll: { id: number; year_name: string }[];
  semestersForYear: { id: number; semester_name: string }[];
  recentLogs: {
    id: number;
    action: string;
    entity_type: string | null;
    entity_id: number | null;
    created_at: string;
    username: string | null;
  }[];
  topCourses: {
    id: number;
    course_code: string;
    course_name: string;
    enrolled: number;
  }[];
  unassignedCount: number;
};

export default function AdminDashboardPage() {
  const [data, setData] = useState<AdminDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/admin/summary");
        if (!res.ok) {
          throw new Error("Failed to load admin summary");
        }
        const json = await res.json();
        if (!json.success) {
          throw new Error(json.error ?? "Unknown error");
        }
        setData(json.data as AdminDashboardResponse);
      } catch (err: any) {
        setError(err.message ?? "Unexpected error");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-900 p-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight mb-2">
            Admin Dashboard
          </h1>
          <p className="text-zinc-600">
            High-level overview of users, academics, and applications.
          </p>
        </header>

        {loading && <p>Loading summary...</p>}
        {error && (
          <p className="text-red-600">Error loading summary: {error}</p>
        )}

        {data && !loading && !error && (
          <div className="space-y-6">
            <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <DashboardCard label="Users" value={data.stats.usersTotal} />
              <DashboardCard label="Admins" value={data.stats.usersAdmin} />
              <DashboardCard
                label="Instructors"
                value={data.stats.usersInstructor}
              />
              <DashboardCard label="Students" value={data.stats.usersStudent} />
              <DashboardCard
                label="Departments"
                value={data.stats.departments}
              />
              <DashboardCard label="Courses" value={data.stats.courses} />
              <DashboardCard label="Levels" value={data.stats.levels} />
              <DashboardCard
                label="Years / Semesters"
                value={data.stats.academicYears}
                secondary={data.stats.semesters}
              />
            </section>

            <div className="grid gap-6 lg:grid-cols-3 lg:items-start">
              <section className="lg:col-span-2 space-y-6">
                <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                      <span>Quick Actions</span>
                    </h2>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <a
                      href="/admin/departments"
                      className="inline-flex items-center rounded-full border border-zinc-200 px-3 py-1 text-sm hover:bg-zinc-50"
                    >
                      Manage Departments
                    </a>
                    <a
                      href="/admin/courses"
                      className="inline-flex items-center rounded-full border border-zinc-200 px-3 py-1 text-sm hover:bg-zinc-50"
                    >
                      Manage Courses
                    </a>
                    <a
                      href="/admin/semesters"
                      className="inline-flex items-center rounded-full border border-zinc-200 px-3 py-1 text-sm hover:bg-zinc-50"
                    >
                      Manage Semesters
                    </a>
                    <a
                      href="/admin/instructors?show_unassigned=1"
                      className="inline-flex items-center rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-sm text-blue-700 hover:bg-blue-100"
                    >
                      View Unassigned Students ({data.unassignedCount})
                    </a>
                  </div>
                </div>

                <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-lg font-semibold">Top Courses by Enrollment</h2>
                  </div>
                  {data.topCourses.length === 0 ? (
                    <p className="text-sm text-zinc-500">
                      No course enrollment data yet.
                    </p>
                  ) : (
                    <ul className="divide-y divide-zinc-100">
                      {data.topCourses.map((c) => (
                        <li
                          key={c.id}
                          className="flex items-center justify-between py-2 text-sm"
                        >
                          <div>
                            <span className="mr-2 rounded-full bg-blue-600 px-2 py-0.5 text-xs font-medium text-white">
                              {c.course_code}
                            </span>
                            <span>{c.course_name}</span>
                          </div>
                          <div className="text-xs text-zinc-500">
                            {c.enrolled} enrolled
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </section>

              <section className="space-y-6">
                <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-lg font-semibold">Current Term</h2>
                  </div>
                  {data.currentYear ? (
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="font-medium">Year:</span>{" "}
                        <span>{data.currentYear.year_name}</span>
                      </div>
                      <div className="text-zinc-500 text-xs">
                        {formatDateOnly(data.currentYear.start_date)} –{" "}
                        {formatDateOnly(data.currentYear.end_date)}
                      </div>
                      <div>
                        <span className="font-medium">Semester:</span>{" "}
                        <span>
                          {data.currentSemester
                            ? data.currentSemester.semester_name
                            : "None set"}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-zinc-500">
                      No current academic year set.
                    </p>
                  )}
                </div>

                <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-lg font-semibold">Recent Activity</h2>
                  </div>
                  {data.recentLogs.length === 0 ? (
                    <p className="text-sm text-zinc-500">No recent activity.</p>
                  ) : (
                    <ul className="divide-y divide-zinc-100 text-sm">
                      {data.recentLogs.map((log) => (
                        <li key={log.id} className="py-2">
                          <div className="font-medium">{log.action}</div>
                          <div className="text-xs text-zinc-500">
                            by {log.username ?? "system"} · {formatDate(log.created_at)}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </section>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function DashboardCard({
  label,
  value,
  secondary,
}: {
  label: string;
  value: number;
  secondary?: number;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <p className="text-sm text-zinc-500 mb-1">{label}</p>
      <p className="text-2xl font-semibold">{value}</p>
      {typeof secondary === "number" && (
        <p className="text-xs text-zinc-500 mt-1">Semesters: {secondary}</p>
      )}
    </div>
  );
}

{/* docf rjthysephsdfef dhfl;safeihfdf
  dfheuhfdsjkkaeufdkjbvksf
  ihhshsuehuhelhsa
  hehsuehdskueeeuhehdjs
  ehuehdshklheiuehiasd
  ieuieuhslkjdfeuuh
  ihesdlkehuhdnxczkjhe
  ehjkdfskkeeerhe
  hfsdkjhfeuroahfznxf
  ajefhuereyt
  skdjhfkseuhaowehfd
  dhfskhfriuap
  shdncvblzjcvslkfhw
  wihsdlkjvn,cmnbshfuwta
  wierhfsdhfzjvnbnx,nzs,jehew
  hsjndzjcnvkjzxjelskuuaw
  sufhekjhfszlkjhdf
  z suhf
  ehHHHHhuvnfjn hrfn
  NVFXJCHGRh
    hskhfge sdfn 
      hn gshrfweihfd
      
      \\ 
iesf isejfsijfs
fjijefj
pfjejfsijf
      */}