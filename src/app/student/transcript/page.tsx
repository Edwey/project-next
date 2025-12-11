"use client";

import { useEffect, useState } from "react";

type TranscriptEntry = {
  year_name: string;
  semester_name: string;
  course_code: string;
  course_name: string;
  credits: number;
  final_grade: string;
  grade_points: number | null;
  status: string;
};

export default function StudentTranscriptPage() {
  const [student, setStudent] = useState<{
    student_id: string;
    first_name: string;
    last_name: string;
  } | null>(null);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [gpaSummary, setGpaSummary] = useState<{
    calculated_gpa: number;
    total_credits: number;
    total_courses: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch("/api/student/transcript");
        const json = await res.json();
        if (!json.success) {
          setError(json.error || "Failed to load transcript");
          return;
        }
        setStudent(json.data.student);
        setTranscript(json.data.transcript || []);
        setGpaSummary(json.data.gpaSummary);
      } catch (err: any) {
        setError(err.message || "Unexpected error");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Group transcript by period
  const groupedTranscript: Record<string, TranscriptEntry[]> = {};
  for (const entry of transcript) {
    const key = `${entry.year_name} - ${entry.semester_name}`;
    if (!groupedTranscript[key]) {
      groupedTranscript[key] = [];
    }
    groupedTranscript[key].push(entry);
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-zinc-200 bg-white p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-1">Official Academic Transcript</h1>
            {student && (
              <p className="text-zinc-600">
                Student ID: {student.student_id} · {student.first_name} {student.last_name}
              </p>
            )}
          </div>
        </div>
      </div>

      {gpaSummary && (
        <div className="grid gap-4 md:grid-cols-3">
          <div className="bg-zinc-50 rounded-lg p-6 text-center">
            <div className="text-4xl font-bold text-blue-600 mb-1">
              {gpaSummary.calculated_gpa.toFixed(2)}
            </div>
            <div className="text-sm text-zinc-600">Overall GPA</div>
          </div>
          <div className="bg-zinc-50 rounded-lg p-6 text-center">
            <div className="text-2xl font-bold mb-1">{gpaSummary.total_credits}</div>
            <div className="text-sm text-zinc-600">Credits Earned</div>
          </div>
          <div className="bg-zinc-50 rounded-lg p-6 text-center">
            <div className="text-2xl font-bold mb-1">{gpaSummary.total_courses}</div>
            <div className="text-sm text-zinc-600">Courses Completed</div>
          </div>
        </div>
      )}

      {loading && <p className="text-sm text-zinc-500">Loading transcript...</p>}
      {error && <p className="text-sm text-red-600">Error: {error}</p>}

      {!loading && !error && (
        <>
          {transcript.length === 0 ? (
            <div className="rounded-lg border border-zinc-200 bg-white p-6">
              <p className="text-sm text-zinc-500">No completed courses yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(groupedTranscript).map(([period, entries]) => (
                <div key={period} className="rounded-lg border border-zinc-200 bg-white p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold">{period}</h2>
                    <span className="inline-block px-2 py-1 bg-zinc-100 text-zinc-700 rounded text-xs font-medium">
                      {entries.length} Courses
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-zinc-50">
                        <tr>
                          <th className="px-4 py-2 text-left">Course</th>
                          <th className="px-4 py-2 text-center">Credits</th>
                          <th className="px-4 py-2 text-center">Grade</th>
                          <th className="px-4 py-2 text-center">Grade Points</th>
                          <th className="px-4 py-2 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {entries.map((entry, idx) => (
                          <tr key={idx} className="border-t">
                            <td className="px-4 py-2">
                              <div className="font-medium">{entry.course_code}</div>
                              <div className="text-xs text-zinc-500">{entry.course_name}</div>
                            </td>
                            <td className="px-4 py-2 text-center">{entry.credits}</td>
                            <td className="px-4 py-2 text-center">
                              <span className="inline-block px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                                {entry.final_grade}
                              </span>
                            </td>
                            <td className="px-4 py-2 text-center">
                              {entry.grade_points !== null
                                ? entry.grade_points.toFixed(2)
                                : "-"}
                            </td>
                            <td className="px-4 py-2 text-center">
                              {entry.status.charAt(0).toUpperCase() + entry.status.slice(1)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

