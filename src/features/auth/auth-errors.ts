import { isAuthError } from "@supabase/supabase-js";

// Supabase error codes -> words a person can act on.
// https://supabase.com/docs/guides/auth/debugging/error-codes
export function authErrorMessage(error: unknown): string {
  if (isAuthError(error)) {
    switch (error.code) {
      case "invalid_credentials":
        return "That email and password don't match an account.";
      case "user_already_exists":
      case "email_exists":
        return "An account with this email already exists. Sign in instead.";
      case "weak_password":
        return "Choose a longer password: at least 8 characters.";
      case "email_address_invalid":
        return "Check the email address.";
      case "over_request_rate_limit":
        return "Too many tries. Wait a minute, then try again.";
      case "signup_disabled":
        return "New accounts are closed right now.";
    }
    if (error.status === 0 || error.name === "AuthRetryableFetchError") {
      return "Can't reach Nouri. Check your connection and try again.";
    }
    return error.message;
  }
  return "Something went wrong. Try again.";
}
