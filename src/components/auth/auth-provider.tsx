"use client";

import * as React from "react";
import { createContext, useContext, useState } from "react";
import { AuthSession, Tenant, AppRole, UserProfile } from "@/lib/auth/types";
import { signOutAction, switchTestAccountAction } from "@/app/actions/auth";

interface AuthContextType {
  session: AuthSession;
  user: UserProfile | null;
  currentTenant: Tenant | null;
  currentRole: AppRole | null;
  switchTestAccount: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({
  children,
  initialSession,
}: {
  children: React.ReactNode;
  initialSession: AuthSession;
}) {
  const [session, setSession] = useState<AuthSession>(initialSession);

  const handleSwitchAccount = async (email: string) => {
    await switchTestAccountAction(email);
  };

  const handleSignOut = async () => {
    await signOutAction();
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session.user,
        currentTenant: session.currentTenant,
        currentRole: session.currentRole,
        switchTestAccount: handleSwitchAccount,
        signOut: handleSignOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
