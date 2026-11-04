"use client";
import { createContext, useCallback, useContext, useState } from "react";
import { CircleAlert, CircleCheck, Info } from "lucide-react";

const ToastContext = createContext(null);
const ICONS = { success: CircleCheck, error: CircleAlert, info: Info };

/** Wrap the app once. `useToast()` returns `toast({ kind, message, onUndo })`. Announced politely; auto-dismisses after 8 seconds. */
export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const dismiss = useCallback((id) => setItems((xs) => xs.filter((x) => x.id !== id)), []);
  const toast = useCallback(
    ({ kind = "info", message, onUndo }) => {
      const id = Math.random().toString(36).slice(2);
      setItems((xs) => [...xs, { id, kind, message, onUndo }]);
      setTimeout(() => dismiss(id), 8000);
    },
    [dismiss]
  );
  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div aria-live="polite" className="fixed bottom-4 left-1/2 z-[60] flex -translate-x-1/2 flex-col gap-2">
        {items.map((t) => {
          const Icon = ICONS[t.kind] ?? Info;
          return (
            <div key={t.id} role="status" className="flex items-center gap-3 rounded-[var(--control-radius)] bg-primary px-4 py-3 text-on-primary" style={{ boxShadow: "var(--shadow-float)" }}>
              <Icon size={16} strokeWidth={1.75} aria-hidden />
              <span>{t.message}</span>
              {t.onUndo ? (
                <button type="button" className="font-medium underline" onClick={() => { t.onUndo(); dismiss(t.id); }}>
                  Undo
                </button>
              ) : null}
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const toast = useContext(ToastContext);
  if (!toast) throw new Error("useToast must be used inside ToastProvider");
  return toast;
}
