"use client";

import { useEffect, useState } from "react";

const STATUS_OPTIONS = [
  "applied",
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

type YearOption = {
  yr: number;
};

type CountsByStatus = Record<Status | string, number>;

type MonthlyRow = {
  period: string;
  submitted: number;
  accepted: number;
};

type ProgramBreakdownRow = {
  program_name: string;
  total: number;
  accepted: number;
};

type AdmissionsAnalyticsResponse = {
  filters: {
    programId: number;
    year: number;
    status: string;
  };
  countsByStatus: CountsByStatus;
  totalApplications: number;
  conversions: {
    review_rate: number | null;
    offer_rate: number | null;
    accept_rate: number | null;
  };
  monthlyTrend: MonthlyRow[];
  programBreakdown: ProgramBreakdownRow[];
  programs: ProgramOption[];
  years: YearOption[];
};

export default function AdmissionsAnalyticsPage() {
  const [programId, setProgramId] = useState<number | "">("");
  const [year, setYear] = useState<number | "">("");
  const [status, setStatus] = useState<string>("");

  const [data, setData] = useState<AdmissionsAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadAnalytics() {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (programId) params.set("programId", String(programId));
      if (year) params.set("year", String(year));
      if (status) params.set("status", status);

      const res = await fetch(`/api/admin/analytics/admissions?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load admissions analytics");
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Failed to load");
      setData(json.data as AdmissionsAnalyticsResponse);
    } catch (err: any) {
      setError(err.message ?? "Unexpected error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleApply(e: React.FormEvent) {
    e.preventDefault();
    loadAnalytics();
  }

  const counts = data?.countsByStatus ?? {};
  const total = data?.totalApplications ?? 0;
  const conv = data?.conversions;

  return (
    <div className="space-y-4">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Admissions Analytics
          </h1>
          <p className="text-sm text-zinc-600">
            Monitor application volume, conversion, and program demand.
          </p>
        </div>
      </header>

      <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <form
          className="grid gap-3 text-sm md:grid-cols-4 md:items-end"
          onSubmit={handleApply}
        >
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

          <div className="flex flex-col">
            <label className="mb-1 text-xs font-medium text-zinc-500">
              Submitted Year
            </label>
            <select
              value={year}
              onChange={(e) =>
                setYear(e.target.value ? Number(e.target.value) : "")
              }
              className="h-8 rounded-md border border-zinc-300 px-2 text-sm"
            >
              <option value="">All Years</option>
              {data?.years.map((y) => (
                <option key={y.yr} value={y.yr}>
                  {y.yr}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col">
            <label className="mb-1 text-xs font-medium text-zinc-500">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="h-8 rounded-md border border-zinc-300 px-2 text-sm"
            >
              <option value="">All Statuses</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s.replace("_", " ")}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              className="inline-flex h-8 items-center rounded-md bg-zinc-900 px-3 text-sm font-medium text-white hover:bg-zinc-800"
            >
              Apply
            </button>
          </div>
        </form>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="text-xs text-zinc-500">Total Applications</div>
          <div className="mt-1 text-2xl font-semibold text-zinc-900">
            {total}
          </div>
          <div className="mt-1 text-xs text-zinc-500">
            Across chosen filters
          </div>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="text-xs text-zinc-500">Offer Conversion</div>
          <div className="mt-1 text-2xl font-semibold text-zinc-900">
            {conv?.offer_rate != null ? `${conv.offer_rate}%` : "N/A"}
          </div>
          <div className="mt-1 text-xs text-zinc-500">
            Offers / total applications
          </div>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="text-xs text-zinc-500">Acceptance Rate</div>
          <div className="mt-1 text-2xl font-semibold text-emerald-600">
            {conv?.accept_rate != null ? `${conv.accept_rate}%` : "N/A"}
          </div>
          <div className="mt-1 text-xs text-zinc-500">
            Accepted / total applications
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm text-sm">
        <h2 className="mb-3 text-sm font-semibold text-zinc-800">
          Status Breakdown
        </h2>
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-left text-xs sm:text-sm">
            <thead className="border-b bg-zinc-50">
              <tr className="text-zinc-500">
                <th className="px-2 py-2">Status</th>
                <th className="px-2 py-2 text-right">Count</th>
              </tr>
            </thead>
            <tbody>
              {STATUS_OPTIONS.map((s) => (
                <tr key={s} className="border-b last:border-0">
                  <td className="px-2 py-2 capitalize">
                    {s.replace("_", " ")}
                  </td>
                  <td className="px-2 py-2 text-right">
                    {counts[s] ?? 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm text-sm">
        <h2 className="mb-3 text-sm font-semibold text-zinc-800">
          Monthly Trend (Last 12 Periods)
        </h2>
        {!data || data.monthlyTrend.length === 0 ? (
          <p className="text-xs text-zinc-500">
            No application data for the selected filters.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-left text-xs sm:text-sm">
              <thead className="border-b bg-zinc-50">
                <tr className="text-zinc-500">
                  <th className="px-2 py-2">Period</th>
                  <th className="px-2 py-2 text-right">Submitted</th>
                  <th className="px-2 py-2 text-right">Accepted</th>
                </tr>
              </thead>
              <tbody>
                {data.monthlyTrend.map((row) => (
                  <tr key={row.period} className="border-b last:border-0">
                    <td className="px-2 py-2">{row.period}</td>
                    <td className="px-2 py-2 text-right">{row.submitted}</td>
                    <td className="px-2 py-2 text-right text-emerald-600">
                      {row.accepted}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm text-sm">
        <h2 className="mb-3 text-sm font-semibold text-zinc-800">
          Program Demand
        </h2>
        {!data || data.programBreakdown.length === 0 ? (
          <p className="text-xs text-zinc-500">
            No application data for the selected filters.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-left text-xs sm:text-sm">
              <thead className="border-b bg-zinc-50">
                <tr className="text-zinc-500">
                  <th className="px-2 py-2">Program</th>
                  <th className="px-2 py-2 text-right">Applications</th>
                  <th className="px-2 py-2 text-right">Accepted</th>
                  <th className="px-2 py-2 text-right">Acceptance %</th>
                </tr>
              </thead>
              <tbody>
                {data.programBreakdown.map((row) => {
                  const totalRow = row.total || 0;
                  const acceptPercent =
                    totalRow > 0
                      ? Number(((row.accepted / totalRow) * 100).toFixed(1))
                      : null;
                  return (
                    <tr key={row.program_name} className="border-b last:border-0">
                      <td className="px-2 py-2">{row.program_name}</td>
                      <td className="px-2 py-2 text-right">{row.total}</td>
                      <td className="px-2 py-2 text-right text-emerald-600">
                        {row.accepted}
                      </td>
                      <td className="px-2 py-2 text-right">
                        {acceptPercent != null ? `${acceptPercent}%` : "N/A"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {loading && (
        <p className="text-xs text-zinc-500">Refreshing analytics...</p>
      )}
      {error && !loading && (
        <p className="text-xs text-red-600">Error: {error}</p>
      )}
    </div>
  );
}
