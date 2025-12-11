"use client";

import { useEffect, useState } from "react";

type Profile = {
  first_name: string;
  last_name: string;
  dept_name: string | null;
  hire_date: string | null;
  username: string;
  email: string;
  phone: string | null;
  mfa_email_enabled: boolean;
};

export default function InstructorProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [mfa, setMfa] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/instructor/profile");
      const json = await res.json();
      if (json.success) {
        const p = json.data.profile as Profile;
        setProfile(p);
        setEmail(p.email ?? "");
        setPhone(p.phone ?? "");
        setMfa(!!p.mfa_email_enabled);
      } else {
        setError(json.error || "Failed to load profile");
      }
    } catch (err: any) {
      setError(err.message || "Unexpected error");
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateContact(e: React.FormEvent) {
    e.preventDefault();
    try {
      setError(null);
      setSuccess(null);
      const res = await fetch("/api/instructor/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_contact",
          email,
          phone,
          mfa_email_enabled: mfa,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setSuccess("Contact details updated successfully.");
        loadProfile();
      } else {
        setError(json.error || "Failed to update contact");
      }
    } catch (err: any) {
      setError(err.message || "Unexpected error");
    }
  }

  async function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault();
    try {
      setError(null);
      setSuccess(null);
      const res = await fetch("/api/instructor/profile/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
          confirm_password: confirmPassword,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setSuccess("Password updated successfully.");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setError(json.error || "Failed to update password");
      }
    } catch (err: any) {
      setError(err.message || "Unexpected error");
    }
  }

  async function handleForgetTrusted() {
    try {
      setError(null);
      setSuccess(null);
      const res = await fetch("/api/instructor/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "forget_trusted" }),
      });
      const json = await res.json();
      if (json.success) {
        setSuccess("Trusted devices cleared on this browser.");
      } else {
        setError(json.error || "Failed to clear trusted devices");
      }
    } catch (err: any) {
      setError(err.message || "Unexpected error");
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
        <p className="text-zinc-600 mt-1">View and update your instructor profile</p>
      </header>

      {error && <p className="text-sm text-red-600">Error: {error}</p>}
      {success && <p className="text-sm text-green-600">{success}</p>}

      {loading || !profile ? (
        <p className="text-sm text-zinc-500">Loading...</p>
      ) : (
        <>
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Instructor Details */}
            <section className="rounded-lg border border-zinc-200 bg-white p-6">
              <h2 className="text-lg font-semibold mb-4">Instructor Details</h2>
              <div className="space-y-3 text-sm">
                <div>
                  <div className="text-xs text-zinc-500">Name</div>
                  <div className="font-medium">
                    {profile.first_name} {profile.last_name}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-zinc-500">Department</div>
                  <div className="font-medium">
                    {profile.dept_name ?? "Unassigned"}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-zinc-500">Hire Date</div>
                  <div className="font-medium">
                    {profile.hire_date ?? "N/A"}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-zinc-500">Username</div>
                  <div className="font-medium">{profile.username}</div>
                </div>
              </div>
            </section>

            {/* Contact Information */}
            <section className="rounded-lg border border-zinc-200 bg-white p-6">
              <h2 className="text-lg font-semibold mb-4">Contact Information</h2>
              <form onSubmit={handleUpdateContact} className="space-y-4 text-sm">
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-zinc-300 rounded-md text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-300 rounded-md text-sm"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    id="mfa_email_enabled"
                    type="checkbox"
                    checked={mfa}
                    onChange={(e) => setMfa(e.target.checked)}
                    className="h-4 w-4 border-zinc-300 rounded"
                  />
                  <label
                    htmlFor="mfa_email_enabled"
                    className="text-xs text-zinc-700"
                  >
                    Enable Email-based MFA (One-Time Code at login)
                  </label>
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
                >
                  Update Contact
                </button>
              </form>

              <button
                type="button"
                onClick={handleForgetTrusted}
                className="mt-4 px-3 py-1.5 border border-zinc-300 text-zinc-700 rounded-md text-xs font-medium hover:bg-zinc-50"
              >
                Forget trusted devices on this browser
              </button>
            </section>
          </div>

          {/* Change Password */}
          <section className="rounded-lg border border-zinc-200 bg-white p-6 max-w-xl">
            <h2 className="text-lg font-semibold mb-4">Change Password</h2>
            <form onSubmit={handleUpdatePassword} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  Current Password
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-zinc-300 rounded-md text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-zinc-300 rounded-md text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-zinc-300 rounded-md text-sm"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-yellow-500 text-white rounded-md text-sm font-medium hover:bg-yellow-600"
              >
                Update Password
              </button>
            </form>
          </section>
        </>
      )}
    </div>
  );
}
