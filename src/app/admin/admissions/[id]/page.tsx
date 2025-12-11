"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { formatDate } from "@/lib/date-format";

type ApplicationDetail = {
  id: number;
  prospect_email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  program_id: number;
  program_name: string;
  wasse_aggregate: number | null;
  cutoff_aggregate: number | null;
  status: string;
  submitted_at: string;
  decided_at: string | null;
  decided_reason: string | null;
  offer_notes: string | null;
};

type ApplicationNote = {
  id: number;
  created_at: string;
  note: string;
};

export default function AdmissionDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = Number(params.id);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [app, setApp] = useState<ApplicationDetail | null>(null);
  const [notes, setNotes] = useState<ApplicationNote[]>([]);
  const [noteInput, setNoteInput] = useState("");
  const [actionBusy, setActionBusy] = useState(false);

  useEffect(() => {
    if (!id || Number.isNaN(id)) return;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/admin/admissions/${id}`);
        if (!res.ok) throw new Error("Failed to load application");
        const json = await res.json();
        if (!json.success) throw new Error(json.error ?? "Failed to load");
        setApp(json.data.application as ApplicationDetail);
        setNotes(json.data.notes as ApplicationNote[]);
      } catch (err: any) {
        setError(err.message ?? "Unexpected error");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  async function performAction(
    action: "under_review" | "offer" | "accept" | "reject",
    offerNotes?: string
  ) {
    if (!app) return;
    try {
      setActionBusy(true);
      const res = await fetch("/api/admin/admissions/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: [app.id],
          action,
          offerNotes: offerNotes ?? undefined,
        }),
      });
      if (!res.ok) throw new Error("Action failed");
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Action failed");

      // Refresh detail
      const detailRes = await fetch(`/api/admin/admissions/${app.id}`);
      if (detailRes.ok) {
        const detailJson = await detailRes.json();
        if (detailJson.success) {
          setApp(detailJson.data.application as ApplicationDetail);
          setNotes(detailJson.data.notes as ApplicationNote[]);
        }
      }
    } catch (err: any) {
      setError(err.message ?? "Unexpected error");
    } finally {
      setActionBusy(false);
    }
  }

  async function handleAddNote(e: React.FormEvent) {
    e.preventDefault();
    if (!app) return;
    const trimmed = noteInput.trim();
    if (!trimmed) return;
    try {
      const res = await fetch(`/api/admin/admissions/${app.id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: trimmed }),
      });
      if (!res.ok) throw new Error("Failed to add note");
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Failed to add note");
      setNoteInput("");
      // Reload notes
      const detailRes = await fetch(`/api/admin/admissions/${app.id}`);
      if (detailRes.ok) {
        const detailJson = await detailRes.json();
        if (detailJson.success) {
          setApp(detailJson.data.application as ApplicationDetail);
          setNotes(detailJson.data.notes as ApplicationNote[]);
        }
      }
    } catch (err: any) {
      setError(err.message ?? "Unexpected error");
    }
  }

  if (!id || Number.isNaN(id)) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">Application</h1>
        <p className="text-sm text-red-600">Invalid application id.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">
          Application #{id}
        </h1>
        <button
          type="button"
          onClick={() => router.push("/admin/admissions")}
          className="inline-flex h-8 items-center rounded-md border border-zinc-300 px-3 text-xs font-medium text-zinc-700 hover:bg-zinc-100"
        >
          Back to list
        </button>
      </header>

      {loading && <p className="text-sm text-zinc-600">Loading...</p>}
      {error && !loading && (
        <p className="text-sm text-red-600">Error: {error}</p>
      )}

      {!loading && !error && app && (
        <>
          <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm text-sm">
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <h2 className="mb-2 text-sm font-semibold text-zinc-800">
                  Applicant
                </h2>
                <dl className="space-y-1 text-sm">
                  <div className="flex">
                    <dt className="w-28 text-zinc-500">Name</dt>
                    <dd className="flex-1 text-zinc-900">
                      {app.first_name} {app.last_name}
                    </dd>
                  </div>
                  <div className="flex">
                    <dt className="w-28 text-zinc-500">Email</dt>
                    <dd className="flex-1 text-zinc-900">
                      {app.prospect_email}
                    </dd>
                  </div>
                  <div className="flex">
                    <dt className="w-28 text-zinc-500">Phone</dt>
                    <dd className="flex-1 text-zinc-900">
                      {app.phone || ""}
                    </dd>
                  </div>
                </dl>
              </div>

              <div>
                <h2 className="mb-2 text-sm font-semibold text-zinc-800">
                  Program
                </h2>
                <dl className="space-y-1 text-sm">
                  <div className="flex">
                    <dt className="w-28 text-zinc-500">Program</dt>
                    <dd className="flex-1 text-zinc-900">{app.program_name}</dd>
                  </div>
                  <div className="flex">
                    <dt className="w-28 text-zinc-500">Aggregate</dt>
                    <dd className="flex-1 text-zinc-900">
                      {app.wasse_aggregate ?? ""}
                    </dd>
                  </div>
                  <div className="flex">
                    <dt className="w-28 text-zinc-500">Cutoff</dt>
                    <dd className="flex-1 text-zinc-900">
                      {app.cutoff_aggregate ?? ""}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>

            <hr className="my-4" />

            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <h2 className="mb-2 text-sm font-semibold text-zinc-800">
                  Status
                </h2>
                <dl className="space-y-1 text-sm">
                  <div className="flex">
                    <dt className="w-28 text-zinc-500">Current</dt>
                    <dd className="flex-1">
                      <span className="inline-flex items-center rounded-full bg-zinc-800 px-2 py-0.5 text-xs font-medium text-white">
                        {app.status.replace("_", " ")}
                      </span>
                    </dd>
                  </div>
                  <div className="flex">
                    <dt className="w-28 text-zinc-500">Submitted</dt>
                    <dd className="flex-1 text-zinc-900">{formatDate(app.submitted_at)}</dd>
                  </div>
                  <div className="flex">
                    <dt className="w-28 text-zinc-500">Decided</dt>
                    <dd className="flex-1 text-zinc-900">
                      {app.decided_at ? formatDate(app.decided_at) : ""}
                    </dd>
                  </div>
                  <div className="flex">
                    <dt className="w-28 text-zinc-500">Reason</dt>
                    <dd className="flex-1 text-zinc-900">
                      {app.decided_reason || ""}
                    </dd>
                  </div>
                </dl>
              </div>

              <div>
                <h2 className="mb-2 text-sm font-semibold text-zinc-800">
                  Actions
                </h2>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={actionBusy}
                    onClick={() => performAction("under_review")}
                    className="inline-flex items-center rounded-md border border-zinc-300 px-3 py-1 text-xs text-zinc-700 hover:bg-zinc-100 disabled:opacity-50"
                  >
                    Mark Under Review
                  </button>
                  <button
                    type="button"
                    disabled={actionBusy}
                    onClick={() =>
                      performAction(
                        "offer",
                        "Congratulations - Offer of Admission"
                      )
                    }
                    className="inline-flex items-center rounded-md border border-blue-200 px-3 py-1 text-xs text-blue-700 hover:bg-blue-50 disabled:opacity-50"
                  >
                    Offer
                  </button>
                  <button
                    type="button"
                    disabled={actionBusy}
                    onClick={() => performAction("accept")}
                    className="inline-flex items-center rounded-md border border-emerald-200 px-3 py-1 text-xs text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                  >
                    Accept
                  </button>
                  <button
                    type="button"
                    disabled={actionBusy}
                    onClick={() => performAction("reject")}
                    className="inline-flex items-center rounded-md border border-red-200 px-3 py-1 text-xs text-red-700 hover:bg-red-50 disabled:opacity-50"
                  >
                    Reject
                  </button>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm text-sm">
            <h2 className="mb-3 text-sm font-semibold text-zinc-800">
              Internal Notes
            </h2>
            <form onSubmit={handleAddNote} className="mb-3 flex gap-2">
              <input
                type="text"
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                placeholder="Add a note..."
                className="h-9 flex-1 rounded-md border border-zinc-300 px-2 text-sm"
              />
              <button
                type="submit"
                className="inline-flex h-9 items-center rounded-md bg-zinc-900 px-3 text-xs font-medium text-white hover:bg-zinc-800"
              >
                Add
              </button>
            </form>
            {notes.length === 0 ? (
              <p className="text-xs text-zinc-500">No notes yet.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {notes.map((n) => (
                  <li
                    key={n.id}
                    className="rounded-md border border-zinc-200 bg-zinc-50 p-2"
                  >
                    <div className="mb-1 text-[11px] text-zinc-500">
                      {formatDate(n.created_at)}
                    </div>
                    <div>{n.note}</div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
