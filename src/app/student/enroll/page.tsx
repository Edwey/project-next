"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Section = {
  id: number;
  section_name: string;
  schedule: string | null;
  room: string | null;
  capacity: number;
  enrolled_count: number;
  course_code: string;
  course_name: string;
  credits: number;
  instructor_name: string;
};

type CurrentEnrollment = {
  id: number;
  course_code: string;
  course_name: string;
  credits: number;
  section_name: string;
};

export default function StudentEnrollPage() {
  const [student, setStudent] = useState<{
    student_id: string;
    first_name: string;
    last_name: string;
    dept_name: string;
    level_name: string;
  } | null>(null);
  const [currentPeriod, setCurrentPeriod] = useState<{
    semester_name: string;
    year_name: string;
  } | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [currentEnrollments, setCurrentEnrollments] = useState<CurrentEnrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [enrolling, setEnrolling] = useState<number | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch("/api/student/enroll");
        const json = await res.json();
        if (!json.success) {
          setError(json.error || "Failed to load enrollment data");
          return;
        }
        setStudent(json.data.student);
        setCurrentPeriod(json.data.currentPeriod);
        setSections(json.data.sections || []);
        setCurrentEnrollments(json.data.currentEnrollments || []);
      } catch (err: any) {
        setError(err.message || "Unexpected error");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleEnroll(sectionId: number) {
    try {
      setEnrolling(sectionId);
      setMessage(null);
      const res = await fetch("/api/student/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section_id: sectionId }),
      });
      const json = await res.json();
      if (json.success) {
        setMessage({ type: "success", text: json.message || "Enrolled successfully" });
        // Reload data
        const reloadRes = await fetch("/api/student/enroll");
        const reloadJson = await reloadRes.json();
        if (reloadJson.success) {
          setSections(reloadJson.data.sections || []);
          setCurrentEnrollments(reloadJson.data.currentEnrollments || []);
        }
      } else {
        setMessage({ type: "error", text: json.error || "Failed to enroll" });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Unexpected error" });
    } finally {
      setEnrolling(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-zinc-200 bg-white p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">Course Enrollment</h1>
            {student && (
              <p className="text-zinc-600">
                Student ID: <strong>{student.student_id}</strong> · {student.dept_name} ·{" "}
                {student.level_name}
              </p>
            )}
          </div>
          {currentPeriod ? (
            <span className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-800 rounded-md text-sm font-medium">
              {currentPeriod.semester_name} {currentPeriod.year_name}
            </span>
          ) : (
            <span className="inline-flex items-center px-4 py-2 bg-zinc-100 text-zinc-600 rounded-md text-sm font-medium">
              Enrollment Closed
            </span>
          )}
        </div>
      </div>

      {message && (
        <div
          className={`rounded-lg border p-4 ${
            message.type === "success"
              ? "border-green-200 bg-green-50 text-green-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {message.text}
        </div>
      )}

      {loading && <p className="text-sm text-zinc-500">Loading enrollment data...</p>}
      {error && <p className="text-sm text-red-600">Error: {error}</p>}

      {!loading && !error && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="rounded-lg border border-zinc-200 bg-white p-6">
              <h2 className="text-lg font-semibold mb-4">Available Sections</h2>
              {!currentPeriod ? (
                <p className="text-sm text-zinc-500">Enrollment is not available at this time.</p>
              ) : sections.length === 0 ? (
                <p className="text-sm text-zinc-500">
                  No sections available for your department in the current semester.
                </p>
              ) : (
                <div className="space-y-3">
                  {sections.map((section) => {
                    const isFull = section.enrolled_count >= section.capacity;
                    const isEnrolling = enrolling === section.id;
                    return (
                      <div key={section.id} className="border rounded-lg p-4">
                        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                          <div className="flex-1">
                            <h3 className="font-medium mb-1">
                              <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium mr-2">
                                {section.course_code}
                              </span>
                              {section.course_name}
                            </h3>
                            <p className="text-sm text-zinc-600 mb-2">
                              Instructor: {section.instructor_name}
                              {section.schedule && ` · ${section.schedule}`}
                              {section.room && ` · Room ${section.room}`}
                            </p>
                            <div className="flex flex-wrap gap-2">
                              <span className="inline-block px-2 py-0.5 bg-zinc-100 text-zinc-700 rounded text-xs">
                                Section {section.section_name}
                              </span>
                              <span className="inline-block px-2 py-0.5 bg-zinc-100 text-zinc-700 rounded text-xs">
                                Credits: {section.credits}
                              </span>
                              <span
                                className={`inline-block px-2 py-0.5 rounded text-xs ${
                                  isFull
                                    ? "bg-red-100 text-red-700"
                                    : "bg-green-100 text-green-700"
                                }`}
                              >
                                {section.enrolled_count} / {section.capacity}
                                {isFull && " (Full)"}
                              </span>
                            </div>
                          </div>
                          <div>
                            <button
                              onClick={() => handleEnroll(section.id)}
                              disabled={isEnrolling || isFull}
                              className={`px-3 py-1 rounded text-sm font-medium ${
                                isFull
                                  ? "bg-zinc-100 text-zinc-400 cursor-not-allowed"
                                  : "bg-blue-600 text-white hover:bg-blue-700"
                              }`}
                            >
                              {isEnrolling ? "Enrolling..." : isFull ? "Full" : "Enroll"}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="rounded-lg border border-zinc-200 bg-white p-6">
              <h2 className="text-lg font-semibold mb-4">Current Enrollments</h2>
              {currentEnrollments.length === 0 ? (
                <p className="text-sm text-zinc-500">
                  You are not enrolled in any courses this semester.
                </p>
              ) : (
                <div className="space-y-2">
                  {currentEnrollments.map((enrollment) => (
                    <div key={enrollment.id} className="border-b pb-2 last:border-0">
                      <div className="font-medium text-sm">
                        {enrollment.course_code} - {enrollment.course_name}
                      </div>
                      <div className="text-xs text-zinc-500">
                        Section {enrollment.section_name} · Credits {enrollment.credits}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

