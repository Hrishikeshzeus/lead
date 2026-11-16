"use client";

import * as React from "react";
import Link from "next/link";
import { useState } from "react";
import {
  School,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Mail,
  Sparkles,
  Building2,
  GraduationCap,
  Users,
  CalendarCheck,
  Bot,
  Zap,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { signInAction } from "@/app/actions/auth";

interface TestAccount {
  email: string;
  label: string;
  institution: string;
  slug: string;
  role: string;
  badgeVariant: "default" | "secondary" | "warning";
  accentColor: string;
}

const PRE_SEEDED_ACCOUNTS: TestAccount[] = [
  {
    email: "admin@apex.edu",
    label: "Apex Admin",
    institution: "Apex Institute of Tech",
    slug: "apex-tech",
    role: "institute_admin",
    badgeVariant: "default",
    accentColor: "from-blue-500 to-indigo-600",
  },
  {
    email: "counsellor@apex.edu",
    label: "Apex Counsellor",
    institution: "Apex Institute of Tech",
    slug: "apex-tech",
    role: "counsellor",
    badgeVariant: "secondary",
    accentColor: "from-sky-500 to-cyan-600",
  },
  {
    email: "admin@beacon.edu",
    label: "Beacon Admin",
    institution: "Beacon Academy",
    slug: "beacon-acad",
    role: "institute_admin",
    badgeVariant: "default",
    accentColor: "from-violet-500 to-purple-600",
  },
  {
    email: "superadmin@admitflow.com",
    label: "Super Admin",
    institution: "Platform Operations",
    slug: "global-hq",
    role: "super_admin",
    badgeVariant: "warning",
    accentColor: "from-amber-500 to-orange-600",
  },
];

export default function LoginPage() {
  const [email, setEmail] = useState("admin@apex.edu");
  const [password, setPassword] = useState("Password123!");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<string>("admin@apex.edu");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const result = await signInAction(null, formData);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  };

  const handleSelectAccount = (acc: TestAccount) => {
    setSelectedAccount(acc.email);
    setEmail(acc.email);
    setPassword("Password123!");
    setError(null);
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-slate-50 dark:bg-slate-950 font-sans selection:bg-indigo-500/20 selection:text-indigo-900">
      {/* Left Column: Brand Hero Visual Showcase */}
      <div className="relative hidden lg:flex lg:w-1/2 flex-col justify-between p-12 xl:p-16 bg-gradient-to-br from-indigo-950 via-slate-900 to-blue-950 text-white overflow-hidden">
        {/* Ambient Decorative Lighting & Grid */}
        <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none" />
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-violet-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Brand Top Header */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-500 to-blue-500 text-white shadow-lg shadow-indigo-500/30">
            <School className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold tracking-tight text-white">AdmitFlow</span>
              <span className="px-2 py-0.5 text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 rounded-full">
                Phase 2 Multi-Tenant
              </span>
            </div>
            <p className="text-xs text-slate-400">Education & Admissions Management CRM</p>
          </div>
        </div>

        {/* Central Value Proposition & Feature Highlights */}
        <div className="relative z-10 my-auto py-8 space-y-8 max-w-xl">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs text-indigo-200 shadow-sm">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              <span>Next-Gen Admissions Intelligence</span>
            </div>
            <h1 className="text-3xl xl:text-4xl font-extrabold tracking-tight text-white leading-[1.15]">
              Streamline prospective student conversion from first inquiry to enrolled.
            </h1>
            <p className="text-sm text-slate-300/90 leading-relaxed">
              Empower recruitment counselors with automated follow-ups, collision-free appointment scheduling, multi-tenant security isolation, and verified RAG admissions counseling.
            </p>
          </div>

          {/* Interactive Feature Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
            <div className="p-3.5 rounded-xl bg-white/5 backdrop-blur-md border border-white/10 hover:border-indigo-400/30 transition-colors">
              <div className="flex items-center gap-2.5 mb-1.5 text-indigo-300">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <span className="text-xs font-semibold text-white">Multi-Tenant Isolation</span>
              </div>
              <p className="text-[11px] text-slate-300">
                PostgreSQL RLS policies ensure Apex Institute and Beacon Academy never cross-access student records.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-white/5 backdrop-blur-md border border-white/10 hover:border-indigo-400/30 transition-colors">
              <div className="flex items-center gap-2.5 mb-1.5 text-indigo-300">
                <CalendarCheck className="h-4 w-4 text-sky-400" />
                <span className="text-xs font-semibold text-white">Collision-Free Booking</span>
              </div>
              <p className="text-[11px] text-slate-300">
                Database-enforced double-booking prevention with instant dynamic slot availability calculation.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-white/5 backdrop-blur-md border border-white/10 hover:border-indigo-400/30 transition-colors">
              <div className="flex items-center gap-2.5 mb-1.5 text-indigo-300">
                <Bot className="h-4 w-4 text-amber-300" />
                <span className="text-xs font-semibold text-white">Verified AI Counselor</span>
              </div>
              <p className="text-[11px] text-slate-300">
                Semantic institutional document search with strict fee and scholarship citations.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-white/5 backdrop-blur-md border border-white/10 hover:border-indigo-400/30 transition-colors">
              <div className="flex items-center gap-2.5 mb-1.5 text-indigo-300">
                <Zap className="h-4 w-4 text-indigo-400" />
                <span className="text-xs font-semibold text-white">Automated Follow-ups</span>
              </div>
              <p className="text-[11px] text-slate-300">
                Multi-channel re-engagement sequences with counselor review workflows and auto-stop safeguards.
              </p>
            </div>
          </div>
        </div>

        {/* Live Social Proof / Metric Pill */}
        <div className="relative z-10 flex items-center justify-between pt-6 border-t border-white/10 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Database RLS & Migrations Active</span>
          </div>
          <span className="text-slate-300 font-medium">100% Verified Suite Passing</span>
        </div>
      </div>

      {/* Right Column: High-Conversion Modern Auth Portal */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 lg:p-12 relative">
        <div className="w-full max-w-lg space-y-6">
          {/* Mobile Header Branding */}
          <div className="lg:hidden flex flex-col items-center text-center mb-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-600 text-white shadow-xl shadow-indigo-500/25 mb-3">
              <School className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              AdmitFlow CRM
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Multi-Tenant Admissions Management & Counselor Portal
            </p>
          </div>

          {/* Main Elevated Authentication Box */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none p-6 sm:p-8 space-y-6">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                  Staff Authentication
                </h2>
                <Badge variant="outline" className="text-[11px] px-2 py-0.5 border-indigo-200 text-indigo-700 dark:text-indigo-300 bg-indigo-50/50 dark:bg-indigo-950/50">
                  Pre-configured
                </Badge>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Choose a pre-seeded institutional role below or enter your login credentials:
              </p>
            </div>

            {/* Interactive Pre-seeded Test Accounts Grid */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                  Quick Login Demo Roles:
                </span>
                <span className="text-[11px] font-normal text-slate-400">1-Click autofill</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {PRE_SEEDED_ACCOUNTS.map((acc) => {
                  const isSelected = selectedAccount === acc.email;
                  return (
                    <button
                      key={acc.email}
                      type="button"
                      onClick={() => handleSelectAccount(acc)}
                      className={`group relative p-2.5 text-left rounded-xl border transition-all text-xs flex flex-col justify-between ${
                        isSelected
                          ? "border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 ring-1 ring-indigo-600 shadow-xs"
                          : "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-100/70 dark:hover:bg-slate-800/80 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                        <span className="font-semibold text-slate-900 dark:text-white text-[12px] flex items-center gap-1.5">
                          {acc.label}
                        </span>
                        {isSelected && (
                          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 text-white">
                            <Check className="h-2.5 w-2.5" />
                          </span>
                        )}
                      </div>

                      <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate w-full mb-1.5">
                        {acc.email}
                      </div>

                      <div className="flex items-center justify-between w-full pt-1 border-t border-slate-200/50 dark:border-slate-700/50">
                        <span className="text-[9px] font-mono text-slate-400 truncate">
                          {acc.slug}
                        </span>
                        <Badge
                          variant={acc.badgeVariant}
                          className="text-[9px] px-1.5 py-0 h-4 font-mono font-medium"
                        >
                          {acc.role}
                        </Badge>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Authentication Form */}
            <form onSubmit={handleSubmit} className="space-y-4 pt-1 border-t border-slate-100 dark:border-slate-800">
              {error && (
                <div className="p-3 text-xs bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-600 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Work Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="counselor@institution.edu"
                    className="pl-9 h-10 text-sm rounded-xl border-slate-200 dark:border-slate-700 focus-visible:ring-indigo-600"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setSelectedAccount("");
                    }}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Password
                  </Label>
                  <Link
                    href="/forgot-password"
                    className="text-xs text-indigo-600 dark:text-indigo-400 font-medium hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="••••••••"
                    className="pl-9 h-10 text-sm rounded-xl border-slate-200 dark:border-slate-700 focus-visible:ring-indigo-600"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-11 text-sm font-semibold rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white shadow-lg shadow-indigo-600/25 transition-all gap-2 mt-2"
                isLoading={loading}
              >
                Sign In to Workspace <ArrowRight className="h-4 w-4" />
              </Button>
            </form>

            {/* Footer Registration Link */}
            <div className="pt-2 text-center text-xs text-slate-500 border-t border-slate-100 dark:border-slate-800">
              Don&apos;t have an institute registered?{" "}
              <Link href="/signup" className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline">
                Register as an Institute
              </Link>
            </div>
          </div>

          {/* Compliance & Security Trust Badges */}
          <div className="flex flex-wrap items-center justify-center gap-4 text-[11px] text-slate-400 px-4">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
              PostgreSQL RLS Protected
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 text-indigo-500" />
              Multi-Tenant Architecture
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5 text-slate-500" />
              AES-256 Encrypted
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
