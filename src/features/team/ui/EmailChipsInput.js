"use client";
import { useId, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { classifyEmail, splitEmails } from "../invite-rules";

/**
 * Paste or type addresses; each becomes a chip. Commas, spaces, semicolons and new lines separate them, and an address
 * is checked when it becomes a chip (not while typing). Bad ones turn red and say why, in words, never colour alone.
 * @param {{ chips: {email:string,state:string,message?:string}[], onChips: (c:any[])=>void, text: string, onText: (t:string)=>void, existing: Map<string,string>, label: string, help?: string, onMaxed?: () => void, max: number }} props
 */
export function EmailChipsInput({ chips, onChips, text, onText, existing, label, help, max }) {
  const id = useId();
  const input = useRef(null);

  function add(raw) {
    const next = [...chips];
    for (const token of splitEmails(raw)) {
      const c = classifyEmail(token, existing);
      if (next.some((x) => x.email === c.email)) continue; // the same address twice is one chip
      if (next.length >= max) break;
      next.push(c);
    }
    onChips(next);
  }

  function commit() {
    if (!text.trim()) return;
    add(text);
    onText("");
  }

  function onKeyDown(e) {
    if (["Enter", ",", ";", " ", "Tab"].includes(e.key) && text.trim()) {
      e.preventDefault();
      commit();
    } else if (e.key === "Backspace" && !text && chips.length) {
      onChips(chips.slice(0, -1));
    }
  }

  function onPaste(e) {
    const pasted = e.clipboardData.getData("text");
    if (!/[\s,;]/.test(pasted.trim())) return; // a single address: let it be typed in normally
    e.preventDefault();
    add(`${text} ${pasted}`);
    onText("");
  }

  const problems = chips.filter((c) => c.state !== "ok");

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-medium text-ink">{label}<span className="text-danger" aria-hidden> *</span></label>
      <div onClick={() => input.current?.focus()} className="flex min-h-11 flex-wrap items-center gap-1.5 rounded-[var(--control-radius)] border border-[var(--line)] bg-input px-2.5 py-2 focus-within:border-accent" style={{ borderRadius: "var(--control-radius)" }}>
        {chips.map((c) => (
          <span key={c.email} className={cn("inline-flex h-7 max-w-full items-center gap-1 rounded-full pl-3 pr-1.5 text-[13px] font-medium", c.state === "ok" ? "bg-accent-soft text-on-accent-soft" : "bg-danger-soft text-danger")} title={c.message}>
            <span className="truncate">{c.email}</span>
            <button type="button" aria-label={`Remove ${c.email}`} onClick={(e) => { e.stopPropagation(); onChips(chips.filter((x) => x.email !== c.email)); input.current?.focus(); }} className="inline-flex size-5 items-center justify-center rounded-full hover:bg-black/10">
              <X size={12} strokeWidth={2} aria-hidden />
            </button>
          </span>
        ))}
        <input
          id={id}
          ref={input}
          type="text"
          inputMode="email"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          value={text}
          onChange={(e) => onText(e.target.value)}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
          onBlur={commit}
          placeholder={chips.length ? "Add another…" : "name@company.com"}
          aria-describedby={`${id}-msg`}
          className="min-w-[140px] flex-1 bg-transparent py-1 text-ink outline-none placeholder:text-muted"
        />
      </div>
      <div id={`${id}-msg`} aria-live="polite" className="text-xs">
        {problems.length ? (
          <ul className="flex flex-col gap-0.5 text-danger">
            {problems.map((p) => <li key={p.email}>{p.email}: {p.message}. {p.state === "invalid" ? "Fix or remove it." : "It won't be sent."}</li>)}
          </ul>
        ) : (
          <p className="text-muted">{help ?? "Paste several at once"}</p>
        )}
      </div>
    </div>
  );
}
