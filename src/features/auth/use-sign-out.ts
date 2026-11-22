"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { outbox } from "@/features/food-diary/outbox";
import { signOut } from "@/services/repositories/auth-repository";

// Drops every cached query and unsaved entry too, so the next account on this device never sees
// the previous one's profile or diary.
export function useSignOut() {
  const queryClient = useQueryClient();
  return useCallback(async () => {
    await signOut();
    queryClient.clear();
    outbox.clear();
  }, [queryClient]);
}
