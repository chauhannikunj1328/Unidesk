"use client";
import { useId, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "./cn";

const CONTROL =
  "w-full bg-input border border-[var(--line)] px-3.5 text-ink placeholder:text-muted outline-none transition-colors focus-visible:border-accent rounded-[var(--control-radius)]";

/** Shared wrapper: always-visible label, help text, and an error shown only after blur or submit. */
export function Field({ id, label, help, error, required, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-medium text-ink">
        {label}
        {required ? <span className="text-danger" aria-hidden> *</span> : null}
      </label>
      {children}
      {error ? (
        <p id={`${id}-msg`} className="text-xs text-danger">
          {error}
        </p>
      ) : help ? (
        <p id={`${id}-msg`} className="text-xs text-muted">
          {help}
        </p>
      ) : null}
    </div>
  );
}

function useTouched(onBlur) {
  const [touched, setTouched] = useState(false);
  return [touched, (e) => { setTouched(true); onBlur?.(e); }];
}

export function Input({ label, help, error, required, className, onBlur, showError, ...rest }) {
  const id = useId();
  const [touched, handleBlur] = useTouched(onBlur);
  const shown = touched || showError ? error : undefined;
  return (
    <Field id={id} label={label} help={help} error={shown} required={required}>
      <input id={id} required={required} aria-invalid={!!shown} aria-describedby={`${id}-msg`} onBlur={handleBlur} className={cn(CONTROL, "h-10", shown && "border-danger", className)} {...rest} />
    </Field>
  );
}

export function Textarea({ label, help, error, required, className, onBlur, ...rest }) {
  const id = useId();
  const [touched, handleBlur] = useTouched(onBlur);
  const shown = touched ? error : undefined;
  return (
    <Field id={id} label={label} help={help} error={shown} required={required}>
      <textarea id={id} required={required} aria-invalid={!!shown} aria-describedby={`${id}-msg`} onBlur={handleBlur} className={cn(CONTROL, "min-h-24 py-2.5 !rounded-[16px]", shown && "border-danger", className)} {...rest} />
    </Field>
  );
}

export function Select({ label, help, error, required, options = [], className, onBlur, ...rest }) {
  const id = useId();
  const [touched, handleBlur] = useTouched(onBlur);
  const shown = touched ? error : undefined;
  return (
    <Field id={id} label={label} help={help} error={shown} required={required}>
      <select id={id} required={required} aria-invalid={!!shown} aria-describedby={`${id}-msg`} onBlur={handleBlur} className={cn(CONTROL, "h-10", shown && "border-danger", className)} {...rest}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

/** Password field with a show/hide button. `showError` forces a server error to appear before the field is left. */
export function PasswordInput({ label, help, error, required, className, onBlur, showError, ...rest }) {
  const id = useId();
  const [touched, handleBlur] = useTouched(onBlur);
  const [visible, setVisible] = useState(false);
  const shown = touched || showError ? error : undefined;
  return (
    <Field id={id} label={label} help={help} error={shown} required={required}>
      <div className="relative">
        <input id={id} type={visible ? "text" : "password"} required={required} aria-invalid={!!shown} aria-describedby={`${id}-msg`} onBlur={handleBlur} className={cn(CONTROL, "h-10 pr-11", shown && "border-danger", className)} {...rest} />
        <button type="button" onClick={() => setVisible((v) => !v)} aria-label={visible ? "Hide password" : "Show password"} aria-pressed={visible} title={visible ? "Hide password" : "Show password"} className="absolute right-1.5 top-1/2 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-muted hover:text-ink">
          {visible ? <EyeOff size={16} strokeWidth={1.75} aria-hidden /> : <Eye size={16} strokeWidth={1.75} aria-hidden />}
        </button>
      </div>
    </Field>
  );
}

/** Checkbox with a label that may contain links. The error shows after submit or when `showError` is set. */
export function Checkbox({ label, error, showError, className, ...rest }) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-start gap-2.5">
        <input id={id} type="checkbox" aria-invalid={!!(showError && error)} aria-describedby={`${id}-msg`} className={cn("mt-0.5 size-4 accent-[var(--accent)]", className)} {...rest} />
        <label htmlFor={id} className="text-sm text-text">{label}</label>
      </div>
      {showError && error ? <p id={`${id}-msg`} className="text-xs text-danger">{error}</p> : null}
    </div>
  );
}
