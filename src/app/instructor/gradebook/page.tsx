"use client";

import { useEffect, useState } from "react";

type Section = {
  id: number;
  section_name: string;
  course_code: string;
  course_name: string;
  semester_name: string;
  year_name: string;
  schedule: string;
};

type Enrollment = {
  enrollment_id: number;
  student_id: string;
  first_name: string;
  last_name: string;
  final_grade: string | null;
  grade_points: number | null;
};

type Grade = {
  grade_id: number;
  assessment_name: string;
  assessment_type: string;
  score: number;
  max_score: number;
  weight: number;
  grade_date: string;
};

export default function GradebookPage() {
  const [sections, setSections] = useState<Section[]>([]);
  const [sectionId, setSectionId] = useState<number | "">("");
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [grades, setGrades] = useState<Record<number, Grade[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [assessmentName, setAssessmentName] = useState("");
  const [assessmentType, setAssessmentType] = useState("assignment");
  const [score, setScore] = useState("");
  const [maxScore, setMaxScore] = useState("100");
  const [weight, setWeight] = useState("10");
  const [gradeDate, setGradeDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedEnrollmentId, setSelectedEnrollmentId] = useState<number | "">("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSections();
  }, []);

  async function loadSections() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/instructor/sections");
      const json = await res.json();
      if (json.success) {
        setSections(json.data.sections || []);
      } else {
        setError(json.error || "Failed to load sections");
      }
    } catch (err: any) {
      setError(err.message || "Unexpected error");
    } finally {
      setLoading(false);
    }
  }

  async function loadGradebook() {
    if (!sectionId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/instructor/gradebook?section_id=${sectionId}`);
      const json = await res.json();
      if (json.success) {
        setEnrollments(json.data.enrollments || []);
        const gradesMap: Record<number, Grade[]> = {};
        json.data.enrollments?.forEach((e: Enrollment) => {
          gradesMap[e.enrollment_id] = [];
        });
        setGrades(gradesMap);
      } else {
        setError(json.error || "Failed to load gradebook");
      }
    } catch (err: any) {
      setError(err.message || "Unexpected error");
    } finally {
      setLoading(false);
    }
  }

  async function handleAddGrade() {
    if (!selectedEnrollmentId || !assessmentName || !score) {
      setError("All fields required");
      return;
    }
    try {
      setSaving(true);
      setError(null);
      const res = await fetch("/api/instructor/gradebook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section_id: sectionId,
          enrollment_id: selectedEnrollmentId,
          assessment_name: assessmentName,
          assessment_type: assessmentType,
          score: Number(score),
          max_score: Number(maxScore),
          weight: Number(weight),
          grade_date: gradeDate,
        }),
      });
      const json = await res.json();
      if (json.success) {
        alert("Grade saved");
        setAssessmentName("");
        setScore("");
        setSelectedEnrollmentId("");
        loadGradebook();
      } else {
        setError(json.error || "Failed to save grade");
      }
    } catch (err: any) {
      setError(err.message || "Unexpected error");
    } finally {
      setSaving(false);
    }
  }

  const selectedSection = sections.find((s) => s.id === sectionId);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Gradebook</h1>
        <p className="text-zinc-600 mt-1">Manage student grades</p>
      </header>

      {error && <p className="text-sm text-red-600">Error: {error}</p>}

      {/* Section Selection */}
      <div className="rounded-lg border border-zinc-200 bg-white p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">
              Course Section
            </label>
            <select
              value={sectionId}
              onChange={(e) => {
                setSectionId(e.target.value ? Number(e.target.value) : "");
                setEnrollments([]);
              }}
              className="w-full px-3 py-2 border border-zinc-300 rounded-md text-sm"
            >
              <option value="">-- Select section --</option>
              {sections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.course_code} - {s.course_name} ({s.section_name})
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={loadGradebook}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
            >
              Load
            </button>
          </div>
        </div>
      </div>

      {/* Gradebook */}
      {selectedSection && (
        <div className="rounded-lg border border-zinc-200 bg-white p-6">
          <h2 className="text-lg font-semibold mb-4">
            {selectedSection.course_code} - {selectedSection.course_name}
          </h2>

          {loading ? (
            <p className="text-sm text-zinc-500">Loading...</p>
          ) : enrollments.length === 0 ? (
            <p className="text-sm text-zinc-500">No enrollments found.</p>
          ) : (
            <>
              {/* Add Grade Form */}
              <div className="border rounded-lg p-4 mb-6 bg-zinc-50">
                <h3 className="font-semibold text-sm mb-3">Add Grade</h3>
                <div className="grid gap-3 sm:grid-cols-4">
                  <div>
                    <label className="block text-xs font-medium text-zinc-700 mb-1">
                      Student
                    </label>
                    <select
                      value={selectedEnrollmentId}
                      onChange={(e) => setSelectedEnrollmentId(e.target.value ? Number(e.target.value) : "")}
                      className="w-full px-2 py-1 border border-zinc-300 rounded text-sm"
                    >
                      <option value="">Select...</option>
                      {enrollments.map((e) => (
                        <option key={e.enrollment_id} value={e.enrollment_id}>
                          {e.first_name} {e.last_name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-700 mb-1">
                      Assessment
                    </label>
                    <input
                      type="text"
                      value={assessmentName}
                      onChange={(e) => setAssessmentName(e.target.value)}
                      className="w-full px-2 py-1 border border-zinc-300 rounded text-sm"
                      placeholder="e.g., Quiz 1"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-700 mb-1">
                      Score
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={score}
                      onChange={(e) => setScore(e.target.value)}
                      className="w-full px-2 py-1 border border-zinc-300 rounded text-sm"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={handleAddGrade}
                      disabled={saving}
                      className="w-full px-3 py-1 bg-green-600 text-white rounded text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                    >
                      {saving ? "Saving..." : "Add"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Enrollments List */}
              <div className="space-y-3">
                {enrollments.map((enrollment) => (
                  <div key={enrollment.enrollment_id} className="border rounded-lg p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">
                          {enrollment.first_name} {enrollment.last_name}
                        </p>
                        <p className="text-xs text-zinc-500">{enrollment.student_id}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          Final: {enrollment.final_grade || "Pending"}
                        </p>
                        <p className="text-xs text-zinc-500">
                          Points: {enrollment.grade_points !== null ? enrollment.grade_points.toFixed(2) : "-"}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
