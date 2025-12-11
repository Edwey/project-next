"use client";

import { useEffect, useState } from "react";
import { formatDateOnly } from "@/lib/date-format";

type Semester = {
  id: number;
  academic_year_id: number;
  semester_name: string;
  start_date: string;
  end_date: string;
  registration_deadline: string | null;
  exam_period_start: string | null;
  exam_period_end: string | null;
  notes: string | null;
  is_current: number;
};

type AcademicYear = {
  id: number;
  year_name: string;
  start_date: string;
  end_date: string;
};

type SemestersResponse = {
  years: AcademicYear[];
  semesters: Semester[];
};

export default function SemestersPage() {
  const [data, setData] = useState<SemestersResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedYearId, setSelectedYearId] = useState<number>(0);

  const [editId, setEditId] = useState<number | null>(null);
  const [semesterName, setSemesterName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [regDeadline, setRegDeadline] = useState("");
  const [examStart, setExamStart] = useState("");
  const [examEnd, setExamEnd] = useState("");
  const [notes, setNotes] = useState("");
  const [isCurrent, setIsCurrent] = useState(false);
  const [saving, setSaving] = useState(false);

  async function load(yearId: number = selectedYearId) {
    try {
      setLoading(true);
      setError(null);
      const url = yearId
        ? `/api/admin/academics/semesters?year_id=${yearId}`
        : "/api/admin/academics/semesters";
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to load semesters");
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Failed to load");
      const responseData = json.data as SemestersResponse;
      setData(responseData);
      if (yearId === 0 && responseData.years.length > 0) {
        setSelectedYearId(responseData.years[0].id);
      }
    } catch (err: any) {
      setError(err.message ?? "Unexpected error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const initLoad = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch("/api/admin/academics/semesters");
        if (!res.ok) throw new Error("Failed to load semesters");
        const json = await res.json();
        if (!json.success) throw new Error(json.error ?? "Failed to load");
        const responseData = json.data as SemestersResponse;
        setData(responseData);
        if (responseData.years.length > 0) {
          setSelectedYearId(responseData.years[0].id);
          // Load semesters for first year
          const yearRes = await fetch(
            `/api/admin/academics/semesters?year_id=${responseData.years[0].id}`
          );
          const yearJson = await yearRes.json();
          if (yearJson.success) {
            setData(yearJson.data as SemestersResponse);
          }
        }
      } catch (err: any) {
        setError(err.message ?? "Unexpected error");
      } finally {
        setLoading(false);
      }
    };
    initLoad();
  }, []);

  function startCreate() {
    setEditId(null);
    setSemesterName("");
    setStartDate("");
    setEndDate("");
    setRegDeadline("");
    setExamStart("");
    setExamEnd("");
    setNotes("");
    setIsCurrent(false);
  }

  function startEdit(s: Semester) {
    setEditId(s.id);
    setSemesterName(s.semester_name);
    setStartDate(s.start_date);
    setEndDate(s.end_date);
    setRegDeadline(s.registration_deadline || "");
    setExamStart(s.exam_period_start || "");
    setExamEnd(s.exam_period_end || "");
    setNotes(s.notes || "");
    setIsCurrent(s.is_current === 1);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      const res = await fetch("/api/admin/academics/semesters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: editId ? "update" : "create",
          id: editId ?? undefined,
          academic_year_id: selectedYearId,
          semester_name: semesterName,
          start_date: startDate,
          end_date: endDate,
          registration_deadline: regDeadline || null,
          exam_period_start: examStart || null,
          exam_period_end: examEnd || null,
          notes: notes || null,
          is_current: isCurrent,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error ?? "Failed to save semester");
      }
      await load(selectedYearId);
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
    if (!confirm("Delete this semester?")) return;
    try {
      setSaving(true);
      setError(null);
      const res = await fetch("/api/admin/academics/semesters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error ?? "Failed to delete semester");
      }
      if (editId === id) {
        startCreate();
      }
      await load(selectedYearId);
    } catch (err: any) {
      setError(err.message ?? "Unexpected error");
    } finally {
      setSaving(false);
    }
  }

  const currentYear = data?.years.find((y) => y.id === selectedYearId);

  return (
    <div className="space-y-4">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Semesters</h1>
      </header>

      {error && (
        <p className="text-sm text-red-600">Error: {error}</p>
      )}

      <div className="flex items-end gap-2">
        <div className="flex flex-col">
          <label className="mb-1 text-xs font-medium text-zinc-500">
            Academic Year
          </label>
          <select
            value={selectedYearId}
            onChange={(e) => {
              const newYearId = Number(e.target.value);
              setSelectedYearId(newYearId);
              load(newYearId);
              startCreate();
            }}
            className="h-8 rounded-md border border-zinc-300 px-2 text-sm"
          >
            {data?.years.map((y) => (
              <option key={y.id} value={y.id}>
                {y.year_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-zinc-800">
            {editId ? "Edit Semester" : "Add Semester"}
          </h2>
          <form onSubmit={handleSubmit} className="grid gap-3 text-sm">
            <div className="flex flex-col">
              <label className="mb-1 text-xs font-medium text-zinc-500">
                Semester
              </label>
              <select
                value={semesterName}
                onChange={(e) => setSemesterName(e.target.value)}
                required
                className="h-8 rounded-md border border-zinc-300 px-2 text-sm"
              >
                <option value="">-- Select --</option>
                <option value="First Semester">First Semester</option>
                <option value="Second Semester">Second Semester</option>
              </select>
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
            <div className="flex flex-col">
              <label className="mb-1 text-xs font-medium text-zinc-500">
                Registration Deadline
              </label>
              <input
                type="date"
                value={regDeadline}
                onChange={(e) => setRegDeadline(e.target.value)}
                className="h-8 rounded-md border border-zinc-300 px-2 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col">
                <label className="mb-1 text-xs font-medium text-zinc-500">
                  Exam Start
                </label>
                <input
                  type="date"
                  value={examStart}
                  onChange={(e) => setExamStart(e.target.value)}
                  className="h-8 rounded-md border border-zinc-300 px-2 text-sm"
                />
              </div>
              <div className="flex flex-col">
                <label className="mb-1 text-xs font-medium text-zinc-500">
                  Exam End
                </label>
                <input
                  type="date"
                  value={examEnd}
                  onChange={(e) => setExamEnd(e.target.value)}
                  className="h-8 rounded-md border border-zinc-300 px-2 text-sm"
                />
              </div>
            </div>
            <div className="flex flex-col">
              <label className="mb-1 text-xs font-medium text-zinc-500">
                Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="rounded-md border border-zinc-300 px-2 py-1 text-sm"
              />
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
                Set as current semester
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
            Semesters in {currentYear?.year_name}
          </h2>
          {loading && <p className="text-xs text-zinc-500">Loading...</p>}
          {!loading && (!data || data.semesters.length === 0) && (
            <p className="text-xs text-zinc-500">No semesters yet.</p>
          )}
          {!loading && data && data.semesters.length > 0 && (
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
                  {data.semesters.map((s) => (
                    <tr key={s.id} className="border-b last:border-0">
                      <td className="px-2 py-2">{s.semester_name}</td>
                      <td className="px-2 py-2 text-xs text-zinc-600">
                        {formatDateOnly(s.start_date)}
                      </td>
                      <td className="px-2 py-2 text-xs text-zinc-600">
                        {formatDateOnly(s.end_date)}
                      </td>
                      <td className="px-2 py-2">
                        {s.is_current === 1 && (
                          <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-medium text-green-700">
                            Yes
                          </span>
                        )}
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
