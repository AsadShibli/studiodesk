import type { IncomingMessage, ServerResponse } from "node:http";
import { createApp } from "../../../api/src/app";

// Same Express app as local :4000, one instance per serverless isolate.
const app = createApp();

export const config = {
  api: {
    // Express (and Stripe raw-body) parse the request. Next must not.
    bodyParser: false,
  },
};

export default function handler(req: IncomingMessage, res: ServerResponse) {
  app(req as never, res as never);
}
