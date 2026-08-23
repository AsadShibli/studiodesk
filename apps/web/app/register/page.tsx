"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [studio, setStudio] = useState("");
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await api("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ name, email, password }),
      });
      if (studio.trim()) {
        await api("/api/orgs", {
          method: "POST",
          body: JSON.stringify({ name: studio.trim() }),
        });
      }
      window.location.href = "/app";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Register failed");
    }
  }

  return (
    <div className="auth-wrap">
      <form className="card auth-card" onSubmit={onSubmit}>
        <h1>Open a studio</h1>
        <p className="muted">
          This creates your workspace. You can add clients and teammates after you sign in.
        </p>
        <label>Your name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} required />
        <label>Email</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <label>Password (min 8)</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
        <label>Studio name</label>
        <input value={studio} onChange={(e) => setStudio(e.target.value)} placeholder="Northshore Studio" />
        {error ? <p className="error">{error}</p> : null}
        <p>
          <button className="btn" type="submit">
            Create studio
          </button>
        </p>
        <p className="muted">
          Already have an account? <Link href="/login">Sign in</Link>
        </p>
      </form>
    </div>
  );
}
