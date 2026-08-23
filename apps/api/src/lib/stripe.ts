import Stripe from "stripe";
import { env } from "../env";

export function getStripe() {
  if (!env.stripeSecret) return null;
  return new Stripe(env.stripeSecret);
}
