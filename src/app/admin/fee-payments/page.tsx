"use client";

import { useEffect, useState } from "react";
import { formatDate } from "@/lib/date-format";

type Payment = {
  id: number;
  student_id: string;
  student_name: string;
  amount: number;
  status: string;
  payment_date: string | null;
  created_at: string;
};

type PaymentsResponse = {
  payments: Payment[];
  total: number;
  totalAmount: number;
};

export default function FeePaymentsPage() {
  const [data, setData] = useState<PaymentsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("all");

  async function load(filterStatus = "all") {
    try {
      setLoading(true);
      setError(null);
      const url =
        filterStatus !== "all"
          ? `/api/admin/fee-payments?status=${filterStatus}`
          : "/api/admin/fee-payments";
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to load payments");
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Failed to load");
      setData(json.data as PaymentsResponse);
    } catch (err: any) {
      setError(err.message ?? "Unexpected error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(status);
  }, []);

  return (
    <div className="space-y-4">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Fee Payments</h1>
      </header>

      {error && <p className="text-sm text-red-600">Error: {error}</p>}

      <div className="rounded-lg border border-zinc-200 bg-white p-3">
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            load(e.target.value);
          }}
          className="h-8 rounded-md border border-zinc-300 px-2 text-sm"
        >
          <option value="all">All Payments</option>
          <option value="pending">Pending</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-zinc-200 bg-white p-4">
          <p className="text-xs text-zinc-500 mb-1">Total Payments</p>
          <p className="text-2xl font-semibold">{data?.total ?? 0}</p>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white p-4">
          <p className="text-xs text-zinc-500 mb-1">Total Amount</p>
          <p className="text-2xl font-semibold">GH₵ {(data?.totalAmount ?? 0).toLocaleString()}</p>
        </div>
      </div>

      <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-zinc-800">Payments</h2>
        {loading && <p className="text-xs text-zinc-500">Loading...</p>}
        {!loading && (!data || data.payments.length === 0) && (
          <p className="text-xs text-zinc-500">No payments found.</p>
        )}
        {!loading && data && data.payments.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-left text-xs sm:text-sm">
              <thead className="border-b bg-zinc-50">
                <tr className="text-zinc-500">
                  <th className="px-2 py-2">Student</th>
                  <th className="px-2 py-2">Amount</th>
                  <th className="px-2 py-2">Status</th>
                  <th className="px-2 py-2">Payment Date</th>
                </tr>
              </thead>
              <tbody>
                {data.payments.map((p) => (
                  <tr key={p.id} className="border-b last:border-0">
                    <td className="px-2 py-2">
                      <div className="font-medium">{p.student_name}</div>
                      <div className="text-xs text-zinc-500">{p.student_id}</div>
                    </td>
                    <td className="px-2 py-2">GH₵ {p.amount.toLocaleString()}</td>
                    <td className="px-2 py-2">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          p.status === "completed"
                            ? "bg-green-100 text-green-700"
                            : p.status === "pending"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="px-2 py-2 text-xs text-zinc-600">
                      {p.payment_date ? formatDate(p.payment_date) : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
