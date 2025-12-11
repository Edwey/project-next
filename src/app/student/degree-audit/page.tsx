"use client";

import { useEffect, useState } from "react";

type Requirement = {
  course_id: number;
  course_code: string;
  course_name: string;
  credits: number;
  required: boolean;
  completed: boolean;
};

export default function StudentDegreeAuditPage() {
  const [student, setStudent] = useState<{
    student_id: string;
    first_name: string;
    last_name: string;
    dept_name: string;
    level_name: string;
    program_name: string | null;
    total_credits: number | null;
  } | null>(null);
  const [progress, setProgress] = useState<{
    total_courses: number;
    required_courses: number;
    completed_courses: number;
    required_completed: number;
    elective_completed: number;
    overall_percent: number;
    required_percent: number;
  } | null>(null);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch("/api/student/degree-audit");
        const json = await res.json();
        if (!json.success) {
          setError(json.error || "Failed to load degree audit");
          return;
        }
        setStudent(json.data.student);
        setProgress(json.data.progress);
        setRequirements(json.data.requirements || []);
      } catch (err: any) {
        setError(err.message || "Unexpected error");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return <p className="text-sm text-zinc-500">Loading degree audit...</p>;
  }

  if (error) {
    return <p className="text-sm text-red-600">Error: {error}</p>;
  }

  if (!student || !progress) {
    return (
      <div className="space-y-6">
        <div className="rounded-lg border border-zinc-200 bg-white p-6">
          <h1 className="text-3xl font-bold tracking-tight mb-2">Degree Audit</h1>
          <p className="text-sm text-zinc-500">
            No program assigned. Please contact your advisor to assign a program.
          </p>
        </div>
      </div>
    );
  }

  const requiredCourses = requirements.filter((r) => r.required);
  const electiveCourses = requirements.filter((r) => !r.required);

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-zinc-200 bg-white p-6">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Degree Audit</h1>
        <p className="text-zinc-600">
          {student.first_name} {student.last_name} · {student.student_id} · {student.dept_name} ·{" "}
          {student.level_name}
        </p>
        {student.program_name && (
          <p className="text-sm text-zinc-500 mt-1">
            Program: <strong>{student.program_name}</strong>
            {student.total_credits && ` · ${student.total_credits} Credits Required`}
          </p>
        )}
      </div>

      {progress && (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-zinc-200 bg-white p-6">
            <h2 className="text-lg font-semibold mb-4">Overall Progress</h2>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-zinc-600">Overall Completion</span>
                  <span className="font-semibold">{progress.overall_percent}%</span>
                </div>
                <div className="w-full bg-zinc-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: `${progress.overall_percent}%` }}
                  />
                </div>
              </div>
              <div className="text-sm text-zinc-600">
                {progress.completed_courses} of {progress.total_courses} courses completed
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-zinc-200 bg-white p-6">
            <h2 className="text-lg font-semibold mb-4">Required Courses</h2>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-zinc-600">Required Completion</span>
                  <span className="font-semibold">{progress.required_percent}%</span>
                </div>
                <div className="w-full bg-zinc-200 rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full"
                    style={{ width: `${progress.required_percent}%` }}
                  />
                </div>
              </div>
              <div className="text-sm text-zinc-600">
                {progress.required_completed} of {progress.required_courses} required courses
                completed
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-lg border border-zinc-200 bg-white p-6">
        <h2 className="text-lg font-semibold mb-4">Required Courses</h2>
        {requiredCourses.length === 0 ? (
          <p className="text-sm text-zinc-500">No required courses defined.</p>
        ) : (
          <div className="space-y-2">
            {requiredCourses.map((req) => (
              <div
                key={req.course_id}
                className={`border rounded-lg p-3 ${
                  req.completed ? "bg-green-50 border-green-200" : "bg-zinc-50"
                }`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-medium text-sm">
                      {req.course_code} - {req.course_name}
                    </div>
                    <div className="text-xs text-zinc-500">{req.credits} Credits</div>
                  </div>
                  <span
                    className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                      req.completed
                        ? "bg-green-100 text-green-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {req.completed ? "Completed" : "Pending"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {electiveCourses.length > 0 && (
        <div className="rounded-lg border border-zinc-200 bg-white p-6">
          <h2 className="text-lg font-semibold mb-4">Elective Courses</h2>
          <div className="space-y-2">
            {electiveCourses.map((req) => (
              <div
                key={req.course_id}
                className={`border rounded-lg p-3 ${
                  req.completed ? "bg-green-50 border-green-200" : "bg-zinc-50"
                }`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-medium text-sm">
                      {req.course_code} - {req.course_name}
                    </div>
                    <div className="text-xs text-zinc-500">{req.credits} Credits</div>
                  </div>
                  <span
                    className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                      req.completed
                        ? "bg-green-100 text-green-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {req.completed ? "Completed" : "Pending"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

