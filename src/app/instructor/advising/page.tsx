"use client";

import { useEffect, useState } from "react";

type Advisee = {
  id: number;
  student_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  is_active: number;
};

type Grade = {
  grade_id: number;
  assessment_type: string;
  assessment_name: string;
  score: number;
  max_score: number;
  grade_date: string;
  course_code: string;
  course_name: string;
  section_name: string;
};

export default function AdvisingPage() {
  const [advisees, setAdvisees] = useState<Advisee[]>([]);
  const [grades, setGrades] = useState<Record<number, Grade[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedAdvisee, setExpandedAdvisee] = useState<number | null>(null);

  const [studentId, setStudentId] = useState("");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState("info");
  const [sending, setSending] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    loadAdvisees();
  }, []);

  async function loadAdvisees() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/instructor/advisees");
      const json = await res.json();
      if (json.success) {
        setAdvisees(json.data.advisees || []);
      } else {
        setError(json.error || "Failed to load advisees");
      }
    } catch (err: any) {
      setError(err.message || "Unexpected error");
    } finally {
      setLoading(false);
    }
  }

  async function loadGradesForAdvisee(adviseeId: number) {
    try {
      const res = await fetch(`/api/instructor/advisees?advisee_id=${adviseeId}`);
      const json = await res.json();
      if (json.success && json.data.grades) {
        setGrades((prev) => ({ ...prev, [adviseeId]: json.data.grades }));
      }
    } catch (err) {
      console.error("Failed to load grades", err);
    }
  }

  async function handleSendNotification(e: React.FormEvent) {
    e.preventDefault();
    if (!studentId || !title || !message) {
      setError("All fields are required");
      return;
    }

    try {
      setSending(true);
      setError(null);
      setSuccessMsg(null);

      const res = await fetch("/api/instructor/advisees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send_notification",
          student_id: Number(studentId),
          title,
          message,
          type,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setSuccessMsg("Notification sent successfully");
        setStudentId("");
        setTitle("");
        setMessage("");
        setType("info");
      } else {
        setError(json.error || "Failed to send notification");
      }
    } catch (err: any) {
      setError(err.message || "Unexpected error");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Advising & Notifications</h1>
        <p className="text-zinc-600 mt-1">Manage your advisees and send notifications</p>
      </header>

      {error && <p className="text-sm text-red-600">Error: {error}</p>}
      {successMsg && <p className="text-sm text-green-600">{successMsg}</p>}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Advisees List */}
        <section className="rounded-lg border border-zinc-200 bg-white p-6">
          <h2 className="text-lg font-semibold mb-4">Your Advisees</h2>
          {loading ? (
            <p className="text-sm text-zinc-500">Loading...</p>
          ) : advisees.length === 0 ? (
            <p className="text-sm text-zinc-500">No advisees assigned.</p>
          ) : (
            <div className="space-y-2">
              {advisees.map((advisee) => (
                <div
                  key={advisee.id}
                  className="border rounded-lg p-3 cursor-pointer hover:bg-zinc-50"
                  onClick={() => {
                    setExpandedAdvisee(
                      expandedAdvisee === advisee.id ? null : advisee.id
                    );
                    if (expandedAdvisee !== advisee.id && !grades[advisee.id]) {
                      loadGradesForAdvisee(advisee.id);
                    }
                  }}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">
                        {advisee.first_name} {advisee.last_name}
                      </p>
                      <p className="text-xs text-zinc-500">ID: {advisee.student_id}</p>
                      <p className="text-xs text-zinc-500">Email: {advisee.email}</p>
                      {advisee.phone && (
                        <p className="text-xs text-zinc-500">Phone: {advisee.phone}</p>
                      )}
                    </div>
                    <span
                      className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                        advisee.is_active
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {advisee.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>

                  {expandedAdvisee === advisee.id && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-xs font-semibold text-zinc-700 mb-2">Recent Grades</p>
                      {grades[advisee.id]?.length ? (
                        <div className="text-xs space-y-1 max-h-40 overflow-y-auto">
                          {grades[advisee.id].map((g) => (
                            <div key={g.grade_id} className="text-zinc-600">
                              <span className="font-medium">{g.course_code}</span> ·{" "}
                              {g.assessment_name} ({g.assessment_type}): {g.score}/{g.max_score}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-zinc-500">No grades found.</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Send Notification Form */}
        <section className="rounded-lg border border-zinc-200 bg-white p-6">
          <h2 className="text-lg font-semibold mb-4">Send Notification</h2>
          <form onSubmit={handleSendNotification} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                Advisee
              </label>
              <select
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                required
                className="w-full px-3 py-2 border border-zinc-300 rounded-md text-sm"
              >
                <option value="">-- Select advisee --</option>
                {advisees.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.first_name} {a.last_name} ({a.student_id})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full px-3 py-2 border border-zinc-300 rounded-md text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                Message
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                rows={4}
                className="w-full px-3 py-2 border border-zinc-300 rounded-md text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full px-3 py-2 border border-zinc-300 rounded-md text-sm"
              >
                <option value="info">Information</option>
                <option value="warning">Warning</option>
                <option value="success">Success</option>
                <option value="error">Alert</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={sending}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {sending ? "Sending..." : "Send Notification"}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
