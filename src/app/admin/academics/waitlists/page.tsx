"use client";

import { useEffect, useState } from "react";

type SectionWithWL = {
  id: number;
  section_name: string;
  course_code: string;
  course_name: string;
  wl_count: number;
};

type SectionMeta = {
  id: number;
  section_name: string;
  capacity: number;
  enrolled_count: number;
  course_code: string;
  course_name: string;
};

type WaitlistEntry = {
  id: number;
  student_id: number;
  sid_code: string;
  first_name: string;
  last_name: string;
  requested_at: string;
};

type WaitlistsResponse = {
  sectionsWithWL: SectionWithWL[];
  sectionMeta: SectionMeta | null;
  entries: WaitlistEntry[];
};

export default function WaitlistsPage() {
  const [data, setData] = useState<WaitlistsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSectionId, setSelectedSectionId] = useState<number>(0);
  const [deleting, setDeleting] = useState(false);

  async function load(sectionId: number = selectedSectionId) {
    try {
      setLoading(true);
      setError(null);
      const url = sectionId
        ? `/api/admin/academics/waitlists?section_id=${sectionId}`
        : "/api/admin/academics/waitlists";
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to load waitlists");
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Failed to load");
      setData(json.data as WaitlistsResponse);
    } catch (err: any) {
      setError(err.message ?? "Unexpected error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleRemove(waitlistId: number) {
    if (!confirm("Remove from waitlist?")) return;
    try {
      setDeleting(true);
      setError(null);
      const res = await fetch("/api/admin/academics/waitlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "remove", waitlist_id: waitlistId }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error ?? "Failed to remove");
      }
      await load(selectedSectionId);
    } catch (err: any) {
      setError(err.message ?? "Unexpected error");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-4">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Waitlists</h1>
      </header>

      {error && <p className="text-sm text-red-600">Error: {error}</p>}

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-zinc-800">
            Sections with Waitlists
          </h2>
          {loading && <p className="text-xs text-zinc-500">Loading...</p>}
          {!loading && (!data || data.sectionsWithWL.length === 0) && (
            <p className="text-xs text-zinc-500">No waitlists at the moment.</p>
          )}
          {!loading && data && data.sectionsWithWL.length > 0 && (
            <div className="space-y-2">
              {data.sectionsWithWL.map((s) => (
                <div
                  key={s.id}
                  onClick={() => {
                    setSelectedSectionId(s.id);
                    load(s.id);
                  }}
                  className={`cursor-pointer rounded-lg border p-3 transition ${
                    selectedSectionId === s.id
                      ? "border-zinc-900 bg-zinc-50"
                      : "border-zinc-200 hover:border-zinc-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="inline-flex items-center rounded-full bg-zinc-900 px-2 py-0.5 text-[11px] font-medium text-white mr-2">
                        {s.course_code}
                      </span>
                      <span className="text-sm">{s.course_name}</span>
                      <div className="text-xs text-zinc-500">
                        Section {s.section_name}
                      </div>
                    </div>
                    <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-[11px] font-medium text-yellow-700">
                      {s.wl_count} waiting
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-zinc-800">
            Waitlist Details
          </h2>
          {!data?.sectionMeta && (
            <p className="text-xs text-zinc-500">
              Select a section to view and manage its waitlist.
            </p>
          )}
          {data?.sectionMeta && (
            <>
              <div className="mb-4 rounded-lg bg-zinc-50 p-3">
                <div className="text-sm font-medium">
                  <span className="inline-flex items-center rounded-full bg-zinc-900 px-2 py-0.5 text-[11px] font-medium text-white mr-2">
                    {data.sectionMeta.course_code}
                  </span>
                  {data.sectionMeta.course_name}
                </div>
                <div className="text-xs text-zinc-600 mt-1">
                  Section {data.sectionMeta.section_name} · Capacity{" "}
                  {data.sectionMeta.capacity} · Enrolled{" "}
                  {data.sectionMeta.enrolled_count}
                </div>
              </div>

              {data.entries.length === 0 && (
                <p className="text-xs text-zinc-500">
                  No students on waitlist for this section.
                </p>
              )}

              {data.entries.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse text-left text-xs sm:text-sm">
                    <thead className="border-b bg-zinc-50">
                      <tr className="text-zinc-500">
                        <th className="px-2 py-2">Student</th>
                        <th className="px-2 py-2">Student ID</th>
                        <th className="px-2 py-2">Requested</th>
                        <th className="px-2 py-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.entries.map((e) => (
                        <tr key={e.id} className="border-b last:border-0">
                          <td className="px-2 py-2">
                            {e.first_name} {e.last_name}
                          </td>
                          <td className="px-2 py-2 text-xs text-zinc-600">
                            {e.sid_code}
                          </td>
                          <td className="px-2 py-2 text-xs text-zinc-600">
                            {e.requested_at}
                          </td>
                          <td className="px-2 py-2 text-right">
                            <button
                              type="button"
                              onClick={() => handleRemove(e.id)}
                              disabled={deleting}
                              className="inline-flex items-center rounded-md border border-red-200 px-2 py-0.5 text-[11px] text-red-700 hover:bg-red-50 disabled:opacity-50"
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
