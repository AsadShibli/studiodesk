import type { Org, Role, User } from "@studiodesk/db";
import type { Permission } from "./lib/permissions";

export type RequestCtx = {
  user: User;
  sessionId: string;
  org: Org | null;
  role: Role | null;
  permissions: Permission[];
};

declare global {
  namespace Express {
    interface Request {
      ctx?: RequestCtx;
    }
  }
}

export {};
