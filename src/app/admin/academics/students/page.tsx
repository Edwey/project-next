"use client";

import { useEffect, useState } from "react";

type Student = {
  id: number;
  student_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  current_level_id: number;
  department_id: number;
  status: string;
  dept_name: string;
  level_name: string;
};

type Department = { id: number; dept_name: string };
type Level = { id: number; level_name: string };

type StudentsResponse = {
  students: Student[];
  departments: Department[];
  levels: Level[];
  total: number;
  page: number;
  perPage: number;
};

export default function StudentsPage() {
  const [data, setData] = useState<StudentsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState({ q: "", department_id: 0, level_id: 0, page: 1 });
  const [editId, setEditId] = useState<number | null>(null);
  const [studentId, setStudentId] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [levelId, setLevelId] = useState<number | "">("");
  const [deptId, setDeptId] = useState<number | "">("");
  const [status, setStatus] = useState("active");
  const [saving, setSaving] = useState(false);

  async function load(f = filters) {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (f.q) params.append("q", f.q);
      if (f.department_id) params.append("department_id", String(f.department_id));
      if (f.level_id) params.append("level_id", String(f.level_id));
      if (f.page) params.append("page", String(f.page));

      const res = await fetch(`/api/admin/academics/students?${params}`);
      if (!res.ok) throw new Error("Failed to load students");
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Failed to load");
      setData(json.data as StudentsResponse);
    } catch (err: any) {
      setError(err.message ?? "Unexpected error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(filters);
  }, []);

  function startCreate() {
    setEditId(null);
    setStudentId("");
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhone("");
    setLevelId("");
    setDeptId("");
    setStatus("active");
  }

  function startEdit(s: Student) {
    setEditId(s.id);
    setStudentId(s.student_id);
    setFirstName(s.first_name);
    setLastName(s.last_name);
    setEmail(s.email);
    setPhone(s.phone || "");
    setLevelId(s.current_level_id);
    setDeptId(s.department_id);
    setStatus(s.status);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      const res = await fetch("/api/admin/academics/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: editId ? "update" : "create",
          id: editId ?? undefined,
          student_id: studentId,
          first_name: firstName,
          last_name: lastName,
          email,
          phone: phone || null,
          current_level_id: levelId ? Number(levelId) : undefined,
          department_id: deptId ? Number(deptId) : undefined,
          status,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error ?? "Failed to save student");
      }
      await load(filters);
      if (!editId) startCreate();
    } catch (err: any) {
      setError(err.message ?? "Unexpected error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this student?")) return;
    try {
      setSaving(true);
      setError(null);
      const res = await fetch("/api/admin/academics/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error ?? "Failed to delete student");
      }
      if (editId === id) startCreate();
      await load(filters);
    } catch (err: any) {
      setError(err.message ?? "Unexpected error");
    } finally {
      setSaving(false);
    }
  }

  const totalPages = data ? Math.ceil(data.total / data.perPage) : 1;

  return (
    <div className="space-y-4">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Students</h1>
      </header>

      {error && <p className="text-sm text-red-600">Error: {error}</p>}

      <div className="rounded-lg border border-zinc-200 bg-white p-3">
        <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-4 text-sm">
          <input
            type="text"
            value={filters.q}
            onChange={(e) => {
              const newFilters = { ...filters, q: e.target.value, page: 1 };
              setFilters(newFilters);
              load(newFilters);
            }}
            placeholder="Search..."
            className="h-8 rounded-md border border-zinc-300 px-2 text-sm"
          />
          <select
            value={filters.department_id}
            onChange={(e) => {
              const newFilters = { ...filters, department_id: Number(e.target.value), page: 1 };
              setFilters(newFilters);
              load(newFilters);
            }}
            className="h-8 rounded-md border border-zinc-300 px-2 text-sm"
          >
            <option value={0}>All Departments</option>
            {data?.departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.dept_name}
              </option>
            ))}
          </select>
          <select
            value={filters.level_id}
            onChange={(e) => {
              const newFilters = { ...filters, level_id: Number(e.target.value), page: 1 };
              setFilters(newFilters);
              load(newFilters);
            }}
            className="h-8 rounded-md border border-zinc-300 px-2 text-sm"
          >
            <option value={0}>All Levels</option>
            {data?.levels.map((l) => (
              <option key={l.id} value={l.id}>
                {l.level_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-zinc-800">
            {editId ? "Edit Student" : "Add Student"}
          </h2>
          <form onSubmit={handleSubmit} className="grid gap-3 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col">
                <label className="mb-1 text-xs font-medium text-zinc-500">First Name</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  className="h-8 rounded-md border border-zinc-300 px-2 text-sm"
                />
              </div>
              <div className="flex flex-col">
                <label className="mb-1 text-xs font-medium text-zinc-500">Last Name</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  className="h-8 rounded-md border border-zinc-300 px-2 text-sm"
                />
              </div>
            </div>
            <div className="flex flex-col">
              <label className="mb-1 text-xs font-medium text-zinc-500">Student ID</label>
              <input
                type="text"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                className="h-8 rounded-md border border-zinc-300 px-2 text-sm"
              />
            </div>
            <div className="flex flex-col">
              <label className="mb-1 text-xs font-medium text-zinc-500">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-8 rounded-md border border-zinc-300 px-2 text-sm"
              />
            </div>
            <div className="flex flex-col">
              <label className="mb-1 text-xs font-medium text-zinc-500">Phone</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="h-8 rounded-md border border-zinc-300 px-2 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col">
                <label className="mb-1 text-xs font-medium text-zinc-500">Level</label>
                <select
                  value={levelId}
                  onChange={(e) => setLevelId(e.target.value ? Number(e.target.value) : "")}
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
              <div className="flex flex-col">
                <label className="mb-1 text-xs font-medium text-zinc-500">Department</label>
                <select
                  value={deptId}
                  onChange={(e) => setDeptId(e.target.value ? Number(e.target.value) : "")}
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
            </div>
            <div className="flex flex-col">
              <label className="mb-1 text-xs font-medium text-zinc-500">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="h-8 rounded-md border border-zinc-300 px-2 text-sm"
              >
                <option value="active">Active</option>
                <option value="graduated">Graduated</option>
                <option value="withdrawn">Withdrawn</option>
                <option value="suspended">Suspended</option>
              </select>
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
          <h2 className="mb-3 text-sm font-semibold text-zinc-800">
            Students ({data?.total ?? 0})
          </h2>
          {loading && <p className="text-xs text-zinc-500">Loading...</p>}
          {!loading && (!data || data.students.length === 0) && (
            <p className="text-xs text-zinc-500">No students.</p>
          )}
          {!loading && data && data.students.length > 0 && (
            <>
              <div className="overflow-x-auto mb-3">
                <table className="min-w-full border-collapse text-left text-xs sm:text-sm">
                  <thead className="border-b bg-zinc-50">
                    <tr className="text-zinc-500">
                      <th className="px-2 py-2">Name</th>
                      <th className="px-2 py-2">Dept</th>
                      <th className="px-2 py-2">Level</th>
                      <th className="px-2 py-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.students.map((s) => (
                      <tr key={s.id} className="border-b last:border-0">
                        <td className="px-2 py-2">
                          {s.first_name} {s.last_name}
                        </td>
                        <td className="px-2 py-2 text-xs text-zinc-600">
                          {s.dept_name}
                        </td>
                        <td className="px-2 py-2 text-xs text-zinc-600">
                          {s.level_name}
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
              <div className="flex items-center justify-between text-xs">
                <span>Page {data.page} of {totalPages}</span>
                <div className="space-x-1">
                  {data.page > 1 && (
                    <button
                      onClick={() => {
                        const newFilters = { ...filters, page: data.page - 1 };
                        setFilters(newFilters);
                        load(newFilters);
                      }}
                      className="px-2 py-1 rounded border border-zinc-300 hover:bg-zinc-100"
                    >
                      Prev
                    </button>
                  )}
                  {data.page < totalPages && (
                    <button
                      onClick={() => {
                        const newFilters = { ...filters, page: data.page + 1 };
                        setFilters(newFilters);
                        load(newFilters);
                      }}
                      className="px-2 py-1 rounded border border-zinc-300 hover:bg-zinc-100"
                    >
                      Next
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
