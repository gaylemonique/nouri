"use client";

import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { QueryClient, type Query } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { useState, type ReactNode } from "react";
import { deviceStore } from "@/infrastructure/storage/device-store";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

// What is kept on the device so the app opens with data while offline.
// Catalog search results are left out: they are many and quickly stale.
const PERSISTED = new Set(["profile", "goals", "diary", "recent-foods", "daily-totals", "foods"]);
const shouldPersist = (query: Query) =>
  query.state.status === "success" && PERSISTED.has(String(query.queryKey[0])) && query.queryKey[1] !== "search";

const persister = createAsyncStoragePersister({ storage: deviceStore, key: "nouri.query-cache" });

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            // Kept as long as the persisted copy, so a restored query is not
            // dropped from memory before it is used.
            gcTime: WEEK_MS,
            // Serve cached data first and let requests wait for a connection
            // instead of failing straight away; the app is used offline.
            networkMode: "offlineFirst",
            retry: 1,
          },
        },
      }),
  );

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: WEEK_MS,
        // Bump when a cached shape changes, so old caches are dropped.
        buster: "1",
        dehydrateOptions: { shouldDehydrateQuery: shouldPersist },
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
