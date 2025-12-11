"use client";

import { useEffect, useState } from "react";

type StudentProfile = {
  student_id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  address: string | null;
  date_of_birth: string | null;
  enrollment_date: string;
  graduation_lock_at: string | null;
  dept_name: string;
  level_name: string;
  program_name: string;
  username: string;
  email: string;
};

export default function StudentProfilePage() {
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Profile form
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  // Password form
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch("/api/student/profile");
        const json = await res.json();
        if (!json.success) {
          setError(json.error || "Failed to load profile");
          return;
        }
        const student = json.data.student;
        setProfile(student);
        setEmail(student.email);
        setPhone(student.phone || "");
        setAddress(student.address || "");
      } catch (err: any) {
        setError(err.message || "Unexpected error");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault();
    try {
      setMessage(null);
      const res = await fetch("/api/student/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_profile",
          email,
          phone,
          address,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setMessage({ type: "success", text: json.message || "Profile updated successfully" });
        // Reload profile
        const reloadRes = await fetch("/api/student/profile");
        const reloadJson = await reloadRes.json();
        if (reloadJson.success) {
          const student = reloadJson.data.student;
          setProfile(student);
          setEmail(student.email);
          setPhone(student.phone || "");
          setAddress(student.address || "");
        }
      } else {
        setMessage({ type: "error", text: json.error || "Failed to update profile" });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Unexpected error" });
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    try {
      setMessage(null);
      const res = await fetch("/api/student/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "change_password",
          current_password: currentPassword,
          new_password: newPassword,
          confirm_password: confirmPassword,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setMessage({ type: "success", text: json.message || "Password changed successfully" });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setMessage({ type: "error", text: json.error || "Failed to change password" });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Unexpected error" });
    }
  }

  if (loading) {
    return <p className="text-sm text-zinc-500">Loading profile...</p>;
  }

  if (error || !profile) {
    return <p className="text-sm text-red-600">Error: {error || "Profile not found"}</p>;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-zinc-200 bg-white p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-1">My Profile</h1>
            <p className="text-zinc-600">
              {profile.first_name} {profile.last_name} · {profile.dept_name} · {profile.level_name}
            </p>
          </div>
          <div className="w-16 h-16 rounded-full bg-blue-600 text-white flex items-center justify-center text-xl font-semibold">
            {profile.first_name[0]}
            {profile.last_name[0]}
          </div>
        </div>
      </div>

      {message && (
        <div
          className={`rounded-lg border p-4 ${
            message.type === "success"
              ? "border-green-200 bg-green-50 text-green-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-lg border border-zinc-200 bg-white p-6">
          <h2 className="text-lg font-semibold mb-4">Update Profile</h2>
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-zinc-700 mb-1">
                Email
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-zinc-300 rounded-md text-sm"
                required
              />
            </div>
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-zinc-700 mb-1">
                Phone
              </label>
              <input
                type="tel"
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 border border-zinc-300 rounded-md text-sm"
              />
            </div>
            <div>
              <label htmlFor="address" className="block text-sm font-medium text-zinc-700 mb-1">
                Address
              </label>
              <textarea
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3 py-2 border border-zinc-300 rounded-md text-sm"
                rows={3}
              />
            </div>
            <button
              type="submit"
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
            >
              Update Profile
            </button>
          </form>
        </div>

        <div className="rounded-lg border border-zinc-200 bg-white p-6">
          <h2 className="text-lg font-semibold mb-4">Change Password</h2>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label
                htmlFor="current_password"
                className="block text-sm font-medium text-zinc-700 mb-1"
              >
                Current Password
              </label>
              <input
                type="password"
                id="current_password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3 py-2 border border-zinc-300 rounded-md text-sm"
                required
              />
            </div>
            <div>
              <label htmlFor="new_password" className="block text-sm font-medium text-zinc-700 mb-1">
                New Password
              </label>
              <input
                type="password"
                id="new_password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 border border-zinc-300 rounded-md text-sm"
                required
                minLength={8}
              />
            </div>
            <div>
              <label
                htmlFor="confirm_password"
                className="block text-sm font-medium text-zinc-700 mb-1"
              >
                Confirm Password
              </label>
              <input
                type="password"
                id="confirm_password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 border border-zinc-300 rounded-md text-sm"
                required
                minLength={8}
              />
            </div>
            <button
              type="submit"
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
            >
              Change Password
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

