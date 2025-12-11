"use client";

import { useEffect, useState } from "react";

type Level = {
  id: number;
  level_name: string;
  level_order: number;
};

type LevelsResponse = {
  levels: Level[];
};

export default function CatalogLevelsPage() {
  const [data, setData] = useState<LevelsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editId, setEditId] = useState<number | null>(null);
  const [levelName, setLevelName] = useState("");
  const [levelOrder, setLevelOrder] = useState<number | "">(0);
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/admin/catalog/levels");
      if (!res.ok) throw new Error("Failed to load levels");
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Failed to load");
      setData(json.data as LevelsResponse);
    } catch (err: any) {
      setError(err.message ?? "Unexpected error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function startCreate() {
    setEditId(null);
    setLevelName("");
    setLevelOrder(0);
  }

  function startEdit(l: Level) {
    setEditId(l.id);
    setLevelName(l.level_name);
    setLevelOrder(l.level_order);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      const res = await fetch("/api/admin/catalog/levels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: editId ? "update" : "create",
          id: editId ?? undefined,
          level_name: levelName,
          level_order: levelOrder ? Number(levelOrder) : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error ?? "Failed to save level");
      }
      await load();
      if (!editId) {
        startCreate();
      }
    } catch (err: any) {
      setError(err.message ?? "Unexpected error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this level?")) return;
    try {
      setSaving(true);
      setError(null);
      const res = await fetch("/api/admin/catalog/levels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error ?? "Failed to delete level");
      }
      if (editId === id) {
        startCreate();
      }
      await load();
    } catch (err: any) {
      setError(err.message ?? "Unexpected error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">
          Manage Levels
        </h1>
      </header>

      {error && (
        <p className="text-sm text-red-600">Error: {error}</p>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-zinc-800">
            {editId ? "Edit Level" : "Create Level"}
          </h2>
          <form onSubmit={handleSubmit} className="grid gap-3 text-sm">
            <div className="flex flex-col">
              <label className="mb-1 text-xs font-medium text-zinc-500">
                Level Name
              </label>
              <input
                type="text"
                value={levelName}
                onChange={(e) => setLevelName(e.target.value)}
                placeholder="e.g., Year 1"
                required
                className="h-8 rounded-md border border-zinc-300 px-2 text-sm"
              />
            </div>
            <div className="flex flex-col">
              <label className="mb-1 text-xs font-medium text-zinc-500">
                Order
              </label>
              <input
                type="number"
                min={1}
                value={levelOrder}
                onChange={(e) =>
                  setLevelOrder(e.target.value ? Number(e.target.value) : "")
                }
                required
                className="h-8 rounded-md border border-zinc-300 px-2 text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex h-8 items-center rounded-md bg-zinc-900 px-3 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
              >
                {editId ? "Update" : "Create"}
              </button>
              {editId && (
                <button
                  type="button"
                  onClick={startCreate}
                  className="inline-flex h-8 items-center rounded-md border border-zinc-300 px-3 text-xs font-medium text-zinc-700 hover:bg-zinc-100"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm text-sm">
          <h2 className="mb-3 text-sm font-semibold text-zinc-800">
            Levels
          </h2>
          {loading && <p className="text-xs text-zinc-500">Loading...</p>}
          {!loading && (!data || data.levels.length === 0) && (
            <p className="text-xs text-zinc-500">No levels yet.</p>
          )}
          {!loading && data && data.levels.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-left text-xs sm:text-sm">
                <thead className="border-b bg-zinc-50">
                  <tr className="text-zinc-500">
                    <th className="px-2 py-2">Order</th>
                    <th className="px-2 py-2">Name</th>
                    <th className="px-2 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.levels.map((l) => (
                    <tr key={l.id} className="border-b last:border-0">
                      <td className="px-2 py-2">{l.level_order}</td>
                      <td className="px-2 py-2">{l.level_name}</td>
                      <td className="px-2 py-2 text-right space-x-1">
                        <button
                          type="button"
                          onClick={() => startEdit(l)}
                          className="inline-flex items-center rounded-md border border-zinc-300 px-2 py-0.5 text-[11px] text-zinc-700 hover:bg-zinc-100"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(l.id)}
                          className="inline-flex items-center rounded-md border border-red-200 px-2 py-0.5 text-[11px] text-red-700 hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
