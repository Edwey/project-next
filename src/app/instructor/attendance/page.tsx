"use client";

import { useEffect, useState } from "react";

type Section = {
  id: number;
  section_name: string;
  course_code: string;
  course_name: string;
  semester_name: string;
  year_name: string;
  schedule: string;
};

type AttendanceRecord = {
  enrollment_id: number;
  student_id: string;
  first_name: string;
  last_name: string;
  status: string;
  notes: string;
};

export default function AttendancePage() {
  const [sections, setSections] = useState<Section[]>([]);
  const [sectionId, setSectionId] = useState<number | "">("");
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split("T")[0]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [attendance, setAttendance] = useState<Record<number, string>>({});
  const [notes, setNotes] = useState<Record<number, string>>({});

  useEffect(() => {
    loadSections();
  }, []);

  async function loadSections() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/instructor/sections");
      const json = await res.json();
      if (json.success) {
        setSections(json.data.sections || []);
      } else {
        setError(json.error || "Failed to load sections");
      }
    } catch (err: any) {
      setError(err.message || "Unexpected error");
    } finally {
      setLoading(false);
    }
  }

  async function loadAttendance() {
    if (!sectionId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(
        `/api/instructor/attendance?section_id=${sectionId}&date=${dateFilter}`
      );
      const json = await res.json();
      if (json.success) {
        setAttendanceRecords(json.data.records || []);
        const attMap: Record<number, string> = {};
        const notesMap: Record<number, string> = {};
        json.data.records?.forEach((r: AttendanceRecord) => {
          attMap[r.enrollment_id] = r.status || "present";
          notesMap[r.enrollment_id] = r.notes || "";
        });
        setAttendance(attMap);
        setNotes(notesMap);
      } else {
        setError(json.error || "Failed to load attendance");
      }
    } catch (err: any) {
      setError(err.message || "Unexpected error");
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveAttendance() {
    if (!sectionId) return;
    try {
      setSaving(true);
      setError(null);
      const res = await fetch("/api/instructor/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section_id: sectionId,
          attendance_date: dateFilter,
          attendance,
          notes,
        }),
      });
      const json = await res.json();
      if (json.success) {
        alert("Attendance saved successfully");
        loadAttendance();
      } else {
        setError(json.error || "Failed to save attendance");
      }
    } catch (err: any) {
      setError(err.message || "Unexpected error");
    } finally {
      setSaving(false);
    }
  }

  const selectedSection = sections.find((s) => s.id === sectionId);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Attendance</h1>
        <p className="text-zinc-600 mt-1">Track student attendance</p>
      </header>

      {error && <p className="text-sm text-red-600">Error: {error}</p>}

      {/* Section & Date Selection */}
      <div className="rounded-lg border border-zinc-200 bg-white p-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">
              Course Section
            </label>
            <select
              value={sectionId}
              onChange={(e) => {
                setSectionId(e.target.value ? Number(e.target.value) : "");
                setAttendanceRecords([]);
              }}
              className="w-full px-3 py-2 border border-zinc-300 rounded-md text-sm"
            >
              <option value="">-- Select section --</option>
              {sections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.course_code} - {s.course_name} ({s.section_name})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">
              Attendance Date
            </label>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full px-3 py-2 border border-zinc-300 rounded-md text-sm"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={loadAttendance}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
            >
              Load
            </button>
          </div>
        </div>
      </div>

      {/* Attendance Records */}
      {selectedSection && (
        <div className="rounded-lg border border-zinc-200 bg-white p-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold">
              {selectedSection.course_code} - {selectedSection.course_name}
            </h2>
            <p className="text-sm text-zinc-600">
              Section {selectedSection.section_name} · {selectedSection.semester_name}{" "}
              {selectedSection.year_name} · {selectedSection.schedule}
            </p>
          </div>

          {loading ? (
            <p className="text-sm text-zinc-500">Loading...</p>
          ) : attendanceRecords.length === 0 ? (
            <p className="text-sm text-zinc-500">No enrollments found.</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse text-sm">
                  <thead className="border-b bg-zinc-50">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium text-zinc-700">
                        Student
                      </th>
                      <th className="px-4 py-2 text-left font-medium text-zinc-700">
                        Status
                      </th>
                      <th className="px-4 py-2 text-left font-medium text-zinc-700">
                        Notes
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceRecords.map((record) => (
                      <tr key={record.enrollment_id} className="border-b">
                        <td className="px-4 py-2">
                          <div className="font-medium">
                            {record.first_name} {record.last_name}
                          </div>
                          <div className="text-xs text-zinc-500">{record.student_id}</div>
                        </td>
                        <td className="px-4 py-2">
                          <select
                            value={attendance[record.enrollment_id] || "present"}
                            onChange={(e) =>
                              setAttendance({
                                ...attendance,
                                [record.enrollment_id]: e.target.value,
                              })
                            }
                            className="px-2 py-1 border border-zinc-300 rounded text-sm"
                          >
                            <option value="present">Present</option>
                            <option value="absent">Absent</option>
                            <option value="late">Late</option>
                            <option value="excused">Excused</option>
                          </select>
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="text"
                            value={notes[record.enrollment_id] || ""}
                            onChange={(e) =>
                              setNotes({
                                ...notes,
                                [record.enrollment_id]: e.target.value,
                              })
                            }
                            className="w-full px-2 py-1 border border-zinc-300 rounded text-sm"
                            placeholder="Optional notes"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4">
                <button
                  onClick={handleSaveAttendance}
                  disabled={saving}
                  className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Attendance"}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
