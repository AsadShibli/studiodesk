import type { NextFunction, Request, Response } from "express";
import { env } from "../env";

// Same-origin via Next rewrite is the happy path. This still blocks
// cross-site POSTs if someone hits Express on :4000 directly.
export function requireSameOrigin(req: Request, res: Response, next: NextFunction) {
  if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") {
    next();
    return;
  }
  const origin = req.get("origin");
  if (origin && origin !== env.webOrigin) {
    res.status(403).json({ error: "Bad origin" });
    return;
  }
  next();
}
