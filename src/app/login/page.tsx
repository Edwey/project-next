"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [usernameOrEmail, setUsernameOrEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usernameOrEmail, password }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || "Login failed");
        return;
      }

      if (data.requiresMfa) {
        // Redirect to MFA verification
        router.push("/mfa-verify");
        return;
      }

      const role = data.data?.role;
      if (role === "admin") {
        router.push("/admin");
      } else if (role === "instructor") {
        router.push("/instructor");
      } else if (role === "student") {
        router.push("/student");
      } else {
        router.push("/");
      }
    } catch (err: any) {
      setError(err.message || "Unexpected error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-100 px-4 py-8">
      <div className="w-full max-w-md mb-4">
        <button
          onClick={() => router.back()}
          className="flex items-center text-blue-600 hover:text-blue-800 text-sm font-medium"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back
        </button>
      </div>
      
      <div className="w-full max-w-md bg-white border border-zinc-200 rounded-lg shadow-sm p-6 space-y-4">
        <h1 className="text-xl font-semibold text-zinc-900 text-center">Sign in</h1>
        {error && <p className="text-sm text-red-600 text-center">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-zinc-700 mb-1">
              Username or email
            </label>
            <input
              id="username"
              type="text"
              value={usernameOrEmail}
              onChange={(e) => setUsernameOrEmail(e.target.value)}
              className="w-full px-3 py-3 border-2 border-zinc-300 rounded-md text-sm text-gray-900 placeholder-gray-500 bg-white focus:border-blue-500 focus:ring-blue-500"
              autoComplete="username"
              required
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-zinc-700 mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-3 border-2 border-zinc-300 rounded-md text-sm text-gray-900 placeholder-gray-500 bg-white focus:border-blue-500 focus:ring-blue-500"
              autoComplete="current-password"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
