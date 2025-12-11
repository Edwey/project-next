"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { formatDate } from "@/lib/date-format";

const adminNav = {
  top: [
    { label: "Dashboard", href: "/admin" },
    { label: "Manage Users", href: "/admin/users" },
  ],
  groups: [
    {
      label: "Admissions",
      items: [
        { label: "Admissions", href: "/admin/admissions" },
        { label: "Admissions Analytics", href: "/admin/analytics/admissions" },
      ],
    },
    {
      label: "Catalog",
      items: [
        { label: "Programs", href: "/admin/catalog/programs" },
        { label: "Requirements", href: "/admin/catalog/requirements" },
        { label: "Departments", href: "/admin/catalog/departments" },
        { label: "Courses", href: "/admin/catalog/courses" },
        { label: "Levels", href: "/admin/catalog/levels" },
      ],
    },
    {
      label: "Academics",
      items: [
        { label: "Academic Years", href: "/admin/academics/academic-years" },
        { label: "Semesters", href: "/admin/academics/semesters" },
        { label: "Sections", href: "/admin/academics/sections" },
        { label: "Students", href: "/admin/academics/students" },
        { label: "Instructors", href: "/admin/academics/instructors" },
        { label: "Waitlists", href: "/admin/academics/waitlists" },
        { label: "Enrollments", href: "/admin/academics/enrollments" },
      ],
    },
    {
      label: "Analytics",
      items: [
        { label: "Academic Analytics", href: "/admin/analytics/academics" },
        { label: "Finance Analytics", href: "/admin/analytics/finance" },
      ],
    },
    {
      label: "Finance",
      items: [{ label: "Fee Payments", href: "/admin/fee-payments" }],
    },
    {
      label: "Notifications",
      items: [{ label: "Notifications", href: "/admin/notifications" }],
    },
    {
      label: "Profile",
      items: [{ label: "Profile", href: "/admin/profile" }],
    },
  ],
};

export default function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const router = useRouter();

  function toggleGroup(label: string) {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(label)) {
      newExpanded.delete(label);
    } else {
      newExpanded.add(label);
    }
    setExpandedGroups(newExpanded);
  }

  async function handleLogout() {
    try {
      const res = await fetch("/api/auth/logout", {
        method: "POST",
      });
      if (res.ok) {
        router.push("/login");
      } else {
        console.error("Logout failed");
      }
    } catch (err) {
      console.error("Logout error:", err);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900 flex">
      <aside className="hidden md:flex md:flex-col w-64 bg-zinc-900 text-zinc-50 px-4 py-5 space-y-4 overflow-y-auto sticky top-0 h-screen">
        <div className="flex items-center mb-2">
          <span className="text-lg font-semibold">Admin Console</span>
        </div>
        <nav className="space-y-4 text-sm">
          <ul className="space-y-1">
            {adminNav.top.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="flex items-center rounded-md px-3 py-2 hover:bg-zinc-800"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="space-y-2">
            {adminNav.groups.map((group) => (
              <div key={group.label}>
                <button
                  onClick={() => toggleGroup(group.label)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-semibold uppercase tracking-wide text-zinc-400 hover:bg-zinc-800"
                >
                  <span>{group.label}</span>
                  <span
                    className={`transition-transform ${
                      expandedGroups.has(group.label) ? "rotate-180" : ""
                    }`}
                  >
                    ▾
                  </span>
                </button>
                {expandedGroups.has(group.label) && (
                  <ul className="space-y-1 ml-2 mt-1">
                    {group.items.map((item) => (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className="block rounded-md px-3 py-1.5 text-zinc-100/80 hover:bg-zinc-800 hover:text-white text-sm"
                        >
                          {item.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </nav>
      </aside>

      <div className="flex-1 flex flex-col min-h-screen">
        <header className="sticky top-0 z-10 border-b bg-white/80 backdrop-blur">
          <div className="mx-auto w-full px-4 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <button className="md:hidden rounded-md border px-2 py-1 text-xs">
                Menu
              </button>
              <h1 className="text-sm font-semibold text-zinc-900">Admin Panel</h1>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <Link
                href="/admin/notifications"
                className="relative text-zinc-600 hover:text-zinc-900"
              >
                <span>Notifications</span>
              </Link>
              <Link
                href="/admin/profile"
                className="flex items-center gap-2"
              >
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-zinc-900 text-xs font-medium text-white">
                  A
                </span>
                <span className="text-zinc-700 hover:text-zinc-900">
                  Admin
                </span>
              </Link>
              <button
                onClick={handleLogout}
                className="text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 px-3 py-1.5 rounded-md text-sm"
              >
                Logout
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 mx-auto w-full max-w-6xl px-4 py-6">
          {children}
        </main>

        <footer className="border-t bg-white py-4 text-center text-xs text-zinc-500">
          © {new Date().getFullYear()} University Management Admin Console
        </footer>
      </div>
    </div>
  );
}
