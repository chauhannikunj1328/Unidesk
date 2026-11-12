"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Drawer } from "@/components/ui/Drawer";
import { RolesMatrix } from "./RolesMatrix";

/** The pastel "Roles & permissions" pill and its read-only drawer (`?roles=1`, so the link can be shared). */
export function RolesPill() {
  const router = useRouter();
  const pathname = usePathname();
  return (
    <Button icon={ShieldCheck} onClick={() => { const q = new URLSearchParams(window.location.search); q.set("roles", "1"); router.replace(`${pathname}?${q}`, { scroll: false }); }}>Roles &amp; permissions</Button>
  );
}

export function RolesDrawerHost({ counts, yourRole }) {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []); // the drawer lives in a portal, which the server cannot render
  if (!mounted || sp.get("roles") !== "1") return null;
  const close = () => { const q = new URLSearchParams(window.location.search); q.delete("roles"); router.replace(q.toString() ? `${pathname}?${q}` : pathname, { scroll: false }); };
  return (
    <Drawer open onClose={close} title="Roles & permissions" width={900}>
      <p className="mb-4 text-text">What each role can do. A person&apos;s role is set on the People page; this only shows the rules.</p>
      <RolesMatrix counts={counts} yourRole={yourRole} />
    </Drawer>
  );
}
