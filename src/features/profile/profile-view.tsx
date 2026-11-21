"use client";

import { useState, type ReactNode } from "react";
import { SampleDataNote, ScreenHeader, SectionTitle } from "@/components/shared/screen";
import { SAMPLE_TARGETS } from "@/fixtures/sample-data";
import { formatKcal } from "@/utils/format";

export function ProfileView() {
  const [notice, setNotice] = useState<string | null>(null);
  const notConnected = (what: string) => () => setNotice(`${what} is not connected yet.`);
  const t = SAMPLE_TARGETS;

  return (
    <>
      <ScreenHeader title="Profile" />
      <SampleDataNote>The targets below are examples. Yours are set during sign-up.</SampleDataNote>

      <section className="mb-7 rounded-card border border-line bg-surface p-4">
        <p className="font-medium">Not signed in</p>
        <p className="mt-1 text-sm text-ink-muted">Sign in to keep your diary on every device and back it up.</p>
        <button type="button" onClick={notConnected("Sign-in")} className="mt-3 h-11 w-full rounded-lg bg-accent font-semibold text-accent-ink">
          Sign in or create an account
        </button>
      </section>

      {notice ? (
        <p role="status" className="-mt-4 mb-5 text-center text-sm text-ink-muted">
          {notice}
        </p>
      ) : null}

      <div className="space-y-7">
        <section>
          <SectionTitle aside={<EditButton onClick={notConnected("Editing targets")} />}>Daily targets</SectionTitle>
          <Rows>
            <Row label="Calories" value={`${formatKcal(t.calories)} kcal`} />
            <Row label="Protein" value={`${t.protein_g} g`} />
            <Row label="Carbs" value={`${t.carbohydrates_g} g`} />
            <Row label="Fat" value={`${t.fat_g} g`} />
          </Rows>
        </section>

        <section>
          <SectionTitle aside={<EditButton onClick={notConnected("Editing your details")} />}>About you</SectionTitle>
          <Rows>
            <Row label="Height" value={null} />
            <Row label="Weight" value={null} />
            <Row label="Activity" value={null} />
            <Row label="Goal" value={null} />
          </Rows>
          <p className="mt-2 text-xs text-ink-muted">All optional. Used only to suggest targets, which you can change.</p>
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
      </div>
    </>
  );
}

function EditButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="-my-3 px-2 py-3 text-sm font-medium text-accent">
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
