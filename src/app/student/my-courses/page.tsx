"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Course = {
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
};

type CompletedCourse = {
  id: number;
  course_code: string;
  course_name: string;
  credits: number;
  section_name: string;
  schedule: string | null;
  room: string | null;
  instructor_name: string;
  final_grade: string;
  grade_points: number | null;
  semester_name: string;
  year_name: string;
};

export default function StudentMyCoursesPage() {
  const [student, setStudent] = useState<{
    student_id: string;
    first_name: string;
    last_name: string;
    dept_name: string;
    level_name: string;
  } | null>(null);
  const [currentEnrollments, setCurrentEnrollments] = useState<Course[]>([]);
  const [completedEnrollments, setCompletedEnrollments] = useState<CompletedCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch("/api/student/courses");
        const json = await res.json();
        if (!json.success) {
          setError(json.error || "Failed to load courses");
          return;
        }
        setStudent(json.data.student);
        setCurrentEnrollments(json.data.currentEnrollments || []);
        setCompletedEnrollments(json.data.completedEnrollments || []);
      } catch (err: any) {
        setError(err.message || "Unexpected error");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-zinc-200 bg-white p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">My Courses</h1>
            {student && (
              <p className="text-zinc-600">
                Student ID: <strong>{student.student_id}</strong> · {student.dept_name} ·{" "}
                {student.level_name}
              </p>
            )}
          </div>
          <Link
            href="/student/enroll"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
          >
            Enroll in Course
          </Link>
        </div>
      </div>

      {loading && <p className="text-sm text-zinc-500">Loading courses...</p>}
      {error && <p className="text-sm text-red-600">Error: {error}</p>}

      {!loading && !error && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="rounded-lg border border-zinc-200 bg-white p-6">
              <h2 className="text-lg font-semibold mb-4">Current Semester</h2>
              {currentEnrollments.length === 0 ? (
                <p className="text-sm text-zinc-500">You are not currently enrolled in any courses.</p>
              ) : (
                <div className="space-y-3">
                  {currentEnrollments.map((course) => (
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
                            {course.schedule && ` · ${course.schedule}`}
                            {course.room && ` · Room ${course.room}`}
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
                        <div>
                          <Link
                            href="/student/grades"
                            className="inline-flex items-center px-3 py-1 border border-blue-200 text-blue-700 rounded text-sm hover:bg-blue-50"
                          >
                            View Grades
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="rounded-lg border border-zinc-200 bg-white p-6">
              <h2 className="text-lg font-semibold mb-4">Completed Courses</h2>
              {completedEnrollments.length === 0 ? (
                <p className="text-sm text-zinc-500">
                  Completed courses will appear after grades are finalized.
                </p>
              ) : (
                <>
                  <div className="space-y-2">
                    {completedEnrollments.slice(0, 8).map((course) => (
                      <div key={course.id} className="border-b pb-2 last:border-0">
                        <div className="font-medium text-sm">
                          {course.course_code} - {course.course_name}
                        </div>
                        <div className="flex justify-between text-xs text-zinc-500">
                          <span>
                            {course.semester_name} {course.year_name}
                          </span>
                          <span className="font-medium">{course.final_grade}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 text-right">
                    <Link
                      href="/student/transcript"
                      className="inline-flex items-center px-3 py-1 border border-blue-200 text-blue-700 rounded text-sm hover:bg-blue-50"
                    >
                      Full Transcript
                    </Link>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

