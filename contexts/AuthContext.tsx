"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { User } from "firebase/auth";
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { createUserIfNew } from "@/lib/firestore/users";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string, displayName?: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setLoading(false);
      // Ensure /users/{uid} exists on first login (e.g. if created before we added this).
      if (u) {
        createUserIfNew(u.uid, {
          displayName: u.displayName ?? u.email ?? "",
          email: u.email ?? "",
        }).catch(() => {});
      }
    });
    return () => unsubscribe();
  }, []);

  const signUp = useCallback(
    async (email: string, password: string, displayName?: string) => {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      // On first signup, create /users/{uid} in Firestore (idempotent).
      await createUserIfNew(cred.user.uid, {
        displayName: displayName ?? cred.user.displayName ?? email,
        email: cred.user.email ?? email,
      });
    },
    []
  );

  const signIn = useCallback(async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  }, []);

  const signOut = useCallback(async () => {
    await firebaseSignOut(auth);
  }, []);

  const value: AuthContextValue = {
    user,
    loading,
    signUp,
    signIn,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (ctx === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
