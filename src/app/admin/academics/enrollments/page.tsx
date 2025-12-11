"use client";

import { useEffect, useState } from "react";

type Semester = {
  id: number;
  semester_name: string;
  year_name: string;
};

type Section = {
  id: number;
  section_name: string;
  capacity: number;
  enrolled_count: number;
  course_code: string;
  course_name: string;
  instructor_name: string;
};

type EnrollmentsResponse = {
  semesters: Semester[];
  sections: Section[];
};

export default function EnrollmentsPage() {
  const [data, setData] = useState<EnrollmentsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSemesterId, setSelectedSemesterId] = useState<number>(0);

  async function load(semesterId: number = selectedSemesterId) {
    try {
      setLoading(true);
      setError(null);
      const url = semesterId
        ? `/api/admin/academics/enrollments?semester_id=${semesterId}`
        : "/api/admin/academics/enrollments";
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to load enrollments");
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Failed to load");
      const response = json.data as EnrollmentsResponse;
      setData(response);
      if (semesterId === 0 && response.semesters.length > 0) {
        setSelectedSemesterId(response.semesters[0].id);
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
        const res = await fetch("/api/admin/academics/enrollments");
        if (!res.ok) throw new Error("Failed to load enrollments");
        const json = await res.json();
        if (!json.success) throw new Error(json.error ?? "Failed to load");
        const responseData = json.data as EnrollmentsResponse;
        setData(responseData);
        if (responseData.semesters.length > 0) {
          const firstSemId = responseData.semesters[0].id;
          setSelectedSemesterId(firstSemId);
          // Load sections for first semester
          const semRes = await fetch(
            `/api/admin/academics/enrollments?semester_id=${firstSemId}`
          );
          const semJson = await semRes.json();
          if (semJson.success) {
            setData(semJson.data as EnrollmentsResponse);
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

  const currentSemester = data?.semesters.find((s) => s.id === selectedSemesterId);

  return (
    <div className="space-y-4">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Enrollments</h1>
      </header>

      {error && <p className="text-sm text-red-600">Error: {error}</p>}

      <div className="flex items-end gap-2">
        <div className="flex flex-col">
          <label className="mb-1 text-xs font-medium text-zinc-500">
            Semester
          </label>
          <select
            value={selectedSemesterId}
            onChange={(e) => {
              const newSemesterId = Number(e.target.value);
              setSelectedSemesterId(newSemesterId);
              load(newSemesterId);
            }}
            className="h-8 rounded-md border border-zinc-300 px-2 text-sm"
          >
            {data?.semesters.map((s) => (
              <option key={s.id} value={s.id}>
                {s.year_name} - {s.semester_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-zinc-800">
          Sections in {currentSemester?.semester_name}
        </h2>
        {loading && <p className="text-xs text-zinc-500">Loading...</p>}
        {!loading && (!data || data.sections.length === 0) && (
          <p className="text-xs text-zinc-500">No sections in this semester.</p>
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
                </tr>
              </thead>
              <tbody>
                {data.sections.map((s) => (
                  <tr key={s.id} className="border-b last:border-0">
                    <td className="px-2 py-2">
                      <span className="inline-flex items-center rounded-full bg-zinc-900 px-2 py-0.5 text-[11px] font-medium text-white">
                        {s.course_code}
                      </span>
                      <div className="text-xs text-zinc-600">{s.course_name}</div>
                    </td>
                    <td className="px-2 py-2">{s.section_name}</td>
                    <td className="px-2 py-2 text-xs text-zinc-600">
                      {s.instructor_name}
                    </td>
                    <td className="px-2 py-2 text-xs">
                      {s.capacity}/{s.enrolled_count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
