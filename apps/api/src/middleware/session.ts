import type { NextFunction, Request, Response } from "express";
import { prisma } from "@studiodesk/db";
import { env } from "../env";
import { permissionsFor } from "../lib/permissions";

export async function loadSession(req: Request, _res: Response, next: NextFunction) {
  const token = req.cookies?.[env.cookieName] as string | undefined;
  if (!token) {
    next();
    return;
  }

  const session = await prisma.session.findUnique({
    where: { id: token },
    include: { user: true },
  });
  if (!session || session.expiresAt < new Date()) {
    next();
    return;
  }

  let org = null;
  let role = null;
  let permissions = [] as ReturnType<typeof permissionsFor>;

  if (session.activeOrgId) {
    const membership = await prisma.membership.findUnique({
      where: {
        userId_orgId: { userId: session.userId, orgId: session.activeOrgId },
      },
      include: { org: true },
    });
    if (membership) {
      org = membership.org;
      role = membership.role;
      permissions = permissionsFor(membership.role);
    }
  }

  req.ctx = {
    user: session.user,
    sessionId: session.id,
    org,
    role,
    permissions,
  };
  next();
}

export function requireUser(req: Request, res: Response, next: NextFunction) {
  if (!req.ctx?.user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}
