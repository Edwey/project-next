"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function MfaVerifyPage() {
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [timeLeft, setTimeLeft] = useState(15 * 60); // 15 minutes
  const router = useRouter();

  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/auth/mfa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Verification failed");
      }

      setSuccess("Verification successful! Redirecting...");
      setTimeout(() => {
        // Redirect based on role
        if (data.data.role === "admin") {
          router.push("/admin");
        } else if (data.data.role === "instructor") {
          router.push("/instructor");
        } else if (data.data.role === "student") {
          router.push("/student");
        } else {
          router.push("/");
        }
      }, 1000);
    } catch (err: any) {
      setError(err.message || "Verification failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/auth/mfa/resend", { method: "POST" });
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to resend code");
      }

      setSuccess("A new verification code has been sent to your email");
      setTimeLeft(15 * 60); // Reset timer
    } catch (err: any) {
      setError(err.message || "Failed to resend code");
    } finally {
      setIsResending(false);
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-100 px-4 py-8">
      <div className="w-full max-w-md mb-4">
        <Link
          href="/login"
          className="flex items-center text-blue-600 hover:text-blue-800 text-sm font-medium"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to login
        </Link>
      </div>

      <div className="w-full max-w-md bg-white border border-zinc-200 rounded-lg shadow-sm p-6 space-y-4">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-zinc-900 mb-2">Multi-Factor Authentication</h1>
          <p className="text-sm text-zinc-600">Enter the 6-digit code sent to your email</p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {success && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-md">
            <p className="text-sm text-green-600">{success}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="code" className="block text-sm font-medium text-zinc-700 mb-1">
              Verification Code
            </label>
            <input
              id="code"
              name="code"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replaceAll(/\D/g, ""))}
              className="w-full px-3 py-3 border-2 border-zinc-300 rounded-md text-sm text-gray-900 placeholder-gray-500 bg-white focus:border-blue-500 focus:ring-blue-500 text-center text-xl tracking-widest"
              placeholder="000000"
              required
              autoFocus
            />
          </div>

          <div className="text-center text-sm text-zinc-600">
            {timeLeft > 0 ? (
              <p>Code expires in {formatTime(timeLeft)}</p>
            ) : (
              <p className="text-red-600">Code expired</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading || code.length !== 6}
            className="w-full px-4 py-3 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Verifying..." : "Verify Code"}
          </button>

          <div className="text-center">
            <button
              type="button"
              onClick={handleResend}
              disabled={isResending || timeLeft > 0}
              className={`text-sm font-medium ${
                timeLeft > 0
                  ? "text-zinc-400 cursor-not-allowed"
                  : "text-blue-600 hover:text-blue-800"
              }`}
            >
              {isResending ? "Sending..." : "Resend code"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
