"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useSession } from "./use-session";

// Sign-in is only for signed-out people. Once a session exists, go home and
// let AuthGate send new accounts on to onboarding.
export function RedirectIfSignedIn({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { status } = useSession();
  useEffect(() => {
    if (status === "signed-in") router.replace("/");
  }, [status, router]);
  return status === "signed-out" ? <>{children}</> : <p role="status" className="sr-only">Loading</p>;
}
