"use client";

import { useEffect, useState } from "react";

type Course = {
  id: number;
  course_code: string;
  course_name: string;
  department_id: number;
  dept_name: string;
  level_id: number;
  level_name: string;
  credits: number;
  description: string | null;
  prerequisites: string | null;
};

type Department = {
  id: number;
  dept_name: string;
};

type Level = {
  id: number;
  level_name: string;
};

type CoursesResponse = {
  courses: Course[];
  departments: Department[];
  levels: Level[];
};

export default function CatalogCoursesPage() {
  const [data, setData] = useState<CoursesResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editId, setEditId] = useState<number | null>(null);
  const [courseCode, setCourseCode] = useState("");
  const [courseName, setCourseName] = useState("");
  const [departmentId, setDepartmentId] = useState<number | "">("");
  const [levelId, setLevelId] = useState<number | "">("");
  const [credits, setCredits] = useState<number | "">(0);
  const [description, setDescription] = useState("");
  const [prerequisites, setPrerequisites] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/admin/catalog/courses");
      if (!res.ok) throw new Error("Failed to load courses");
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Failed to load");
      setData(json.data as CoursesResponse);
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
    setCourseCode("");
    setCourseName("");
    setDepartmentId("");
    setLevelId("");
    setCredits(0);
    setDescription("");
    setPrerequisites("");
  }

  function startEdit(c: Course) {
    setEditId(c.id);
    setCourseCode(c.course_code);
    setCourseName(c.course_name);
    setDepartmentId(c.department_id);
    setLevelId(c.level_id);
    setCredits(c.credits);
    setDescription(c.description || "");
    setPrerequisites(c.prerequisites || "");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      const res = await fetch("/api/admin/catalog/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: editId ? "update" : "create",
          id: editId ?? undefined,
          course_code: courseCode,
          course_name: courseName,
          department_id: departmentId ? Number(departmentId) : undefined,
          level_id: levelId ? Number(levelId) : undefined,
          credits: credits ? Number(credits) : undefined,
          description: description || null,
          prerequisites: prerequisites || null,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error ?? "Failed to save course");
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
    if (!confirm("Delete this course?")) return;
    try {
      setSaving(true);
      setError(null);
      const res = await fetch("/api/admin/catalog/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error ?? "Failed to delete course");
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
        <h1 className="text-2xl font-semibold tracking-tight">
          Manage Courses
        </h1>
      </header>

      {error && (
        <p className="text-sm text-red-600">Error: {error}</p>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-zinc-800">
            {editId ? "Edit Course" : "Add Course"}
          </h2>
          <form onSubmit={handleSubmit} className="grid gap-3 text-sm md:grid-cols-2">
            <div className="flex flex-col">
              <label className="mb-1 text-xs font-medium text-zinc-500">
                Code
              </label>
              <input
                type="text"
                value={courseCode}
                onChange={(e) => setCourseCode(e.target.value)}
                placeholder="e.g., CS101"
                required
                className="h-8 rounded-md border border-zinc-300 px-2 text-sm"
              />
            </div>
            <div className="flex flex-col">
              <label className="mb-1 text-xs font-medium text-zinc-500">
                Credits
              </label>
              <input
                type="number"
                min={1}
                value={credits}
                onChange={(e) =>
                  setCredits(e.target.value ? Number(e.target.value) : "")
                }
                required
                className="h-8 rounded-md border border-zinc-300 px-2 text-sm"
              />
            </div>
            <div className="md:col-span-2 flex flex-col">
              <label className="mb-1 text-xs font-medium text-zinc-500">
                Name
              </label>
              <input
                type="text"
                value={courseName}
                onChange={(e) => setCourseName(e.target.value)}
                placeholder="e.g., Introduction to Programming"
                required
                className="h-8 rounded-md border border-zinc-300 px-2 text-sm"
              />
            </div>
            <div className="flex flex-col">
              <label className="mb-1 text-xs font-medium text-zinc-500">
                Department
              </label>
              <select
                value={departmentId}
                onChange={(e) =>
                  setDepartmentId(e.target.value ? Number(e.target.value) : "")
                }
                required
                className="h-8 rounded-md border border-zinc-300 px-2 text-sm"
              >
                <option value="">-- Select --</option>
                {data?.departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.dept_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col">
              <label className="mb-1 text-xs font-medium text-zinc-500">
                Level
              </label>
              <select
                value={levelId}
                onChange={(e) =>
                  setLevelId(e.target.value ? Number(e.target.value) : "")
                }
                required
                className="h-8 rounded-md border border-zinc-300 px-2 text-sm"
              >
                <option value="">-- Select --</option>
                {data?.levels.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.level_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2 flex flex-col">
              <label className="mb-1 text-xs font-medium text-zinc-500">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="(optional)"
                rows={2}
                className="rounded-md border border-zinc-300 px-2 py-1 text-sm"
              />
            </div>
            <div className="md:col-span-2 flex flex-col">
              <label className="mb-1 text-xs font-medium text-zinc-500">
                Prerequisites
              </label>
              <input
                type="text"
                value={prerequisites}
                onChange={(e) => setPrerequisites(e.target.value)}
                placeholder="(optional)"
                className="h-8 rounded-md border border-zinc-300 px-2 text-sm"
              />
            </div>
            <div className="md:col-span-2 flex items-center gap-2">
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
          <h2 className="mb-3 text-sm font-semibold text-zinc-800">
            Courses
          </h2>
          {loading && <p className="text-xs text-zinc-500">Loading...</p>}
          {!loading && (!data || data.courses.length === 0) && (
            <p className="text-xs text-zinc-500">No courses yet.</p>
          )}
          {!loading && data && data.courses.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-left text-xs sm:text-sm">
                <thead className="border-b bg-zinc-50">
                  <tr className="text-zinc-500">
                    <th className="px-2 py-2">Code</th>
                    <th className="px-2 py-2">Name</th>
                    <th className="px-2 py-2">Dept</th>
                    <th className="px-2 py-2">Level</th>
                    <th className="px-2 py-2">Credits</th>
                    <th className="px-2 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.courses.map((c) => (
                    <tr key={c.id} className="border-b last:border-0">
                      <td className="px-2 py-2">
                        <span className="inline-flex items-center rounded-full bg-zinc-900 px-2 py-0.5 text-[11px] font-medium text-white">
                          {c.course_code}
                        </span>
                      </td>
                      <td className="px-2 py-2">{c.course_name}</td>
                      <td className="px-2 py-2 text-xs text-zinc-600">
                        {c.dept_name}
                      </td>
                      <td className="px-2 py-2 text-xs text-zinc-600">
                        {c.level_name}
                      </td>
                      <td className="px-2 py-2">{c.credits}</td>
                      <td className="px-2 py-2 text-right space-x-1">
                        <button
                          type="button"
                          onClick={() => startEdit(c)}
                          className="inline-flex items-center rounded-md border border-zinc-300 px-2 py-0.5 text-[11px] text-zinc-700 hover:bg-zinc-100"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(c.id)}
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
