import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { ACTIVE_TENANT_COOKIE, DEMO_USER_COOKIE } from "@/lib/auth/session";

export async function POST(request: Request) {
  const requestUrl = new URL(request.url);

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      await supabase.auth.signOut();
    } catch {}
  }

  cookies().delete(ACTIVE_TENANT_COOKIE);
  cookies().delete(DEMO_USER_COOKIE);

  return NextResponse.redirect(new URL("/login", requestUrl.origin));
}
