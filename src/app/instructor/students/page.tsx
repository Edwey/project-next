"use client";

import { useEffect, useState } from "react";

type Section = {
  id: number;
  course_code: string;
  course_name: string;
  section_name: string;
  semester_name: string;
  year_name: string;
  level_id: number | null;
};

type Student = {
  id: number;
  sid_code: string;
  first_name: string;
  last_name: string;
};

type Message = {
  type: "success" | "error";
  text: string;
};

export default function InstructorStudentsPage() {
  const [sections, setSections] = useState<Section[]>([]);
  const [myStudents, setMyStudents] = useState<Student[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);

  const [qaSearch, setQaSearch] = useState("");
  const [qaResults, setQaResults] = useState<Student[]>([]);
  const [qaStudentId, setQaStudentId] = useState<number | null>(null);
  const [qaSectionId, setQaSectionId] = useState<number | "">("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadInitial();
  }, []);

  async function loadInitial() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/instructor/students");
      const json = await res.json();
      if (json.success) {
        setSections(json.data.sections || []);
        setMyStudents(json.data.my_students || []);
      } else {
        setError(json.error || "Failed to load students");
      }
    } catch (err: any) {
      setError(err.message || "Unexpected error");
    } finally {
      setLoading(false);
    }
  }

  async function handleSearch(term: string) {
    setQaSearch(term);
    setQaStudentId(null);
    if (!term.trim()) {
      setQaResults([]);
      return;
    }
    try {
      const res = await fetch(`/api/instructor/students?search=${encodeURIComponent(term)}`);
      const json = await res.json();
      if (json.success) {
        setQaResults(json.data.results || []);
      }
    } catch (err) {
      console.error("student search failed", err);
    }
  }

  function selectQuickStudent(s: Student) {
    setQaStudentId(s.id);
    setQaSearch(`${s.sid_code} - ${s.first_name} ${s.last_name}`);
    setQaResults([]);
  }

  async function submitQuick(action: "invite" | "manual_enroll") {
    if (!qaStudentId || !qaSectionId) return;
    try {
      setError(null);
      const res = await fetch("/api/instructor/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          student_id: qaStudentId,
          section_id: qaSectionId,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setMessages((prev) => [...prev, { type: "success", text: json.message || "Action completed" }]);
        loadInitial();
      } else {
        setMessages((prev) => [...prev, { type: "error", text: json.error || "Request failed" }]);
      }
    } catch (err: any) {
      setMessages((prev) => [...prev, { type: "error", text: err.message || "Unexpected error" }]);
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Students</h1>
        <p className="text-zinc-600 mt-1">Invite or enroll students into your sections</p>
      </header>

      {error && <p className="text-sm text-red-600">Error: {error}</p>}
      {messages.map((m, idx) => (
        <div
          key={idx}
          className={`text-sm px-3 py-2 rounded border ${
            m.type === "success"
              ? "bg-green-50 border-green-200 text-green-700"
              : "bg-red-50 border-red-200 text-red-700"
          }`}
        >
          {m.text}
        </div>
      ))}

      {loading ? (
        <p className="text-sm text-zinc-500">Loading...</p>
      ) : (
        <>
          {/* Quick Add to Section */}
          <section className="rounded-lg border border-zinc-200 bg-white p-6">
            <h2 className="text-lg font-semibold mb-4">Quick Add to Section</h2>
            <div className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)] items-end">
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  Search student (name, code, or email)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={qaSearch}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-300 rounded-md text-sm"
                    placeholder="Start typing..."
                    autoComplete="off"
                  />
                  {qaResults.length > 0 && (
                    <div className="absolute z-20 mt-1 w-full bg-white border border-zinc-200 rounded-md shadow text-sm max-h-60 overflow-auto">
                      {qaResults.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => selectQuickStudent(s)}
                          className="w-full text-left px-3 py-1.5 hover:bg-zinc-50"
                        >
                          {s.sid_code} - {s.first_name} {s.last_name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <p className="mt-1 text-xs text-zinc-500">
                  Only students in your department are shown.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  Section
                </label>
                <select
                  value={qaSectionId}
                  onChange={(e) => setQaSectionId(e.target.value ? Number(e.target.value) : "")}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-md text-sm"
                >
                  <option value="">Select section…</option>
                  {sections.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.course_code} · {s.course_name} · {s.section_name} · {s.semester_name} {s.year_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => submitQuick("invite")}
                  className="flex-1 px-3 py-2 border border-blue-300 text-blue-700 rounded-md text-sm font-medium hover:bg-blue-50"
                >
                  Invite
                </button>
                <button
                  type="button"
                  onClick={() => submitQuick("manual_enroll")}
                  className="flex-1 px-3 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700"
                >
                  Enroll
                </button>
              </div>
            </div>
          </section>

          {/* My Students */}
          <section className="rounded-lg border border-zinc-200 bg-white p-6">
            <h2 className="text-lg font-semibold mb-4">My Students</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-sm">
                <thead className="border-b bg-zinc-50">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-zinc-700">Student</th>
                  </tr>
                </thead>
                <tbody>
                  {myStudents.length === 0 ? (
                    <tr>
                      <td className="px-4 py-2 text-sm text-zinc-500">
                        No students currently in your sections.
                      </td>
                    </tr>
                  ) : (
                    myStudents.map((s) => (
                      <tr key={s.id} className="border-b">
                        <td className="px-4 py-2">
                          {s.sid_code} - {s.first_name} {s.last_name}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
