"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { GoalsForm } from "@/features/profile/goals-form";
import { useCompleteOnboarding, useGoals, useProfile } from "@/features/profile/use-profile";
import { saveErrorMessage } from "./save-error";
import { useSession } from "./use-session";
import { useSignOut } from "./use-sign-out";

export function OnboardingView() {
  const router = useRouter();
  const { status, session } = useSession();
  const signOut = useSignOut();
  const userId = session?.user.id;
  const profile = useProfile(userId);
  const goals = useGoals(userId);
  const [error, setError] = useState<string | null>(null);

  const done = Boolean(profile.data?.onboarding_completed_at);
  const accountGone = profile.data === null;
  useEffect(() => {
    if (status === "signed-out") router.replace("/sign-in/");
    else if (accountGone) void signOut();
    else if (done) router.replace("/");
  }, [status, accountGone, done, router, signOut]);

  if (!userId || profile.isPending || goals.isPending || done || accountGone) return <p className="sr-only">Loading</p>;

  return (
    <>
      <header className="pt-10 pb-6">
        <p className="text-sm text-ink-muted">{session.user.email}</p>
        <h1 className="font-display text-[2rem] leading-tight tracking-[-0.01em]">Set your daily targets</h1>
        <p className="mt-2 text-ink-muted">Home and Progress compare each day with these. You can change them any time in Profile.</p>
      </header>
      <OnboardingForm userId={userId} initialGoals={goals.data ?? null} initialName={profile.data?.display_name ?? null} error={error} setError={setError} />
      <button
        type="button"
        onClick={() => void signOut()}
        className="mt-6 h-11 w-full text-sm text-ink-muted hover:text-ink"
      >
        Not you? Sign out
      </button>
    </>
  );
}

function OnboardingForm({
  userId,
  initialGoals,
  initialName,
  error,
  setError,
}: {
  userId: string;
  initialGoals: Parameters<typeof GoalsForm>[0]["initial"];
  initialName: string | null;
  error: string | null;
  setError: (e: string | null) => void;
}) {
  const complete = useCompleteOnboarding(userId);
  return (
    <GoalsForm
      askName
      initial={initialGoals}
      initialName={initialName}
      submitLabel="Start my diary"
      submitError={error}
      onSubmit={async (result) => {
        setError(null);
        try {
          await complete.mutateAsync(result);
        } catch (e) {
          setError(saveErrorMessage(e));
        }
      }}
    />
  );
}
