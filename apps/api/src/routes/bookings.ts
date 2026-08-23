import { Router, type Request } from "express";
import { z } from "zod";
import { prisma, prismaForOrg } from "@studiodesk/db";
import { authorize } from "../lib/authorize";
import { syncBookingToCalendar } from "../lib/google";
import { requireUser } from "../middleware/session";

export const bookingsRouter = Router();
bookingsRouter.use(requireUser);

function extraWhere(req: Request) {
  const ctx = req.ctx!;
  if (ctx.role === "staff") return { staffId: ctx.user.id };
  if (ctx.role === "client") return { client: { userId: ctx.user.id } };
  return {};
}

bookingsRouter.get("/bookings", authorize({ permission: "booking:read" }), async (req, res) => {
  const db = prismaForOrg(req.ctx!.org!.id);
  const bookings = await db.booking.findMany({
    where: extraWhere(req),
    include: { client: true },
    orderBy: { startAt: "asc" },
  });
  res.json(bookings);
});

const bookingSchema = z.object({
  clientId: z.string(),
  staffId: z.string().nullable().optional(),
  title: z.string().min(1).optional(),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
});

bookingsRouter.post("/bookings", authorize({ permission: "booking:write" }), async (req, res) => {
  const parsed = bookingSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid booking" });
    return;
  }
  const orgId = req.ctx!.org!.id;
  const db = prismaForOrg(orgId);
  const client = await db.client.findFirst({ where: { id: parsed.data.clientId } });
  if (!client) {
    res.status(400).json({ error: "Client not in this studio" });
    return;
  }
  let staffId = parsed.data.staffId ?? null;
  if (req.ctx!.role === "staff") staffId = req.ctx!.user.id;

  const booking = await db.booking.create({
    data: {
      clientId: client.id,
      staffId,
      title: parsed.data.title ?? "Session",
      startAt: new Date(parsed.data.startAt),
      endAt: new Date(parsed.data.endAt),
    },
  });
  await syncBookingToCalendar({
    orgId,
    staffId: booking.staffId,
    bookingId: booking.id,
    title: booking.title,
    startAt: booking.startAt,
    endAt: booking.endAt,
    existingEventId: null,
  });
  res.status(201).json(booking);
});

bookingsRouter.patch("/bookings/:id", authorize({ permission: "booking:write" }), async (req, res) => {
  const parsed = z
    .object({ status: z.enum(["scheduled", "cancelled", "completed"]).optional() })
    .safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid update" });
    return;
  }
  const db = prismaForOrg(req.ctx!.org!.id);
  const existing = await db.booking.findFirst({
    where: { id: req.params.id, ...extraWhere(req) },
  });
  if (!existing) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const booking = await db.booking.update({
    where: { id: existing.id },
    data: parsed.data,
  });
  res.json(booking);
});

// Used by the staff picker on the booking form.
bookingsRouter.get("/bookings/staff", authorize({ permission: "booking:read" }), async (req, res) => {
  const members = await prisma.membership.findMany({
    where: {
      orgId: req.ctx!.org!.id,
      role: { in: ["owner", "manager", "staff"] },
    },
    include: { user: true },
  });
  res.json(members.map((m) => ({ id: m.user.id, name: m.user.name, role: m.role })));
});
