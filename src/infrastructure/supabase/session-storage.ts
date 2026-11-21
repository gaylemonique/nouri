import { Preferences } from "@capacitor/preferences";
import type { SupportedStorage } from "@supabase/supabase-js";

// Supabase keeps the session (access and refresh token) here. On Android and
// iOS, Preferences writes to SharedPreferences / UserDefaults, which the OS
// does not clear under storage pressure the way it can clear WebView
// localStorage. In a browser the plugin falls back to localStorage.
export const sessionStorage: SupportedStorage = {
  async getItem(key) {
    const { value } = await Preferences.get({ key });
    return value;
  },
  async setItem(key, value) {
    await Preferences.set({ key, value });
  },
  async removeItem(key) {
    await Preferences.remove({ key });
  },
};
