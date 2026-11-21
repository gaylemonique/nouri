import type { Metadata } from "next";
import { RedirectIfSignedIn } from "@/features/auth/redirect-if-signed-in";
import { SignInView } from "@/features/auth/sign-in-view";

export const metadata: Metadata = { title: "Sign in · Nouri" };

export default function SignInPage() {
  return (
    <RedirectIfSignedIn>
      <SignInView />
    </RedirectIfSignedIn>
  );
}
