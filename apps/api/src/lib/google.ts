import { google } from "googleapis";
import { prisma } from "@studiodesk/db";
import { env } from "../env";
import { isFlagEnabled } from "./flags";

export function googleConfigured() {
  return Boolean(env.googleClientId && env.googleClientSecret);
}

export function googleOAuthClient() {
  return new google.auth.OAuth2(
    env.googleClientId,
    env.googleClientSecret,
    env.googleRedirectUri,
  );
}

export function calendarAuthUrl(state: string) {
  const client = googleOAuthClient();
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: ["https://www.googleapis.com/auth/calendar.events"],
    state,
  });
}

/** Soft-fail: missing Google creds or flag off never blocks a booking write. */
export async function syncBookingToCalendar(opts: {
  orgId: string;
  staffId: string | null;
  bookingId: string;
  title: string;
  startAt: Date;
  endAt: Date;
  existingEventId: string | null;
}) {
  if (!opts.staffId || !googleConfigured()) return;
  const enabled = await isFlagEnabled(opts.orgId, "google_calendar");
  if (!enabled) return;

  const account = await prisma.googleAccount.findUnique({
    where: { userId: opts.staffId },
  });
  if (!account) return;

  const auth = googleOAuthClient();
  auth.setCredentials({
    refresh_token: account.refreshToken,
    access_token: account.accessToken ?? undefined,
  });
  const calendar = google.calendar({ version: "v3", auth });
  const body = {
    summary: opts.title,
    start: { dateTime: opts.startAt.toISOString() },
    end: { dateTime: opts.endAt.toISOString() },
  };

  try {
    if (opts.existingEventId) {
      await calendar.events.update({
        calendarId: "primary",
        eventId: opts.existingEventId,
        requestBody: body,
      });
      return;
    }
    const created = await calendar.events.insert({
      calendarId: "primary",
      requestBody: body,
    });
    if (created.data.id) {
      await prisma.booking.update({
        where: { id: opts.bookingId },
        data: { googleEventId: created.data.id },
      });
    }
  } catch (err) {
    console.warn("Google Calendar sync skipped:", err);
  }
}
