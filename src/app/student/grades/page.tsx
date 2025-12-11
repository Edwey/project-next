"use client";

import { useEffect, useState } from "react";

type Assessment = {
  assessment_type: string;
  assessment_name: string;
  score: number;
  max_score: number;
  weight: number;
  grade_date: string;
};

type CourseGrades = {
  course_code: string;
  course_name: string;
  credits: number;
  section_name: string;
  instructor: string;
  final_grade: string | null;
  assessments: Assessment[];
};

export default function StudentGradesPage() {
  const [student, setStudent] = useState<{
    student_id: string;
    dept_name: string;
    level_name: string;
  } | null>(null);
  const [gradesByCourse, setGradesByCourse] = useState<CourseGrades[]>([]);
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
        const res = await fetch("/api/student/grades");
        const json = await res.json();
        if (!json.success) {
          setError(json.error || "Failed to load grades");
          return;
        }
        setGradesByCourse(json.data.gradesByCourse || []);
        setGpaSummary(json.data.gpaSummary);
      } catch (err: any) {
        setError(err.message || "Unexpected error");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-zinc-200 bg-white p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">Academic Performance</h1>
            {student && (
              <p className="text-zinc-600">
                Student ID: <strong>{student.student_id}</strong> · {student.dept_name} ·{" "}
                {student.level_name}
              </p>
            )}
          </div>
          {gpaSummary && (
            <div className="bg-white border rounded-lg p-4 text-center">
              <div className="text-4xl font-bold text-blue-600 mb-1">
                {gpaSummary.calculated_gpa.toFixed(2)}
              </div>
              <div className="text-sm text-zinc-600">Overall GPA</div>
              <div className="text-xs text-zinc-500 mt-1">
                Credits: <strong>{gpaSummary.total_credits}</strong>
              </div>
            </div>
          )}
        </div>
      </div>

      {loading && <p className="text-sm text-zinc-500">Loading grades...</p>}
      {error && <p className="text-sm text-red-600">Error: {error}</p>}

      {!loading && !error && (
        <div className="space-y-6">
          {gradesByCourse.length === 0 ? (
            <div className="rounded-lg border border-zinc-200 bg-white p-6">
              <p className="text-sm text-zinc-500">No grades available for the current semester.</p>
            </div>
          ) : (
            gradesByCourse.map((course) => (
              <div key={course.course_code} className="rounded-lg border border-zinc-200 bg-white p-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
                  <div>
                    <h2 className="text-xl font-semibold mb-1">
                      <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium mr-2">
                        {course.course_code}
                      </span>
                      {course.course_name}
                    </h2>
                    <p className="text-sm text-zinc-600">
                      Section {course.section_name} · {course.instructor} · {course.credits} Credits
                    </p>
                  </div>
                  {course.final_grade && (
                    <div className="text-right">
                      <span className="inline-block px-4 py-2 bg-green-100 text-green-800 rounded-lg text-lg font-semibold">
                        Final Grade: {course.final_grade}
                      </span>
                    </div>
                  )}
                </div>

                {course.assessments.length === 0 ? (
                  <p className="text-sm text-zinc-500">No assessments recorded yet.</p>
                ) : (
                  <div className="space-y-2">
                    {course.assessments.map((assessment, idx) => (
                      <div key={idx} className="border rounded-lg p-3">
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="font-medium text-sm">{assessment.assessment_name}</div>
                            <div className="text-xs text-zinc-500">
                              {assessment.assessment_type.charAt(0).toUpperCase() +
                                assessment.assessment_type.slice(1)}{" "}
                              · Weight: {assessment.weight}%
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-sm">
                              {assessment.score} / {assessment.max_score}
                            </div>
                            <div className="text-xs text-zinc-500">
                              {new Date(assessment.grade_date).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

