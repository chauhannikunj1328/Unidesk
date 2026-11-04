"use client";
import { useId } from "react";
import { X } from "lucide-react";
import { Layer } from "./Layer";
import { Button } from "./Button";
import { IconButton } from "./IconButton";

/** Centred dialog: title, body, footer. Escape closes, focus trapped. */
export function Dialog({ open, onClose, title, children, footer, width = 480 }) {
  const id = useId();
  return (
    <Layer open={open} onClose={onClose} labelledBy={id}>
      <div style={{ width: `min(${width}px, calc(100vw - 32px))`, borderRadius: "var(--card-radius)", overflow: "hidden" }} className="flex max-h-[calc(100vh-32px)] flex-col">
        <div className="flex items-start justify-between gap-4 px-6 pt-6">
          <h2 id={id} className="font-display-theme text-2xl">{title}</h2>
          <IconButton icon={X} label="Close" onClick={onClose} />
        </div>
        <div className="overflow-y-auto px-6 py-4">{children}</div>
        {footer ? <div className="flex justify-end gap-2 px-6 pb-6">{footer}</div> : null}
      </div>
    </Layer>
  );
}

/** For destructive actions: says exactly what will be lost. */
export function ConfirmDialog({ open, onClose, onConfirm, title, consequence, confirmLabel = "Confirm", loading }) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="danger" loading={loading} onClick={onConfirm}>{confirmLabel}</Button>
        </>
      }
    >
      <p>{consequence}</p>
    </Dialog>
  );
}
