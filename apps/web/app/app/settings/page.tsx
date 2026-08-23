"use client";

import { useEffect, useState } from "react";
import { api, type Me } from "@/lib/api";

type Flag = { key: string; fromPlan: boolean; override: boolean | null; enabled: boolean };

const FLAG_COPY: Record<string, { title: string; blurb: string }> = {
  invoicing: { title: "Invoices", blurb: "Create bills and collect payment." },
  client_portal: { title: "Client logins", blurb: "Let a client sign in and see only their own sessions." },
  google_calendar: { title: "Google Calendar", blurb: "Put new bookings on a connected Google calendar." },
  team_calendar: { title: "Team calendar", blurb: "See sessions across teammates, not just your own." },
};

const ROLE_COPY: Record<string, string> = {
  manager: "Manager — clients, bookings, invoices. Cannot change the plan.",
  staff: "Staff — their own sessions.",
  client: "Client — only their own bookings and invoices.",
};

export default function SettingsPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [flags, setFlags] = useState<Flag[]>([]);
  const [plan, setPlan] = useState("free");
  const [cal, setCal] = useState<{ connected: boolean; configured: boolean } | null>(null);
  const [invite, setInvite] = useState({ email: "", name: "", role: "manager", password: "demo1234" });
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  async function load() {
    const mine = await api<Me>("/api/me");
    setMe(mine);
    const f = await api<{ plan: string; flags: Flag[] }>("/api/flags");
    setFlags(f.flags);
    setPlan(f.plan);
    api<{ connected: boolean; configured: boolean }>("/api/calendar/status").then(setCal);
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  async function upgrade() {
    setError("");
    try {
      const checkout = await api<{ url?: string }>("/api/billing/checkout", { method: "POST" });
      if (checkout.url) {
        window.location.href = checkout.url;
        return;
      }
    } catch {
      // No Stripe keys: fall through to the local upgrade path.
    }
    await api("/api/billing/dev-upgrade", { method: "POST" });
    setMsg("This studio is now on Pro. Invoices should appear in the menu.");
    load();
  }

  async function downgrade() {
    await api("/api/billing/dev-downgrade", { method: "POST" });
    setMsg("This studio is now on Free. Invoices leave the menu unless you turn them on below.");
    load();
  }

  async function toggle(key: string, enabled: boolean) {
    await api(`/api/flags/${key}`, { method: "POST", body: JSON.stringify({ enabled }) });
    load();
  }

  async function connectCalendar() {
    const { url } = await api<{ url: string }>("/api/calendar/connect");
    window.location.href = url;
  }

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await api("/api/orgs/members", { method: "POST", body: JSON.stringify(invite) });
      setMsg(`${invite.name} can sign in as a ${invite.role}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invite failed");
    }
  }

  return (
    <div>
      <h1>Studio settings</h1>
      <p className="muted">Plan, extras, calendar, and who else can sign in to {me?.org?.name ?? "this studio"}.</p>
      {error ? <p className="error">{error}</p> : null}
      {msg ? <p>{msg}</p> : null}
      <div className="card">
        <h2>Plan</h2>
        <p>
          This studio is on{" "}
          <span className={`badge ${plan}`}>{plan === "pro" ? "Pro" : "Free"}</span>.
        </p>
        <p className="muted">
          Free: clients and bookings. Pro: invoices, client logins, and calendar extras.
        </p>
        {me?.permissions.includes("billing:manage") ? (
          <p className="row">
            <button className="btn" type="button" onClick={upgrade} disabled={plan === "pro"}>
              Switch to Pro
            </button>
            <button className="btn secondary" type="button" onClick={downgrade} disabled={plan === "free"}>
              Switch to Free
            </button>
          </p>
        ) : (
          <p className="muted">Only the studio owner can change the plan.</p>
        )}
      </div>
      <div className="card">
        <h2>Extras</h2>
        <p className="muted">
          The plan turns these on by default. You can still switch one extra on or off for this studio only.
        </p>
        {flags.map((f) => {
          const copy = FLAG_COPY[f.key] ?? { title: f.key, blurb: "" };
          return (
            <p key={f.key} className="row">
              <span>
                <strong>{copy.title}</strong>
                <br />
                <span className="muted">{copy.blurb}</span>
                <br />
                <span className="muted">
                  {f.enabled ? "On" : "Off"}
                  {f.override === null ? " (from plan)" : " (custom for this studio)"}
                </span>
              </span>
              {me?.permissions.includes("flag:manage") ? (
                <button className="btn secondary" type="button" onClick={() => toggle(f.key, !f.enabled)}>
                  Turn {f.enabled ? "off" : "on"}
                </button>
              ) : null}
            </p>
          );
        })}
      </div>
      <div className="card">
        <h2>Google Calendar</h2>
        <p className="muted">
          {cal?.configured
            ? cal.connected
              ? "Connected. New bookings can be added to your Google calendar."
              : "Not connected yet. Connect your Google account to copy bookings onto your calendar."
            : "Optional. This demo has no Google keys set, so Connect stays off. The rest of the studio still works."}
        </p>
        <button className="btn" type="button" onClick={connectCalendar} disabled={!cal?.configured}>
          Connect Google Calendar
        </button>
      </div>
      {me?.permissions.includes("org:invite") ? (
      <form className="card" onSubmit={sendInvite}>
        <h2>Invite someone</h2>
        <p className="muted">They get an email address and a temporary password. Pick how much they can do.</p>
        <label>Name</label>
        <input value={invite.name} onChange={(e) => setInvite({ ...invite, name: e.target.value })} required />
        <label>Email</label>
        <input type="email" value={invite.email} onChange={(e) => setInvite({ ...invite, email: e.target.value })} required />
        <label>Access</label>
        <select value={invite.role} onChange={(e) => setInvite({ ...invite, role: e.target.value })}>
          {Object.entries(ROLE_COPY).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <label>Temporary password</label>
        <input value={invite.password} onChange={(e) => setInvite({ ...invite, password: e.target.value })} />
        <p>
          <button className="btn" type="submit">
            Send invite
          </button>
        </p>
      </form>
      ) : null}
    </div>
  );
}
