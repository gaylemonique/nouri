"use client";

import { useSyncExternalStore } from "react";
import { startOfDay } from "@/utils/format";

const subscribe = () => () => {};
let cached: Date | null = null;
const getToday = () => {
  const now = startOfDay(new Date());
  if (!cached || cached.getTime() !== now.getTime()) cached = now;
  return cached;
};

// Today's local date from the device, or null while prerendering. The static
// export is built once, so the date must never come from build time.
export function useToday(): Date | null {
  return useSyncExternalStore(subscribe, getToday, () => null);
}
