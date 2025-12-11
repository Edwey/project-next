"use client";

import { useEffect, useState } from "react";

type Department = {
  id: number;
  dept_name: string;
};

type ProgramRow = {
  id: number;
  program_code: string;
  program_name: string;
  total_credits: number;
  department_id: number;
  dept_name: string;
};

type ProgramsResponse = {
  programs: ProgramRow[];
  departments: Department[];
};

export default function CatalogProgramsPage() {
  const [data, setData] = useState<ProgramsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editId, setEditId] = useState<number | null>(null);
  const [programCode, setProgramCode] = useState("");
  const [programName, setProgramName] = useState("");
  const [departmentId, setDepartmentId] = useState<number | "">("");
  const [totalCredits, setTotalCredits] = useState<number | "">(120);
  const [saving, setSaving] = useState(false);

  async function loadPrograms() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/admin/catalog/programs");
      if (!res.ok) throw new Error("Failed to load programs");
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Failed to load programs");
      setData(json.data as ProgramsResponse);
    } catch (err: any) {
      setError(err.message ?? "Unexpected error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPrograms();
  }, []);

  function startCreate() {
    setEditId(null);
    setProgramCode("");
    setProgramName("");
    setDepartmentId("");
    setTotalCredits(120);
  }

  function startEdit(p: ProgramRow) {
    setEditId(p.id);
    setProgramCode(p.program_code);
    setProgramName(p.program_name);
    setDepartmentId(p.department_id);
    setTotalCredits(p.total_credits);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      const res = await fetch("/api/admin/catalog/programs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: editId ? "update" : "create",
          id: editId ?? undefined,
          program_code: programCode,
          program_name: programName,
          department_id: departmentId ? Number(departmentId) : undefined,
          total_credits: totalCredits ? Number(totalCredits) : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error ?? "Failed to save program");
      }
      await loadPrograms();
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
    if (!confirm("Delete this program? This requires removing its requirements/applications/students first.")) {
      return;
    }
    try {
      setSaving(true);
      setError(null);
      const res = await fetch("/api/admin/catalog/programs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error ?? "Failed to delete program");
      }
      if (editId === id) {
        startCreate();
      }
      await loadPrograms();
    } catch (err: any) {
      setError(err.message ?? "Unexpected error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Program Guide</h1>
        <p className="text-sm text-zinc-600">
          Manage academic programs and their basic metadata.
        </p>
      </header>

      {error && (
        <p className="text-sm text-red-600">Error: {error}</p>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-zinc-800">
            {editId ? "Edit Program" : "Create Program"}
          </h2>
          <form onSubmit={handleSubmit} className="grid gap-3 text-sm md:grid-cols-2">
            <div className="flex flex-col">
              <label className="mb-1 text-xs font-medium text-zinc-500">
                Program Code
              </label>
              <input
                type="text"
                value={programCode}
                onChange={(e) => setProgramCode(e.target.value)}
                placeholder="e.g., BSC-CS"
                required
                className="h-8 rounded-md border border-zinc-300 px-2 text-sm"
              />
            </div>
            <div className="flex flex-col">
              <label className="mb-1 text-xs font-medium text-zinc-500">
                Total Credits
              </label>
              <input
                type="number"
                min={1}
                value={totalCredits}
                onChange={(e) =>
                  setTotalCredits(e.target.value ? Number(e.target.value) : "")
                }
                required
                className="h-8 rounded-md border border-zinc-300 px-2 text-sm"
              />
            </div>
            <div className="md:col-span-2 flex flex-col">
              <label className="mb-1 text-xs font-medium text-zinc-500">
                Program Name
              </label>
              <input
                type="text"
                value={programName}
                onChange={(e) => setProgramName(e.target.value)}
                placeholder="e.g., B.Sc. Computer Science"
                required
                className="h-8 rounded-md border border-zinc-300 px-2 text-sm"
              />
            </div>
            <div className="md:col-span-2 flex flex-col">
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
                <option value="">-- Choose Department --</option>
                {data?.departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.dept_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2 flex items-center gap-2">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex h-8 items-center rounded-md bg-zinc-900 px-3 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
              >
                {editId ? "Update Program" : "Create Program"}
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
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-800">Program Guide</h2>
          </div>
          {loading && <p className="text-xs text-zinc-500">Loading programs...</p>}
          {!loading && (!data || data.programs.length === 0) && (
            <p className="text-xs text-zinc-500">No programs yet.</p>
          )}
          {!loading && data && data.programs.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-left text-xs sm:text-sm">
                <thead className="border-b bg-zinc-50">
                  <tr className="text-zinc-500">
                    <th className="px-2 py-2">#</th>
                    <th className="px-2 py-2">Code</th>
                    <th className="px-2 py-2">Name</th>
                    <th className="px-2 py-2">Credits</th>
                    <th className="px-2 py-2">Department</th>
                    <th className="px-2 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.programs.map((p) => (
                    <tr key={p.id} className="border-b last:border-0">
                      <td className="px-2 py-2">{p.id}</td>
                      <td className="px-2 py-2">{p.program_code}</td>
                      <td className="px-2 py-2">{p.program_name}</td>
                      <td className="px-2 py-2">{p.total_credits}</td>
                      <td className="px-2 py-2">{p.dept_name}</td>
                      <td className="px-2 py-2 text-right space-x-1">
                        <button
                          type="button"
                          onClick={() => startEdit(p)}
                          className="inline-flex items-center rounded-md border border-zinc-300 px-2 py-0.5 text-[11px] text-zinc-700 hover:bg-zinc-100"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(p.id)}
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
