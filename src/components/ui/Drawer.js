"use client";
import { useId } from "react";
import { X } from "lucide-react";
import { Layer } from "./Layer";
import { IconButton } from "./IconButton";

/** Right-side drawer, 460 to 520px. Optional summary line above the footer buttons. */
export function Drawer({ open, onClose, title, children, summary, footer, width = 500, band = false }) {
  const id = useId();
  return (
    <Layer open={open} onClose={onClose} labelledBy={id} align="right">
      <div style={{ width: `min(${width}px, 100vw)`, borderRadius: "var(--card-radius) 0 0 var(--card-radius)", overflow: "hidden" }} className="flex h-screen flex-col">
        {band ? (
          // Grove: the drawer header carries the band colour, with the same dark layer that keeps white text readable.
          <div data-on-image className="relative flex items-start justify-between gap-4 px-6 py-5 text-white" style={{ background: "var(--header-bg)" }}>
            <div aria-hidden className="pointer-events-none absolute inset-0 bg-black/35" />
            <h2 id={id} className="font-display-theme relative text-2xl" style={{ color: "#fff" }}>{title}</h2>
            <span className="relative"><IconButton icon={X} label="Close" onClick={onClose} className="!text-white" /></span>
          </div>
        ) : (
          <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-5">
            <h2 id={id} className="font-display-theme text-2xl">{title}</h2>
            <IconButton icon={X} label="Close" onClick={onClose} />
          </div>
        )}
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        <div className="border-t border-line px-6 py-4">
          {summary ? <p className="mb-3 text-muted">{summary}</p> : null}
          {footer ? <div className="flex justify-end gap-2">{footer}</div> : null}
        </div>
      </div>
    </Layer>
  );
}
