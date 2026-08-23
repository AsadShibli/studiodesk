export const env = {
  databaseUrl: process.env.DATABASE_URL ?? "",
  cookieName: process.env.SESSION_COOKIE ?? "studiodesk_session",
  webOrigin: process.env.WEB_ORIGIN ?? "http://localhost:3000",
  apiPort: Number(process.env.API_PORT ?? 4000),
  stripeSecret: process.env.STRIPE_SECRET_KEY ?? "",
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? "",
  stripePricePro: process.env.STRIPE_PRICE_PRO ?? "",
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
  googleRedirectUri:
    process.env.GOOGLE_REDIRECT_URI ??
    "http://localhost:3000/api/calendar/callback",
  nodeEnv: process.env.NODE_ENV ?? "development",
};
