"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, type Me } from "@/lib/api";

const links = [
  { href: "/app", label: "Overview" },
  { href: "/app/clients", label: "Clients" },
  { href: "/app/bookings", label: "Bookings" },
  { href: "/app/invoices", label: "Invoices" },
  { href: "/app/import", label: "Import list" },
  { href: "/app/settings", label: "Studio settings" },
  // { href: "/app/architecture", label: "How it works" },
  // Hidden: studio owners don't need an architecture page in the product.
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [invoicing, setInvoicing] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    api<Me>("/api/me")
      .then(async (data) => {
        setMe(data);
        if (data.org) {
          const f = await api<{ flags: { key: string; enabled: boolean }[] }>("/api/flags");
          setInvoicing(Boolean(f.flags.find((x) => x.key === "invoicing")?.enabled));
        }
      })
      .catch(() => router.push("/login"));
  }, [router]);

  async function switchOrg(orgId: string) {
    await api("/api/orgs/switch", { method: "POST", body: JSON.stringify({ orgId }) });
    window.location.reload();
  }

  async function logout() {
    await api("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  if (!me) return <p className="main">Loading…</p>;

  return (
    <div className="shell">
      <aside className="sidebar">
        <p className="brand">StudioDesk</p>
        {me.orgs.length > 0 ? (
          <>
            <label htmlFor="studio-switch" style={{ color: "#b8b0a6" }}>
              Current studio
            </label>
            <select
              id="studio-switch"
              value={me.org?.id ?? ""}
              onChange={(e) => switchOrg(e.target.value)}
              style={{ marginBottom: "0.35rem", background: "#2a2622", color: "white", borderColor: "#3f3a34" }}
            >
              {me.orgs.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name} · {o.plan === "pro" ? "Pro" : "Free"}
                </option>
              ))}
            </select>
            <p style={{ color: "#b8b0a6", fontSize: "0.8rem", margin: "0 0 1rem" }}>
              Each studio has its own plan. Switch to compare Free vs Pro.
            </p>
          </>
        ) : null}
        {links
          .filter((l) => {
            if (l.href === "/app/invoices") return invoicing && me.permissions.includes("invoice:read");
            if (l.href === "/app/import") return me.permissions.includes("import:write");
            if (l.href === "/app/clients") return me.permissions.includes("client:read");
            if (l.href === "/app/settings") return me.role !== "client";
            return true;
          })
          .map((l) => (
          <Link key={l.href} href={l.href} className={pathname === l.href ? "active" : ""}>
            {l.label}
          </Link>
        ))}
        <p className="muted" style={{ marginTop: "2rem", color: "#b8b0a6" }}>
          {me.user.name}
          <br />
          {me.role ?? "no org"} · {me.org?.plan ?? "—"}
        </p>
        <button className="btn secondary" type="button" onClick={logout}>
          Log out
        </button>
      </aside>
      <div className="main">{children}</div>
    </div>
  );
}
