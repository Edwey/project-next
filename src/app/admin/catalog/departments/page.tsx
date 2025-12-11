"use client";

import { useEffect, useState } from "react";

type Department = {
  id: number;
  dept_code: string;
  dept_name: string;
  dept_head: string | null;
  description: string | null;
};

type DepartmentsResponse = {
  departments: Department[];
};

export default function CatalogDepartmentsPage() {
  const [data, setData] = useState<DepartmentsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editId, setEditId] = useState<number | null>(null);
  const [deptCode, setDeptCode] = useState("");
  const [deptName, setDeptName] = useState("");
  const [deptHead, setDeptHead] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/admin/catalog/departments");
      if (!res.ok) throw new Error("Failed to load departments");
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Failed to load");
      setData(json.data as DepartmentsResponse);
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
    setDeptCode("");
    setDeptName("");
    setDeptHead("");
    setDescription("");
  }

  function startEdit(d: Department) {
    setEditId(d.id);
    setDeptCode(d.dept_code);
    setDeptName(d.dept_name);
    setDeptHead(d.dept_head || "");
    setDescription(d.description || "");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      const res = await fetch("/api/admin/catalog/departments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: editId ? "update" : "create",
          id: editId ?? undefined,
          dept_code: deptCode,
          dept_name: deptName,
          dept_head: deptHead || null,
          description: description || null,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error ?? "Failed to save department");
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
    if (!confirm("Delete this department?")) return;
    try {
      setSaving(true);
      setError(null);
      const res = await fetch("/api/admin/catalog/departments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error ?? "Failed to delete department");
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
          Manage Departments
        </h1>
      </header>

      {error && (
        <p className="text-sm text-red-600">Error: {error}</p>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-zinc-800">
            {editId ? "Edit Department" : "Add Department"}
          </h2>
          <form onSubmit={handleSubmit} className="grid gap-3 text-sm md:grid-cols-2">
            <div className="flex flex-col">
              <label className="mb-1 text-xs font-medium text-zinc-500">
                Code
              </label>
              <input
                type="text"
                value={deptCode}
                onChange={(e) => setDeptCode(e.target.value.toUpperCase())}
                placeholder="e.g., CS"
                required
                className="h-8 rounded-md border border-zinc-300 px-2 text-sm"
              />
            </div>
            <div className="flex flex-col">
              <label className="mb-1 text-xs font-medium text-zinc-500">
                Name
              </label>
              <input
                type="text"
                value={deptName}
                onChange={(e) => setDeptName(e.target.value)}
                placeholder="e.g., Computer Science"
                required
                className="h-8 rounded-md border border-zinc-300 px-2 text-sm"
              />
            </div>
            <div className="md:col-span-2 flex flex-col">
              <label className="mb-1 text-xs font-medium text-zinc-500">
                Department Head
              </label>
              <input
                type="text"
                value={deptHead}
                onChange={(e) => setDeptHead(e.target.value)}
                placeholder="(optional)"
                className="h-8 rounded-md border border-zinc-300 px-2 text-sm"
              />
            </div>
            <div className="md:col-span-2 flex flex-col">
              <label className="mb-1 text-xs font-medium text-zinc-500">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="(optional)"
                rows={3}
                className="rounded-md border border-zinc-300 px-2 py-1 text-sm"
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
            Departments
          </h2>
          {loading && <p className="text-xs text-zinc-500">Loading...</p>}
          {!loading && (!data || data.departments.length === 0) && (
            <p className="text-xs text-zinc-500">No departments yet.</p>
          )}
          {!loading && data && data.departments.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-left text-xs sm:text-sm">
                <thead className="border-b bg-zinc-50">
                  <tr className="text-zinc-500">
                    <th className="px-2 py-2">Code</th>
                    <th className="px-2 py-2">Name</th>
                    <th className="px-2 py-2">Head</th>
                    <th className="px-2 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.departments.map((d) => (
                    <tr key={d.id} className="border-b last:border-0">
                      <td className="px-2 py-2">
                        <span className="inline-flex items-center rounded-full bg-zinc-900 px-2 py-0.5 text-[11px] font-medium text-white">
                          {d.dept_code}
                        </span>
                      </td>
                      <td className="px-2 py-2">{d.dept_name}</td>
                      <td className="px-2 py-2 text-xs text-zinc-600">
                        {d.dept_head || ""}
                      </td>
                      <td className="px-2 py-2 text-right space-x-1">
                        <button
                          type="button"
                          onClick={() => startEdit(d)}
                          className="inline-flex items-center rounded-md border border-zinc-300 px-2 py-0.5 text-[11px] text-zinc-700 hover:bg-zinc-100"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(d.id)}
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
