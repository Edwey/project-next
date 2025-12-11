"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function InstructorLayout({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();
  const [profile, setProfile] = useState<{
    firstName: string;
    lastName: string;
    email: string;
  } | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await fetch("/api/instructor/profile");
        if (res.ok) {
          const data = await res.json();
          setProfile(data.data);
        }
      } catch (error) {
        console.error("Failed to load profile:", error);
      }
    };
    loadProfile();
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900 flex">
      <aside className="hidden md:flex md:flex-col w-56 bg-zinc-900 text-zinc-50 px-4 py-5 space-y-4 overflow-y-auto sticky top-0 h-screen">
        <div className="flex flex-col mb-4 pb-4 border-b border-zinc-700">
          <span className="text-lg font-semibold">Instructor</span>
          {profile && (
            <div className="text-xs text-zinc-400 mt-2">
              <p className="font-medium">
                {profile.firstName} {profile.lastName}
              </p>
              <p className="truncate">{profile.email}</p>
            </div>
          )}
        </div>
        <nav className="space-y-2 text-sm">
          <Link
            href="/instructor"
            className="block rounded-md px-3 py-2 hover:bg-zinc-800"
          >
            Dashboard
          </Link>
          <Link
            href="/instructor/courses"
            className="block rounded-md px-3 py-2 hover:bg-zinc-800"
          >
            Courses
          </Link>
          <Link
            href="/instructor/gradebook"
            className="block rounded-md px-3 py-2 hover:bg-zinc-800"
          >
            Gradebook
          </Link>
          <Link
            href="/instructor/attendance"
            className="block rounded-md px-3 py-2 hover:bg-zinc-800"
          >
            Attendance
          </Link>
          <Link
            href="/instructor/advising"
            className="block rounded-md px-3 py-2 hover:bg-zinc-800"
          >
            Advising
          </Link>
          <Link
            href="/instructor/students"
            className="block rounded-md px-3 py-2 hover:bg-zinc-800"
          >
            Students
          </Link>
          <Link
            href="/instructor/waitlists"
            className="block rounded-md px-3 py-2 hover:bg-zinc-800"
          >
            Waitlists
          </Link>
          <Link
            href="/instructor/notifications"
            className="block rounded-md px-3 py-2 hover:bg-zinc-800"
          >
            Notifications
          </Link>
          <Link
            href="/instructor/profile"
            className="block rounded-md px-3 py-2 hover:bg-zinc-800"
          >
            Profile
          </Link>
        </nav>
        <div className="mt-auto pt-4 border-t border-zinc-700">
          <button
            onClick={handleLogout}
            className="w-full rounded-md px-3 py-2 text-sm bg-red-600 hover:bg-red-700 text-white"
          >
            Logout
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-h-screen">
        <header className="sticky top-0 z-10 border-b bg-white/80 backdrop-blur">
          <div className="mx-auto w-full px-4 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold text-zinc-900">
                Instructor Panel
              </h1>
            </div>
          </div>
        </header>

        <main className="flex-1 mx-auto w-full max-w-5xl px-4 py-6">
          {children}
        </main>
      </div>
    </div>
  );
}

