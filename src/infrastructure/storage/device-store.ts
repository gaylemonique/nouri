import { Preferences } from "@capacitor/preferences";

// Key-value storage that survives app restarts: SharedPreferences on Android,
// UserDefaults on iOS, localStorage in a browser. Holds the auth session, the
// offline query cache and the write queue.
//
// ponytail: fine while the persisted cache stays small (a few hundred KB:
// recent days, profile, the browse lists; search results are not kept).
// Move to SQLite (@capacitor-community/sqlite) behind this same interface if
// it grows, for example to cache the whole catalog for offline search.
export const deviceStore = {
  async getItem(key: string): Promise<string | null> {
    const { value } = await Preferences.get({ key });
    return value;
  },
  async setItem(key: string, value: string): Promise<void> {
    await Preferences.set({ key, value });
  },
  async removeItem(key: string): Promise<void> {
    await Preferences.remove({ key });
  },
};
