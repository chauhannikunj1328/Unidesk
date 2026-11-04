"use client";
import { useTransition } from "react";
import { LogOut } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Menu } from "@/components/ui/Menu";
import { signOutAction } from "@/features/auth/actions";

/** The avatar opens a small menu with who you are and "Sign out". Settings and Appearance join it with Hub flow 24. */
export function ProfileMenu({ name, email, size = 36, className }) {
  const [pending, start] = useTransition();
  return (
    <Menu
      items={[{ heading: name, sub: email }, { separator: true }, { label: pending ? "Signing out…" : "Sign out", icon: LogOut, onSelect: () => start(async () => { await signOutAction(); }) }]}
      trigger={({ toggle }) => (
        <button type="button" onClick={toggle} aria-label={`Account menu for ${name}`} title={name} className="rounded-full">
          <Avatar name={name} size={size} className={className} />
        </button>
      )}
    />
  );
}
