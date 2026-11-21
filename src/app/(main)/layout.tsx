import type { ReactNode } from "react";
import { BottomNav } from "@/components/navigation/bottom-nav";
import { AuthGate } from "@/features/auth/auth-gate";

export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGate>
      <main className="mx-auto min-h-dvh w-full max-w-md px-4 pt-[env(safe-area-inset-top)] pb-[calc(3.5rem+env(safe-area-inset-bottom)+1.5rem)]">
        {children}
      </main>
      <BottomNav />
    </AuthGate>
  );
}
