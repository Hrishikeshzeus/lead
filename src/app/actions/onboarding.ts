"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { getServerAuthSession, ACTIVE_TENANT_COOKIE } from "@/lib/auth/session";

export interface OnboardingState {
  error?: string;
  success?: boolean;
}

export async function onboardInstituteAction(
  prevState: OnboardingState | null,
  formData: FormData
): Promise<OnboardingState> {
  const name = formData.get("name")?.toString().trim();
  const rawSlug = formData.get("slug")?.toString().trim();
  const contactEmail = formData.get("contactEmail")?.toString().trim();
  const contactPhone = formData.get("contactPhone")?.toString().trim() || null;
  const address = formData.get("address")?.toString().trim() || null;

  if (!name || !contactEmail) {
    return { error: "Institute name and admissions contact email are required." };
  }

  // Generate or sanitize slug
  const slug = (rawSlug || name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!slug || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
    return {
      error: "Invalid slug. Slug must contain only lowercase alphanumeric characters and hyphens.",
    };
  }

  const session = await getServerAuthSession();
  if (!session.isAuthenticated || !session.user) {
    return { error: "You must be authenticated to register an institute." };
  }

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();

      // Execute atomic onboarding RPC function
      const { data: tenantId, error: rpcError } = await supabase.rpc(
        "create_institute_onboarding",
        {
          inst_name: name,
          inst_slug: slug,
          inst_email: contactEmail,
          inst_phone: contactPhone,
          inst_address: address,
        }
      );

      if (rpcError) {
        return { error: rpcError.message };
      }

      // Set current tenant cookie to new institute
      cookies().set(ACTIVE_TENANT_COOKIE, tenantId, {
        path: "/",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
      });
    } catch (err: any) {
      return { error: err.message || "Failed to register institute on Supabase." };
    }
  } else {
    // In dev shell mode without live Supabase credentials
    cookies().set(ACTIVE_TENANT_COOKIE, `inst-${slug}`, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
    });
  }

  redirect("/");
}
