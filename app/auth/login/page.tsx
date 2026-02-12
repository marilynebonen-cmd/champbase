"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { Layout } from "@/components/ui/Layout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { signIn } = useAuth();
  const router = useRouter();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await signIn(email, password);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    }
  }

  return (
    <Layout>
      <div className="max-w-md mx-auto animate-fade-in">
        <h1 className="heading-1 mb-8">Log in</h1>
        <Card>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="login-email" className="block text-sm font-medium text-[var(--muted-foreground)] mb-2">
                Email
              </label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--background)] px-4 py-3 text-[var(--foreground)] transition-base focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
              />
            </div>
            <div>
              <label htmlFor="login-password" className="block text-sm font-medium text-[var(--muted-foreground)] mb-2">
                Password
              </label>
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--background)] px-4 py-3 text-[var(--foreground)] transition-base focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
              />
            </div>
            {error && <p className="text-[var(--accent)] text-sm">{error}</p>}
            <Button type="submit" className="w-full" size="lg">
              Sign in
            </Button>
          </form>
          <p className="mt-6 caption">
            <Link href="/auth/signup" className="text-[var(--accent)] hover:text-[var(--accent-hover)] transition-base">
              Sign up
            </Link>
          </p>
        </Card>
      </div>
    </Layout>
  );
}
