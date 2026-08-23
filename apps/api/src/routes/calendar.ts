import { Router } from "express";
import { prisma } from "@studiodesk/db";
import { authorize } from "../lib/authorize";
import { calendarAuthUrl, googleConfigured, googleOAuthClient } from "../lib/google";
import { requireUser } from "../middleware/session";

export const calendarRouter = Router();

calendarRouter.get(
  "/calendar/connect",
  requireUser,
  authorize({ permission: "booking:write", flag: "google_calendar" }),
  (req, res) => {
    if (!googleConfigured()) {
      res.status(501).json({ error: "Google OAuth is not configured" });
      return;
    }
    const url = calendarAuthUrl(req.ctx!.user.id);
    res.json({ url, configured: true });
  },
);

calendarRouter.get("/calendar/status", requireUser, async (req, res) => {
  const account = await prisma.googleAccount.findUnique({
    where: { userId: req.ctx!.user.id },
  });
  res.json({ connected: Boolean(account), configured: googleConfigured() });
});

calendarRouter.get("/calendar/callback", async (req, res) => {
  const code = String(req.query.code ?? "");
  const userId = String(req.query.state ?? "");
  if (!code || !userId) {
    res.status(400).send("Missing code or state");
    return;
  }
  const client = googleOAuthClient();
  const { tokens } = await client.getToken(code);
  if (!tokens.refresh_token) {
    res.status(400).send("No refresh token. Disconnect the app in Google and retry.");
    return;
  }
  await prisma.googleAccount.upsert({
    where: { userId },
    update: {
      refreshToken: tokens.refresh_token,
      accessToken: tokens.access_token ?? null,
    },
    create: {
      userId,
      refreshToken: tokens.refresh_token,
      accessToken: tokens.access_token ?? null,
    },
  });
  res.redirect("/app/settings?calendar=connected");
});
