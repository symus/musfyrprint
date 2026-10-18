"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Logo } from "@/components/brand/Logo";
import { postJson } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(
    params.get("reason") === "forbidden" ? "Your account does not have back-office access." : null,
  );
  const [sending, setSending] = useState(false);

  return (
    <form
      className="card w-full max-w-sm space-y-5 p-8"
      onSubmit={async (e) => {
        e.preventDefault();
        setSending(true);
        setError(null);
        try {
          await postJson("/api/v1/auth/login", { email, password });
          router.replace("/admin");
        } catch (err) {
          setError(
            err instanceof ApiError
              ? err.status === 429 ? "Too many attempts. Please wait a few minutes." : (err.problem.detail ?? "Sign-in failed.")
              : "Network error. Please try again.",
          );
        } finally {
          setSending(false);
        }
      }}
    >
      <Logo />
      <h1 className="text-2xl font-extrabold">Staff sign-in</h1>
      <div>
        <label htmlFor="email" className="label">E-mail</label>
        <input id="email" type="email" autoComplete="username" required className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div>
        <label htmlFor="password" className="label">Password</label>
        <input id="password" type="password" autoComplete="current-password" required className="input" value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      <button type="submit" className="btn btn-primary w-full" disabled={sending}>{sending ? "Signing in…" : "Sign in"}</button>
    </form>
  );
}
