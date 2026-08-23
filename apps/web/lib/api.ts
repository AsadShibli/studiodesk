export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const res = await fetch(path, { ...init, credentials: "include", headers });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = (body as { error?: string }).error ?? res.statusText;
    throw new Error(message);
  }
  return body as T;
}

export type Me = {
  user: { id: string; email: string; name: string };
  org: { id: string; name: string; slug: string; plan: "free" | "pro" } | null;
  role: "owner" | "manager" | "staff" | "client" | null;
  permissions: string[];
  orgs: { id: string; name: string; slug: string; plan: string; role: string }[];
};
