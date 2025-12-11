"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Notification = {
  id: number;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
  sender_username: string;
};

function StudentNotificationsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const onlyUnread = searchParams.get("filter") === "unread";

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const params = onlyUnread ? "?filter=unread" : "";
        const res = await fetch(`/api/student/notifications${params}`);
        const json = await res.json();
        if (!json.success) {
          setError(json.error || "Failed to load notifications");
          return;
        }
        setNotifications(json.data.notifications || []);
      } catch (err: any) {
        setError(err.message || "Unexpected error");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [onlyUnread]);

  async function handleMarkRead(notificationId: number) {
    try {
      const res = await fetch("/api/student/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark_read", notification_id: notificationId }),
      });
      const json = await res.json();
      if (json.success) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
        );
      }
    } catch (err: any) {
      console.error("Failed to mark notification as read", err);
    }
  }

  async function handleMarkAllRead() {
    try {
      const res = await fetch("/api/student/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark_all_read" }),
      });
      const json = await res.json();
      if (json.success) {
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      }
    } catch (err: any) {
      console.error("Failed to mark all as read", err);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-zinc-200 bg-white p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
          <div className="flex gap-2">
            <button
              onClick={() => router.push(onlyUnread ? "/student/notifications" : "/student/notifications?filter=unread")}
              className="px-4 py-2 border border-zinc-300 rounded-md text-sm hover:bg-zinc-50"
            >
              {onlyUnread ? "Show All" : "Show Unread"}
            </button>
            <button
              onClick={handleMarkAllRead}
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
            >
              Mark All Read
            </button>
          </div>
        </div>
      </div>

      {loading && <p className="text-sm text-zinc-500">Loading notifications...</p>}
      {error && <p className="text-sm text-red-600">Error: {error}</p>}

      {!loading && !error && (
        <div className="rounded-lg border border-zinc-200 bg-white p-6">
          {notifications.length === 0 ? (
            <p className="text-sm text-zinc-500">No notifications.</p>
          ) : (
            <div className="space-y-4">
              {notifications.map((notification) => (
                <div key={notification.id} className="border-b pb-4 last:border-0">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <div className="font-semibold text-sm mb-1">
                        [{notification.type.toUpperCase()}] {notification.title}
                      </div>
                      <div className="text-xs text-zinc-500 mb-1">
                        {new Date(notification.created_at).toLocaleString()}
                        {!notification.is_read && (
                          <span className="ml-2 inline-block px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                            New
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-zinc-500 mb-2">
                        From: {notification.sender_username}
                      </div>
                      <div className="text-sm whitespace-pre-wrap">{notification.message}</div>
                    </div>
                    {!notification.is_read && (
                      <button
                        onClick={() => handleMarkRead(notification.id)}
                        className="px-3 py-1 border border-blue-200 text-blue-700 rounded text-sm hover:bg-blue-50 whitespace-nowrap"
                      >
                        Mark Read
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function StudentNotificationsPage() {
  return (
    <Suspense fallback={<p className="text-sm text-zinc-500">Loading...</p>}>
      <StudentNotificationsContent />
    </Suspense>
  );
}

