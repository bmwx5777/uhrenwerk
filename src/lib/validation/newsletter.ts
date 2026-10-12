import { z } from "zod";

import { emailField } from "./common";

/** Схема подписки на рассылку. */
export const newsletterSchema = z.object({
  email: emailField,
  source: z.enum(["footer", "checkout", "popup"]).optional().catch(undefined),
});

export type NewsletterInput = z.infer<typeof newsletterSchema>;
