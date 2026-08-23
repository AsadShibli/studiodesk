import { randomBytes } from "node:crypto";
import type { Response } from "express";
import { prisma } from "@studiodesk/db";
import { env } from "../env";

const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000;

export function newSessionId() {
  // Unguessable id in the cookie; revocation = delete the row.
  return randomBytes(32).toString("hex");
}

export function setSessionCookie(res: Response, sessionId: string, expiresAt: Date) {
  res.cookie(env.cookieName, sessionId, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.nodeEnv === "production",
    path: "/",
    expires: expiresAt,
  });
}

export function clearSessionCookie(res: Response) {
  res.clearCookie(env.cookieName, { path: "/" });
}

export async function createSession(userId: string, activeOrgId?: string) {
  const expiresAt = new Date(Date.now() + TWO_WEEKS_MS);
  return prisma.session.create({
    data: {
      id: newSessionId(),
      userId,
      activeOrgId: activeOrgId ?? null,
      expiresAt,
    },
  });
}
