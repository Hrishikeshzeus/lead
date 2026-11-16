"use client";

import * as React from "react";
import Link from "next/link";
import {
  Menu,
  Search,
  Bell,
  Plus,
  Database,
  CheckCircle2,
  AlertCircle,
  Building2,
  LogOut,
  ChevronDown,
  Shield,
  User,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth/auth-provider";

interface TopNavProps {
  onOpenMobileSidebar: () => void;
  onOpenNewLeadModal: () => void;
}

export function TopNav({
  onOpenMobileSidebar,
  onOpenNewLeadModal,
}: TopNavProps) {
  const [supabaseConnected, setSupabaseConnected] = React.useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = React.useState(false);
  const { user, currentTenant, currentRole, switchTestAccount, signOut } = useAuth();

  React.useEffect(() => {
    setSupabaseConnected(isSupabaseConfigured());
  }, []);

  const getRoleBadgeVariant = (role?: string | null) => {
    switch (role) {
      case "super_admin":
        return "destructive";
      case "institute_admin":
        return "default";
      case "counsellor":
        return "secondary";
      default:
        return "outline";
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 px-4 lg:px-6">
      <div className="flex items-center gap-3">
        {/* Mobile menu trigger */}
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onOpenMobileSidebar}
          aria-label="Toggle navigation"
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Global Search Bar */}
        <div className="relative hidden md:flex items-center w-64 lg:w-80">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search leads, courses, counselors..."
            className="pl-9 h-9 bg-muted/40 focus:bg-background text-sm rounded-lg"
          />
        </div>

        {/* Active Institute Namespace Pill */}
        <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-card border shadow-xs">
          <Building2 className="h-4 w-4 text-primary shrink-0" />
          <div className="flex flex-col text-left">
            <span className="text-xs font-bold text-foreground leading-tight truncate max-w-[180px]">
              {currentTenant?.name || "Admissions Workspace"}
            </span>
            <span className="text-[10px] text-muted-foreground font-mono leading-none">
              slug: {currentTenant?.slug || "default"}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Test Accounts & Institute Switcher (for Phase 2 evaluation) */}
        <div className="relative">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAccountMenuOpen(!accountMenuOpen)}
            className="gap-1.5 h-9 text-xs"
          >
            <div className="flex items-center gap-1.5">
              <span className="font-semibold">{user?.fullName || "Switch Account"}</span>
              <Badge variant={getRoleBadgeVariant(currentRole)} className="text-[9px] px-1 py-0 h-4">
                {currentRole?.replace(/_/g, " ")}
              </Badge>
            </div>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground ml-1" />
          </Button>

          {accountMenuOpen && (
            <div
              className="absolute right-0 mt-2 w-72 rounded-xl border bg-popover p-2 text-popover-foreground shadow-xl z-50 animate-in fade-in zoom-in-95"
              onClick={() => setAccountMenuOpen(false)}
            >
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between border-b pb-2">
                <span>Phase 2 Test Accounts</span>
                <Sparkles className="h-3 w-3 text-amber-500" />
              </div>

              <div className="space-y-1 py-1.5 text-xs">
                <button
                  onClick={() => switchTestAccount("admin@apex.edu")}
                  className="w-full text-left p-2 rounded-lg hover:bg-muted flex flex-col gap-0.5 transition-colors"
                >
                  <div className="flex items-center justify-between font-semibold">
                    <span>Dr. Alan Turing</span>
                    <Badge variant="default" className="text-[9px] px-1 py-0">admin</Badge>
                  </div>
                  <span className="text-[11px] text-muted-foreground">Apex Institute (admin@apex.edu)</span>
                </button>

                <button
                  onClick={() => switchTestAccount("counsellor@apex.edu")}
                  className="w-full text-left p-2 rounded-lg hover:bg-muted flex flex-col gap-0.5 transition-colors"
                >
                  <div className="flex items-center justify-between font-semibold">
                    <span>Ada Lovelace</span>
                    <Badge variant="secondary" className="text-[9px] px-1 py-0">counsellor</Badge>
                  </div>
                  <span className="text-[11px] text-muted-foreground">Apex Institute (counsellor@apex.edu)</span>
                </button>

                <button
                  onClick={() => switchTestAccount("admin@beacon.edu")}
                  className="w-full text-left p-2 rounded-lg hover:bg-muted flex flex-col gap-0.5 transition-colors"
                >
                  <div className="flex items-center justify-between font-semibold">
                    <span>Dr. Grace Hopper</span>
                    <Badge variant="default" className="text-[9px] px-1 py-0">admin</Badge>
                  </div>
                  <span className="text-[11px] text-muted-foreground">Beacon University (admin@beacon.edu)</span>
                </button>

                <button
                  onClick={() => switchTestAccount("counsellor@beacon.edu")}
                  className="w-full text-left p-2 rounded-lg hover:bg-muted flex flex-col gap-0.5 transition-colors"
                >
                  <div className="flex items-center justify-between font-semibold">
                    <span>Claude Shannon</span>
                    <Badge variant="secondary" className="text-[9px] px-1 py-0">counsellor</Badge>
                  </div>
                  <span className="text-[11px] text-muted-foreground">Beacon University (counsellor@beacon.edu)</span>
                </button>

                <button
                  onClick={() => switchTestAccount("superadmin@admitflow.com")}
                  className="w-full text-left p-2 rounded-lg hover:bg-muted flex flex-col gap-0.5 transition-colors border-t mt-1 pt-1"
                >
                  <div className="flex items-center justify-between font-semibold">
                    <span>AdmitFlow SuperAdmin</span>
                    <Badge variant="destructive" className="text-[9px] px-1 py-0">super_admin</Badge>
                  </div>
                  <span className="text-[11px] text-muted-foreground">Global Audit (superadmin@admitflow.com)</span>
                </button>
              </div>

              <div className="border-t pt-1.5 mt-1">
                <Link
                  href="/onboarding"
                  className="block w-full text-left px-2 py-1.5 rounded-lg text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
                >
                  + Onboard New Institute
                </Link>
                <button
                  onClick={() => signOut()}
                  className="w-full text-left px-2 py-1.5 rounded-lg text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors flex items-center gap-1.5 mt-0.5"
                >
                  <LogOut className="h-3.5 w-3.5" /> Sign Out
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Primary Action Button: + New Lead */}
        <Button
          onClick={onOpenNewLeadModal}
          size="sm"
          className="gap-1.5 rounded-lg shadow-sm font-medium"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">New Lead</span>
        </Button>
      </div>
    </header>
  );
}
