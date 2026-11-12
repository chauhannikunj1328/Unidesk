"use client";
import { useEffect, useState } from "react";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { useToast } from "@/components/ui/Toast";
import { restoreSharedDataAction, setSharedDataAction } from "../shared-data-actions";
import { applyChange, confirmationFor, countOn, toastText } from "../shared-data-rules";

export const COLUMN_HELP = { contacts: "People you work with", clients: "Companies you serve", projects: "Work for each client" };

/**
 * All the doing for Shared data, shared by every theme: each switch saves at once, warns before turning off something an
 * app needs, and can be undone. Returns what the screens render, plus `dialog`, which each screen renders once.
 * @param {{ code: string, label: string, settings: Record<string, boolean> }[]} serverApps
 */
export function useSharedData(serverApps) {
  const toast = useToast();
  const [apps, setApps] = useState(serverApps);
  const [ask, setAsk] = useState(null);
  const [last, setLast] = useState(null); // the last change, for "Undo last change"
  const [busy, setBusy] = useState(null);
  useEffect(() => setApps(serverApps), [serverApps]);

  const setRow = (code, settings) => setApps((list) => list.map((a) => (a.code === code ? { ...a, settings, count: countOn(settings) } : a)));

  async function restore(app, values, label) {
    setRow(app, values);
    const r = await restoreSharedDataAction({ app, values }).catch(() => null);
    if (!r?.ok) { toast({ kind: "error", message: `Couldn't update ${label}. Try again.` }); return; }
    setRow(app, r.settings);
    setLast(null);
    toast({ kind: "info", message: `${label} is back as it was.` });
  }

  async function apply(code, type, enabled) {
    const row = apps.find((a) => a.code === code);
    const previous = row.settings;
    setRow(code, applyChange(previous, type, enabled).next); // show it at once; the server has the last word
    setBusy(`${code}:${type}`);
    const r = await setSharedDataAction({ app: code, type, enabled }).catch(() => null);
    setBusy(null);
    if (!r?.ok) {
      setRow(code, previous);
      toast({ kind: "error", message: r?.error && !/valid/.test(r.error) ? r.error : `Couldn't update ${row.label}. Try again.` });
      return;
    }
    setRow(code, r.settings);
    if (!r.changed) return;
    setLast({ app: code, label: row.label, values: r.previous });
    toast({ kind: "success", message: toastText(row.label, type, enabled, r.note), onUndo: () => restore(code, r.previous, row.label) });
  }

  /** A switch was pressed. Turning something off that an app relies on asks first. */
  function request(code, type, enabled) {
    const row = apps.find((a) => a.code === code);
    if (!enabled) {
      const q = confirmationFor(code, type, row.settings);
      if (q) { setAsk({ code, type, ...q }); return; }
    }
    apply(code, type, enabled);
  }

  const dialog = (
    <ConfirmDialog
      open={!!ask}
      onClose={() => setAsk(null)}
      onConfirm={() => { const a = ask; setAsk(null); apply(a.code, a.type, false); }}
      title={ask?.title ?? ""}
      consequence={ask?.consequence ?? ""}
      confirmLabel="Turn off"
    />
  );

  return { apps, request, busy, last, undoLast: () => last && restore(last.app, last.values, last.label), dialog };
}
