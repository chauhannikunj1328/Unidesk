import { prisma } from "./prisma.js";

/**
 * Every email goes into EmailLog. In development that is the whole story (see /dev/emails and the server console).
 * A provider (Resend or SMTP) plugs in here later without changing any flow.
 * @param {{ to: string, subject: string, template: string, text: string, link?: string }} mail
 */
export async function sendEmail({ to, subject, template, text, link }) {
  // In production the log never keeps the working link: a database leak must not hand out live sign-in or reset links.
  const keepLink = process.env.NODE_ENV !== "production";
  const row = await prisma.emailLog.create({
    data: { to, subject, template, body: keepLink || !link ? text : text.split(link).join("[link removed]"), link: keepLink ? link ?? null : null, status: "sent" },
  });
  if (process.env.NODE_ENV !== "production") console.log(`\n[email] to ${to}: ${subject}${link ? `\n        ${link}` : ""}\n`);
  return row;
}

export const verifyEmail = (name, link) => ({
  template: "verify-email",
  subject: "Confirm your email for Unidesk",
  text: `Hi ${name},\n\nConfirm your email to finish creating your Unidesk account:\n${link}\n\nThis link works for 24 hours. If you didn't create an account, you can ignore this email.`,
});

export const resetEmail = (name, link) => ({
  template: "reset-password",
  subject: "Reset your Unidesk password",
  text: `Hi ${name},\n\nUse this link to choose a new password:\n${link}\n\nIt works for 1 hour and only once. If you didn't ask for this, you can ignore this email and your password stays the same.`,
});

/** The invitation. `apps` and `role` are plain words; `note` is the inviter's own text (shown as a quote, never as HTML). */
export const inviteEmail = ({ inviter, org, role, apps, note, link, expires, reminder = false }) => ({
  template: "team-invite",
  subject: `${reminder ? "Reminder: " : ""}${inviter} invited you to ${org}`,
  text: [
    `${inviter} invited you to join ${org} on Unidesk as ${/^[aeiou]/i.test(role) ? "an" : "a"} ${role}.`,
    apps.length ? `Apps you can open: ${apps.join(", ")}.` : "",
    note ? `\n${inviter} wrote:\n"${note}"` : "",
    `\nAccept the invite:\n${link}`,
    `\nThis invite works until ${expires}. If you weren't expecting it, you can ignore this email.`,
  ].filter(Boolean).join("\n"),
});
