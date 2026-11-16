"use client";

import * as React from "react";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/navigation/sidebar";
import { TopNav } from "@/components/navigation/top-nav";
import { NewLeadModal } from "@/components/modals/new-lead-modal";
import { Sparkles, ShieldCheck } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";

interface DashboardShellProps {
  children: React.ReactNode;
}

const AUTH_ROUTES = [
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/onboarding",
];

export function DashboardShell({ children }: DashboardShellProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [newLeadModalOpen, setNewLeadModalOpen] = useState(false);
  const { currentTenant, currentRole } = useAuth();

  // Standalone full-page view for authentication and onboarding routes
  if (AUTH_ROUTES.some((route) => pathname.startsWith(route))) {
    return <main className="min-h-screen bg-background">{children}</main>;
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar Navigation */}
      <Sidebar
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(!collapsed)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Top Header */}
        <TopNav
          onOpenMobileSidebar={() => setMobileOpen(true)}
          onOpenNewLeadModal={() => setNewLeadModalOpen(true)}
        />

        {/* Phase 2 Multi-Tenant Active Banner */}
        <div className="bg-gradient-to-r from-indigo-50/80 via-white to-blue-50/80 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/40 border-b border-indigo-100/80 dark:border-slate-800 px-4 py-2 text-xs flex flex-wrap items-center justify-between gap-2 shadow-xs">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-semibold text-slate-900 dark:text-white">Active Tenant:</span>
            <span className="px-2 py-0.5 rounded-md bg-indigo-100/70 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-200 font-medium">
              {currentTenant?.name || "Apex Institute of Technology"}
            </span>
            <code className="text-[11px] font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
              {currentTenant?.slug || "apex-tech"}
            </code>
            <span className="hidden sm:inline text-slate-300 dark:text-slate-700">|</span>
            <span className="hidden sm:inline text-slate-600 dark:text-slate-400">Role:</span>
            <span className="font-mono text-indigo-600 dark:text-indigo-400 font-semibold hidden sm:inline">
              {currentRole}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-2.5 py-0.5 rounded-full text-emerald-800 dark:text-emerald-300 font-medium">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>RLS Multi-Tenant Isolation Active</span>
          </div>
        </div>

        {/* Page Content Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Reusable New Lead Modal */}
      <NewLeadModal
        open={newLeadModalOpen}
        onOpenChange={setNewLeadModalOpen}
      />
    </div>
  );
}
