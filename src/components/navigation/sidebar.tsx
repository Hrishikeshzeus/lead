"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  CalendarClock,
  Calendar,
  GraduationCap,
  BookOpen,
  UserCheck,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  School,
  Building2,
  ShieldAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/components/auth/auth-provider";

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  badge?: string | number;
  badgeVariant?: "default" | "secondary" | "destructive" | "warning";
}

const NAV_ITEMS: NavItem[] = [
  {
    title: "Overview",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    title: "Leads",
    href: "/leads",
    icon: Users,
    badge: "6 New",
    badgeVariant: "secondary",
  },
  {
    title: "Conversations",
    href: "/conversations",
    icon: MessageSquare,
    badge: "1",
    badgeVariant: "default",
  },
  {
    title: "Follow-ups",
    href: "/follow-ups",
    icon: CalendarClock,
    badge: "4",
    badgeVariant: "warning",
  },
  {
    title: "Appointments",
    href: "/appointments",
    icon: Calendar,
  },
  {
    title: "Courses",
    href: "/courses",
    icon: GraduationCap,
  },
  {
    title: "Knowledge Base",
    href: "/knowledge-base",
    icon: BookOpen,
  },
  {
    title: "Team",
    href: "/team",
    icon: UserCheck,
  },
  {
    title: "Analytics",
    href: "/analytics",
    icon: BarChart3,
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
  },
];

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export function Sidebar({
  collapsed,
  onToggleCollapse,
  mobileOpen = false,
  onCloseMobile,
}: SidebarProps) {
  const pathname = usePathname();
  const { user, currentTenant, currentRole } = useAuth();

  const isItemActive = (href: string) => {
    if (href === "/") {
      return pathname === "/" || pathname === "/overview";
    }
    return pathname.startsWith(href);
  };

  const formatRole = (role?: string | null) => {
    if (!role) return "Staff";
    switch (role) {
      case "super_admin":
        return "Super Admin";
      case "institute_admin":
        return "Institute Admin";
      case "counsellor":
        return "Admissions Counsellor";
      default:
        return role;
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return "AF";
    return name
      .split(" ")
      .map((part) => part[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={cn(
          "fixed top-0 bottom-0 left-0 z-40 flex flex-col border-r border-border bg-card transition-all duration-300 lg:static",
          collapsed ? "w-16" : "w-64",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between border-b border-border px-4">
          <Link
            href="/"
            className={cn(
              "flex items-center gap-3 font-semibold transition-opacity hover:opacity-90 overflow-hidden",
              collapsed && "justify-center w-full"
            )}
            onClick={onCloseMobile}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm shadow-primary/25">
              <School className="h-5 w-5" />
            </div>
            {!collapsed && (
              <div className="flex flex-col min-w-0">
                <span className="text-base font-bold tracking-tight text-foreground flex items-center gap-1.5 truncate">
                  AdmitFlow
                  <span className="text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full shrink-0">
                    Phase 2
                  </span>
                </span>
                <span className="text-[11px] text-muted-foreground leading-none truncate" title={currentTenant?.name}>
                  {currentTenant?.name || "Admissions Workspace"}
                </span>
              </div>
            )}
          </Link>

          {!collapsed && (
            <button
              onClick={onToggleCollapse}
              aria-label="Collapse sidebar"
              className="hidden lg:flex h-7 w-7 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-colors shrink-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
        </div>

        {collapsed && (
          <div className="hidden lg:flex justify-center py-2 border-b border-border/50">
            <button
              onClick={onToggleCollapse}
              aria-label="Expand sidebar"
              className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Navigation Link List */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {!collapsed && (
            <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">
              Recruitment & Workflow
            </div>
          )}

          {NAV_ITEMS.map((item) => {
            const active = isItemActive(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={true}
                onClick={onCloseMobile}
                title={collapsed ? item.title : undefined}
                className={cn(
                  "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all relative select-none",
                  active
                    ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  collapsed && "justify-center px-2"
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0 transition-transform group-hover:scale-110",
                    active ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
                  )}
                />
                {!collapsed && (
                  <span className="flex-1 truncate">{item.title}</span>
                )}
                {!collapsed && item.badge && (
                  <Badge
                    variant={active ? "secondary" : item.badgeVariant || "secondary"}
                    className={cn(
                      "ml-auto text-[10px] px-1.5 py-0 h-5 font-semibold",
                      active && "bg-white/20 text-white border-transparent"
                    )}
                  >
                    {item.badge}
                  </Badge>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer with Verified User Profile & Role */}
        <div className="border-t border-border p-3">
          {!collapsed ? (
            <div className="flex items-center gap-3 rounded-lg bg-muted/40 p-2">
              <div className="relative shrink-0">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-xs border border-primary/20">
                  {getInitials(user?.fullName)}
                </div>
                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-background" />
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-xs font-semibold text-foreground truncate" title={user?.fullName}>
                  {user?.fullName || "Admissions Staff"}
                </span>
                <span className="text-[11px] text-muted-foreground truncate flex items-center gap-1">
                  {currentRole === "super_admin" && (
                    <ShieldAlert className="h-3 w-3 text-amber-500 shrink-0" />
                  )}
                  {formatRole(currentRole)}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex justify-center">
              <div className="relative" title={`${user?.fullName || "Staff"} (${formatRole(currentRole)})`}>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-xs border border-primary/20">
                  {getInitials(user?.fullName)}
                </div>
                <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-background" />
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
