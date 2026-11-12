"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Info, UserPlus } from "lucide-react";
import { useTheme } from "@/components/shell/ThemeProvider";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { Drawer } from "@/components/ui/Drawer";
import { Select, Textarea } from "@/components/ui/Field";
import { Toggle } from "@/components/ui/Toggle";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/components/ui/cn";
import { APP_LIST } from "@/lib/apps";
import { appLabel, roleLabel } from "@/lib/labels";
import { sendInvitesAction } from "../invite-actions";
import {
  MAX_INVITES, NOTE_MAX, ROLE_CARD_HELP, allowedApps, classifyEmail, defaultApps, effectiveApps, invitableRoles, seatCheck,
  seatsLeft, shortSeatsMessage, splitEmails, summaryLine, usesSeats,
} from "../invite-rules";
import { EmailChipsInput } from "./EmailChipsInput";
import { scheduleDelivery, undoSend } from "./invite-sender";

const STEPS = ["Who", "Access", "Review"];

/** Role cards look different per theme: pastel uses the role colour, glass and grove the accent. */
function RoleCard({ role, selected, onSelect, theme, single }) {
  const style = selected && theme === "pastel" ? { background: `var(--role-${role.toLowerCase()}, #e9e8e4)`, borderColor: "transparent" } : undefined;
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 border px-4 py-3 transition-colors focus-within:ring-2 focus-within:ring-[var(--accent)]",
        selected ? (theme === "pastel" ? "text-ink" : "border-accent bg-accent-soft") : "border-line bg-card hover:bg-subtle"
      )}
      style={{ borderRadius: "var(--control-radius)", ...style }}
    >
      <input type="radio" name="invite-role" value={role} checked={selected} onChange={() => onSelect(role)} className="mt-1 size-4 accent-[var(--accent)]" />
      <span className="min-w-0">
        <span className="block font-medium text-ink">{roleLabel(role)}{single ? "" : ""}</span>
        <span className="block text-sm text-text">{ROLE_CARD_HELP[role]}</span>
      </span>
    </label>
  );
}

/**
 * The invite drawer (Hub flow 05). One drawer for all three themes: the data, rules and actions are shared, and the
 * theme only changes the look (role cards, header, toggles). Opens from `?invite=1` so the address can be shared.
 * @param {{ data: any, viewer: { membershipId: string, role: string } }} props
 */
export function InviteHost({ data, viewer }) {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const open = sp.get("invite") === "1";
  // The drawer lives in a portal, which the server cannot render. Wait for the browser, so a shared ?invite=1 link opens cleanly.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const roleParam = (sp.get("inviteRole") ?? "").toUpperCase();
  const close = () => {
    const next = new URLSearchParams(window.location.search);
    next.delete("invite");
    next.delete("inviteRole");
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };
  if (!mounted || !open || invitableRoles(viewer.role).length === 0) return null;
  return <InviteDrawer data={data} viewer={viewer} startRole={invitableRoles(viewer.role).includes(roleParam) ? roleParam : null} onClose={close} />;
}

function InviteDrawer({ data, viewer, startRole, onClose }) {
  const theme = useTheme();
  const toast = useToast();
  const router = useRouter();
  const { members, seats, appUsage, clients } = data;
  const roles = invitableRoles(viewer.role);
  const isManager = viewer.role === "MANAGER";

  const existing = useMemo(() => new Map(members.map((m) => [m.email.toLowerCase(), m.status])), [members]);
  const [chips, setChips] = useState([]);
  const [text, setText] = useState("");
  const [role, setRole] = useState(startRole ?? (roles.includes("MEMBER") ? "MEMBER" : roles[0]));
  const [apps, setApps] = useState(() => defaultApps(startRole ?? "MEMBER"));
  const [reportsToId, setReportsToId] = useState(viewer.membershipId);
  const [clientId, setClientId] = useState("");
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const confirmingRef = useRef(false);
  const setConfirm = (v) => { confirmingRef.current = v; setConfirming(v); };

  // Addresses typed but not yet turned into chips still count, so pressing Send right after typing works.
  const pending = useMemo(() => splitEmails(text).map((t) => classifyEmail(t, existing)), [text, existing]);
  const all = useMemo(() => {
    const out = [...chips];
    for (const c of pending) if (!out.some((x) => x.email === c.email)) out.push(c);
    return out.slice(0, MAX_INVITES);
  }, [chips, pending]);
  const valid = all.filter((c) => c.state === "ok");
  const skipped = all.length - valid.length;
  const people = valid.length;

  const dirty = chips.length > 0 || text.trim() !== "" || note.trim() !== "";
  // Escape and the backdrop only ask when something was typed. While the question is open, they must not ask again.
  function requestClose() {
    if (confirmingRef.current) return;
    if (dirty && !sending) setConfirm(true);
    else onClose();
  }

  const finalApps = effectiveApps(role, apps);
  const check = seatCheck({ people, role, apps, appUsage, seatLimit: seats.limit });
  const needsApps = role !== "CLIENT" && role !== "ADMIN" && finalApps.length === 0;
  const needsClient = role === "CLIENT" && clients.length > 0 && !clientId;
  const canSend = people > 0 && check.ok && !needsApps && !needsClient && !sending;

  const managerOptions = members.filter((m) => m.role !== "CLIENT" && m.status !== "inactive");

  function pickRole(next) {
    if (next === role) return;
    setRole(next);
    setApps(defaultApps(next));
    if (next !== "CLIENT") setClientId("");
    toast({ kind: "info", message: `Apps set for ${roleLabel(next)}` });
  }

  async function send() {
    setError(null);
    setSending(true);
    try {
      const r = await sendInvitesAction({ emails: valid.map((c) => c.email), role, apps: finalApps, reportsToId: isManager ? null : reportsToId, note: note.trim() || undefined, clientId: role === "CLIENT" ? clientId || null : null });
      if (!r.ok) { setError(r.error); return; }
      const n = r.invited.length;
      scheduleDelivery(r.batchId);
      onClose();
      toast({
        kind: "success",
        message: `${n} ${n === 1 ? "invite" : "invites"} sent`,
        onUndo: async () => {
          const u = await undoSend(r.batchId);
          router.refresh();
          toast(u.ok ? { kind: "info", message: u.kept ? "Some invites had already gone out" : "Invites taken back. Nothing was emailed." } : { kind: "error", message: u.error });
        },
      });
      if (r.skipped?.length) toast({ kind: "info", message: `${r.skipped.length} left out: ${r.skipped.map((s) => s.email).slice(0, 2).join(", ")}${r.skipped.length > 2 ? "…" : ""}` });
    } catch {
      setError("We couldn't reach Unidesk. Check your connection and try again.");
    } finally {
      setSending(false);
    }
  }

  const stepDone = [people > 0, !needsApps && !needsClient && people > 0, canSend];
  const visibleApps = APP_LIST.filter((a) => allowedApps(role).includes(a.code));

  return (
    <>
      <Drawer
        open
        onClose={requestClose}
        title="Invite people"
        width={480}
        band={theme === "grove"}
        summary={
          <span className="flex items-start gap-2 rounded-[14px] bg-subtle px-3.5 py-3 text-sm text-text" aria-live="polite">
            <Info size={16} strokeWidth={1.75} aria-hidden className="mt-0.5 shrink-0" />
            <span>{people === 0 ? "Add at least one email address." : summaryLine({ people, role, apps, appUsage, seatLimit: seats.limit })}{skipped ? ` ${skipped} ${skipped === 1 ? "address is" : "addresses are"} left out.` : ""}</span>
          </span>
        }
        footer={
          <>
            <Button onClick={requestClose}>Cancel</Button>
            <Button variant="primary" icon={UserPlus} loading={sending} disabled={!canSend} onClick={send}>{people > 1 ? `Send ${people} invites` : "Send invite"}</Button>
          </>
        }
      >
        <ol className="mb-5 flex items-center gap-2 text-[13px]" aria-label="Progress">
          {STEPS.map((s, i) => (
            <li key={s} className="flex items-center gap-2">
              <span className={cn("inline-flex size-6 items-center justify-center rounded-full text-xs font-medium", stepDone[i] ? "bg-primary text-on-primary" : "bg-subtle text-muted")}>{i + 1}</span>
              <span className={stepDone[i] ? "font-medium text-ink" : "text-muted"}>{s}</span>
              {i < STEPS.length - 1 ? <span aria-hidden className="mx-1 h-px w-5 bg-line" /> : null}
            </li>
          ))}
        </ol>

        {error ? <div className="mb-4"><Banner kind="danger">{error}</Banner></div> : null}
        {!check.ok && people > 0 ? (
          <div className="mb-4">
            <Banner kind="warning">
              {shortSeatsMessage(check.short)} Remove some people or an app to send now. Buying more seats arrives with Billing.
            </Banner>
          </div>
        ) : null}

        <div className="flex flex-col gap-6">
          <section aria-labelledby="inv-who" className="flex flex-col gap-4">
            <h3 id="inv-who" className="sr-only">Who</h3>
            <EmailChipsInput label="Email addresses" chips={chips} onChips={setChips} text={text} onText={setText} existing={existing} max={MAX_INVITES} help={`Paste several at once (up to ${MAX_INVITES})`} />
          </section>

          <section aria-labelledby="inv-role">
            <div className="mb-2 flex items-baseline justify-between"><h3 id="inv-role" className="text-sm font-medium text-ink">Role</h3><span className="text-xs text-muted">What they can do</span></div>
            <div role="radiogroup" aria-labelledby="inv-role" className="flex flex-col gap-2">
              {roles.map((r) => <RoleCard key={r} role={r} selected={role === r} onSelect={pickRole} theme={theme} />)}
            </div>
            {isManager ? <p className="mt-2 text-xs text-muted">Managers invite Members. They will report to you.</p> : null}
          </section>

          {role === "CLIENT" ? (
            clients.length > 0 ? (
              <Select label="Which client is this?" required value={clientId} onChange={(e) => setClientId(e.target.value)} help="They will only see this client's records." options={[{ value: "", label: "Choose a client" }, ...clients.map((c) => ({ value: c.id, label: c.name }))]} />
            ) : (
              <Banner kind="info">You have no clients yet. This person can be linked to a client once you add one.</Banner>
            )
          ) : null}

          <section aria-labelledby="inv-apps">
            <div className="mb-2 flex items-baseline justify-between"><h3 id="inv-apps" className="text-sm font-medium text-ink">Apps they can open</h3><span className="text-xs text-muted">{role === "ADMIN" ? "Admins can open every app" : `${roleLabel(role)}s start with ${defaultApps(role).map(appLabel).join(", ")}`}</span></div>
            <ul className="flex flex-col divide-y divide-line rounded-[var(--control-radius)] border border-line">
              {visibleApps.map((a) => {
                const on = finalApps.includes(a.code);
                const left = seatsLeft(appUsage, seats.limit, a.code);
                const short = usesSeats(role) && on && people > left;
                return (
                  <li key={a.code} className="flex items-center gap-3 px-3.5 py-2.5">
                    <span aria-hidden className="size-2.5 rounded-full" style={{ background: a.dot }} />
                    <span className="flex-1 text-ink">{a.label}</span>
                    {usesSeats(role) ? <span className={cn("text-xs", short ? "font-medium text-danger" : "text-muted")}>{left} {left === 1 ? "seat" : "seats"} left</span> : <span className="text-xs text-muted">Free for clients</span>}
                    <Toggle checked={on} disabled={role === "ADMIN"} label={`${a.label} access`} onChange={(v) => setApps((cur) => (v ? [...cur, a.code] : cur.filter((x) => x !== a.code)))} />
                  </li>
                );
              })}
            </ul>
            {needsApps ? <p className="mt-2 text-xs text-danger">Choose at least one app.</p> : null}
          </section>

          <Select
            label="Reports to"
            value={isManager ? viewer.membershipId : reportsToId}
            disabled={isManager}
            onChange={(e) => setReportsToId(e.target.value)}
            help={isManager ? "Managers' invitees report to them." : "They appear under this person on the team."}
            options={managerOptions.map((m) => ({ value: m.id, label: m.id === viewer.membershipId ? `${m.name} (you)` : m.name }))}
          />

          <div>
            <Textarea label="Personal note (optional)" value={note} maxLength={NOTE_MAX} onChange={(e) => setNote(e.target.value)} placeholder="Add a note to the invite email" help="Shown in the email, under your name." />
            <p className="mt-1 text-right text-xs text-muted tabular">{note.length}/{NOTE_MAX}</p>
          </div>
        </div>
      </Drawer>

      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirm(false)}
        onConfirm={() => { setConfirm(false); onClose(); }}
        title="Discard these invites?"
        consequence="Nothing has been sent. The addresses and choices you entered will be lost."
        confirmLabel="Discard"
      />
    </>
  );
}

/** The primary "Invite member" button for the page header. Opens the drawer by adding ?invite=1. */
export function InviteButton({ role, variant = "primary" }) {
  const router = useRouter();
  const pathname = usePathname();
  if (invitableRoles(role).length === 0) return null;
  return (
    <Button
      variant={variant}
      icon={UserPlus}
      onClick={() => {
        const next = new URLSearchParams(window.location.search);
        next.set("invite", "1");
        router.replace(`${pathname}?${next.toString()}`, { scroll: false });
      }}
    >
      Invite member
    </Button>
  );
}
