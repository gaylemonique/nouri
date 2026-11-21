// Errors from PostgREST writes -> a sentence for the form.
export function saveErrorMessage(error: unknown): string {
  if (error instanceof TypeError) return "Can't reach Nouri. Check your connection and try again.";
  return "Couldn't save. Try again.";
}
