"use client";

/**
 * Switch in the new iOS style: a pill track and a glossy capsule thumb that stretches while pressed.
 * Track colours come from the theme (--toggle-on / --toggle-off); the size from --toggle-w / --toggle-h / --toggle-thumb.
 */
export function Toggle({ checked, onChange, disabled, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      data-checked={checked}
      onClick={() => onChange?.(!checked)}
      className="ui-toggle"
      style={{ background: checked ? "var(--toggle-on)" : "var(--toggle-off)" }}
    >
      <span aria-hidden className="ui-toggle-thumb" />
    </button>
  );
}
