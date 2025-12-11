"use client";

import { useEffect, useState } from "react";
import { formatDate } from "@/lib/date-format";

type User = {
  id: number;
  username: string;
  email: string;
  role: string;
  is_active: number;
  created_at: string;
};

type UsersResponse = {
  users: User[];
  total: number;
};

export default function UsersPage() {
  const [data, setData] = useState<UsersResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");

  async function load(query = "") {
    try {
      setLoading(true);
      setError(null);
      const url = query
        ? `/api/admin/users?q=${encodeURIComponent(query)}`
        : "/api/admin/users";
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to load users");
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Failed to load");
      setData(json.data as UsersResponse);
    } catch (err: any) {
      setError(err.message ?? "Unexpected error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-4">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Manage Users</h1>
      </header>

      {error && <p className="text-sm text-red-600">Error: {error}</p>}

      <div className="rounded-lg border border-zinc-200 bg-white p-3">
        <input
          type="text"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            load(e.target.value);
          }}
          placeholder="Search users..."
          className="h-8 w-full rounded-md border border-zinc-300 px-2 text-sm"
        />
      </div>

      <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-zinc-800">
          Users ({data?.total ?? 0})
        </h2>
        {loading && <p className="text-xs text-zinc-500">Loading...</p>}
        {!loading && (!data || data.users.length === 0) && (
          <p className="text-xs text-zinc-500">No users found.</p>
        )}
        {!loading && data && data.users.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-left text-xs sm:text-sm">
              <thead className="border-b bg-zinc-50">
                <tr className="text-zinc-500">
                  <th className="px-2 py-2">Username</th>
                  <th className="px-2 py-2">Email</th>
                  <th className="px-2 py-2">Role</th>
                  <th className="px-2 py-2">Status</th>
                  <th className="px-2 py-2">Created</th>
                </tr>
              </thead>
              <tbody>
                {data.users.map((u) => (
                  <tr key={u.id} className="border-b last:border-0">
                    <td className="px-2 py-2 font-medium">{u.username}</td>
                    <td className="px-2 py-2 text-xs text-zinc-600">{u.email}</td>
                    <td className="px-2 py-2">
                      <span className="inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-700">
                        {u.role}
                      </span>
                    </td>
                    <td className="px-2 py-2">
                      {u.is_active === 1 ? (
                        <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-medium text-green-700">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-medium text-red-700">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-2 text-xs text-zinc-600">
                      {formatDate(u.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
