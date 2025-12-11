"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type CourseSection = {
  id: number;
  course_code: string;
  course_name: string;
  section_name: string;
  semester_name: string;
  year_name: string;
  schedule: string;
  room: string;
  enrolled_count: number;
  capacity: number;
  pending_grades: number;
};

export default function CoursesPage() {
  const [courses, setCourses] = useState<CourseSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCourses();
  }, []);

  async function loadCourses() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/instructor/course-overview");
      const json = await res.json();
      if (json.success) {
        setCourses(json.data.courses || []);
      } else {
        setError(json.error || "Failed to load courses");
      }
    } catch (err: any) {
      setError(err.message || "Unexpected error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">My Courses</h1>
        <p className="text-zinc-600 mt-1">Course overview and management</p>
      </header>

      {error && <p className="text-sm text-red-600">Error: {error}</p>}

      <div className="rounded-lg border border-zinc-200 bg-white p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Course Overview</h2>
          <span className="text-sm text-zinc-600">{courses.length} sections</span>
        </div>

        {loading ? (
          <p className="text-sm text-zinc-500">Loading...</p>
        ) : courses.length === 0 ? (
          <p className="text-sm text-zinc-500">You are not assigned to any course sections.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead className="border-b bg-zinc-50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-zinc-700">Course</th>
                  <th className="px-4 py-2 text-left font-medium text-zinc-700">Section</th>
                  <th className="px-4 py-2 text-left font-medium text-zinc-700">Schedule</th>
                  <th className="px-4 py-2 text-left font-medium text-zinc-700">Enrollment</th>
                  <th className="px-4 py-2 text-left font-medium text-zinc-700">Pending Grades</th>
                  <th className="px-4 py-2 text-left font-medium text-zinc-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {courses.map((course) => (
                  <tr key={course.id} className="border-b hover:bg-zinc-50">
                    <td className="px-4 py-2">
                      <div className="font-medium">{course.course_code}</div>
                      <div className="text-xs text-zinc-500">{course.course_name}</div>
                    </td>
                    <td className="px-4 py-2">{course.section_name}</td>
                    <td className="px-4 py-2">
                      <div className="text-xs">
                        {course.semester_name} {course.year_name}
                      </div>
                      <div className="text-xs text-zinc-500">{course.schedule}</div>
                      <div className="text-xs text-zinc-500">Room: {course.room}</div>
                    </td>
                    <td className="px-4 py-2">
                      <span className="inline-block px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                        {course.enrolled_count}
                      </span>
                      <span className="text-xs text-zinc-500 ml-1">/ {course.capacity}</span>
                    </td>
                    <td className="px-4 py-2">
                      {course.pending_grades > 0 ? (
                        <span className="inline-block px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs font-medium">
                          {course.pending_grades} pending
                        </span>
                      ) : (
                        <span className="inline-block px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                          None
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 space-x-1">
                      <Link
                        href={`/instructor/gradebook?section_id=${course.id}`}
                        className="inline-block px-2 py-1 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700"
                      >
                        Gradebook
                      </Link>
                      <Link
                        href={`/instructor/attendance?section_id=${course.id}`}
                        className="inline-block px-2 py-1 bg-gray-600 text-white rounded text-xs font-medium hover:bg-gray-700"
                      >
                        Attendance
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
