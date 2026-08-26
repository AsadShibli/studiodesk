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

// Commented out: Next's typecheck errors "module cannot be found" without a
// local import of express-serve-static-core. Global Express.Request is enough.
// declare module "express-serve-static-core" {
//   interface Request {
//     ctx?: RequestCtx;
//   }
// }

export {};
