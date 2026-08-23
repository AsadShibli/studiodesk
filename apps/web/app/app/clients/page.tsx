"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type Client = { id: string; name: string; email: string; notes: string | null };

export default function ClientsPage() {
  const [rows, setRows] = useState<Client[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  function load() {
    api<Client[]>("/api/clients").then(setRows).catch((e) => setError(e.message));
  }

  useEffect(() => {
    load();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await api("/api/clients", {
        method: "POST",
        body: JSON.stringify({ name, email, notes }),
      });
      setName("");
      setEmail("");
      setNotes("");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  }

  return (
    <div>
      <h1>Clients</h1>
      <p className="muted">
        People this studio works with — names and emails. They do not get a login unless you invite them later.
      </p>
      <form className="card row" onSubmit={onSubmit}>
        <div>
          <label>Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Jordan Lee" required />
        </div>
        <div>
          <label>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jordan@example.com" required />
        </div>
        <div>
          <label>Notes</label>
          <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
        </div>
        <button className="btn" type="submit">
          Add client
        </button>
      </form>
      {error ? <p className="error">{error}</p> : null}
      {rows.length === 0 ? (
        <p className="card muted">No clients yet. Add someone you work with using the form above.</p>
      ) : (
      <table className="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((c) => (
            <tr key={c.id}>
              <td>{c.name}</td>
              <td>{c.email}</td>
              <td>{c.notes}</td>
            </tr>
          ))}
        </tbody>
      </table>
      )}
    </div>
  );
}
