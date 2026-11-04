import { z } from "zod";

/** Shared by the forms (feedback after blur) and the server actions (the real check). */

export const PASSWORD_MIN = 10;
export const PASSWORD_MAX = 128;

// Passwords that are long enough to pass the length rule but are among the most common.
const COMMON = new Set([
  "password123", "password1234", "password12345", "passw0rd123", "1234567890", "12345678910", "0123456789",
  "qwertyuiop", "qwerty12345", "qwerty1234", "1q2w3e4r5t", "1qaz2wsx3edc", "abcdefghij", "abc1234567", "abcd123456",
  "iloveyou123", "letmein123", "welcome123", "welcome1234", "administrator", "changeme123", "changeme1234",
  "trustno1234", "monkey12345", "dragon12345", "football123", "baseball123", "superman123", "internet123",
  "unidesk123", "unidesk1234", "unidesk12345", "unideskdemo", "demo-password-123",
]);

/** Returns a plain-words problem, or null when the password is acceptable. */
export function passwordProblem(password) {
  if (typeof password !== "string" || password.length < PASSWORD_MIN) return `Use at least ${PASSWORD_MIN} characters.`;
  if (password.length > PASSWORD_MAX) return `Use at most ${PASSWORD_MAX} characters.`;
  const lower = password.toLowerCase();
  if (COMMON.has(lower) || /^(.)\1+$/.test(password) || /^\d+$/.test(password)) return "That password is too common. Choose something harder to guess.";
  return null;
}

export const emailSchema = z.string().trim().toLowerCase().min(1, "Enter your work email").email("Enter a valid email address").max(254);

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password").max(PASSWORD_MAX),
  keep: z.boolean().optional(),
});

export const signUpSchema = z.object({
  name: z.string().trim().min(1, "Enter your name").max(120),
  email: emailSchema,
  password: z.string().superRefine((v, ctx) => {
    const p = passwordProblem(v);
    if (p) ctx.addIssue({ code: "custom", message: p });
  }),
  terms: z.any().refine((v) => v === true, { message: "Tick this box to continue." }),
  referralCode: z.string().trim().toUpperCase().regex(/^[A-Z0-9-]{3,32}$/, "Check the referral code").optional().or(z.literal("")),
});

export const forgotSchema = z.object({ email: emailSchema });

export const resetSchema = z
  .object({
    password: z.string().superRefine((v, ctx) => {
      const p = passwordProblem(v);
      if (p) ctx.addIssue({ code: "custom", message: p });
    }),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "The passwords don't match." });

/** zod issues to { field: message }, first message per field. */
export function fieldErrors(error) {
  const out = {};
  for (const issue of error.issues) {
    const key = issue.path[0] ?? "form";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
