"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";

type Client = { id: string; name: string };
type Invoice = {
  id: string;
  amountCents: number;
  currency: string;
  status: string;
  client: Client;
};

export default function InvoicesPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [rows, setRows] = useState<Invoice[]>([]);
  const [clientId, setClientId] = useState("");
  const [amount, setAmount] = useState("120");
  const [error, setError] = useState("");

  function load() {
    api<Invoice[]>("/api/invoices").then(setRows).catch((e) => setError(e.message));
    api<Client[]>("/api/clients").then(setClients).catch(() => undefined);
  }

  useEffect(() => {
    load();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await api("/api/invoices", {
        method: "POST",
        body: JSON.stringify({
          clientId,
          amountCents: Math.round(Number(amount) * 100),
        }),
      });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  }

  async function pay(id: string) {
    const result = await api<{ url: string | null; simulated?: boolean }>(`/api/invoices/${id}/pay`, {
      method: "POST",
    });
    if (result.url) window.location.href = result.url;
    else load();
  }

  return (
    <div>
      <h1>Invoices</h1>
      <p className="muted">
        Send a bill to a client. This page only appears when invoicing is turned on for the studio (Pro plan, or an owner override).
      </p>
      {clients.length === 0 ? (
        <p className="card">
          You need a client before you can invoice.{" "}
          <Link href="/app/clients">Add a client first</Link>.
        </p>
      ) : (
      <form className="card row" onSubmit={onSubmit}>
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
          <label>Amount (USD)</label>
          <input value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <button className="btn" type="submit">
          Create invoice
        </button>
      </form>
      )}
      {error ? <p className="error">{error}</p> : null}
      {rows.length === 0 ? (
        <p className="card muted">
          No invoices yet. Choose a client and an amount above when you are ready to bill them.
        </p>
      ) : (
      <table className="table">
        <thead>
          <tr>
            <th>Client</th>
            <th>Amount</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((inv) => (
            <tr key={inv.id}>
              <td>{inv.client.name}</td>
              <td>
                {(inv.amountCents / 100).toFixed(2)} {inv.currency.toUpperCase()}
              </td>
              <td>{inv.status}</td>
              <td>
                {inv.status !== "paid" ? (
                  <button className="btn secondary" type="button" onClick={() => pay(inv.id)}>
                    Collect payment
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
