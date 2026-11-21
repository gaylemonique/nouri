import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  // Placeholder. The app id cannot change after the first store release, so
  // confirm the final one before phase 08.
  appId: "com.nouri.app",
  appName: "Nouri",
  webDir: "out",
  server: { androidScheme: "https" },
};

export default config;
