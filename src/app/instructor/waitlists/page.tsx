"use client";

import { useEffect, useState } from "react";

type WaitlistSection = {
  id: number;
  section_name: string;
  course_code: string;
  course_name: string;
  wl_count: number;
};

type WaitlistEntry = {
  id: number;
  first_name: string;
  last_name: string;
  sid_code: string;
  requested_at: string;
};

type SectionMeta = {
  id: number;
  section_name: string;
  capacity: number;
  enrolled_count: number;
  course_code: string;
  course_name: string;
};

export default function InstructorWaitlistsPage() {
  const [sections, setSections] = useState<WaitlistSection[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState<number | null>(null);
  const [sectionMeta, setSectionMeta] = useState<SectionMeta | null>(null);
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSections();
  }, []);

  useEffect(() => {
    if (selectedSectionId) {
      loadEntries(selectedSectionId);
    } else {
      setSectionMeta(null);
      setEntries([]);
    }
  }, [selectedSectionId]);

  async function loadSections() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/instructor/waitlists");
      const json = await res.json();
      if (json.success) {
        setSections(json.data.sections || []);
      } else {
        setError(json.error || "Failed to load waitlist sections");
      }
    } catch (err: any) {
      setError(err.message || "Unexpected error");
    } finally {
      setLoading(false);
    }
  }

  async function loadEntries(sectionId: number) {
    try {
      setError(null);
      const res = await fetch(`/api/instructor/waitlists?section_id=${sectionId}`);
      const json = await res.json();
      if (json.success) {
        setSectionMeta(json.data.section || null);
        setEntries(json.data.entries || []);
      } else {
        setError(json.error || "Failed to load waitlist entries");
      }
    } catch (err: any) {
      setError(err.message || "Unexpected error");
    }
  }

  async function promoteNext() {
    if (!selectedSectionId) return;
    try {
      setError(null);
      const res = await fetch("/api/instructor/waitlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "promote_next", section_id: selectedSectionId }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error || "Unable to promote next student");
      }
      loadEntries(selectedSectionId);
    } catch (err: any) {
      setError(err.message || "Unexpected error");
    }
  }

  async function removeEntry(waitlistId: number) {
    if (!selectedSectionId) return;
    try {
      setError(null);
      const res = await fetch("/api/instructor/waitlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "remove_entry", section_id: selectedSectionId, waitlist_id: waitlistId }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error || "Unable to remove entry");
      }
      loadEntries(selectedSectionId);
    } catch (err: any) {
      setError(err.message || "Unexpected error");
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Waitlists</h1>
        <p className="text-zinc-600 mt-1">Manage section waitlists</p>
      </header>

      {error && <p className="text-sm text-red-600">Error: {error}</p>}

      {loading ? (
        <p className="text-sm text-zinc-500">Loading...</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          {/* Sections with waitlists */}
          <section className="rounded-lg border border-zinc-200 bg-white p-6">
            <h2 className="text-lg font-semibold mb-4">My Sections with Waitlists</h2>
            {sections.length === 0 ? (
              <p className="text-sm text-zinc-500">No waitlists for your sections.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {sections.map((s) => (
                  <li
                    key={s.id}
                    className={`flex items-center justify-between border rounded-md px-3 py-2 cursor-pointer hover:bg-zinc-50 ${
                      selectedSectionId === s.id ? "border-blue-400 bg-blue-50" : "border-zinc-200"
                    }`}
                    onClick={() => setSelectedSectionId(s.id)}
                  >
                    <div>
                      <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium mr-2">
                        {s.course_code}
                      </span>
                      <span className="font-medium">{s.course_name}</span>
                      <span className="text-xs text-zinc-500 ml-1">· Section {s.section_name}</span>
                    </div>
                    <span className="inline-block px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded text-xs font-medium">
                      {s.wl_count} waiting
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Waitlist details */}
          <section className="rounded-lg border border-zinc-200 bg-white p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Waitlist Details</h2>
              {sectionMeta && (
                <button
                  type="button"
                  onClick={promoteNext}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
                >
                  Promote Next
                </button>
              )}
            </div>

            {!sectionMeta ? (
              <p className="text-sm text-zinc-500">
                Select a section to view and manage its waitlist.
              </p>
            ) : entries.length === 0 ? (
              <>
                <div className="mb-3 text-sm">
                  <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium mr-2">
                    {sectionMeta.course_code}
                  </span>
                  <span className="font-medium">{sectionMeta.course_name}</span>
                  <span className="text-xs text-zinc-500 ml-1">
                    · Section {sectionMeta.section_name}
                  </span>
                  <div className="text-xs text-zinc-500">
                    Capacity {sectionMeta.capacity} · Enrolled {sectionMeta.enrolled_count}
                  </div>
                </div>
                <p className="text-sm text-zinc-500">No students on waitlist for this section.</p>
              </>
            ) : (
              <>
                <div className="mb-3 text-sm">
                  <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium mr-2">
                    {sectionMeta.course_code}
                  </span>
                  <span className="font-medium">{sectionMeta.course_name}</span>
                  <span className="text-xs text-zinc-500 ml-1">
                    · Section {sectionMeta.section_name}
                  </span>
                  <div className="text-xs text-zinc-500">
                    Capacity {sectionMeta.capacity} · Enrolled {sectionMeta.enrolled_count}
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse text-sm">
                    <thead className="border-b bg-zinc-50">
                      <tr>
                        <th className="px-4 py-2 text-left font-medium text-zinc-700">Student</th>
                        <th className="px-4 py-2 text-left font-medium text-zinc-700">Student ID</th>
                        <th className="px-4 py-2 text-left font-medium text-zinc-700">Requested</th>
                        <th className="px-4 py-2 text-right font-medium text-zinc-700"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {entries.map((e) => (
                        <tr key={e.id} className="border-b">
                          <td className="px-4 py-2">
                            {e.first_name} {e.last_name}
                          </td>
                          <td className="px-4 py-2 text-xs text-zinc-500">{e.sid_code}</td>
                          <td className="px-4 py-2 text-xs text-zinc-500">{e.requested_at}</td>
                          <td className="px-4 py-2 text-right">
                            <button
                              type="button"
                              onClick={() => removeEntry(e.id)}
                              className="text-xs text-red-600 hover:underline"
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
