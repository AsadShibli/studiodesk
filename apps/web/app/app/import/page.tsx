"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type Row = { id: string; line: number; payload: unknown; error: string | null };
type Batch = {
  id: string;
  status: string;
  createdAt: string;
  rows?: Row[];
};

const SAMPLE = `name,email,notes,booking_start,booking_end,booking_title
Jordan Lee,jordan@example.com,From Calendly export,2026-09-01T14:00:00.000Z,2026-09-01T15:00:00.000Z,Follow-up
Bad Row,not-an-email,Should fail dry-run,,,
Priya Shah,priya@example.com,VIP client,,,
`;

const STATUS_LABEL: Record<string, string> = {
  dry_run: "Checked — not saved yet",
  committed: "Saved to this studio",
  rolled_back: "Undone",
};

export default function ImportPage() {
  const [csv, setCsv] = useState(SAMPLE);
  const [batch, setBatch] = useState<Batch | null>(null);
  const [history, setHistory] = useState<Batch[]>([]);
  const [error, setError] = useState("");

  function loadHistory() {
    api<Batch[]>("/api/imports").then(setHistory).catch((e) => setError(e.message));
  }

  useEffect(() => {
    loadHistory();
  }, []);

  async function dryRun(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const created = await api<Batch>("/api/imports/dry-run", {
        method: "POST",
        body: JSON.stringify({ csv }),
      });
      setBatch(created);
      loadHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  }

  async function commit() {
    if (!batch) return;
    const updated = await api<Batch>(`/api/imports/${batch.id}/commit`, { method: "POST" });
    setBatch(updated);
    loadHistory();
  }

  async function rollback(id: string) {
    await api(`/api/imports/${id}/rollback`, { method: "POST" });
    loadHistory();
  }

  return (
    <div>
      <h1>Import a list</h1>
      <p className="muted">
        Paste a spreadsheet export (CSV). First we check every row. Then you can save the good ones, or undo a save.
      </p>
      <form className="card" onSubmit={dryRun}>
        <label>Paste CSV</label>
        <textarea rows={8} value={csv} onChange={(e) => setCsv(e.target.value)} />
        <p className="muted">Need a starting point? The box already has a sample, including one bad row so you can see a check fail.</p>
        <p>
          <button className="btn" type="submit">
            Check rows
          </button>
        </p>
      </form>
      {error ? <p className="error">{error}</p> : null}
      {batch?.rows ? (
        <div className="card">
          <h2>Check results</h2>
          <p className="muted">Rows with an error will be skipped if you save.</p>
          <table className="table">
            <thead>
              <tr>
                <th>Line</th>
                <th>What we read</th>
                <th>Problem</th>
              </tr>
            </thead>
            <tbody>
              {batch.rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.line}</td>
                  <td>
                    <code>{JSON.stringify(r.payload)}</code>
                  </td>
                  <td className="error">{r.error}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {batch.status === "dry_run" ? (
            <button className="btn" type="button" onClick={commit}>
              Save valid rows
            </button>
          ) : (
            <p>{STATUS_LABEL[batch.status] ?? batch.status}</p>
          )}
        </div>
      ) : null}
      <h2>Past imports</h2>
      {history.length === 0 ? (
        <p className="card muted">No imports yet. Check a CSV above to start.</p>
      ) : (
      <table className="table">
        <thead>
          <tr>
            <th>When</th>
            <th>What happened</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {history.map((b) => (
            <tr key={b.id}>
              <td>{new Date(b.createdAt).toLocaleString()}</td>
              <td>{STATUS_LABEL[b.status] ?? b.status}</td>
              <td>
                {b.status === "committed" ? (
                  <button className="btn danger" type="button" onClick={() => rollback(b.id)}>
                    Undo this import
                  </button>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      )}
    </div>
  );
}
