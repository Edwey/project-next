"use client";

import { useEffect, useState } from "react";

type Notification = {
  id: number;
  title: string;
  message: string;
  type: string;
  is_read: number;
  created_at: string;
  sender_username: string;
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [onlyUnread, setOnlyUnread] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadNotifications();
  }, [onlyUnread]);

  async function loadNotifications() {
    try {
      setLoading(true);
      setError(null);
      const url = `/api/instructor/notifications${onlyUnread ? "?unread=true" : ""}`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        setNotifications(json.data.notifications || []);
      } else {
        setError(json.error || "Failed to load notifications");
      }
    } catch (err: any) {
      setError(err.message || "Unexpected error");
    } finally {
      setLoading(false);
    }
  }

  async function markAsRead(notificationId: number) {
    try {
      const res = await fetch("/api/instructor/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "mark_read",
          notification_id: notificationId,
        }),
      });
      const json = await res.json();
      if (json.success) {
        loadNotifications();
      }
    } catch (err) {
      console.error("Failed to mark as read", err);
    }
  }

  async function markAllAsRead() {
    try {
      const res = await fetch("/api/instructor/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "mark_all_read",
        }),
      });
      const json = await res.json();
      if (json.success) {
        loadNotifications();
      }
    } catch (err) {
      console.error("Failed to mark all as read", err);
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
        <p className="text-zinc-600 mt-1">View your notifications</p>
      </header>

      {error && <p className="text-sm text-red-600">Error: {error}</p>}

      {/* Controls */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setOnlyUnread(!onlyUnread)}
          className="px-4 py-2 border border-zinc-300 rounded-md text-sm font-medium hover:bg-zinc-50"
        >
          {onlyUnread ? "Show All" : "Show Unread"}
        </button>
        <button
          onClick={markAllAsRead}
          className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
        >
          Mark All Read
        </button>
      </div>

      {/* Notifications List */}
      <div className="rounded-lg border border-zinc-200 bg-white p-6">
        {loading ? (
          <p className="text-sm text-zinc-500">Loading...</p>
        ) : notifications.length === 0 ? (
          <p className="text-sm text-zinc-500">No notifications.</p>
        ) : (
          <div className="space-y-3">
            {notifications.map((n) => (
              <div
                key={n.id}
                className={`border rounded-lg p-4 ${
                  n.is_read ? "bg-white" : "bg-blue-50 border-blue-200"
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="inline-block px-2 py-1 bg-gray-200 text-gray-700 rounded text-xs font-medium uppercase">
                        {n.type}
                      </span>
                      <h3 className="font-semibold text-sm">{n.title}</h3>
                      {!n.is_read && (
                        <span className="inline-block px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                          New
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-500 mt-1">
                      {n.created_at} · From: {n.sender_username || "System"}
                    </p>
                    <p className="text-sm text-zinc-700 mt-2 whitespace-pre-wrap">{n.message}</p>
                  </div>
                  {!n.is_read && (
                    <button
                      onClick={() => markAsRead(n.id)}
                      className="ml-4 px-3 py-1 border border-blue-300 text-blue-600 rounded text-sm font-medium hover:bg-blue-50"
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
    </div>
  );
}
