"use client";

import Link from "next/link";

import { useEffect, useState } from "react";
import { formatDate } from "@/lib/date-format";

const PAGE_SIZE = 10;
const STATUS_OPTIONS = [
  "under_review",
  "offered",
  "accepted",
  "rejected",
] as const;

type Status = (typeof STATUS_OPTIONS)[number];

type ProgramOption = {
  id: number;
  program_name: string;
};

type ApplicationRow = {
  id: number;
  first_name: string;
  last_name: string;
  prospect_email: string;
  program_name: string;
  wasse_aggregate: number | null;
  cutoff_aggregate: number | null;
  status: string;
  decided_reason: string | null;
  submitted_at: string;
};

type AdmissionsResponse = {
  rows: ApplicationRow[];
  total: number;
  pages: number;
  page: number;
  pageSize: number;
  filters: {
    status: string;
    q: string;
    programId: number | null;
  };
  programs: ProgramOption[];
};

export default function AdmissionsPage() {
  const [status, setStatus] = useState<string>("");
  const [programId, setProgramId] = useState<number | "">("");
  const [q, setQ] = useState<string>("");
  const [page, setPage] = useState<number>(1);

  const [data, setData] = useState<AdmissionsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [bulkAction, setBulkAction] = useState<string>("");
  const [bulkOfferNotes, setBulkOfferNotes] = useState<string>("");
  const [actionBusy, setActionBusy] = useState<boolean>(false);
  const [credentialsModal, setCredentialsModal] = useState<
    | null
    | {
        appId: number;
        email: string;
        username: string;
        tempPassword: string;
      }[]
  >(null);

  async function loadAdmissions(params?: { resetPage?: boolean }) {
    try {
      if (params?.resetPage) {
        setPage(1);
      }
      setLoading(true);
      setError(null);

      const search = new URLSearchParams();
      if (status) search.set("status", status);
      if (q.trim()) search.set("q", q.trim());
      if (programId) search.set("programId", String(programId));
      search.set("page", String(params?.resetPage ? 1 : page));

      const res = await fetch(`/api/admin/admissions?${search.toString()}`);
      if (!res.ok) throw new Error("Failed to load admissions");
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Unknown error");
      setData(json.data as AdmissionsResponse);
      setPage((json.data as AdmissionsResponse).page);
      setSelectedIds([]);
    } catch (err: any) {
      setError(err.message ?? "Unexpected error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAdmissions();
  }, []);

  function handleApplyFilters(e: React.FormEvent) {
    e.preventDefault();
    loadAdmissions({ resetPage: true });
  }

  function handlePageChange(newPage: number) {
    setPage(newPage);
    // trigger reload with new page
    setTimeout(() => {
      loadAdmissions();
    }, 0);
  }

  function toggleAll(checked: boolean) {
    if (!data) return;
    if (checked) {
      setSelectedIds(data.rows.map((r) => r.id));
    } else {
      setSelectedIds([]);
    }
  }

  function toggleOne(id: number, checked: boolean) {
    setSelectedIds((prev) =>
      checked ? Array.from(new Set([...prev, id])) : prev.filter((v) => v !== id)
    );
  }

  async function performAction(
    ids: number[],
    action: "under_review" | "offer" | "accept" | "reject",
    notes?: string
  ) {
    if (!ids.length) return;
    try {
      setActionBusy(true);
      const res = await fetch("/api/admin/admissions/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, action, offerNotes: notes ?? undefined }),
      });
      if (!res.ok) throw new Error("Action failed");
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Action failed");

      const creds = (json.acceptedCredentials || []) as {
        appId: number;
        email: string;
        username: string;
        tempPassword: string;
      }[];
      if (creds.length) {
        setCredentialsModal(creds);
      }
      await loadAdmissions();
    } catch (err: any) {
      setError(err.message ?? "Unexpected error");
    } finally {
      setActionBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Admissions</h1>
      </header>

      <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <form
          className="flex flex-wrap items-end gap-3 text-sm"
          onSubmit={handleApplyFilters}
        >
          <div className="flex flex-col">
            <label className="mb-1 text-xs font-medium text-zinc-500">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="h-8 rounded-md border border-zinc-300 px-2 text-sm"
            >
              <option value="">All</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s.replace("_", " ")}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col">
            <label className="mb-1 text-xs font-medium text-zinc-500">
              Program
            </label>
            <select
              value={programId}
              onChange={(e) =>
                setProgramId(e.target.value ? Number(e.target.value) : "")
              }
              className="h-8 rounded-md border border-zinc-300 px-2 text-sm"
            >
              <option value="">All Programs</option>
              {data?.programs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.program_name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-1 min-w-[160px] flex-col">
            <label className="mb-1 text-xs font-medium text-zinc-500">
              Search
            </label>
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Name / email / program"
              className="h-8 rounded-md border border-zinc-300 px-2 text-sm"
            />
          </div>

          <button
            type="submit"
            className="inline-flex h-8 items-center rounded-md bg-zinc-900 px-3 text-sm font-medium text-white hover:bg-zinc-800"
          >
            Apply
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm text-sm">
        {loading && <p>Loading admissions...</p>}
        {error && !loading && (
          <p className="text-red-600">Error loading admissions: {error}</p>
        )}

        {!loading && !error && data && (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-left text-xs sm:text-sm">
                <thead className="border-b bg-zinc-50">
                  <tr className="text-zinc-500">
                    <th className="px-2 py-2">
                      <input
                        type="checkbox"
                        className="h-3 w-3 rounded border-zinc-300"
                        onChange={(e) => toggleAll(e.target.checked)}
                        checked={
                          !!data &&
                          data.rows.length > 0 &&
                          selectedIds.length === data.rows.length
                        }
                      />
                    </th>
                    <th className="px-2 py-2 text-right">#</th>
                    <th className="px-2 py-2">Applicant</th>
                    <th className="px-2 py-2">Email</th>
                    <th className="px-2 py-2">Program</th>
                    <th className="px-2 py-2 text-right">Aggregate</th>
                    <th className="px-2 py-2 text-right">Cutoff</th>
                    <th className="px-2 py-2">Status</th>
                    <th className="px-2 py-2">Reason</th>
                    <th className="px-2 py-2">Submitted</th>
                    <th className="px-2 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={11}
                        className="px-2 py-6 text-center text-zinc-500"
                      >
                        No applications
                      </td>
                    </tr>
                  ) : (
                    data.rows.map((a) => (
                      <tr key={a.id} className="border-b last:border-0">
                        <td className="px-2 py-2 align-middle">
                          <input
                            type="checkbox"
                            className="h-3 w-3 rounded border-zinc-300"
                            checked={selectedIds.includes(a.id)}
                            onChange={(e) =>
                              toggleOne(a.id, e.target.checked)
                            }
                          />
                        </td>
                        <td className="px-2 py-2 text-right align-middle text-zinc-500">
                          {a.id}
                        </td>
                        <td className="px-2 py-2 align-middle">
                          <Link
                            href={`/admin/admissions/${a.id}`}
                            className="text-sm font-medium text-zinc-900 hover:underline"
                          >
                            {a.first_name} {a.last_name}
                          </Link>
                        </td>
                        <td className="px-2 py-2 align-middle text-xs text-zinc-600">
                          {a.prospect_email}
                        </td>
                        <td className="px-2 py-2 align-middle text-xs text-zinc-600">
                          {a.program_name}
                        </td>
                        <td className="px-2 py-2 text-right align-middle">
                          {a.wasse_aggregate ?? ""}
                        </td>
                        <td className="px-2 py-2 text-right align-middle">
                          {a.cutoff_aggregate ?? ""}
                        </td>
                        <td className="px-2 py-2 align-middle">
                          <span className="inline-flex items-center rounded-full bg-zinc-800 px-2 py-0.5 text-xs font-medium text-white">
                            {a.status.replace("_", " ")}
                          </span>
                        </td>
                        <td className="px-2 py-2 align-middle text-xs text-zinc-600">
                          {a.decided_reason ?? ""}
                        </td>
                        <td className="px-2 py-2 align-middle text-xs text-zinc-600">
                          {formatDate(a.submitted_at)}
                        </td>
                        <td className="px-2 py-2 text-right align-middle space-x-1">
                          <button
                            type="button"
                            disabled={actionBusy}
                            onClick={() =>
                              performAction([a.id], "under_review")
                            }
                            className="inline-flex items-center rounded-md border border-zinc-300 px-2 py-0.5 text-[11px] text-zinc-700 hover:bg-zinc-100"
                          >
                            Review
                          </button>
                          <button
                            type="button"
                            disabled={actionBusy}
                            onClick={() =>
                              performAction(
                                [a.id],
                                "offer",
                                "Congratulations - Offer of Admission"
                              )
                            }
                            className="inline-flex items-center rounded-md border border-blue-200 px-2 py-0.5 text-[11px] text-blue-700 hover:bg-blue-50"
                          >
                            Offer
                          </button>
                          <button
                            type="button"
                            disabled={actionBusy}
                            onClick={() => performAction([a.id], "accept")}
                            className="inline-flex items-center rounded-md border border-emerald-200 px-2 py-0.5 text-[11px] text-emerald-700 hover:bg-emerald-50"
                          >
                            Accept
                          </button>
                          <button
                            type="button"
                            disabled={actionBusy}
                            onClick={() => performAction([a.id], "reject")}
                            className="inline-flex items-center rounded-md border border-red-200 px-2 py-0.5 text-[11px] text-red-700 hover:bg-red-50"
                          >
                            Reject
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-zinc-700">
              <select
                value={bulkAction}
                onChange={(e) => setBulkAction(e.target.value)}
                className="h-8 rounded-md border border-zinc-300 px-2 text-xs"
              >
                <option value="">Bulk action...</option>
                <option value="under_review">Mark Under Review</option>
                <option value="offer">Offer</option>
                <option value="accept">Accept</option>
                <option value="reject">Reject</option>
              </select>
              <input
                type="text"
                value={bulkOfferNotes}
                onChange={(e) => setBulkOfferNotes(e.target.value)}
                placeholder="Offer notes (optional)"
                className="h-8 w-48 rounded-md border border-zinc-300 px-2 text-xs"
              />
              <button
                type="button"
                disabled={
                  actionBusy || !bulkAction || selectedIds.length === 0
                }
                onClick={() =>
                  performAction(
                    selectedIds,
                    bulkAction as any,
                    bulkOfferNotes || undefined
                  )
                }
                className="inline-flex h-8 items-center rounded-md bg-zinc-900 px-3 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
              >
                Apply to selected
              </button>
              <span className="text-zinc-500">
                {selectedIds.length} selected
              </span>
            </div>

            {data.pages > 1 && (
              <div className="mt-3 flex items-center justify-between text-xs text-zinc-600">
                <div>
                  Showing {(data.page - 1) * PAGE_SIZE + 1}–
                  {Math.min(data.page * PAGE_SIZE, data.total)} of {data.total}
                </div>
                <div className="flex items-center gap-1">
                  {Array.from({ length: data.pages }, (_, i) => i + 1).map(
                    (p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => handlePageChange(p)}
                        className={`h-7 min-w-[2rem] rounded-md px-2 text-xs ${
                          p === data.page
                            ? "bg-zinc-900 text-white"
                            : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                        }`}
                      >
                        {p}
                      </button>
                    )
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </section>

      {credentialsModal && credentialsModal.length > 0 && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-lg">
            <h2 className="mb-3 text-lg font-semibold">Student Account Created</h2>
            <p className="mb-3 text-sm text-zinc-700">
              The following credentials were generated for accepted
              applications. Share these securely with the student. They will be
              prompted to change the password on first login.
            </p>
            <div className="max-h-60 space-y-3 overflow-y-auto text-sm">
              {credentialsModal.map((c) => (
                <div
                  key={c.appId}
                  className="rounded-md border border-zinc-200 bg-zinc-50 p-3"
                >
                  <div className="mb-1 text-xs text-zinc-500">
                    Application #{c.appId}
                  </div>
                  <div className="space-y-1">
                    <div>
                      <span className="font-medium">Email:</span>{" "}
                      <code className="rounded bg-white px-1 py-0.5 text-xs">
                        {c.email}
                      </code>
                    </div>
                    <div>
                      <span className="font-medium">Username:</span>{" "}
                      <code className="rounded bg-white px-1 py-0.5 text-xs">
                        {c.username}
                      </code>
                    </div>
                    <div>
                      <span className="font-medium">Temporary password:</span>{" "}
                      <code className="rounded bg-white px-1 py-0.5 text-xs">
                        {c.tempPassword}
                      </code>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setCredentialsModal(null)}
                className="inline-flex h-8 items-center rounded-md bg-zinc-900 px-3 text-xs font-medium text-white hover:bg-zinc-800"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
