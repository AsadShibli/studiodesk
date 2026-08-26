import { Router } from "express";
import { z } from "zod";
import { prismaForOrg } from "@studiodesk/db";
import { authorize } from "../lib/authorize";
import { emailSchema } from "../lib/email";
import { requireUser } from "../middleware/session";

export const clientsRouter = Router();

clientsRouter.use(requireUser);

clientsRouter.get("/clients", authorize({ permission: "client:read" }), async (req, res) => {
  const db = prismaForOrg(req.ctx!.org!.id);
  const clients = await db.client.findMany({ orderBy: { createdAt: "desc" } });
  res.json(clients);
});

const clientSchema = z.object({
  name: z.string().min(1),
  email: emailSchema,
  notes: z.string().optional(),
});

clientsRouter.post("/clients", authorize({ permission: "client:write" }), async (req, res) => {
  const parsed = clientSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid client" });
    return;
  }
  const db = prismaForOrg(req.ctx!.org!.id);
  const email = parsed.data.email.toLowerCase();
  try {
    const client = await db.client.create({
      data: { orgId: req.ctx!.org!.id, name: parsed.data.name, email, notes: parsed.data.notes },
    });
    res.status(201).json(client);
  } catch {
    res.status(409).json({ error: "Client email already exists in this studio" });
  }
});

clientsRouter.patch("/clients/:id", authorize({ permission: "client:write" }), async (req, res) => {
  const parsed = clientSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid client" });
    return;
  }
  const db = prismaForOrg(req.ctx!.org!.id);
  const client = await db.client.update({
    where: { id: req.params.id },
    data: parsed.data,
  });
  if (!client) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(client);
});
