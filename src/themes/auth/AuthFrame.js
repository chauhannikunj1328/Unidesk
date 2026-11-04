import Link from "next/link";

/** Logo mark, used on every auth screen. */
export function Logo({ light }) {
  return (
    <Link href="/hub" className="inline-flex items-center gap-2.5 font-display-theme text-2xl" style={light ? { color: "#fff" } : undefined}>
      <span aria-hidden className="inline-flex size-8 items-center justify-center rounded-lg text-sm" style={{ background: light ? "#fff" : "var(--primary)", color: light ? "#14260b" : "var(--on-primary)", fontStyle: "normal", fontFamily: "var(--font-ui)" }}>U</span>
      Unidesk
    </Link>
  );
}

const FACTS = ["One login for the Hub and all seven apps", "One shared client record, set up once", "Turn on only the apps your firm needs"];

/**
 * Public page (P9), no app shell. A different structure per theme (12-Theme-Pattern-Language.md):
 * glass: frosted card on the warm gradient. pastel: big rounded card on the grey canvas.
 * grove: split screen, green gradient panel left, form right.
 */
export function AuthFrame({ theme, children }) {
  if (theme === "grove") {
    return (
      <div className="grid min-h-screen grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] max-[900px]:grid-cols-1" style={{ background: "var(--card)" }}>
        <aside className="relative flex flex-col justify-between overflow-hidden p-12 text-white max-[900px]:hidden" style={{ background: "var(--header-bg)" }}>
          <div aria-hidden className="absolute inset-0 bg-black/35" />
          <div className="relative"><Logo light /></div>
          <div className="relative">
            <h2 className="font-display-theme text-[44px] leading-[1.05]" style={{ color: "#fff" }}>One login. Every app.</h2>
            <ul className="mt-8 flex flex-col gap-3 text-lg text-white/95">
              {FACTS.map((f) => <li key={f} className="flex items-center gap-3"><span aria-hidden className="size-2 rounded-full bg-[#a6c64a]" />{f}</li>)}
            </ul>
          </div>
          <p className="relative text-sm text-white/85">Built by RV Accounting Solutions</p>
        </aside>
        <main className="flex items-center justify-center p-8">
          <div className="w-full max-w-[420px]">
            <div className="mb-10 min-[901px]:hidden"><Logo /></div>
            {children}
          </div>
        </main>
      </div>
    );
  }

  if (theme === "pastel") {
    return (
      <div className="flex min-h-screen items-center justify-center p-6" style={{ background: "var(--bg)" }}>
        <main className="w-full max-w-[460px] bg-white p-10 max-[480px]:p-6" style={{ borderRadius: "32px", boxShadow: "var(--shadow-float)" }}>
          <div className="mb-8"><Logo /></div>
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6" style={{ background: "var(--bg)", backgroundAttachment: "fixed" }}>
      <main className="w-full max-w-[420px] p-9 max-[480px]:p-6" style={{ background: "rgba(255,255,255,0.84)", backdropFilter: "blur(30px)", WebkitBackdropFilter: "blur(30px)", borderRadius: "32px", boxShadow: "var(--shadow-float)" }}>
        <div className="mb-8"><Logo /></div>
        {children}
      </main>
    </div>
  );
}
