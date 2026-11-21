"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            // Serve cached data first and let requests wait for a connection
            // instead of failing straight away; the app is used offline.
            networkMode: "offlineFirst",
            retry: 1,
          },
          mutations: { networkMode: "offlineFirst" },
        },
      }),
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
