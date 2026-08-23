import { Router } from "express";
import { Plan, prisma } from "@studiodesk/db";
import { authorize } from "../lib/authorize";
import { env } from "../env";
import { getStripe } from "../lib/stripe";
import { requireUser } from "../middleware/session";

export const billingRouter = Router();

billingRouter.post(
  "/billing/checkout",
  requireUser,
  authorize({ permission: "billing:manage" }),
  async (req, res) => {
    const stripe = getStripe();
    const org = req.ctx!.org!;
    if (!stripe || !env.stripePricePro) {
      res.status(501).json({
        error: "Stripe is not configured. Use POST /api/billing/dev-upgrade in development.",
      });
      return;
    }
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: env.stripePricePro, quantity: 1 }],
      success_url: `${env.webOrigin}/app/settings?upgrade=ok`,
      cancel_url: `${env.webOrigin}/app/settings?upgrade=cancel`,
      client_reference_id: org.id,
      metadata: { orgId: org.id },
    });
    res.json({ url: session.url });
  },
);

// Local demo path: no Stripe account required. Disabled in production.
billingRouter.post(
  "/billing/dev-upgrade",
  requireUser,
  authorize({ permission: "billing:manage" }),
  async (req, res) => {
    if (env.nodeEnv === "production") {
      res.status(403).json({ error: "Not available in production" });
      return;
    }
    const org = await prisma.org.update({
      where: { id: req.ctx!.org!.id },
      data: { plan: Plan.pro },
    });
    res.json({ plan: org.plan });
  },
);

billingRouter.post(
  "/billing/dev-downgrade",
  requireUser,
  authorize({ permission: "billing:manage" }),
  async (req, res) => {
    if (env.nodeEnv === "production") {
      res.status(403).json({ error: "Not available in production" });
      return;
    }
    const org = await prisma.org.update({
      where: { id: req.ctx!.org!.id },
      data: { plan: Plan.free },
    });
    res.json({ plan: org.plan });
  },
);
