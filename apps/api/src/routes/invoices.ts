import { Router } from "express";
import { z } from "zod";
import { prismaForOrg } from "@studiodesk/db";
import { authorize } from "../lib/authorize";
import { env } from "../env";
import { getStripe } from "../lib/stripe";
import { requireUser } from "../middleware/session";

export const invoicesRouter = Router();
invoicesRouter.use(requireUser);

invoicesRouter.get(
  "/invoices",
  authorize({ permission: "invoice:read", flag: "invoicing" }),
  async (req, res) => {
    const db = prismaForOrg(req.ctx!.org!.id);
    const where =
      req.ctx!.role === "client" ? { client: { userId: req.ctx!.user.id } } : {};
    const invoices = await db.invoice.findMany({
      where,
      include: { client: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(invoices);
  },
);

const createSchema = z.object({
  clientId: z.string(),
  amountCents: z.number().int().positive(),
});

invoicesRouter.post(
  "/invoices",
  authorize({ permission: "invoice:write", flag: "invoicing" }),
  async (req, res) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid invoice" });
      return;
    }
    const db = prismaForOrg(req.ctx!.org!.id);
    const client = await db.client.findFirst({ where: { id: parsed.data.clientId } });
    if (!client) {
      res.status(400).json({ error: "Client not in this studio" });
      return;
    }
    const invoice = await db.invoice.create({
      data: {
        clientId: client.id,
        amountCents: parsed.data.amountCents,
        status: "open",
      },
    });
    res.status(201).json(invoice);
  },
);

invoicesRouter.post(
  "/invoices/:id/pay",
  authorize({ permission: "invoice:read", flag: "invoicing" }),
  async (req, res) => {
    const stripe = getStripe();
    const db = prismaForOrg(req.ctx!.org!.id);
    const invoice = await db.invoice.findFirst({
      where: { id: req.params.id },
      include: { client: true },
    });
    if (!invoice) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    if (!stripe) {
      // Dev stand-in so the pay flow is demoable without Stripe keys.
      const paid = await db.invoice.update({
        where: { id: invoice.id },
        data: { status: "paid" },
      });
      res.json({ url: null, invoice: paid, simulated: true });
      return;
    }
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: invoice.currency,
            unit_amount: invoice.amountCents,
            product_data: { name: `Invoice ${invoice.id.slice(0, 8)}` },
          },
        },
      ],
      success_url: `${env.webOrigin}/app/invoices?paid=1`,
      cancel_url: `${env.webOrigin}/app/invoices`,
      metadata: { orgId: req.ctx!.org!.id, invoiceId: invoice.id },
    });
    await db.invoice.update({
      where: { id: invoice.id },
      data: { stripeCheckoutSessionId: session.id },
    });
    res.json({ url: session.url });
  },
);
