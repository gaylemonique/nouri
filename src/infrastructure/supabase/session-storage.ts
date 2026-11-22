import type { SupportedStorage } from "@supabase/supabase-js";
import { deviceStore } from "@/infrastructure/storage/device-store";

// Supabase keeps the session (access and refresh token) in device storage,
// which the OS does not clear under storage pressure the way it can clear
// WebView localStorage.
export const sessionStorage: SupportedStorage = deviceStore;
