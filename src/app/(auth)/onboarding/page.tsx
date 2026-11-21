import type { Metadata } from "next";
import { OnboardingView } from "@/features/auth/onboarding-view";

export const metadata: Metadata = { title: "Your targets · Nouri" };

export default function OnboardingPage() {
  return <OnboardingView />;
}
