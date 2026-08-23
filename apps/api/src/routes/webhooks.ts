import type { Request, Response } from "express";
import Stripe from "stripe";
import { Plan, prisma } from "@studiodesk/db";
import { env } from "../env";
import { getStripe } from "../lib/stripe";

async function markProcessed(id: string, source: string) {
  try {
    await prisma.processedEvent.create({ data: { id, source } });
    return true;
  } catch {
    return false; // unique id → already handled
  }
}

export async function stripeWebhook(req: Request, res: Response) {
  const stripe = getStripe();
  if (!stripe || !env.stripeWebhookSecret) {
    res.status(501).json({ error: "Stripe webhooks not configured" });
    return;
  }
  const sig = req.headers["stripe-signature"];
  if (typeof sig !== "string") {
    res.status(400).json({ error: "Missing signature" });
    return;
  }
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, env.stripeWebhookSecret);
  } catch {
    res.status(400).json({ error: "Invalid signature" });
    return;
  }

  const fresh = await markProcessed(event.id, "stripe");
  if (!fresh) {
    res.json({ ok: true, duplicate: true });
    return;
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const orgId = session.metadata?.orgId ?? session.client_reference_id;
    if (orgId && session.mode === "subscription") {
      await prisma.org.update({
        where: { id: orgId },
        data: {
          plan: Plan.pro,
          stripeCustomerId: String(session.customer ?? "") || undefined,
          stripeSubscriptionId: String(session.subscription ?? "") || undefined,
        },
      });
    }
    if (orgId && session.mode === "payment" && session.metadata?.invoiceId) {
      await prisma.invoice.update({
        where: { id: session.metadata.invoiceId },
        data: { status: "paid", stripeCheckoutSessionId: session.id },
      });
    }
  }

  res.json({ ok: true });
}
