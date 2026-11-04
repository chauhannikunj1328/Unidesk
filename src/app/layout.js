import { Inter, Instrument_Serif, Plus_Jakarta_Sans, Geist } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const instrumentSerif = Instrument_Serif({ variable: "--font-instrument-serif", subsets: ["latin"], weight: "400" });
const jakarta = Plus_Jakarta_Sans({ variable: "--font-jakarta", subsets: ["latin"] });
const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata = {
  title: "Unidesk",
  description: "One login and one shared client record across the Hub and every app.",
};

const THEMES = ["glass", "pastel", "grove"];

export default async function RootLayout({ children }) {
  // Phase 0: the theme comes from a cookie. Hub flow 24 replaces this with user.theme and organization.defaultTheme.
  const cookieTheme = (await cookies()).get("theme")?.value;
  const theme = THEMES.includes(cookieTheme) ? cookieTheme : "glass";
  return (
    <html lang="en" data-theme={theme} className={`${inter.variable} ${instrumentSerif.variable} ${jakarta.variable} ${geist.variable}`}>
      <body>{children}</body>
    </html>
  );
}
