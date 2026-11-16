"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { ACTIVE_TENANT_COOKIE, DEMO_USER_COOKIE, TEST_ACCOUNTS } from "@/lib/auth/session";

export interface AuthActionState {
  error?: string;
  success?: string;
}

export async function signInAction(
  prevState: AuthActionState | null,
  formData: FormData
): Promise<AuthActionState> {
  const email = formData.get("email")?.toString().trim().toLowerCase();
  const password = formData.get("password")?.toString();

  if (!email || !password) {
    return { error: "Please provide both email and password." };
  }

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { error: error.message };
      }
    } catch (err: any) {
      return { error: err.message || "Failed to authenticate." };
    }
  } else {
    // If testing in dev shell mode with one of the test accounts or standard email
    cookies().set(DEMO_USER_COOKIE, email, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
    });

    if (TEST_ACCOUNTS[email]) {
      cookies().set(ACTIVE_TENANT_COOKIE, TEST_ACCOUNTS[email].tenant.id, {
        path: "/",
        httpOnly: true,
        sameSite: "lax",
      });
    }
  }

  redirect("/");
}

export async function signUpAction(
  prevState: AuthActionState | null,
  formData: FormData
): Promise<AuthActionState> {
  const fullName = formData.get("fullName")?.toString().trim();
  const email = formData.get("email")?.toString().trim().toLowerCase();
  const password = formData.get("password")?.toString();

  if (!fullName || !email || !password) {
    return { error: "All fields are required." };
  }

  if (password.length < 6) {
    return { error: "Password must be at least 6 characters." };
  }

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) {
        return { error: error.message };
      }

      if (data.user) {
        // Upsert profile
        await supabase.from("profiles").upsert({
          id: data.user.id,
          full_name: fullName,
          email,
        });
      }
    } catch (err: any) {
      return { error: err.message || "Failed to register user." };
    }
  } else {
    cookies().set(DEMO_USER_COOKIE, email, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
    });
  }

  redirect("/onboarding");
}

export async function forgotPasswordAction(
  prevState: AuthActionState | null,
  formData: FormData
): Promise<AuthActionState> {
  const email = formData.get("email")?.toString().trim().toLowerCase();

  if (!email) {
    return { error: "Please enter your email address." };
  }

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/reset-password`,
      });

      if (error) {
        return { error: error.message };
      }
    } catch (err: any) {
      return { error: err.message };
    }
  }

  return {
    success: "Password reset link has been dispatched to your email address.",
  };
}

export async function signOutAction(): Promise<void> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      await supabase.auth.signOut();
    } catch {}
  }

  cookies().delete(ACTIVE_TENANT_COOKIE);
  cookies().delete(DEMO_USER_COOKIE);
  redirect("/login");
}

export async function switchTestAccountAction(email: string): Promise<void> {
  const account = TEST_ACCOUNTS[email];
  if (account) {
    cookies().set(DEMO_USER_COOKIE, email, { path: "/", httpOnly: true });
    cookies().set(ACTIVE_TENANT_COOKIE, account.tenant.id, { path: "/", httpOnly: true });
  }
  redirect("/");
}
