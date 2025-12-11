"use client";

import { useEffect, useState } from "react";

type Section = {
  id: number;
  section_name: string;
  schedule: string | null;
  room: string | null;
  capacity: number;
  course_code: string;
  course_name: string;
  dept_name: string;
  instructor_name: string;
  semester_name: string;
  year_name: string;
  enrolled: number;
};

type Department = { id: number; dept_name: string };
type Year = { id: number; year_name: string };
type Instructor = { id: number; name: string };
type Course = { id: number; course_code: string; course_name: string };
type Semester = { id: number; semester_name: string };

type SectionsResponse = {
  sections: Section[];
  departments: Department[];
  years: Year[];
  instructors: Instructor[];
  courses: Course[];
  semesters: Semester[];
};

export default function SectionsPage() {
  const [data, setData] = useState<SectionsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState({
    department_id: 0,
    year_id: 0,
    semester_id: 0,
    instructor_id: 0,
    course_id: 0,
    q: "",
  });

  const [editId, setEditId] = useState<number | null>(null);
  const [courseId, setCourseId] = useState<number | "">("");
  const [sectionName, setSectionName] = useState("");
  const [instructorId, setInstructorId] = useState<number | "">("");
  const [schedule, setSchedule] = useState("");
  const [room, setRoom] = useState("");
  const [capacity, setCapacity] = useState<number | "">(0);
  const [semesterId, setSemesterId] = useState<number | "">("");
  const [yearId, setYearId] = useState<number | "">("");
  const [saving, setSaving] = useState(false);

  async function load(f = filters) {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (f.department_id) params.append("department_id", String(f.department_id));
      if (f.year_id) params.append("year_id", String(f.year_id));
      if (f.semester_id) params.append("semester_id", String(f.semester_id));
      if (f.instructor_id) params.append("instructor_id", String(f.instructor_id));
      if (f.course_id) params.append("course_id", String(f.course_id));
      if (f.q) params.append("q", f.q);

      const res = await fetch(`/api/admin/academics/sections?${params}`);
      if (!res.ok) throw new Error("Failed to load sections");
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Failed to load");
      setData(json.data as SectionsResponse);
    } catch (err: any) {
      setError(err.message ?? "Unexpected error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function startCreate() {
    setEditId(null);
    setCourseId("");
    setSectionName("");
    setInstructorId("");
    setSchedule("");
    setRoom("");
    setCapacity(0);
    setSemesterId("");
    setYearId("");
  }

  function startEdit(s: Section) {
    setEditId(s.id);
    setCourseId(0);
    setSectionName(s.section_name);
    setInstructorId(0);
    setSchedule(s.schedule || "");
    setRoom(s.room || "");
    setCapacity(s.capacity);
    setSemesterId(0);
    setYearId(0);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      const res = await fetch("/api/admin/academics/sections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: editId ? "update" : "create",
          id: editId ?? undefined,
          course_id: courseId ? Number(courseId) : undefined,
          section_name: sectionName,
          instructor_id: instructorId ? Number(instructorId) : undefined,
          schedule: schedule || null,
          room: room || null,
          capacity: capacity ? Number(capacity) : undefined,
          semester_id: semesterId ? Number(semesterId) : undefined,
          academic_year_id: yearId ? Number(yearId) : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error ?? "Failed to save section");
      }
      await load();
      if (!editId) {
        startCreate();
      }
    } catch (err: any) {
      setError(err.message ?? "Unexpected error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this section?")) return;
    try {
      setSaving(true);
      setError(null);
      const res = await fetch("/api/admin/academics/sections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error ?? "Failed to delete section");
      }
      if (editId === id) {
        startCreate();
      }
      await load();
    } catch (err: any) {
      setError(err.message ?? "Unexpected error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Course Sections</h1>
      </header>

      {error && (
        <p className="text-sm text-red-600">Error: {error}</p>
      )}

      <div className="rounded-lg border border-zinc-200 bg-white p-3">
        <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 text-sm">
          <div className="flex flex-col">
            <label className="mb-1 text-xs font-medium text-zinc-500">Dept</label>
            <select
              value={filters.department_id}
              onChange={(e) => {
                const newFilters = { ...filters, department_id: Number(e.target.value) };
                setFilters(newFilters);
                load(newFilters);
              }}
              className="h-8 rounded-md border border-zinc-300 px-2 text-sm"
            >
              <option value={0}>All</option>
              {data?.departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.dept_name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col">
            <label className="mb-1 text-xs font-medium text-zinc-500">Year</label>
            <select
              value={filters.year_id}
              onChange={(e) => {
                const newFilters = { ...filters, year_id: Number(e.target.value) };
                setFilters(newFilters);
                load(newFilters);
              }}
              className="h-8 rounded-md border border-zinc-300 px-2 text-sm"
            >
              <option value={0}>All</option>
              {data?.years.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.year_name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col">
            <label className="mb-1 text-xs font-medium text-zinc-500">Semester</label>
            <select
              value={filters.semester_id}
              onChange={(e) => {
                const newFilters = { ...filters, semester_id: Number(e.target.value) };
                setFilters(newFilters);
                load(newFilters);
              }}
              className="h-8 rounded-md border border-zinc-300 px-2 text-sm"
            >
              <option value={0}>All</option>
              {data?.semesters.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.semester_name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col">
            <label className="mb-1 text-xs font-medium text-zinc-500">Instructor</label>
            <select
              value={filters.instructor_id}
              onChange={(e) => {
                const newFilters = { ...filters, instructor_id: Number(e.target.value) };
                setFilters(newFilters);
                load(newFilters);
              }}
              className="h-8 rounded-md border border-zinc-300 px-2 text-sm"
            >
              <option value={0}>All</option>
              {data?.instructors.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col">
            <label className="mb-1 text-xs font-medium text-zinc-500">Search</label>
            <input
              type="text"
              value={filters.q}
              onChange={(e) => {
                const newFilters = { ...filters, q: e.target.value };
                setFilters(newFilters);
                load(newFilters);
              }}
              placeholder="Code/name/section"
              className="h-8 rounded-md border border-zinc-300 px-2 text-sm"
            />
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-zinc-800">
            {editId ? "Edit Section" : "Add Section"}
          </h2>
          <form onSubmit={handleSubmit} className="grid gap-3 text-sm">
            <div className="flex flex-col">
              <label className="mb-1 text-xs font-medium text-zinc-500">Course</label>
              <select
                value={courseId}
                onChange={(e) => setCourseId(e.target.value ? Number(e.target.value) : "")}
                required
                className="h-8 rounded-md border border-zinc-300 px-2 text-sm"
              >
                <option value="">-- Select --</option>
                {data?.courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.course_code} - {c.course_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col">
                <label className="mb-1 text-xs font-medium text-zinc-500">Section</label>
                <input
                  type="text"
                  value={sectionName}
                  onChange={(e) => setSectionName(e.target.value)}
                  placeholder="A, B, 01"
                  required
                  className="h-8 rounded-md border border-zinc-300 px-2 text-sm"
                />
              </div>
              <div className="flex flex-col">
                <label className="mb-1 text-xs font-medium text-zinc-500">Capacity</label>
                <input
                  type="number"
                  min={1}
                  value={capacity}
                  onChange={(e) =>
                    setCapacity(e.target.value ? Number(e.target.value) : "")
                  }
                  required
                  className="h-8 rounded-md border border-zinc-300 px-2 text-sm"
                />
              </div>
            </div>
            <div className="flex flex-col">
              <label className="mb-1 text-xs font-medium text-zinc-500">Instructor</label>
              <select
                value={instructorId}
                onChange={(e) => setInstructorId(e.target.value ? Number(e.target.value) : "")}
                required
                className="h-8 rounded-md border border-zinc-300 px-2 text-sm"
              >
                <option value="">-- Select --</option>
                {data?.instructors.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col">
                <label className="mb-1 text-xs font-medium text-zinc-500">Year</label>
                <select
                  value={yearId}
                  onChange={(e) => setYearId(e.target.value ? Number(e.target.value) : "")}
                  required
                  className="h-8 rounded-md border border-zinc-300 px-2 text-sm"
                >
                  <option value="">-- Select --</option>
                  {data?.years.map((y) => (
                    <option key={y.id} value={y.id}>
                      {y.year_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col">
                <label className="mb-1 text-xs font-medium text-zinc-500">Semester</label>
                <select
                  value={semesterId}
                  onChange={(e) => setSemesterId(e.target.value ? Number(e.target.value) : "")}
                  required
                  className="h-8 rounded-md border border-zinc-300 px-2 text-sm"
                >
                  <option value="">-- Select --</option>
                  {data?.semesters.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.semester_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col">
                <label className="mb-1 text-xs font-medium text-zinc-500">Schedule</label>
                <input
                  type="text"
                  value={schedule}
                  onChange={(e) => setSchedule(e.target.value)}
                  placeholder="Mon/Wed 10:00"
                  className="h-8 rounded-md border border-zinc-300 px-2 text-sm"
                />
              </div>
              <div className="flex flex-col">
                <label className="mb-1 text-xs font-medium text-zinc-500">Room</label>
                <input
                  type="text"
                  value={room}
                  onChange={(e) => setRoom(e.target.value)}
                  placeholder="B-201"
                  className="h-8 rounded-md border border-zinc-300 px-2 text-sm"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex h-8 items-center rounded-md bg-zinc-900 px-3 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
              >
                {editId ? "Update" : "Create"}
              </button>
              {editId && (
                <button
                  type="button"
                  onClick={startCreate}
                  className="inline-flex h-8 items-center rounded-md border border-zinc-300 px-3 text-xs font-medium text-zinc-700 hover:bg-zinc-100"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm text-sm">
          <h2 className="mb-3 text-sm font-semibold text-zinc-800">Sections</h2>
          {loading && <p className="text-xs text-zinc-500">Loading...</p>}
          {!loading && (!data || data.sections.length === 0) && (
            <p className="text-xs text-zinc-500">No sections.</p>
          )}
          {!loading && data && data.sections.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-left text-xs sm:text-sm">
                <thead className="border-b bg-zinc-50">
                  <tr className="text-zinc-500">
                    <th className="px-2 py-2">Course</th>
                    <th className="px-2 py-2">Section</th>
                    <th className="px-2 py-2">Instructor</th>
                    <th className="px-2 py-2">Cap/Enr</th>
                    <th className="px-2 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.sections.map((s) => (
                    <tr key={s.id} className="border-b last:border-0">
                      <td className="px-2 py-2">
                        <span className="inline-flex items-center rounded-full bg-zinc-900 px-2 py-0.5 text-[11px] font-medium text-white">
                          {s.course_code}
                        </span>
                      </td>
                      <td className="px-2 py-2">{s.section_name}</td>
                      <td className="px-2 py-2 text-xs text-zinc-600">
                        {s.instructor_name}
                      </td>
                      <td className="px-2 py-2 text-xs">
                        {s.enrolled}/{s.capacity}
                      </td>
                      <td className="px-2 py-2 text-right space-x-1">
                        <button
                          type="button"
                          onClick={() => startEdit(s)}
                          className="inline-flex items-center rounded-md border border-zinc-300 px-2 py-0.5 text-[11px] text-zinc-700 hover:bg-zinc-100"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(s.id)}
                          className="inline-flex items-center rounded-md border border-red-200 px-2 py-0.5 text-[11px] text-red-700 hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
