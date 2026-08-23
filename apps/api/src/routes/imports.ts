import { parse } from "csv-parse/sync";
import { Router } from "express";
import { z } from "zod";
import { prisma, prismaForOrg } from "@studiodesk/db";
import { authorize } from "../lib/authorize";
import { requireUser } from "../middleware/session";

export const importsRouter = Router();
importsRouter.use(requireUser);

const mappingSchema = z.object({
  name: z.string().default("name"),
  email: z.string().default("email"),
  notes: z.string().default("notes"),
  booking_start: z.string().default("booking_start"),
  booking_end: z.string().default("booking_end"),
  booking_title: z.string().default("booking_title"),
});

type Mapping = z.infer<typeof mappingSchema>;

function cell(row: Record<string, string>, key: string) {
  return (row[key] ?? "").trim();
}

function previewRows(csv: string, mapping: Mapping) {
  const records = parse(csv, { columns: true, skip_empty_lines: true, trim: true }) as Record<
    string,
    string
  >[];
  return records.map((row, i) => {
    const name = cell(row, mapping.name);
    const email = cell(row, mapping.email).toLowerCase();
    const notes = cell(row, mapping.notes) || undefined;
    const start = cell(row, mapping.booking_start);
    const end = cell(row, mapping.booking_end);
    const title = cell(row, mapping.booking_title) || "Imported session";
    let error: string | null = null;
    if (!name || !email || !email.includes("@")) error = "Name and a valid email are required";
    let startAt: string | null = start || null;
    let endAt: string | null = end || null;
    if (start || end) {
      const s = start ? new Date(start) : null;
      const e = end ? new Date(end) : null;
      if (!s || Number.isNaN(s.getTime()) || !e || Number.isNaN(e.getTime())) {
        error = error ?? "booking_start and booking_end must be ISO dates";
      } else {
        startAt = s.toISOString();
        endAt = e.toISOString();
      }
    }
    return {
      line: i + 2,
      payload: { name, email, notes, startAt, endAt, title },
      error,
    };
  });
}

importsRouter.get("/imports", authorize({ permission: "import:write" }), async (req, res) => {
  const db = prismaForOrg(req.ctx!.org!.id);
  const batches = await db.importBatch.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { rows: true } } },
  });
  res.json(batches);
});

importsRouter.post("/imports/dry-run", authorize({ permission: "import:write" }), async (req, res) => {
  const parsed = z
    .object({ csv: z.string().min(1), mapping: mappingSchema.optional() })
    .safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "csv string required" });
    return;
  }
  const mapping = mappingSchema.parse(parsed.data.mapping ?? {});
  const rows = previewRows(parsed.data.csv, mapping);
  const batch = await prisma.importBatch.create({
    data: {
      orgId: req.ctx!.org!.id,
      source: "csv",
      status: "dry_run",
      mapping,
      rows: { create: rows.map((r) => ({ line: r.line, payload: r.payload, error: r.error })) },
    },
    include: { rows: true },
  });
  res.status(201).json(batch);
});

importsRouter.post("/imports/:id/commit", authorize({ permission: "import:write" }), async (req, res) => {
  const orgId = req.ctx!.org!.id;
  const batch = await prisma.importBatch.findFirst({
    where: { id: req.params.id, orgId },
    include: { rows: true },
  });
  if (!batch || batch.status !== "dry_run") {
    res.status(400).json({ error: "Batch not found or already committed" });
    return;
  }
  const db = prismaForOrg(orgId);
  for (const row of batch.rows) {
    if (row.error) continue;
    const p = row.payload as {
      name: string;
      email: string;
      notes?: string;
      startAt: string | null;
      endAt: string | null;
      title: string;
    };
    const client = await db.client.upsert({
      where: { orgId_email: { orgId, email: p.email } },
      update: { name: p.name, notes: p.notes, importBatchId: batch.id },
      create: {
        name: p.name,
        email: p.email,
        notes: p.notes,
        importBatchId: batch.id,
      },
    });
    if (p.startAt && p.endAt) {
      await db.booking.create({
        data: {
          clientId: client.id,
          title: p.title,
          startAt: new Date(p.startAt),
          endAt: new Date(p.endAt),
          importBatchId: batch.id,
        },
      });
    }
  }
  const updated = await prisma.importBatch.update({
    where: { id: batch.id },
    data: { status: "committed" },
  });
  res.json(updated);
});

importsRouter.post("/imports/:id/rollback", authorize({ permission: "import:write" }), async (req, res) => {
  const orgId = req.ctx!.org!.id;
  const batch = await prisma.importBatch.findFirst({
    where: { id: req.params.id, orgId, status: "committed" },
  });
  if (!batch) {
    res.status(400).json({ error: "Committed batch not found" });
    return;
  }
  // Rollback is a query, not a guess: every imported row is tagged with batchId.
  await prisma.booking.deleteMany({ where: { importBatchId: batch.id, orgId } });
  await prisma.client.deleteMany({ where: { importBatchId: batch.id, orgId } });
  const updated = await prisma.importBatch.update({
    where: { id: batch.id },
    data: { status: "rolled_back" },
  });
  res.json(updated);
});
