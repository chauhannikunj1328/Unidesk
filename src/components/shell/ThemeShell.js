import { GlassShell } from "@/themes/glass/Shell";
import { PastelShell } from "@/themes/pastel/Shell";
import { GroveShell } from "@/themes/grove/Shell";
import { ThemeProvider } from "./ThemeProvider";
import { CommandPaletteProvider } from "./CommandPalette";
import { DevThemeSwitcher } from "./DevThemeSwitcher";
import { ToastProvider } from "@/components/ui/Toast";

const SHELLS = { glass: GlassShell, pastel: PastelShell, grove: GroveShell };

/** Picks the shell for the current theme. Same pages render inside all three. */
export function ThemeShell({ theme, session, children }) {
  const Shell = SHELLS[theme] ?? GlassShell;
  return (
    <ThemeProvider theme={theme}>
      <ToastProvider>
        <CommandPaletteProvider apps={session.apps}>
          <Shell session={session}>{children}</Shell>
          <DevThemeSwitcher />
        </CommandPaletteProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
