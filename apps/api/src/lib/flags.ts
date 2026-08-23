import type { Plan } from "@studiodesk/db";
import { prisma } from "@studiodesk/db";

export const FLAG_KEYS = [
  "invoicing",
  "client_portal",
  "google_calendar",
  "team_calendar",
] as const;

export type FlagKey = (typeof FLAG_KEYS)[number];

// The plan IS a set of flags. Overrides (per org) win when present.
const PLAN_FLAGS: Record<Plan, Record<FlagKey, boolean>> = {
  free: {
    invoicing: false,
    client_portal: false,
    google_calendar: false,
    team_calendar: false,
  },
  pro: {
    invoicing: true,
    client_portal: true,
    google_calendar: true,
    team_calendar: true,
  },
};

export async function isFlagEnabled(orgId: string, flagKey: FlagKey) {
  const override = await prisma.featureOverride.findUnique({
    where: { orgId_flagKey: { orgId, flagKey } },
  });
  if (override) return override.enabled;
  const org = await prisma.org.findUnique({ where: { id: orgId } });
  if (!org) return false;
  return PLAN_FLAGS[org.plan][flagKey];
}

export async function listFlags(orgId: string, plan: Plan) {
  const overrides = await prisma.featureOverride.findMany({ where: { orgId } });
  const byKey = new Map(overrides.map((o) => [o.flagKey, o.enabled]));
  return FLAG_KEYS.map((key) => ({
    key,
    fromPlan: PLAN_FLAGS[plan][key],
    override: byKey.has(key) ? byKey.get(key)! : null,
    enabled: byKey.has(key) ? byKey.get(key)! : PLAN_FLAGS[plan][key],
  }));
}
