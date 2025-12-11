"use client";

import { useEffect, useState } from "react";
import { formatDate } from "@/lib/date-format";

type AdminProfile = {
  id: number;
  username: string;
  email: string;
  role: string;
  is_active: number;
  created_at: string;
  last_login: string | null;
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editUsername, setEditUsername] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch("/api/admin/profile");
        if (!res.ok) throw new Error("Failed to load profile");
        const json = await res.json();
        if (!json.success) throw new Error(json.error ?? "Failed to load");
        const data = json.data as AdminProfile;
        setProfile(data);
        setEditUsername(data.username);
        setEditEmail(data.email);
      } catch (err: any) {
        setError(err.message ?? "Unexpected error");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      const res = await fetch("/api/admin/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_profile",
          username: editUsername,
          email: editEmail,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error ?? "Failed to update profile");
      }
      if (profile) {
        setProfile({ ...profile, username: editUsername, email: editEmail });
      }
      setEditMode(false);
      alert("Profile updated successfully");
    } catch (err: any) {
      setError(err.message ?? "Unexpected error");
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    try {
      setSaving(true);
      setError(null);
      const res = await fetch("/api/admin/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "change_password",
          current_password: password,
          new_password: newPassword,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error ?? "Failed to change password");
      }
      setPassword("");
      setNewPassword("");
      setConfirmPassword("");
      alert("Password changed successfully");
    } catch (err: any) {
      setError(err.message ?? "Unexpected error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Admin Profile</h1>
      </header>

      {error && <p className="text-sm text-red-600">Error: {error}</p>}

      {loading && <p className="text-sm text-zinc-500">Loading...</p>}

      {profile && !loading && (
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-zinc-800">
                Profile Information
              </h2>
              {!editMode && (
                <button
                  onClick={() => setEditMode(true)}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                  Edit
                </button>
              )}
            </div>
            {editMode ? (
              <form onSubmit={handleUpdateProfile} className="space-y-3">
                <div className="flex flex-col">
                  <label className="mb-1 text-xs font-medium text-zinc-500">
                    Username
                  </label>
                  <input
                    type="text"
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value)}
                    required
                    className="h-8 rounded-md border border-zinc-300 px-2 text-sm"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="mb-1 text-xs font-medium text-zinc-500">
                    Email
                  </label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    required
                    className="h-8 rounded-md border border-zinc-300 px-2 text-sm"
                  />
                </div>
                <div>
                  <p className="text-xs text-zinc-500 mb-1">Role</p>
                  <p className="font-medium text-sm capitalize">{profile.role}</p>
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex h-8 items-center rounded-md bg-blue-600 px-3 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditMode(false);
                      setEditUsername(profile.username);
                      setEditEmail(profile.email);
                    }}
                    className="inline-flex h-8 items-center rounded-md border border-zinc-300 px-3 text-xs font-medium text-zinc-700 hover:bg-zinc-100"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-xs text-zinc-500">Username</p>
                  <p className="font-medium">{profile.username}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500">Email</p>
                  <p className="font-medium">{profile.email}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500">Role</p>
                  <p className="font-medium capitalize">{profile.role}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500">Status</p>
                  <p className="font-medium">
                    {profile.is_active === 1 ? (
                      <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-medium text-green-700">
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-medium text-red-700">
                        Inactive
                      </span>
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500">Member Since</p>
                  <p className="font-medium">{formatDate(profile.created_at)}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500">Last Login</p>
                  <p className="font-medium">{profile.last_login ? formatDate(profile.last_login) : "Never"}</p>
                </div>
              </div>
            )}
          </section>

          <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-zinc-800">
              Change Password
            </h2>
            <form onSubmit={handleChangePassword} className="space-y-3">
              <div className="flex flex-col">
                <label className="mb-1 text-xs font-medium text-zinc-500">
                  Current Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-8 rounded-md border border-zinc-300 px-2 text-sm"
                />
              </div>
              <div className="flex flex-col">
                <label className="mb-1 text-xs font-medium text-zinc-500">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  className="h-8 rounded-md border border-zinc-300 px-2 text-sm"
                />
              </div>
              <div className="flex flex-col">
                <label className="mb-1 text-xs font-medium text-zinc-500">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="h-8 rounded-md border border-zinc-300 px-2 text-sm"
                />
              </div>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex h-8 items-center rounded-md bg-zinc-900 px-3 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Change Password"}
              </button>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
