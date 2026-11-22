"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { syncQueue } from "@/features/food-diary/sync-queue";
import { signOut } from "@/services/repositories/auth-repository";

// Drops every cached query and queued change too (on the device as well), so the next account on this device never sees
// the previous one's profile or diary.
export function useSignOut() {
  const queryClient = useQueryClient();
  return useCallback(async () => {
    await signOut();
    queryClient.clear();
    await syncQueue.reset();
  }, [queryClient]);
}
