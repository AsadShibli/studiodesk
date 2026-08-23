import type { NextFunction, Request, Response } from "express";
import { isFlagEnabled, type FlagKey } from "./flags";
import type { Permission } from "./permissions";

/** One door for roles, entitlements, and flags: can this user in this org do X? */
export function authorize(opts: { permission: Permission; flag?: FlagKey }) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const ctx = req.ctx;
    if (!ctx?.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    if (!ctx.org) {
      res.status(400).json({ error: "No active organization" });
      return;
    }
    if (!ctx.permissions.includes(opts.permission)) {
      res.status(403).json({ error: "Forbidden", missing: opts.permission });
      return;
    }
    if (opts.flag) {
      const on = await isFlagEnabled(ctx.org.id, opts.flag);
      if (!on) {
        res.status(403).json({ error: "Feature disabled", flag: opts.flag });
        return;
      }
    }
    next();
  };
}
