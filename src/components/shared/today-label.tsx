"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};
const format = () =>
  new Intl.DateTimeFormat("en-PH", { weekday: "long", day: "numeric", month: "long" }).format(new Date());

// The date comes from the device at runtime. Rendering it at build time would
// freeze the export date into the bundle.
export function TodayLabel() {
  const label = useSyncExternalStore(subscribe, format, () => null);
  return <span suppressHydrationWarning>{label ?? " "}</span>;
}
