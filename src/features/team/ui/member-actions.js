"use client";
import { createContext, useContext, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog, Dialog } from "@/components/ui/Dialog";
import { Banner } from "@/components/ui/Banner";
import { Input, Select } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/components/ui/cn";
import { deactivateAction, reactivateAction, removeAction } from "../lifecycle-actions";
import { descendantIds } from "../filters";

/**
 * Deactivate, reactivate, remove (with a hand-over) and "make owner", for the whole Team page. One provider holds the
 * dialogs; the person panel, the table menu and the cards just call `ask`. Same in every theme.
 */
const Ctx = createContext(null);
export const useMemberActions = () => useContext(Ctx);

const ADMINS = ["OWNER", "ADMIN"];

export function MemberActionsProvider({ members, viewer, children }) {
  const toast = useToast();
  const router = useRouter();
  const [dialog, setDialog] = useState(null); // { kind: "deactivate" | "remove", member }
  const [busy, setBusy] = useState(false);

  /** What can be done to this person by the viewer. */
  const can = useMemo(() => (kind, m) => {
    if (!ADMINS.includes(viewer.role) || !m) return false;
    if (kind === "owner") return viewer.role === "OWNER" && m.role === "ADMIN" && m.status === "active";
    if (m.role === "OWNER" || m.id === viewer.membershipId) return false;
    if (kind === "deactivate") return m.status === "active";
    if (kind === "reactivate") return m.status === "inactive";
    if (kind === "remove") return m.status === "active" || m.status === "inactive";
    return false;
  }, [viewer]);

  async function reactivate(m) {
    const r = await reactivateAction({ membershipId: m.id });
    toast(r.ok ? { kind: "success", message: `${m.name} is active again.` } : { kind: "error", message: r.error });
  }

  const ask = (kind, m) => {
    if (kind === "reactivate") reactivate(m);
    else if (kind === "owner") router.push(`/hub/settings/ownership?to=${m.id}`);
    else setDialog({ kind, member: m });
  };

  async function confirmDeactivate() {
    setBusy(true);
    const r = await deactivateAction({ membershipId: dialog.member.id });
    setBusy(false);
    setDialog(null);
    toast(r.ok ? { kind: "success", message: `${r.name} was deactivated.`, onUndo: () => reactivateAction({ membershipId: dialog.member.id }).then(() => router.refresh()) } : { kind: "error", message: r.error });
  }

  return (
    <Ctx.Provider value={{ ask, can }}>
      {children}
      <ConfirmDialog
        open={dialog?.kind === "deactivate"}
        onClose={() => setDialog(null)}
        onConfirm={confirmDeactivate}
        title={`Deactivate ${dialog?.member.name}?`}
        consequence={`${dialog?.member.name.split(" ")[0]} won't be able to sign in. Their work and files stay as they are, and you can reactivate them any time. Their seat is freed.`}
        confirmLabel="Deactivate"
        loading={busy}
      />
      {dialog?.kind === "remove" ? <RemoveWizard member={dialog.member} members={members} viewer={viewer} onClose={() => setDialog(null)} /> : null}
    </Ctx.Provider>
  );
}

/** The two-step removal: hand over what they own, then type REMOVE. All or nothing on the server. */
function RemoveWizard({ member, members, viewer, onClose }) {
  const toast = useToast();
  const router = useRouter();
  const first = member.name.split(" ")[0];
  const heirs = members.filter((m) => m.id !== member.id && m.status === "active" && m.role !== "CLIENT");
  const below = useMemo(() => descendantIds(members.map((m) => ({ id: m.id, reportsToId: m.reportsToId })), member.id), [members, member.id]);
  const reports = members.filter((m) => m.reportsToId === member.id);
  const clients = member.ownedClients ?? [];
  const fallback = heirs.find((h) => h.id === member.reportsToId)?.id ?? heirs.find((h) => h.id === viewer.membershipId)?.id ?? heirs[0]?.id ?? "";
  const [step, setStep] = useState(1);
  const [clientsTo, setClientsTo] = useState(fallback);
  const [reportsTo, setReportsTo] = useState(heirs.find((h) => h.id === member.reportsToId && !below.has(h.id))?.id ?? heirs.find((h) => !below.has(h.id))?.id ?? "");
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const nothing = clients.length === 0 && reports.length === 0;

  async function remove() {
    setBusy(true); setError(null);
    const r = await removeAction({ membershipId: member.id, clientsTo: clients.length ? clientsTo : undefined, reportsTo: reports.length ? reportsTo : undefined, confirm: typed });
    setBusy(false);
    if (!r.ok) { setError(r.error); return; }
    onClose();
    const moved = [r.movedClients ? `${r.movedClients} ${r.movedClients === 1 ? "client" : "clients"} moved to ${r.clientsTo}` : null, r.movedReports ? `${r.movedReports} ${r.movedReports === 1 ? "person" : "people"} now report to ${r.reportsTo}` : null].filter(Boolean).join(". ");
    toast({ kind: "success", message: `${r.name} was removed.${moved ? ` ${moved}.` : ""}` });
    const q = new URLSearchParams(window.location.search); if (q.get("id") === member.id) { q.delete("id"); router.replace(`${window.location.pathname}${q.toString() ? `?${q}` : ""}`, { scroll: false }); }
  }

  const StepDot = ({ n, label }) => (
    <span className="flex items-center gap-2 text-[13px]">
      <span className={cn("inline-flex size-6 items-center justify-center rounded-full text-xs font-medium", step >= n ? "bg-primary text-on-primary" : "bg-subtle text-muted")}>{n}</span>
      <span className={step >= n ? "font-medium text-ink" : "text-muted"}>{label}</span>
    </span>
  );

  return (
    <Dialog
      open
      onClose={onClose}
      title={`Remove ${member.name}?`}
      width={520}
      footer={step === 1 ? (
        <><Button onClick={onClose}>Cancel</Button><Button variant="primary" disabled={(clients.length > 0 && !clientsTo) || (reports.length > 0 && !reportsTo)} onClick={() => setStep(2)}>Continue</Button></>
      ) : (
        <><Button onClick={() => { setStep(1); setError(null); }}>Back</Button><Button variant="danger" loading={busy} disabled={typed !== "REMOVE"} onClick={remove}>Remove from workspace</Button></>
      )}
    >
      <div className="mb-4 flex items-center gap-3" aria-label="Progress"><StepDot n={1} label="Hand over work" /><span aria-hidden className="h-px w-6 bg-line" /><StepDot n={2} label="Confirm" /></div>
      {error ? <div className="mb-3"><Banner kind="danger">{error}</Banner></div> : null}
      {step === 1 ? (
        <div className="flex flex-col gap-4">
          {nothing ? <p>{first} doesn&apos;t own any clients, and nobody reports to {first}. There is nothing to hand over.</p> : <p>{first} owns the work below. Choose who takes it over.</p>}
          {clients.length > 0 ? (
            <Select label={`${clients.length} ${clients.length === 1 ? "client" : "clients"} ${first} owns: give to`} value={clientsTo} onChange={(e) => setClientsTo(e.target.value)} help={clients.map((c) => c.name).join(", ")} options={heirs.map((h) => ({ value: h.id, label: h.name }))} />
          ) : null}
          {reports.length > 0 ? (
            <Select label={`New manager for ${reports.length} ${reports.length === 1 ? "person" : "people"}`} value={reportsTo} onChange={(e) => setReportsTo(e.target.value)} help={reports.map((r) => r.name).join(", ")} options={heirs.filter((h) => !below.has(h.id)).map((h) => ({ value: h.id, label: h.name }))} />
          ) : null}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <p>Remove {member.name} from your workspace? {first} loses access to all apps. Their past work stays in the history under their name.</p>
          <Input label="Type REMOVE to confirm" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" autoFocus />
        </div>
      )}
    </Dialog>
  );
}
