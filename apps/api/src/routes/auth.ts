import { Router } from "express";
import { z } from "zod";
import { prisma } from "@studiodesk/db";
import { emailSchema } from "../lib/email";
import { hashPassword, verifyPassword } from "../lib/passwords";
import {
  clearSessionCookie,
  createSession,
  setSessionCookie,
} from "../lib/sessions";
import { requireUser } from "../middleware/session";

export const authRouter = Router();

const registerSchema = z.object({
  email: emailSchema,
  password: z.string().min(8),
  name: z.string().min(1),
});

authRouter.post("/auth/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
    return;
  }
  const email = parsed.data.email.toLowerCase();
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) {
    res.status(409).json({ error: "Email already registered" });
    return;
  }
  const user = await prisma.user.create({
    data: {
      email,
      name: parsed.data.name,
      passwordHash: await hashPassword(parsed.data.password),
    },
  });
  const session = await createSession(user.id);
  setSessionCookie(res, session.id, session.expiresAt);
  res.status(201).json({ id: user.id, email: user.email, name: user.name });
});

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1),
});

authRouter.post("/auth/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email.toLowerCase() },
  });
  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }
  const membership = await prisma.membership.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
  });
  const session = await createSession(user.id, membership?.orgId);
  setSessionCookie(res, session.id, session.expiresAt);
  res.json({ id: user.id, email: user.email, name: user.name });
});

authRouter.post("/auth/logout", requireUser, async (req, res) => {
  await prisma.session.delete({ where: { id: req.ctx!.sessionId } });
  clearSessionCookie(res);
  res.json({ ok: true });
});

authRouter.get("/me", requireUser, async (req, res) => {
  const { user, org, role, permissions } = req.ctx!;
  const memberships = await prisma.membership.findMany({
    where: { userId: user.id },
    include: { org: true },
  });
  res.json({
    user: { id: user.id, email: user.email, name: user.name },
    org,
    role,
    permissions,
    orgs: memberships.map((m) => ({
      id: m.org.id,
      name: m.org.name,
      slug: m.org.slug,
      plan: m.org.plan,
      role: m.role,
    })),
  });
});
