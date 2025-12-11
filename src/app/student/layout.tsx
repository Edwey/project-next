"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function StudentLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900 flex">
      <aside className="hidden md:flex md:flex-col w-56 bg-zinc-900 text-zinc-50 px-4 py-5 space-y-4 sticky top-0 h-screen overflow-y-auto">
        <div className="mb-4 pb-4 border-b border-zinc-700">
          <span className="text-lg font-semibold">Student</span>
        </div>
        <nav className="space-y-1 text-sm">
          <Link
            href="/student"
            className={`block rounded-md px-3 py-2 hover:bg-zinc-800 ${
              pathname === "/student" ? "bg-zinc-800" : ""
            }`}
          >
            Dashboard
          </Link>
          <Link
            href="/student/my-courses"
            className={`block rounded-md px-3 py-2 hover:bg-zinc-800 ${
              pathname === "/student/my-courses" ? "bg-zinc-800" : ""
            }`}
          >
            My Courses
          </Link>
          <Link
            href="/student/enroll"
            className={`block rounded-md px-3 py-2 hover:bg-zinc-800 ${
              pathname === "/student/enroll" ? "bg-zinc-800" : ""
            }`}
          >
            Enroll
          </Link>
          <Link
            href="/student/attendance"
            className={`block rounded-md px-3 py-2 hover:bg-zinc-800 ${
              pathname === "/student/attendance" ? "bg-zinc-800" : ""
            }`}
          >
            Attendance
          </Link>
          <Link
            href="/student/grades"
            className={`block rounded-md px-3 py-2 hover:bg-zinc-800 ${
              pathname === "/student/grades" ? "bg-zinc-800" : ""
            }`}
          >
            Grades
          </Link>
          <Link
            href="/student/degree-audit"
            className={`block rounded-md px-3 py-2 hover:bg-zinc-800 ${
              pathname === "/student/degree-audit" ? "bg-zinc-800" : ""
            }`}
          >
            Degree Audit
          </Link>
          <Link
            href="/student/transcript"
            className={`block rounded-md px-3 py-2 hover:bg-zinc-800 ${
              pathname === "/student/transcript" ? "bg-zinc-800" : ""
            }`}
          >
            Transcript
          </Link>
          <Link
            href="/student/fee-statement"
            className={`block rounded-md px-3 py-2 hover:bg-zinc-800 ${
              pathname === "/student/fee-statement" ? "bg-zinc-800" : ""
            }`}
          >
            Fees
          </Link>
          <Link
            href="/student/notifications"
            className={`block rounded-md px-3 py-2 hover:bg-zinc-800 ${
              pathname === "/student/notifications" ? "bg-zinc-800" : ""
            }`}
          >
            Notifications
          </Link>
          <Link
            href="/student/profile"
            className={`block rounded-md px-3 py-2 hover:bg-zinc-800 ${
              pathname === "/student/profile" ? "bg-zinc-800" : ""
            }`}
          >
            Profile
          </Link>
        </nav>
        <div className="mt-auto pt-4 border-t border-zinc-700">
          <button
            onClick={async () => {
              await fetch("/api/auth/logout", { method: "POST" });
              window.location.href = "/login";
            }}
            className="w-full rounded-md px-3 py-2 text-sm bg-red-600 hover:bg-red-700 text-white"
          >
            Logout
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-h-screen">
        <header className="sticky top-0 z-10 border-b bg-white/80 backdrop-blur">
          <div className="px-4 py-3 text-sm font-semibold text-zinc-900">
            Student Portal
          </div>
        </header>
        <main className="flex-1 mx-auto w-full max-w-5xl px-4 py-6">
          {children}
        </main>
      </div>
    </div>
  );
}

