"use client";
import { createContext, useContext } from "react";

const ThemeContext = createContext("glass");

/** Makes the current theme available to client components so they can choose their structure. */
export function ThemeProvider({ theme, children }) {
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
