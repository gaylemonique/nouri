import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto min-h-dvh w-full max-w-md px-4 pt-[env(safe-area-inset-top)] pb-[calc(env(safe-area-inset-bottom)+2rem)]">
      {children}
    </main>
  );
}
