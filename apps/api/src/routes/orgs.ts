import { Router } from "express";
import { z } from "zod";
import { Role, prisma } from "@studiodesk/db";
import { authorize } from "../lib/authorize";
import { hashPassword } from "../lib/passwords";
import { slugify } from "../lib/slug";
import { emailSchema } from "../lib/email";
import { requireUser } from "../middleware/session";

export const orgsRouter = Router();

orgsRouter.post("/orgs", requireUser, async (req, res) => {
  const parsed = z.object({ name: z.string().min(1) }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Name required" });
    return;
  }
  const base = slugify(parsed.data.name);
  let slug = base;
  let n = 1;
  while (await prisma.org.findUnique({ where: { slug } })) {
    slug = `${base}-${n++}`;
  }
  const org = await prisma.org.create({
    data: { name: parsed.data.name, slug },
  });
  await prisma.membership.create({
    data: { orgId: org.id, userId: req.ctx!.user.id, role: Role.owner },
  });
  await prisma.session.update({
    where: { id: req.ctx!.sessionId },
    data: { activeOrgId: org.id },
  });
  res.status(201).json(org);
});

orgsRouter.post("/orgs/switch", requireUser, async (req, res) => {
  const parsed = z.object({ orgId: z.string() }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "orgId required" });
    return;
  }
  const membership = await prisma.membership.findUnique({
    where: {
      userId_orgId: { userId: req.ctx!.user.id, orgId: parsed.data.orgId },
    },
  });
  if (!membership) {
    res.status(403).json({ error: "Not a member of that organization" });
    return;
  }
  await prisma.session.update({
    where: { id: req.ctx!.sessionId },
    data: { activeOrgId: parsed.data.orgId },
  });
  res.json({ ok: true, orgId: parsed.data.orgId });
});

const inviteSchema = z.object({
  email: emailSchema,
  name: z.string().min(1),
  role: z.enum(["manager", "staff", "client"]),
  password: z.string().min(8),
});

orgsRouter.post(
  "/orgs/members",
  requireUser,
  authorize({ permission: "org:invite" }),
  async (req, res) => {
    const parsed = inviteSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid invite" });
      return;
    }
    const orgId = req.ctx!.org!.id;
    const email = parsed.data.email.toLowerCase();
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          name: parsed.data.name,
          passwordHash: await hashPassword(parsed.data.password),
        },
      });
    }
    const membership = await prisma.membership.upsert({
      where: { userId_orgId: { userId: user.id, orgId } },
      update: { role: parsed.data.role },
      create: { userId: user.id, orgId, role: parsed.data.role },
    });
    res.status(201).json({ membershipId: membership.id, userId: user.id, role: membership.role });
  },
);
