"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  completeOnboarding,
  fetchGoals,
  fetchProfile,
  saveGoals,
  type GoalsInput,
  type NutritionGoals,
  type Profile,
} from "@/services/repositories/profile-repository";

export const profileKeys = {
  profile: (userId: string) => ["profile", userId] as const,
  goals: (userId: string) => ["goals", userId] as const,
};

export function useProfile(userId: string | undefined) {
  return useQuery({
    queryKey: profileKeys.profile(userId ?? ""),
    queryFn: () => fetchProfile(userId!),
    enabled: Boolean(userId),
  });
}

export function useGoals(userId: string | undefined) {
  return useQuery({
    queryKey: profileKeys.goals(userId ?? ""),
    queryFn: () => fetchGoals(userId!),
    enabled: Boolean(userId),
  });
}

// Optimistic: the new targets show at once and roll back if the save fails.
export function useSaveGoals(userId: string) {
  const queryClient = useQueryClient();
  const key = profileKeys.goals(userId);
  return useMutation({
    mutationFn: (input: GoalsInput) => saveGoals(input),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<NutritionGoals | null>(key);
      queryClient.setQueryData<NutritionGoals | null>(key, (old) =>
        old ? { ...old, ...input } : { id: "pending", user_id: userId, updated_at: new Date().toISOString(), ...input },
      );
      return { previous };
    },
    onError: (_error, _input, context) => {
      queryClient.setQueryData(key, context?.previous ?? null);
    },
    onSuccess: (saved) => {
      queryClient.setQueryData(key, saved);
    },
  });
}

// Goals first, then the profile flag, so a failure in between leaves the user
// on onboarding with nothing lost; saving again is safe (goals upsert).
export function useCompleteOnboarding(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ displayName, goals }: { displayName: string | null; goals: GoalsInput }) => {
      const savedGoals = await saveGoals(goals);
      const profile = await completeOnboarding(userId, displayName);
      return { savedGoals, profile };
    },
    onSuccess: ({ savedGoals, profile }) => {
      queryClient.setQueryData<NutritionGoals>(profileKeys.goals(userId), savedGoals);
      queryClient.setQueryData<Profile>(profileKeys.profile(userId), profile);
    },
  });
}
