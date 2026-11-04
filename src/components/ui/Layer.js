"use client";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

const FOCUSABLE = 'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

/**
 * Portal at the document root (never under the sidebar), Escape closes, focus is trapped and restored.
 * Used by Dialog and Drawer.
 */
export function Layer({ open, onClose, labelledBy, align = "center", children }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement;
    const node = ref.current;
    node?.querySelector(FOCUSABLE)?.focus();
    function onKey(e) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose?.();
      } else if (e.key === "Tab" && node) {
        const items = [...node.querySelectorAll(FOCUSABLE)];
        if (items.length === 0) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <div className={`fixed inset-0 z-50 flex ${align === "right" ? "justify-end" : "items-center justify-center p-4"}`}>
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden />
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby={labelledBy} className="relative flex max-h-full flex-col bg-card text-text" style={{ boxShadow: "var(--shadow-float)" }}>
        {children}
      </div>
    </div>,
    document.body
  );
}
