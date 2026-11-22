"use client";

import { useState, type ReactNode } from "react";
import { ScreenHeader, SectionTitle } from "@/components/shared/screen";
import { Sheet } from "@/components/ui/sheet";
import { useSession } from "@/features/auth/use-session";
import { useSignOut } from "@/features/auth/use-sign-out";
import { usePendingCount } from "@/features/food-diary/sync-queue";
import type { Profile } from "@/services/repositories/profile-repository";
import { formatKcal } from "@/utils/format";
import { DeleteAccount } from "./delete-account";
import { GoalsForm } from "./goals-form";
import { useGoals, useProfile, useSaveGoals } from "./use-profile";

const ACTIVITY: Record<NonNullable<Profile["activity_level"]>, string> = {
  sedentary: "Mostly sitting",
  light: "Lightly active",
  moderate: "Moderately active",
  active: "Active",
  very_active: "Very active",
};

const OBJECTIVE: Record<NonNullable<Profile["tracking_objective"]>, string> = {
  lose_weight: "Lose weight",
  maintain_weight: "Keep my weight",
  gain_weight: "Gain weight",
  track_only: "Just tracking",
};

const grams = (n: number | null | undefined) => (n === null || n === undefined ? null : `${n} g`);

export function ProfileView() {
  const { session } = useSession();
  // AuthGate renders this screen only with a session.
  const userId = session!.user.id;
  const profile = useProfile(userId);
  const goals = useGoals(userId);
  const saveGoals = useSaveGoals(userId);
  const signOut = useSignOut();
  const pending = usePendingCount();
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [editingGoals, setEditingGoals] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const p = profile.data;
  const g = goals.data;

  return (
    <>
      <ScreenHeader title="Profile" />

      <section className="mb-7 rounded-card border border-line bg-surface p-4">
        <p className="font-medium">{p?.display_name ?? "No name set"}</p>
        <p className="mt-0.5 text-sm text-ink-muted">{session!.user.email}</p>
      </section>

      <div className="space-y-7">
        <section>
          <SectionTitle aside={<EditButton label="Edit daily targets" onClick={() => setEditingGoals(true)} />}>Daily targets</SectionTitle>
          <Rows>
            <Row label="Calories" value={g ? `${formatKcal(g.calorie_goal)} kcal` : null} />
            <Row label="Protein" value={grams(g?.protein_goal_g)} />
            <Row label="Carbs" value={grams(g?.carbohydrates_goal_g)} />
            <Row label="Fat" value={grams(g?.fat_goal_g)} />
          </Rows>
          {saveGoals.isError ? (
            <p role="alert" className="mt-2 text-sm">
              Couldn&apos;t save your targets, so they are back to what they were. Try again.
            </p>
          ) : null}
        </section>

        <section>
          <SectionTitle aside={<EditButton label="Edit your details" onClick={() => setNotice("Editing your details is not built yet.")} />}>
            About you
          </SectionTitle>
          <Rows>
            <Row label="Height" value={p?.height_cm ? `${p.height_cm} cm` : null} />
            <Row label="Weight" value={p?.current_weight_kg ? `${p.current_weight_kg} kg` : null} />
            <Row label="Activity" value={p?.activity_level ? (ACTIVITY[p.activity_level] ?? null) : null} />
            <Row label="Goal" value={p?.tracking_objective ? (OBJECTIVE[p.tracking_objective] ?? null) : null} />
          </Rows>
          {notice ? (
            <p role="status" className="mt-2 text-sm text-ink-muted">
              {notice}
            </p>
          ) : (
            <p className="mt-2 text-xs text-ink-muted">All optional. Used only to suggest targets, which you can change.</p>
          )}
        </section>

        <section>
          <SectionTitle>About the numbers</SectionTitle>
          <div className="space-y-2 text-sm leading-relaxed text-ink-muted">
            <p>
              Plain foods like rice, eggs and fruit use USDA FoodData Central values. Filipino dishes are worked out from home recipes and
              marked Estimated, because the same dish can differ a lot between kitchens.
            </p>
            <p>Nouri shows estimates. It is not medical or dietary advice.</p>
          </div>
        </section>

        {/* Signing out deletes this device's queue; say so before that loses entries. */}
        {confirmSignOut && pending > 0 ? (
          <div role="alert" className="space-y-2 rounded-card border border-ink p-4">
            <p className="text-sm">
              {pending === 1 ? "1 change hasn't" : `${pending} changes haven't`} reached Nouri yet. Signing out now deletes{" "}
              {pending === 1 ? "it" : "them"} from this phone. Connect to the internet first to keep {pending === 1 ? "it" : "them"}.
            </p>
            <button type="button" onClick={() => void signOut()} className="h-12 w-full rounded-lg border border-ink font-medium">
              Sign out and delete {pending === 1 ? "it" : "them"}
            </button>
            <button type="button" onClick={() => setConfirmSignOut(false)} className="h-11 w-full text-sm text-ink-muted hover:text-ink">
              Stay signed in
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => (pending > 0 ? setConfirmSignOut(true) : void signOut())}
            className="h-12 w-full rounded-lg border border-line font-medium hover:border-ink-muted"
          >
            Sign out
          </button>
        )}

        <DeleteAccount email={session!.user.email} />
      </div>

      <Sheet open={editingGoals} onClose={() => setEditingGoals(false)} title="Daily targets">
        {editingGoals ? (
          <div className="pt-4">
            <GoalsForm
              initial={g ?? null}
              submitLabel="Save targets"
              onSubmit={async ({ goals: input }) => {
                // Optimistic: the rows update now; a failure rolls them back
                // and shows the message under the targets.
                saveGoals.mutate(input);
                setEditingGoals(false);
              }}
            />
          </div>
        ) : null}
      </Sheet>
    </>
  );
}

function EditButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} className="-my-3 px-2 py-3 text-sm font-medium text-accent">
      Edit
    </button>
  );
}

function Rows({ children }: { children: ReactNode }) {
  return <dl className="divide-y divide-line border-y border-line">{children}</dl>;
}

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex min-h-12 items-center justify-between">
      <dt>{label}</dt>
      <dd className={value ? "font-semibold" : "text-ink-muted"}>{value ?? "Not set"}</dd>
    </div>
  );
}
