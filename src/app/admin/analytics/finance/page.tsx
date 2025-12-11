"use client";

import { useEffect, useState } from "react";

type FinanceData = {
  totalRevenue: number;
  pendingPayments: number;
  completedPayments: number;
  paymentsByStatus: { status: string; count: number }[];
  recentPayments: any[];
};

export default function FinanceAnalyticsPage() {
  const [data, setData] = useState<FinanceData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch("/api/admin/analytics/finance");
        if (!res.ok) throw new Error("Failed to load analytics");
        const json = await res.json();
        if (!json.success) throw new Error(json.error ?? "Failed to load");
        setData(json.data as FinanceData);
      } catch (err: any) {
        setError(err.message ?? "Unexpected error");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="space-y-4">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Finance Analytics</h1>
      </header>

      {error && <p className="text-sm text-red-600">Error: {error}</p>}

      {loading && <p className="text-sm text-zinc-500">Loading...</p>}

      {data && !loading && (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-zinc-200 bg-white p-4">
              <p className="text-xs text-zinc-500 mb-1">Total Revenue</p>
              <p className="text-2xl font-semibold">GH₵ {data.totalRevenue.toLocaleString()}</p>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-white p-4">
              <p className="text-xs text-zinc-500 mb-1">Pending Payments</p>
              <p className="text-2xl font-semibold">{data.pendingPayments}</p>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-white p-4">
              <p className="text-xs text-zinc-500 mb-1">Completed Payments</p>
              <p className="text-2xl font-semibold">{data.completedPayments}</p>
            </div>
          </div>

          <section className="rounded-xl border border-zinc-200 bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold">Payments by Status</h2>
            <div className="space-y-2">
              {data.paymentsByStatus.length === 0 ? (
                <p className="text-xs text-zinc-500">No payment data available</p>
              ) : (
                data.paymentsByStatus.map((item) => (
                  <div key={item.status} className="flex justify-between text-sm">
                    <span>{item.status}</span>
                    <span className="font-medium">{item.count}</span>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
