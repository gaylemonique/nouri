import type { ReactNode } from "react";
import { BottomNav } from "@/components/navigation/bottom-nav";

export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <main className="mx-auto min-h-dvh w-full max-w-md px-4 pt-[env(safe-area-inset-top)] pb-[calc(3.5rem+env(safe-area-inset-bottom)+1.5rem)]">
        {children}
      </main>
      <BottomNav />
    </>
  );
}
