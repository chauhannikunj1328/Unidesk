import { notFound } from "next/navigation";
import { listRecentEmails } from "@/server/dev-outbox";

export const metadata = { title: "Sent emails · Unidesk" };
export const dynamic = "force-dynamic";

/** Development only: every email the app "sent", with its link, so flows can be tried without a mail provider. */
export default async function DevEmailsPage() {
  if (process.env.NODE_ENV === "production") notFound();
  const rows = await listRecentEmails();
  return (
    <main style={{ maxWidth: 760, margin: "40px auto", padding: "0 16px", fontFamily: "system-ui" }}>
      <h1 style={{ fontSize: 24, marginBottom: 4 }}>Sent emails (development)</h1>
      <p style={{ color: "#555", marginBottom: 24 }}>Newest first. Not available in production.</p>
      {rows.length === 0 ? <p>No emails yet.</p> : rows.map((r) => (
        <article key={r.id} style={{ border: "1px solid #ddd", borderRadius: 12, padding: 16, marginBottom: 12 }}>
          <p style={{ fontWeight: 600 }}>{r.subject}</p>
          <p style={{ color: "#555", fontSize: 13 }}>To {r.to} · {r.createdAt.toISOString()}</p>
          <pre style={{ whiteSpace: "pre-wrap", fontSize: 13, margin: "8px 0" }}>{r.body}</pre>
          {r.link ? <a href={r.link} data-email-link style={{ wordBreak: "break-all" }}>{r.link}</a> : null}
        </article>
      ))}
    </main>
  );
}
