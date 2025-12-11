"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatDateOnly } from "@/lib/date-format";

type DashboardData = {
  student: {
    student_id: string;
    first_name: string;
    last_name: string;
    dept_name: string;
    level_name: string;
    enrollment_date: string;
    graduation_lock_at: string | null;
  };
  currentPeriod: {
    semester_name: string;
    year_name: string;
  } | null;
  enrollments: {
    id: number;
    course_code: string;
    course_name: string;
    credits: number;
    section_name: string;
    schedule: string | null;
    room: string | null;
    instructor_name: string;
    status: string;
    final_grade: string | null;
    semester_name: string;
    year_name: string;
  }[];
  gpaSummary: {
    calculated_gpa: number;
    total_credits: number;
    total_courses: number;
  } | null;
  gpaByTerm: {
    year_name: string;
    semester_name: string;
    term_gpa: number | null;
    term_credits: number;
  }[];
  recentGrades: {
    course_code: string;
    course_name: string;
    assessment_name: string;
    assessment_type: string;
    score: number;
    max_score: number;
    weight: number;
    grade_date: string;
  }[];
  attendanceSummary: {
    total_count: number;
    present_count: number;
    absent_count: number;
    late_count: number;
    excused_count: number;
  };
};

export default function StudentDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch("/api/student/dashboard");
        const json = await res.json();
        if (!json.success) {
          setError(json.error || "Failed to load dashboard");
          return;
        }
        setData(json.data as DashboardData);
      } catch (err: any) {
        setError(err.message || "Unexpected error");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-zinc-500">Loading dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-red-600">Error: {error}</p>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="space-y-6">
      {data.student.graduation_lock_at && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm">
          <p className="font-medium text-yellow-800">
            Graduation access window. Your student portal access remains available until{" "}
            {new Date(data.student.graduation_lock_at).toLocaleString()}. Please download
            transcripts or documents before this time.
          </p>
        </div>
      )}

      <div className="rounded-lg border border-zinc-200 bg-white p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">
              Welcome back, {data.student.first_name}!
            </h1>
            <p className="text-zinc-600">
              Student ID: <strong>{data.student.student_id}</strong> · {data.student.dept_name} ·{" "}
              {data.student.level_name}
            </p>
            <p className="text-sm text-zinc-500 mt-1">
              Enrolled since {formatDateOnly(data.student.enrollment_date)}
            </p>
          </div>
          {data.currentPeriod && (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800">
                {data.currentPeriod.semester_name} {data.currentPeriod.year_name}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-6">
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/student/enroll"
            className="inline-flex items-center rounded-full border border-blue-200 px-3 py-1 text-sm hover:bg-blue-50"
          >
            Enroll in Courses
          </Link>
          <Link
            href="/student/my-courses"
            className="inline-flex items-center rounded-full border border-zinc-200 px-3 py-1 text-sm hover:bg-zinc-50"
          >
            View My Courses
          </Link>
          <Link
            href="/student/fee-statement"
            className="inline-flex items-center rounded-full border border-green-200 px-3 py-1 text-sm hover:bg-green-50"
          >
            View Fee Statement
          </Link>
          <Link
            href="/student/profile"
            className="inline-flex items-center rounded-full border border-zinc-200 px-3 py-1 text-sm hover:bg-zinc-50"
          >
            Update Profile
          </Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-lg border border-zinc-200 bg-white p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Current Courses</h2>
              <Link
                href="/student/my-courses"
                className="text-sm text-blue-600 hover:underline"
              >
                View All
              </Link>
            </div>
            {data.enrollments.length === 0 ? (
              <div className="text-center py-8 text-zinc-500">
                <p className="mb-1">You are not enrolled in any courses for the current semester.</p>
                <p className="mb-0">Visit the enrollment page to add courses.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {data.enrollments.map((course) => (
                  <div key={course.id} className="border rounded-lg p-4">
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                      <div className="flex-1">
                        <h3 className="font-medium mb-1">
                          <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium mr-2">
                            {course.course_code}
                          </span>
                          {course.course_name}
                        </h3>
                        <p className="text-sm text-zinc-600 mb-2">
                          Instructor: {course.instructor_name}
                          {course.schedule && ` · Time: ${course.schedule}`}
                          {course.room && ` · Room: ${course.room}`}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <span className="inline-block px-2 py-0.5 bg-zinc-100 text-zinc-700 rounded text-xs">
                            {course.credits} Credits
                          </span>
                          <span className="inline-block px-2 py-0.5 bg-zinc-100 text-zinc-700 rounded text-xs">
                            Section {course.section_name}
                          </span>
                          <span className="inline-block px-2 py-0.5 bg-zinc-100 text-zinc-700 rounded text-xs">
                            Status: {course.status}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        {course.final_grade ? (
                          <span className="inline-block px-3 py-1 bg-green-100 text-green-800 rounded text-sm font-medium">
                            Final Grade: {course.final_grade}
                          </span>
                        ) : (
                          <span className="inline-block px-3 py-1 bg-yellow-100 text-yellow-800 rounded text-sm font-medium">
                            In Progress
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-lg border border-zinc-200 bg-white p-6">
            <h2 className="text-lg font-semibold mb-4">Academic Snapshot</h2>
            {data.gpaSummary ? (
              <>
                <div className="bg-zinc-50 rounded-lg p-4 text-center mb-4">
                  <div className="text-4xl font-bold text-blue-600 mb-1">
                    {data.gpaSummary.calculated_gpa.toFixed(2)}
                  </div>
                  <div className="text-sm text-zinc-600">Current GPA</div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-center mb-4">
                  <div>
                    <div className="font-semibold">{data.gpaSummary.total_credits}</div>
                    <div className="text-xs text-zinc-500">Credits Earned</div>
                  </div>
                  <div>
                    <div className="font-semibold">{data.gpaSummary.total_courses}</div>
                    <div className="text-xs text-zinc-500">Courses Completed</div>
                  </div>
                </div>
                {data.gpaByTerm.length > 0 && (
                  <>
                    <hr className="my-4" />
                    <h3 className="font-semibold text-sm mb-3">GPA by Term</h3>
                    <div className="space-y-2 text-sm">
                      {data.gpaByTerm.map((term, idx) => (
                        <div key={idx} className="flex justify-between items-center">
                          <div>
                            <div className="font-medium">{term.year_name}</div>
                            <div className="text-xs text-zinc-500">{term.semester_name}</div>
                          </div>
                          <div className="text-right">
                            {term.term_gpa !== null ? (
                              <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                                {term.term_gpa.toFixed(2)}
                              </span>
                            ) : (
                              <span className="text-xs text-zinc-500">-</span>
                            )}
                            <div className="text-xs text-zinc-500">{term.term_credits} credits</div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 text-right">
                      <Link href="/student/degree-audit" className="text-xs text-blue-600 hover:underline">
                        View full degree audit →
                      </Link>
                    </div>
                  </>
                )}
              </>
            ) : (
              <p className="text-sm text-zinc-500">GPA information will appear once grades are recorded.</p>
            )}
          </div>

          <div className="rounded-lg border border-zinc-200 bg-white p-6">
            <h2 className="text-lg font-semibold mb-4">Attendance (30 days)</h2>
            {data.attendanceSummary.total_count > 0 ? (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-zinc-600">Sessions attended</span>
                  <span className="inline-block px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium">
                    {data.attendanceSummary.present_count}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-zinc-600">Absences</span>
                  <span className="inline-block px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-medium">
                    {data.attendanceSummary.absent_count}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-zinc-600">Late / Excused</span>
                  <span className="inline-block px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs font-medium">
                    {data.attendanceSummary.late_count + data.attendanceSummary.excused_count}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-zinc-500">No attendance records for the past 30 days.</p>
            )}
          </div>

          <div className="rounded-lg border border-zinc-200 bg-white p-6">
            <h2 className="text-lg font-semibold mb-4">Recent Grades</h2>
            {data.recentGrades.length === 0 ? (
              <p className="text-sm text-zinc-500">No recent grade entries.</p>
            ) : (
              <div className="space-y-2">
                {data.recentGrades.map((grade, idx) => (
                  <div key={idx} className="border-b pb-2 last:border-0">
                    <div className="font-medium text-sm">
                      {grade.course_code} - {grade.assessment_name}
                    </div>
                    <div className="flex justify-between text-xs text-zinc-500">
                      <span>{grade.assessment_type.charAt(0).toUpperCase() + grade.assessment_type.slice(1)}</span>
                      <span>
                        {grade.score} / {grade.max_score}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

