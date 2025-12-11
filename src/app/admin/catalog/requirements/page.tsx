"use client";

import { useEffect, useState } from "react";

type Program = {
  id: number;
  program_code: string;
  program_name: string;
};

type Course = {
  id: number;
  course_code: string;
  course_name: string;
  credits: number;
};

type ProgramCourse = {
  id: number;
  term_number: number | null;
  required: number;
  course_id: number;
  course_code: string;
  course_name: string;
  credits: number;
};

type PrerequisiteRow = {
  id: number;
  course_id: number;
  prereq_course_id: number;
  course_code: string;
  course_name: string;
  prereq_code: string;
  prereq_name: string;
};

type RequirementsResponse = {
  programs: Program[];
  programId: number;
  programCourses: ProgramCourse[];
  allCourses: Course[];
  programCourseIds: number[];
  prerequisites: PrerequisiteRow[];
};

export default function CatalogRequirementsPage() {
  const [programId, setProgramId] = useState<number | "">("");
  const [data, setData] = useState<RequirementsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [addCourseId, setAddCourseId] = useState<number | "">("");
  const [termNumber, setTermNumber] = useState<string>("");
  const [required, setRequired] = useState(true);

  const [prereqCourseId, setPrereqCourseId] = useState<number | "">("");
  const [prereqPrereqId, setPrereqPrereqId] = useState<number | "">("");

  const [saving, setSaving] = useState(false);

  async function load(programOverride?: number) {
    try {
      setLoading(true);
      setError(null);
      const pid = programOverride ?? (programId ? Number(programId) : undefined);
      const params = new URLSearchParams();
      if (pid) params.set("programId", String(pid));
      const res = await fetch(`/api/admin/catalog/requirements?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load requirements");
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Failed to load requirements");
      const d = json.data as RequirementsResponse;
      setData(d);
      setProgramId(d.programId || "");
      setAddCourseId("");
      setTermNumber("");
      setRequired(true);
      setPrereqCourseId("");
      setPrereqPrereqId("");
    } catch (err: any) {
      setError(err.message ?? "Unexpected error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleAddProgramCourse(e: React.FormEvent) {
    e.preventDefault();
    if (!programId || !addCourseId) return;
    try {
      setSaving(true);
      setError(null);
      const res = await fetch("/api/admin/catalog/requirements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add_program_course",
          program_id: Number(programId),
          course_id: Number(addCourseId),
          term_number: termNumber || null,
          required,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error ?? "Failed to add course");
      }
      await load(Number(programId));
    } catch (err: any) {
      setError(err.message ?? "Unexpected error");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoveProgramCourse(id: number) {
    if (!programId) return;
    if (!confirm("Remove this course from the program?")) return;
    try {
      setSaving(true);
      setError(null);
      const res = await fetch("/api/admin/catalog/requirements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete_program_course",
          program_course_id: id,
          program_id: Number(programId),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error ?? "Failed to remove requirement");
      }
      await load(Number(programId));
    } catch (err: any) {
      setError(err.message ?? "Unexpected error");
    } finally {
      setSaving(false);
    }
  }

  async function handleAddPrereq(e: React.FormEvent) {
    e.preventDefault();
    if (!programId || !prereqCourseId || !prereqPrereqId) return;
    try {
      setSaving(true);
      setError(null);
      const res = await fetch("/api/admin/catalog/requirements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add_course_prereq",
          course_id: Number(prereqCourseId),
          prereq_course_id: Number(prereqPrereqId),
          program_id: Number(programId),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error ?? "Failed to add prerequisite");
      }
      await load(Number(programId));
    } catch (err: any) {
      setError(err.message ?? "Unexpected error");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemovePrereq(id: number) {
    if (!programId) return;
    if (!confirm("Remove this prerequisite?")) return;
    try {
      setSaving(true);
      setError(null);
      const res = await fetch("/api/admin/catalog/requirements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete_course_prereq",
          prereq_id: id,
          program_id: Number(programId),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error ?? "Failed to remove prerequisite");
      }
      await load(Number(programId));
    } catch (err: any) {
      setError(err.message ?? "Unexpected error");
    } finally {
      setSaving(false);
    }
  }

  const selectedProgram =
    data?.programs.find((p) => p.id === (programId ? Number(programId) : 0)) ??
    null;

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Program Requirements
          </h1>
          {selectedProgram && (
            <div className="text-xs text-zinc-600">
              Managing: {selectedProgram.program_name}
            </div>
          )}
        </div>
        <form
          className="flex flex-wrap items-center gap-2 text-sm"
          onSubmit={(e) => {
            e.preventDefault();
            load(programId ? Number(programId) : undefined);
          }}
        >
          <select
            value={programId}
            onChange={(e) => setProgramId(e.target.value ? Number(e.target.value) : "")}
            className="h-8 rounded-md border border-zinc-300 px-2 text-sm"
          >
            {data?.programs.map((p) => (
              <option key={p.id} value={p.id}>
                {p.program_code} — {p.program_name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="inline-flex h-8 items-center rounded-md bg-zinc-900 px-3 text-xs font-medium text-white hover:bg-zinc-800"
          >
            Load Program
          </button>
        </form>
      </header>

      {error && <p className="text-sm text-red-600">Error: {error}</p>}

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm text-sm">
          <h2 className="mb-3 text-sm font-semibold text-zinc-800">
            Add Required Course
          </h2>
          {!data || data.programs.length === 0 ? (
            <p className="text-xs text-zinc-500">
              No programs available. Create a program first.
            </p>
          ) : (
            <form onSubmit={handleAddProgramCourse} className="grid gap-3 md:grid-cols-2">
              <div className="md:col-span-2 flex flex-col">
                <label className="mb-1 text-xs font-medium text-zinc-500">
                  Course
                </label>
                <select
                  value={addCourseId}
                  onChange={(e) =>
                    setAddCourseId(e.target.value ? Number(e.target.value) : "")
                  }
                  required
                  className="h-8 rounded-md border border-zinc-300 px-2 text-sm"
                >
                  <option value="">-- Select Course --</option>
                  {data.allCourses
                    .filter((c) => !data.programCourseIds.includes(c.id))
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.course_code} — {c.course_name}
                      </option>
                    ))}
                </select>
              </div>
              <div className="flex flex-col">
                <label className="mb-1 text-xs font-medium text-zinc-500">
                  Term Number (optional)
                </label>
                <input
                  type="number"
                  min={1}
                  value={termNumber}
                  onChange={(e) => setTermNumber(e.target.value)}
                  placeholder="e.g. 1"
                  className="h-8 rounded-md border border-zinc-300 px-2 text-sm"
                />
              </div>
              <div className="flex items-center md:justify-start">
                <label className="inline-flex items-center gap-2 text-xs text-zinc-700">
                  <input
                    type="checkbox"
                    checked={required}
                    onChange={(e) => setRequired(e.target.checked)}
                    className="h-3 w-3 rounded border-zinc-300"
                  />
                  Required Course
                </label>
              </div>
              <div className="md:col-span-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex h-8 items-center rounded-md bg-zinc-900 px-3 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
                >
                  Add Course
                </button>
              </div>
            </form>
          )}

          <div className="mt-6 rounded-md border border-zinc-200">
            <div className="border-b px-3 py-2 text-xs font-semibold text-zinc-700">
              Program Courses
            </div>
            <div className="max-h-80 overflow-y-auto text-xs sm:text-sm">
              {!data || data.programCourses.length === 0 ? (
                <p className="px-3 py-4 text-xs text-zinc-500">
                  No courses assigned yet.
                </p>
              ) : (
                <table className="min-w-full border-collapse text-left">
                  <thead className="border-b bg-zinc-50 text-[11px] text-zinc-500">
                    <tr>
                      <th className="px-2 py-1">Course</th>
                      <th className="px-2 py-1">Credits</th>
                      <th className="px-2 py-1">Term</th>
                      <th className="px-2 py-1">Required</th>
                      <th className="px-2 py-1"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.programCourses.map((row) => (
                      <tr key={row.id} className="border-b last:border-0">
                        <td className="px-2 py-1">
                          <div className="text-xs font-medium">
                            {row.course_code}
                          </div>
                          <div className="text-[11px] text-zinc-500">
                            {row.course_name}
                          </div>
                        </td>
                        <td className="px-2 py-1">{row.credits}</td>
                        <td className="px-2 py-1">
                          {row.term_number ? row.term_number : "-"}
                        </td>
                        <td className="px-2 py-1">
                          {row.required === 1 ? (
                            <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                              Yes
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-600">
                              No
                            </span>
                          )}
                        </td>
                        <td className="px-2 py-1 text-right">
                          <button
                            type="button"
                            onClick={() => handleRemoveProgramCourse(row.id)}
                            className="inline-flex items-center rounded-md border border-red-200 px-2 py-0.5 text-[11px] text-red-700 hover:bg-red-50"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm text-sm">
          <h2 className="mb-3 text-sm font-semibold text-zinc-800">
            Configure Prerequisites
          </h2>
          {!data || data.programCourses.length === 0 ? (
            <p className="text-xs text-zinc-500">
              Add courses to the program before configuring prerequisites.
            </p>
          ) : (
            <form onSubmit={handleAddPrereq} className="grid gap-3">
              <div className="flex flex-col">
                <label className="mb-1 text-xs font-medium text-zinc-500">
                  Course
                </label>
                <select
                  value={prereqCourseId}
                  onChange={(e) =>
                    setPrereqCourseId(
                      e.target.value ? Number(e.target.value) : ""
                    )
                  }
                  required
                  className="h-8 rounded-md border border-zinc-300 px-2 text-sm"
                >
                  <option value="">-- Select Course --</option>
                  {data.programCourses.map((row) => (
                    <option key={row.course_id} value={row.course_id}>
                      {row.course_code} — {row.course_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col">
                <label className="mb-1 text-xs font-medium text-zinc-500">
                  Prerequisite Course
                </label>
                <select
                  value={prereqPrereqId}
                  onChange={(e) =>
                    setPrereqPrereqId(
                      e.target.value ? Number(e.target.value) : ""
                    )
                  }
                  required
                  className="h-8 rounded-md border border-zinc-300 px-2 text-sm"
                >
                  <option value="">-- Select Prerequisite --</option>
                  {data.allCourses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.course_code} — {c.course_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex h-8 items-center rounded-md bg-zinc-900 px-3 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
                >
                  Add Prerequisite
                </button>
              </div>
            </form>
          )}

          <div className="mt-6 rounded-md border border-zinc-200">
            <div className="border-b px-3 py-2 text-xs font-semibold text-zinc-700">
              Course Prerequisites
            </div>
            <div className="max-h-80 overflow-y-auto text-xs sm:text-sm">
              {!data || data.prerequisites.length === 0 ? (
                <p className="px-3 py-4 text-xs text-zinc-500">
                  No prerequisites defined.
                </p>
              ) : (
                <table className="min-w-full border-collapse text-left">
                  <thead className="border-b bg-zinc-50 text-[11px] text-zinc-500">
                    <tr>
                      <th className="px-2 py-1">Course</th>
                      <th className="px-2 py-1">Prerequisite</th>
                      <th className="px-2 py-1"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.prerequisites.map((row) => (
                      <tr key={row.id} className="border-b last:border-0">
                        <td className="px-2 py-1">
                          <div className="text-xs font-medium">
                            {row.course_code}
                          </div>
                          <div className="text-[11px] text-zinc-500">
                            {row.course_name}
                          </div>
                        </td>
                        <td className="px-2 py-1">
                          <div className="text-xs font-medium">
                            {row.prereq_code}
                          </div>
                          <div className="text-[11px] text-zinc-500">
                            {row.prereq_name}
                          </div>
                        </td>
                        <td className="px-2 py-1 text-right">
                          <button
                            type="button"
                            onClick={() => handleRemovePrereq(row.id)}
                            className="inline-flex items-center rounded-md border border-red-200 px-2 py-0.5 text-[11px] text-red-700 hover:bg-red-50"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </section>
      </div>

      {loading && (
        <p className="text-xs text-zinc-500">Loading program requirements...</p>
      )}
    </div>
  );
}
