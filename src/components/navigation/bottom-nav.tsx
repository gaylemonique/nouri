"use client";

import { ChartColumn, CircleUser, House, NotebookPen, Search, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type Tab = { href: string; label: string; icon: LucideIcon };

const tabs: Tab[] = [
  { href: "/", label: "Home", icon: House },
  { href: "/diary/", label: "Diary", icon: NotebookPen },
  { href: "/discover/", label: "Discover", icon: Search },
  { href: "/progress/", label: "Progress", icon: ChartColumn },
  { href: "/profile/", label: "Profile", icon: CircleUser },
];

const normalize = (path: string) => (path.length > 1 ? path.replace(/\/+$/, "") : path);

export function BottomNav() {
  const pathname = normalize(usePathname() ?? "/");

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto grid max-w-md grid-cols-5">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = pathname === normalize(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-14 flex-col items-center justify-center gap-1 text-[0.6875rem] font-medium transition-colors duration-150 ${
                  active ? "text-accent" : "text-ink-muted hover:text-ink"
                }`}
              >
                <Icon aria-hidden size={22} strokeWidth={active ? 2.1 : 1.6} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
