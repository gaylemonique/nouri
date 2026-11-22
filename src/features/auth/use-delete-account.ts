"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { syncQueue } from "@/features/food-diary/sync-queue";
import { deleteAccount } from "@/services/repositories/auth-repository";

// After the server has deleted the account, nothing of it stays on the
// device either: cached queries and queued changes go too. The session
// listener then sends the app to sign-in.
export function useDeleteAccount() {
  const queryClient = useQueryClient();
  return useCallback(async () => {
    await deleteAccount();
    queryClient.clear();
    await syncQueue.reset();
  }, [queryClient]);
}
