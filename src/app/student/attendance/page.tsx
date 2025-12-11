"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Course = {
  course_code: string;
  course_name: string;
};

type AttendanceRecord = {
  attendance_date: string;
  status: string;
  notes: string | null;
  course_code: string;
  course_name: string;
  section_name: string;
  schedule: string | null;
  instructor_name: string;
};

function StudentAttendanceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [student, setStudent] = useState<{
    student_id: string;
    dept_name: string;
    level_name: string;
  } | null>(null);
  const [availableCourses, setAvailableCourses] = useState<Course[]>([]);
  const [summary, setSummary] = useState<{
    total_count: number;
    present_count: number;
    absent_count: number;
    late_count: number;
    excused_count: number;
  } | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCourse, setSelectedCourse] = useState(searchParams.get("course") || "");
  const [selectedDate, setSelectedDate] = useState(searchParams.get("date") || "");

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const params = new URLSearchParams();
        if (selectedCourse) params.set("course", selectedCourse);
        if (selectedDate) params.set("date", selectedDate);
        const res = await fetch(`/api/student/attendance?${params.toString()}`);
        const json = await res.json();
        if (!json.success) {
          setError(json.error || "Failed to load attendance");
          return;
        }
        setAvailableCourses(json.data.availableCourses || []);
        setSummary(json.data.summary);
        setRecords(json.data.records || []);
      } catch (err: any) {
        setError(err.message || "Unexpected error");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [selectedCourse, selectedDate]);

  function handleFilter() {
    const params = new URLSearchParams();
    if (selectedCourse) params.set("course", selectedCourse);
    if (selectedDate) params.set("date", selectedDate);
    router.push(`/student/attendance?${params.toString()}`);
  }

  function handleClear() {
    setSelectedCourse("");
    setSelectedDate("");
    router.push("/student/attendance");
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-zinc-200 bg-white p-6">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Attendance Overview</h1>
        {student && (
          <p className="text-zinc-600">
            Student ID: <strong>{student.student_id}</strong> · {student.dept_name} ·{" "}
            {student.level_name}
          </p>
        )}
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleFilter();
          }}
          className="grid gap-4 md:grid-cols-4 mb-4"
        >
          <div>
            <label htmlFor="course" className="block text-sm font-medium text-zinc-700 mb-1">
              Course
            </label>
            <select
              id="course"
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="w-full px-3 py-2 border border-zinc-300 rounded-md text-sm"
            >
              <option value="">All courses</option>
              {availableCourses.map((c) => (
                <option key={c.course_code} value={c.course_code}>
                  {c.course_code} - {c.course_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="date" className="block text-sm font-medium text-zinc-700 mb-1">
              Date
            </label>
            <input
              type="date"
              id="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-3 py-2 border border-zinc-300 rounded-md text-sm"
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
            >
              Filter
            </button>
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={handleClear}
              className="w-full px-4 py-2 border border-zinc-300 rounded-md text-sm hover:bg-zinc-50"
            >
              Clear
            </button>
          </div>
        </form>

        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-zinc-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-600 mb-1">{summary.present_count}</div>
              <div className="text-sm text-zinc-600">Present</div>
            </div>
            <div className="bg-zinc-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-red-600 mb-1">{summary.absent_count}</div>
              <div className="text-sm text-zinc-600">Absent</div>
            </div>
            <div className="bg-zinc-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-yellow-600 mb-1">{summary.late_count}</div>
              <div className="text-sm text-zinc-600">Late</div>
            </div>
            <div className="bg-zinc-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-blue-600 mb-1">{summary.excused_count}</div>
              <div className="text-sm text-zinc-600">Excused</div>
            </div>
          </div>
        )}

        {loading && <p className="text-sm text-zinc-500">Loading attendance records...</p>}
        {error && <p className="text-sm text-red-600">Error: {error}</p>}

        {!loading && !error && records.length === 0 && (
          <p className="text-sm text-zinc-500">No attendance records found.</p>
        )}

        {!loading && !error && records.length > 0 && (
          <div className="space-y-2">
            {records.map((record, idx) => (
              <div key={idx} className="border rounded-lg p-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <div>
                    <div className="font-medium text-sm">
                      {record.course_code} - {record.course_name}
                    </div>
                    <div className="text-xs text-zinc-500">
                      Section {record.section_name} · {record.instructor_name}
                      {record.schedule && ` · ${record.schedule}`}
                    </div>
                    {record.notes && (
                      <div className="text-xs text-zinc-600 mt-1">Note: {record.notes}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                        record.status === "present"
                          ? "bg-green-100 text-green-700"
                          : record.status === "absent"
                          ? "bg-red-100 text-red-700"
                          : record.status === "late"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                    </span>
                    <span className="text-xs text-zinc-500">
                      {new Date(record.attendance_date).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function StudentAttendancePage() {
  return (
    <Suspense fallback={<p className="text-sm text-zinc-500">Loading...</p>}>
      <StudentAttendanceContent />
    </Suspense>
  );
}

