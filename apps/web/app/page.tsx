import Link from "next/link";

export default function HomePage() {
  return (
    <main className="hero">
      {/* Old line: "Portfolio SaaS" — that tells an engineer, not a studio owner. */}
      <p className="muted">For small studios</p>
      <h1>StudioDesk</h1>
      <p>
        One place for the people you work with, the sessions you book, and (when you
        need it) the invoices you send.
      </p>
      <ul className="muted">
        <li>Add clients without creating logins for them</li>
        <li>Book a session and assign a teammate</li>
        <li>Upgrade a studio to send invoices</li>
      </ul>
      <p className="row">
        <Link className="btn" href="/login">
          Sign in
        </Link>
        <Link className="btn secondary" href="/register">
          Open a studio
        </Link>
      </p>
      <p className="muted">
        Try the demo studio: <strong>owner@demo</strong> / <strong>demo1234</strong>
        {/* Architecture link removed from the product. Page still exists at /architecture if you want it. */}
      </p>
    </main>
  );
}
