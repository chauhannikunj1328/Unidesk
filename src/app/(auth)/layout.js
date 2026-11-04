import { AuthFrame } from "@/themes/auth/AuthFrame";
import { ThemeProvider } from "@/components/shell/ThemeProvider";
import { DevThemeSwitcher } from "@/components/shell/DevThemeSwitcher";
import { ToastProvider } from "@/components/ui/Toast";
import { getAuthTheme } from "@/lib/theme";

export default async function AuthLayout({ children }) {
  const theme = await getAuthTheme();
  return (
    <ThemeProvider theme={theme}>
      <ToastProvider>
        <div data-theme={theme}>
          <AuthFrame theme={theme}>{children}</AuthFrame>
        </div>
        <DevThemeSwitcher />
      </ToastProvider>
    </ThemeProvider>
  );
}
