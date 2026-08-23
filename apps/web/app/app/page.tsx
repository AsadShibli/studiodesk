"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, type Me } from "@/lib/api";

const ROLE_COPY: Record<string, string> = {
  owner: "You run this studio — clients, bookings, billing, and teammates.",
  manager: "You can manage clients, bookings, and invoices. Billing stays with the owner.",
  staff: "You see the sessions assigned to you.",
  client: "You can see your own sessions and invoices.",
};

export default function DashboardPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [name, setName] = useState("");

  useEffect(() => {
    api<Me>("/api/me").then(setMe);
  }, []);

  async function createOrg(e: React.FormEvent) {
    e.preventDefault();
    await api("/api/orgs", { method: "POST", body: JSON.stringify({ name }) });
    window.location.reload();
  }

  if (!me) return <p className="muted">Loading your studio…</p>;
  if (!me.org) {
    return (
      <form className="card" onSubmit={createOrg}>
        <h1>Name your studio</h1>
        <p className="muted">This is the workspace for your clients and bookings. You can add teammates later.</p>
        <label>Studio name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Northshore Studio" required />
        <p>
          <button className="btn" type="submit">
            Create studio
          </button>
        </p>
      </form>
    );
  }

  const role = me.role ?? "owner";

  return (
    <div>
      <p className="muted">Welcome back, {me.user.name}</p>
      <h1>{me.org.name}</h1>
      <p>
        StudioDesk is where this studio keeps <strong>people you work with</strong>,{" "}
        <strong>sessions on the calendar</strong>, and (on the Pro plan) <strong>invoices</strong>.
      </p>
      <p className="muted">
        {ROLE_COPY[role]} This studio is on the{" "}
        <span className={`badge ${me.org.plan}`}>{me.org.plan}</span> plan.
      </p>
      <div className="card">
        <h2>What do you want to do?</h2>
        <p className="muted">You do not need to use every page. Start with one action.</p>
        <p className="row">
          {me.permissions.includes("client:write") ? (
            <Link className="btn" href="/app/clients">
              Add a client
            </Link>
          ) : null}
          <Link className="btn secondary" href="/app/bookings">
            View bookings
          </Link>
          {me.permissions.includes("import:write") ? (
            <Link className="btn secondary" href="/app/import">
              Import a spreadsheet
            </Link>
          ) : null}
          {me.org.plan === "free" && me.permissions.includes("billing:manage") ? (
            <Link className="btn secondary" href="/app/settings">
              Unlock invoices
            </Link>
          ) : null}
        </p>
      </div>
      {/* Interview talking points used to live here. Moved out of the home
          screen so a studio owner is not greeted with engineering notes.
          Same ideas still live on /app/architecture. */}
    </div>
  );
}
