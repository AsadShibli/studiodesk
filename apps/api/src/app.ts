import express from "express";
import cookieParser from "cookie-parser";
import { healthRouter } from "./routes/health";
import { authRouter } from "./routes/auth";
import { orgsRouter } from "./routes/orgs";
import { clientsRouter } from "./routes/clients";
import { bookingsRouter } from "./routes/bookings";
import { flagsRouter } from "./routes/flags";
import { billingRouter } from "./routes/billing";
import { invoicesRouter } from "./routes/invoices";
import { calendarRouter } from "./routes/calendar";
import { importsRouter } from "./routes/imports";
import { stripeWebhook } from "./routes/webhooks";
import { loadSession } from "./middleware/session";
import { requireSameOrigin } from "./middleware/origin";

export function createApp() {
  const app = express();

  // Raw body required to verify Stripe signatures.
  app.post("/api/webhooks/stripe", express.raw({ type: "application/json" }), stripeWebhook);

  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());
  app.use(requireSameOrigin);
  app.use(loadSession);

  const api = express.Router();
  api.use(healthRouter);
  api.use(authRouter);
  api.use(orgsRouter);
  api.use(clientsRouter);
  api.use(bookingsRouter);
  api.use(flagsRouter);
  api.use(billingRouter);
  api.use(invoicesRouter);
  api.use(calendarRouter);
  api.use(importsRouter);
  app.use("/api", api);

  return app;
}
