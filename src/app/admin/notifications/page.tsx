"use client";

import { useEffect, useState } from "react";
import { formatDate } from "@/lib/date-format";

type Notification = {
  id: number;
  to_user_id: number;
  subject: string;
  body: string;
  is_read: number;
  created_at: string;
  username: string;
};

type NotificationsResponse = {
  notifications: Notification[];
  total: number;
  unread: number;
};

export default function NotificationsPage() {
  const [data, setData] = useState<NotificationsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");

  async function load(filterType = "all") {
    try {
      setLoading(true);
      setError(null);
      const url =
        filterType !== "all"
          ? `/api/admin/notifications?filter=${filterType}`
          : "/api/admin/notifications";
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to load notifications");
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Failed to load");
      setData(json.data as NotificationsResponse);
    } catch (err: any) {
      setError(err.message ?? "Unexpected error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(filter);
  }, []);

  return (
    <div className="space-y-4">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
      </header>

      {error && <p className="text-sm text-red-600">Error: {error}</p>}

      <div className="rounded-lg border border-zinc-200 bg-white p-3">
        <select
          value={filter}
          onChange={(e) => {
            setFilter(e.target.value);
            load(e.target.value);
          }}
          className="h-8 rounded-md border border-zinc-300 px-2 text-sm"
        >
          <option value="all">All Notifications</option>
          <option value="unread">Unread</option>
          <option value="read">Read</option>
        </select>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-zinc-200 bg-white p-4">
          <p className="text-xs text-zinc-500 mb-1">Total Notifications</p>
          <p className="text-2xl font-semibold">{data?.total ?? 0}</p>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white p-4">
          <p className="text-xs text-zinc-500 mb-1">Unread</p>
          <p className="text-2xl font-semibold text-blue-600">{data?.unread ?? 0}</p>
        </div>
      </div>

      <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-zinc-800">Notifications</h2>
        {loading && <p className="text-xs text-zinc-500">Loading...</p>}
        {!loading && (!data || data.notifications.length === 0) && (
          <p className="text-xs text-zinc-500">No notifications.</p>
        )}
        {!loading && data && data.notifications.length > 0 && (
          <div className="space-y-2">
            {data.notifications.map((n) => (
              <div
                key={n.id}
                className={`rounded-lg border p-3 ${
                  n.is_read === 0
                    ? "border-blue-200 bg-blue-50"
                    : "border-zinc-200 bg-white"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{n.subject}</p>
                    <p className="text-xs text-zinc-600 mt-1">{n.body}</p>
                    <p className="text-xs text-zinc-500 mt-2">
                      To: {n.username} · {formatDate(n.created_at)}
                    </p>
                  </div>
                  {n.is_read === 0 && (
                    <span className="inline-flex h-2 w-2 rounded-full bg-blue-600 mt-1"></span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
