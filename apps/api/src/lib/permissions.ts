import type { Role } from "@studiodesk/db";

export const PERMISSIONS = [
  "client:read",
  "client:write",
  "booking:read",
  "booking:write",
  "invoice:read",
  "invoice:write",
  "billing:manage",
  "org:invite",
  "org:manage",
  "flag:manage",
  "import:write",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

// Roles are bundles of permissions — routes never check role names.
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  owner: [...PERMISSIONS],
  manager: [
    "client:read",
    "client:write",
    "booking:read",
    "booking:write",
    "invoice:read",
    "invoice:write",
    "org:invite",
    "import:write",
  ],
  staff: ["client:read", "booking:read", "booking:write"],
  client: ["booking:read", "invoice:read"],
};

export function permissionsFor(role: Role): Permission[] {
  return ROLE_PERMISSIONS[role];
}
