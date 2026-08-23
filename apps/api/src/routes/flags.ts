import { Router } from "express";
import { z } from "zod";
import { prisma } from "@studiodesk/db";
import { authorize } from "../lib/authorize";
import { FLAG_KEYS, listFlags, type FlagKey } from "../lib/flags";
import { requireUser } from "../middleware/session";

export const flagsRouter = Router();
flagsRouter.use(requireUser);

flagsRouter.get("/flags", async (req, res) => {
  if (!req.ctx?.org) {
    res.status(400).json({ error: "No active organization" });
    return;
  }
  const flags = await listFlags(req.ctx.org.id, req.ctx.org.plan);
  res.json({ plan: req.ctx.org.plan, flags });
});

flagsRouter.post(
  "/flags/:key",
  authorize({ permission: "flag:manage" }),
  async (req, res) => {
    const key = req.params.key as FlagKey;
    if (!FLAG_KEYS.includes(key)) {
      res.status(400).json({ error: "Unknown flag" });
      return;
    }
    const parsed = z.object({ enabled: z.boolean() }).safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "enabled boolean required" });
      return;
    }
    const orgId = req.ctx!.org!.id;
    const row = await prisma.featureOverride.upsert({
      where: { orgId_flagKey: { orgId, flagKey: key } },
      update: { enabled: parsed.data.enabled },
      create: { orgId, flagKey: key, enabled: parsed.data.enabled },
    });
    res.json(row);
  },
);
