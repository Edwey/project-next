"use client";

import { useEffect, useState } from "react";

type FeePayment = {
  id: number;
  amount: number;
  payment_date: string;
  status: string;
  scholarship_amount: number | null;
  notes: string | null;
  semester_name: string;
  year_name: string;
};

export default function StudentFeeStatementPage() {
  const [student, setStudent] = useState<{
    student_id: string;
    dept_name: string;
    level_name: string;
  } | null>(null);
  const [feeSummary, setFeeSummary] = useState<{
    total_paid: number;
    total_pending: number;
  } | null>(null);
  const [feePayments, setFeePayments] = useState<FeePayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch("/api/student/fee-statement");
        const json = await res.json();
        if (!json.success) {
          setError(json.error || "Failed to load fee statement");
          return;
        }
        setFeeSummary(json.data.feeSummary);
        setFeePayments(json.data.feePayments || []);
      } catch (err: any) {
        setError(err.message || "Unexpected error");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function formatCurrency(amount: number): string {
    return `$${amount.toFixed(2)}`;
  }

  function getStatusBadge(status: string) {
    const badges: Record<string, { bg: string; text: string }> = {
      paid: { bg: "bg-green-100", text: "text-green-700" },
      pending: { bg: "bg-yellow-100", text: "text-yellow-700" },
      overdue: { bg: "bg-red-100", text: "text-red-700" },
    };
    const badge = badges[status] || { bg: "bg-zinc-100", text: "text-zinc-700" };
    return (
      <span
        className={`inline-block px-2 py-1 rounded text-xs font-medium ${badge.bg} ${badge.text}`}
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-zinc-200 bg-white p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">Fee Statement</h1>
            {student && (
              <p className="text-zinc-600">
                Student ID: <strong>{student.student_id}</strong> · {student.dept_name} ·{" "}
                {student.level_name}
              </p>
            )}
          </div>
        </div>
      </div>

      {loading && <p className="text-sm text-zinc-500">Loading fee statement...</p>}
      {error && <p className="text-sm text-red-600">Error: {error}</p>}

      {!loading && !error && feeSummary && (
        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-1">
            <div className="rounded-lg border border-zinc-200 bg-white p-6 text-center">
              <h2 className="text-lg font-semibold mb-4">Totals</h2>
              <div className="mb-4">
                <div className="text-2xl font-bold text-green-600 mb-1">
                  {formatCurrency(feeSummary.total_paid)}
                </div>
                <div className="text-sm text-zinc-600">Total Paid</div>
              </div>
              <div>
                <div className="text-xl font-bold text-yellow-600 mb-1">
                  {formatCurrency(feeSummary.total_pending)}
                </div>
                <div className="text-sm text-zinc-600">Pending Balance</div>
              </div>
            </div>
          </div>

          <div className="md:col-span-2">
            <div className="rounded-lg border border-zinc-200 bg-white p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Payments History</h2>
                <span className="inline-block px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                  {feePayments.length} records
                </span>
              </div>
              {feePayments.length === 0 ? (
                <p className="text-sm text-zinc-500">No fee payments have been recorded yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-zinc-50">
                      <tr>
                        <th className="px-4 py-2 text-left">Academic Period</th>
                        <th className="px-4 py-2 text-center">Status</th>
                        <th className="px-4 py-2 text-right">Amount</th>
                        <th className="px-4 py-2 text-left">Payment Date</th>
                        <th className="px-4 py-2 text-right">Scholarship</th>
                        <th className="px-4 py-2 text-left">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {feePayments.map((payment) => (
                        <tr key={payment.id} className="border-t">
                          <td className="px-4 py-2">
                            {payment.semester_name} {payment.year_name}
                          </td>
                          <td className="px-4 py-2 text-center">{getStatusBadge(payment.status)}</td>
                          <td className="px-4 py-2 text-right font-medium">
                            {formatCurrency(payment.amount)}
                          </td>
                          <td className="px-4 py-2">
                            {new Date(payment.payment_date).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-2 text-right">
                            {payment.scholarship_amount
                              ? formatCurrency(payment.scholarship_amount)
                              : "-"}
                          </td>
                          <td className="px-4 py-2 text-xs text-zinc-500">
                            {payment.notes || "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

