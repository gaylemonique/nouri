"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { ChoiceGroup } from "@/components/ui/choice-group";
import { TextField } from "@/components/ui/text-field";
import { signIn, signUp } from "@/services/repositories/auth-repository";
import { authErrorMessage } from "./auth-errors";

type Mode = "sign-in" | "sign-up";

const schema = z.object({
  email: z.email("Enter an email address like name@example.com."),
  password: z.string().min(8, "Use at least 8 characters."),
});
type Values = z.infer<typeof schema>;

export function SignInView() {
  const [mode, setMode] = useState<Mode>("sign-in");
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { email: "", password: "" } });

  // On success the session listener fires and the page redirects; nothing to do here.
  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await (mode === "sign-in" ? signIn(values) : signUp(values));
    } catch (error) {
      setFormError(authErrorMessage(error));
    }
  });

  return (
    <>
      <header className="pt-14 pb-8">
        <h1 className="font-display text-[2.75rem] leading-none tracking-[-0.01em]">Nouri</h1>
        <p className="mt-3 text-ink-muted">A food diary that knows a cup of rice, a piece of pandesal and a bowl of sinigang.</p>
      </header>

      <ChoiceGroup
        label="Do you have an account?"
        value={mode}
        onChange={(m) => {
          setMode(m);
          setFormError(null);
        }}
        options={[
          { value: "sign-in", label: "Sign in" },
          { value: "sign-up", label: "Create account" },
        ]}
      />

      <form onSubmit={onSubmit} noValidate className="mt-6 space-y-4">
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          inputMode="email"
          autoCapitalize="none"
          spellCheck={false}
          error={errors.email?.message}
          {...register("email")}
        />
        <TextField
          label="Password"
          type={showPassword ? "text" : "password"}
          autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
          hint={mode === "sign-up" ? "At least 8 characters." : undefined}
          error={errors.password?.message}
          trailing={
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              aria-pressed={showPassword}
              className="h-full px-3 text-sm font-medium text-accent"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          }
          {...register("password")}
        />

        {formError ? (
          <p role="alert" className="rounded-lg border border-ink px-3 py-2 text-sm">
            {formError}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="h-12 w-full rounded-lg bg-accent font-semibold text-accent-ink disabled:opacity-60"
        >
          {isSubmitting ? "One moment…" : mode === "sign-in" ? "Sign in" : "Create account"}
        </button>
        {/* ponytail: no "forgot password" yet. Reset needs email, and the project
            has no SMTP sender (see README). Add it with custom SMTP. */}
      </form>

      <p className="mt-10 text-xs leading-relaxed text-ink-muted">Nouri shows estimates. It is not medical or dietary advice.</p>
    </>
  );
}
