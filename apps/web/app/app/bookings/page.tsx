"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";

type Client = { id: string; name: string; email: string };
type Staff = { id: string; name: string; role: string };
type Booking = {
  id: string;
  title: string;
  startAt: string;
  endAt: string;
  status: string;
  client: Client;
};

export default function BookingsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [rows, setRows] = useState<Booking[]>([]);
  const [clientId, setClientId] = useState("");
  const [staffId, setStaffId] = useState("");
  const [title, setTitle] = useState("Session");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [error, setError] = useState("");

  function load() {
    api<Booking[]>("/api/bookings").then(setRows).catch((e) => setError(e.message));
    api<Client[]>("/api/clients").then(setClients).catch(() => undefined);
    api<Staff[]>("/api/bookings/staff").then(setStaff).catch(() => undefined);
  }

  useEffect(() => {
    load();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await api("/api/bookings", {
        method: "POST",
        body: JSON.stringify({
          clientId,
          staffId: staffId || null,
          title,
          startAt: new Date(startAt).toISOString(),
          endAt: new Date(endAt).toISOString(),
        }),
      });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  }

  return (
    <div>
      <h1>Bookings</h1>
      <p className="muted">A booking is a session with a client, on the calendar, optionally assigned to a teammate.</p>
      {clients.length === 0 ? (
        <p className="card">
          You need a client before you can book a session.{" "}
          <Link href="/app/clients">Add a client first</Link>.
        </p>
      ) : (
      <form className="card" onSubmit={onSubmit}>
        <div className="row">
          <div>
            <label>Client</label>
            <select value={clientId} onChange={(e) => setClientId(e.target.value)} required>
              <option value="">Choose a client</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label>Staff</label>
            <select value={staffId} onChange={(e) => setStaffId(e.target.value)}>
              <option value="">Unassigned</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <label>Title</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} />
        <div className="row">
          <div>
            <label>Start</label>
            <input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} required />
          </div>
          <div>
            <label>End</label>
            <input type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} required />
          </div>
        </div>
        <p>
          <button className="btn" type="submit">
            Book session
          </button>
        </p>
      </form>
      )}
      {error ? <p className="error">{error}</p> : null}
      {rows.length === 0 ? (
        <p className="card muted">
          {clients.length === 0
            ? "Sessions will show up here after you add a client and book a time."
            : "No sessions yet. Pick a client and a start/end time above."}
        </p>
      ) : (
      <table className="table">
        <thead>
          <tr>
            <th>When</th>
            <th>Client</th>
            <th>Title</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((b) => (
            <tr key={b.id}>
              <td>{new Date(b.startAt).toLocaleString()}</td>
              <td>{b.client.name}</td>
              <td>{b.title}</td>
              <td>{b.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
      )}
    </div>
  );
}
