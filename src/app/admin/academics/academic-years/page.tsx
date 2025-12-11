"use client";

import { useEffect, useState } from "react";
import { formatDateOnly } from "@/lib/date-format";

type AcademicYear = {
  id: number;
  year_name: string;
  start_date: string;
  end_date: string;
  is_current: number;
};

type YearsResponse = {
  years: AcademicYear[];
};

export default function AcademicYearsPage() {
  const [data, setData] = useState<YearsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editId, setEditId] = useState<number | null>(null);
  const [yearName, setYearName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isCurrent, setIsCurrent] = useState(false);
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/admin/academics/academic-years");
      if (!res.ok) throw new Error("Failed to load academic years");
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Failed to load");
      setData(json.data as YearsResponse);
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
    setYearName("");
    setStartDate("");
    setEndDate("");
    setIsCurrent(false);
  }

  function startEdit(y: AcademicYear) {
    setEditId(y.id);
    setYearName(y.year_name);
    setStartDate(y.start_date);
    setEndDate(y.end_date);
    setIsCurrent(y.is_current === 1);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      const res = await fetch("/api/admin/academics/academic-years", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: editId ? "update" : "create",
          id: editId ?? undefined,
          year_name: yearName,
          start_date: startDate,
          end_date: endDate,
          is_current: isCurrent,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error ?? "Failed to save academic year");
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
    if (!confirm("Delete this academic year?")) return;
    try {
      setSaving(true);
      setError(null);
      const res = await fetch("/api/admin/academics/academic-years", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error ?? "Failed to delete academic year");
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
          Academic Years
        </h1>
      </header>

      {error && (
        <p className="text-sm text-red-600">Error: {error}</p>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-zinc-800">
            {editId ? "Edit Academic Year" : "Create Academic Year"}
          </h2>
          <form onSubmit={handleSubmit} className="grid gap-3 text-sm">
            <div className="flex flex-col">
              <label className="mb-1 text-xs font-medium text-zinc-500">
                Year Name
              </label>
              <input
                type="text"
                value={yearName}
                onChange={(e) => setYearName(e.target.value)}
                placeholder="e.g., 2025/2026"
                required
                className="h-8 rounded-md border border-zinc-300 px-2 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col">
                <label className="mb-1 text-xs font-medium text-zinc-500">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                  className="h-8 rounded-md border border-zinc-300 px-2 text-sm"
                />
              </div>
              <div className="flex flex-col">
                <label className="mb-1 text-xs font-medium text-zinc-500">
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                  className="h-8 rounded-md border border-zinc-300 px-2 text-sm"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_current"
                checked={isCurrent}
                onChange={(e) => setIsCurrent(e.target.checked)}
                className="h-4 w-4 rounded border-zinc-300"
              />
              <label htmlFor="is_current" className="text-xs font-medium text-zinc-500">
                Set as current academic year
              </label>
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
            Academic Years
          </h2>
          {loading && <p className="text-xs text-zinc-500">Loading...</p>}
          {!loading && (!data || data.years.length === 0) && (
            <p className="text-xs text-zinc-500">No academic years yet.</p>
          )}
          {!loading && data && data.years.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-left text-xs sm:text-sm">
                <thead className="border-b bg-zinc-50">
                  <tr className="text-zinc-500">
                    <th className="px-2 py-2">Name</th>
                    <th className="px-2 py-2">Start</th>
                    <th className="px-2 py-2">End</th>
                    <th className="px-2 py-2">Current</th>
                    <th className="px-2 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.years.map((y) => (
                    <tr key={y.id} className="border-b last:border-0">
                      <td className="px-2 py-2 font-medium">{y.year_name}</td>
                      <td className="px-2 py-2 text-xs text-zinc-600">
                        {formatDateOnly(y.start_date)}
                      </td>
                      <td className="px-2 py-2 text-xs text-zinc-600">
                        {formatDateOnly(y.end_date)}
                      </td>
                      <td className="px-2 py-2">
                        {y.is_current === 1 && (
                          <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-medium text-green-700">
                            Yes
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-2 text-right space-x-1">
                        <button
                          type="button"
                          onClick={() => startEdit(y)}
                          className="inline-flex items-center rounded-md border border-zinc-300 px-2 py-0.5 text-[11px] text-zinc-700 hover:bg-zinc-100"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(y.id)}
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
