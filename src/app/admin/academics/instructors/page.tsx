"use client";

import { useEffect, useState } from "react";

type Department = {
  id: number;
  dept_name: string;
};

type Instructor = {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  department_id: number;
  hire_date: string | null;
  dept_name: string;
  advisee_count: number;
};

type UnassignedStudent = {
  id: number;
  student_id: string;
  first_name: string;
  last_name: string;
  email: string;
  dept_name: string;
  level_name: string;
};

type LoadState = "idle" | "loading" | "error";

export default function AdminInstructorsPage() {
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [unassignedCount, setUnassignedCount] = useState<number | null>(null);
  const [unassignedStudents, setUnassignedStudents] = useState<
    UnassignedStudent[]
  >([]);

  const [q, setQ] = useState("");
  const [departmentId, setDepartmentId] = useState<number | "">("");

  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState<Instructor | null>(null);
  const [formFirst, setFormFirst] = useState("");
  const [formLast, setFormLast] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formDeptId, setFormDeptId] = useState<number | "">("");
  const [formHireDate, setFormHireDate] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadInstructors();
    loadUnassigned();
  }, []);

  async function loadInstructors(params?: { q?: string; department_id?: number }) {
    try {
      setLoadState("loading");
      setError(null);

      const query = new URLSearchParams();
      const qParam = params?.q ?? q;
      const deptParam = params?.department_id ?? (departmentId || 0);

      if (qParam) query.set("q", qParam);
      if (deptParam && deptParam > 0) {
        query.set("department_id", String(deptParam));
      }

      const res = await fetch(
        `/api/admin/academics/instructors${query.toString() ? `?${query.toString()}` : ""}`
      );
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || "Failed to load instructors");
      }

      setInstructors(json.data.instructors || []);
      setDepartments(json.data.departments || []);
      setLoadState("idle");
    } catch (err: any) {
      setError(err.message || "Unexpected error");
      setLoadState("error");
    }
  }

  async function loadUnassigned() {
    try {
      const res = await fetch(
        "/api/admin/academics/instructors?action=unassigned_students"
      );
      const json = await res.json();
      if (json.success) {
        setUnassignedCount(json.data.unassignedCount ?? 0);
        setUnassignedStudents(json.data.unassignedStudents || []);
      }
    } catch (err) {
      // Non-fatal; just log
      console.error("Failed to load unassigned students", err);
    }
  }

  function startCreate() {
    setEditing(null);
    setFormFirst("");
    setFormLast("");
    setFormPhone("");
    setFormDeptId("");
    setFormHireDate(new Date().toISOString().split("T")[0]);
  }

  function startEdit(instructor: Instructor) {
    setEditing(instructor);
    setFormFirst(instructor.first_name);
    setFormLast(instructor.last_name);
    setFormPhone(instructor.phone || "");
    setFormDeptId(instructor.department_id);
    setFormHireDate(
      instructor.hire_date
        ? instructor.hire_date.substring(0, 10)
        : new Date().toISOString().split("T")[0]
    );
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!formFirst || !formLast || !formDeptId) return;

    try {
      setSaving(true);

      const payload: any = {
        action: editing ? "update" : "create",
        first_name: formFirst,
        last_name: formLast,
        phone: formPhone || null,
        department_id: typeof formDeptId === "number" ? formDeptId : null,
        hire_date: formHireDate || null,
      };

      if (editing) {
        payload.id = editing.id;
      }

      const res = await fetch("/api/admin/academics/instructors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || "Failed to save instructor");
      }

      await loadInstructors();
      setEditing(null);
      startCreate();
    } catch (err: any) {
      setError(err.message || "Unexpected error while saving instructor");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(instructor: Instructor) {
    if (!confirm(`Delete instructor ${instructor.first_name} ${instructor.last_name}?`)) {
      return;
    }

    try {
      const res = await fetch("/api/admin/academics/instructors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id: instructor.id }),
      });
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || "Failed to delete instructor");
      }
      await loadInstructors();
    } catch (err: any) {
      setError(err.message || "Unexpected error while deleting instructor");
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Manage Instructors
          </h1>
          <p className="text-sm text-zinc-600 mt-1">
            View and manage instructor profiles and advising assignments.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-600">
          {typeof unassignedCount === "number" && (
            <span className="inline-flex items-center rounded-full bg-amber-50 px-3 py-1 font-medium text-amber-800 border border-amber-200">
              Unassigned students: {unassignedCount}
            </span>
          )}
        </div>
      </header>

      {error && (
        <p className="text-sm text-red-600">
          {error}
        </p>
      )}

      {/* Filters and quick actions */}
      <section className="rounded-lg border border-zinc-200 bg-white p-4 space-y-3">
        <form
          className="flex flex-col sm:flex-row gap-3 items-start sm:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            loadInstructors();
          }}
        >
          <div className="flex-1 min-w-0">
            <label className="block text-xs font-medium text-zinc-600 mb-1">
              Search
            </label>
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Name or email"
              className="w-full px-3 py-2 border border-zinc-300 rounded-md text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1">
              Department
            </label>
            <select
              value={departmentId}
              onChange={(e) =>
                setDepartmentId(e.target.value ? Number(e.target.value) : "")
              }
              className="px-3 py-2 border border-zinc-300 rounded-md text-sm min-w-[10rem]"
            >
              <option value="">All</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.dept_name}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="px-4 py-2 rounded-md bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-800"
          >
            Filter
          </button>
        </form>
      </section>

      {/* Main content: table + editor */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)] items-start">
        <section className="rounded-lg border border-zinc-200 bg-white p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-zinc-900">
              Instructors
            </h2>
            {loadState === "loading" && (
              <span className="text-xs text-zinc-500">Loading...</span>
            )}
          </div>

          {instructors.length === 0 ? (
            <p className="text-sm text-zinc-500">
              No instructors found. Adjust filters or add a new instructor.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-sm">
                <thead className="border-b bg-zinc-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-zinc-700">
                      Name
                    </th>
                    <th className="px-3 py-2 text-left font-medium text-zinc-700">
                      Department
                    </th>
                    <th className="px-3 py-2 text-left font-medium text-zinc-700">
                      Contact
                    </th>
                    <th className="px-3 py-2 text-left font-medium text-zinc-700">
                      Advisees
                    </th>
                    <th className="px-3 py-2 text-right font-medium text-zinc-700">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {instructors.map((i) => (
                    <tr key={i.id} className="border-b last:border-0">
                      <td className="px-3 py-2 align-top">
                        <div className="font-medium">
                          {i.first_name} {i.last_name}
                        </div>
                      </td>
                      <td className="px-3 py-2 align-top text-xs text-zinc-600">
                        {i.dept_name}
                      </td>
                      <td className="px-3 py-2 align-top text-xs text-zinc-600">
                        <div>{i.email || "—"}</div>
                        {i.phone && <div>{i.phone}</div>}
                      </td>
                      <td className="px-3 py-2 align-top">
                        <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                          {i.advisee_count}
                        </span>
                      </td>
                      <td className="px-3 py-2 align-top text-right text-xs space-x-2">
                        <button
                          type="button"
                          onClick={() => startEdit(i)}
                          className="inline-flex items-center rounded-md border border-zinc-300 px-2 py-1 hover:bg-zinc-50"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(i)}
                          className="inline-flex items-center rounded-md border border-red-200 px-2 py-1 text-red-700 hover:bg-red-50"
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

        <section className="rounded-lg border border-zinc-200 bg-white p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-900">
              {editing ? "Edit Instructor" : "Add Instructor"}
            </h2>
            {editing && (
              <button
                type="button"
                onClick={startCreate}
                className="text-xs text-zinc-600 hover:text-zinc-900"
              >
                Cancel edit
              </button>
            )}
          </div>

          <form onSubmit={handleSave} className="space-y-3 text-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">
                  First name
                </label>
                <input
                  type="text"
                  value={formFirst}
                  onChange={(e) => setFormFirst(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-zinc-300 rounded-md text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">
                  Last name
                </label>
                <input
                  type="text"
                  value={formLast}
                  onChange={(e) => setFormLast(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-zinc-300 rounded-md text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">
                  Department
                </label>
                <select
                  value={formDeptId}
                  onChange={(e) =>
                    setFormDeptId(e.target.value ? Number(e.target.value) : "")
                  }
                  required
                  className="w-full px-3 py-2 border border-zinc-300 rounded-md text-sm"
                >
                  <option value="">Select department</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.dept_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">
                  Hire date
                </label>
                <input
                  type="date"
                  value={formHireDate}
                  onChange={(e) => setFormHireDate(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-md text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">
                Phone
              </label>
              <input
                type="text"
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
                className="w-full px-3 py-2 border border-zinc-300 rounded-md text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full mt-2 px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {saving
                ? "Saving..."
                : editing
                ? "Update Instructor"
                : "Create Instructor"}
            </button>
          </form>

          {unassignedStudents.length > 0 && (
            <div className="pt-3 border-t border-zinc-200 max-h-52 overflow-y-auto">
              <h3 className="text-xs font-semibold text-zinc-700 mb-2">
                Unassigned Students (preview)
              </h3>
              <ul className="space-y-1 text-xs text-zinc-600">
                {unassignedStudents.slice(0, 10).map((s) => (
                  <li key={s.id} className="flex justify-between gap-2">
                    <span>
                      <span className="font-medium">
                        {s.first_name} {s.last_name}
                      </span>{" "}
                      <span className="text-zinc-400">
                        ({s.student_id}) · {s.dept_name} · {s.level_name}
                      </span>
                    </span>
                    <span className="hidden sm:inline text-zinc-400">
                      {s.email}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
