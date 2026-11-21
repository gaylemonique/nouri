"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useProfile } from "@/features/profile/use-profile";
import { useSession } from "./use-session";
import { useSignOut } from "./use-sign-out";

// The app is a static bundle, so there is no server to redirect. This decides
// on the device: no session -> sign-in, profile not set up -> onboarding.
// RLS is what protects the data; this only picks the screen.
export function AuthGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { status, session } = useSession();
  const signOut = useSignOut();
  const profile = useProfile(session?.user.id);
  const needsOnboarding = profile.data ? !profile.data.onboarding_completed_at : false;

  useEffect(() => {
    if (status === "signed-out") router.replace("/sign-in/");
    else if (needsOnboarding) router.replace("/onboarding/");
  }, [status, needsOnboarding, router]);

  if (status !== "signed-in" || needsOnboarding) return <Loading />;

  if (profile.isError && !profile.data) {
    return (
      <div className="mx-auto max-w-md px-4 pt-24 text-center">
        <p className="font-medium">Couldn&apos;t load your profile.</p>
        <p className="mt-1 text-sm text-ink-muted">Check your connection, then try again.</p>
        <button type="button" onClick={() => void profile.refetch()} className="mt-5 h-11 w-full rounded-lg bg-accent font-semibold text-accent-ink">
          Try again
        </button>
        <button type="button" onClick={() => void signOut()} className="mt-2 h-11 w-full text-sm text-ink-muted hover:text-ink">
          Sign out
        </button>
      </div>
    );
  }

  // ponytail: on an offline cold start the profile query pauses with nothing
  // cached, and the user is let in rather than kept on a blank screen. The
  // offline cache (phase 07) persists the profile and removes this case.
  if (profile.isPending && profile.fetchStatus !== "paused") return <Loading />;

  return <>{children}</>;
}

function Loading() {
  return (
    <p role="status" className="sr-only">
      Loading
    </p>
  );
}
