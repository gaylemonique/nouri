import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  // Final (confirmed 2026-11-22). It cannot change after the first Play
  // upload; android/app/build.gradle uses the same id.
  appId: "com.nouri.app",
  appName: "Nouri",
  webDir: "out",
  server: { androidScheme: "https" },
};

export default config;
