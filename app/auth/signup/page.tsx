"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { Layout } from "@/components/ui/Layout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { signUp } = useAuth();
  const router = useRouter();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await signUp(email, password, displayName || undefined);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign up failed");
    }
  }

  return (
    <Layout>
      <div className="max-w-md mx-auto animate-fade-in">
        <h1 className="heading-1 mb-8">Sign up</h1>
        <Card>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="signup-displayName" className="block text-sm font-medium text-[var(--muted-foreground)] mb-2">
                Display name
              </label>
              <input
                id="signup-displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
                className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--background)] px-4 py-3 text-[var(--foreground)] placeholder:text-[var(--muted)] transition-base focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
              />
            </div>
            <div>
              <label htmlFor="signup-email" className="block text-sm font-medium text-[var(--muted-foreground)] mb-2">
                Email
              </label>
              <input
                id="signup-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--background)] px-4 py-3 text-[var(--foreground)] transition-base focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
              />
            </div>
            <div>
              <label htmlFor="signup-password" className="block text-sm font-medium text-[var(--muted-foreground)] mb-2">
                Password
              </label>
              <input
                id="signup-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--background)] px-4 py-3 text-[var(--foreground)] transition-base focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
              />
            </div>
            {error && <p className="text-[var(--accent)] text-sm">{error}</p>}
            <Button type="submit" className="w-full" size="lg">
              Create account
            </Button>
          </form>
          <p className="mt-6 caption">
            <Link href="/auth/login" className="text-[var(--accent)] hover:text-[var(--accent-hover)] transition-base">
              Log in
            </Link>
          </p>
        </Card>
      </div>
    </Layout>
  );
}
