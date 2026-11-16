"use client";

import * as React from "react";
import Link from "next/link";
import {
  Users,
  GraduationCap,
  Calendar,
  ClockAlert,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  Sparkles,
  ChevronRight,
  Filter,
  PlusCircle,
  CheckCircle2,
  PhoneCall,
  Mail,
  MessageSquare,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { SampleDataBadge } from "@/components/ui/sample-badge";
import {
  SAMPLE_METRICS,
  SAMPLE_FUNNEL,
  SAMPLE_LEADS,
  SAMPLE_APPOINTMENTS,
  SAMPLE_FOLLOW_UPS,
} from "@/lib/sample-data";

export default function OverviewPage() {
  const [filterSource, setFilterSource] = React.useState<string>("all");

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "enrolled":
        return "success";
      case "accepted":
        return "info";
      case "application_submitted":
        return "default";
      case "counseling_scheduled":
        return "warning";
      case "new":
        return "secondary";
      default:
        return "outline";
    }
  };

  const formatStatus = (status: string) => {
    return status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  return (
    <div className="space-y-8 animate-in fade-in-50">
      {/* Top Banner / Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/60 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Admissions Command Center
            </h1>
            <SampleDataBadge />
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time prospective student tracking, intake progress, and counselor action queue.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link href="/leads" prefetch={true}>
            <Button variant="outline" size="sm" className="gap-1.5 rounded-xl border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium">
              <Users className="h-4 w-4 text-indigo-600 dark:text-indigo-400" /> View All Leads
            </Button>
          </Link>
          <Link href="/analytics" prefetch={true}>
            <Button size="sm" className="gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white shadow-md shadow-indigo-600/20 font-medium">
              <TrendingUp className="h-4 w-4" /> Funnel Report
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {SAMPLE_METRICS.map((metric, i) => {
          const icons = [Users, GraduationCap, CheckCircle2, ClockAlert];
          const MetricIcon = icons[i % icons.length];
          const iconColors = [
            "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200/60 dark:border-indigo-800/40",
            "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 border-blue-200/60 dark:border-blue-800/40",
            "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200/60 dark:border-emerald-800/40",
            "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 border-amber-200/60 dark:border-amber-800/40",
          ];
          const colorClass = iconColors[i % iconColors.length];

          return (
            <Card
              key={i}
              className="rounded-2xl border-slate-200/80 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 bg-white dark:bg-slate-900"
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg border ${colorClass}`}>
                    <MetricIcon className="h-4 w-4" />
                  </div>
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {metric.title}
                  </CardTitle>
                </div>
                {metric.isPositive ? (
                  <span className="flex items-center justify-center h-6 w-6 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </span>
                ) : (
                  <span className="flex items-center justify-center h-6 w-6 rounded-full bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400">
                    <ArrowDownRight className="h-3.5 w-3.5" />
                  </span>
                )}
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                  {metric.value}
                </div>
                <div className="flex items-center gap-1.5 mt-2 text-xs">
                  <span
                    className={
                      metric.isPositive
                        ? "font-semibold text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40"
                        : "font-semibold text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/40"
                    }
                  >
                    {metric.change}
                  </span>
                  <span className="text-slate-400">· {metric.secondaryText}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Admissions Conversion Funnel & Quick Action Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recruitment Funnel Visualizer */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">
                  Recruitment & Conversion Funnel
                </CardTitle>
                <CardDescription>
                  Inquiry-to-enrollment progression for the Fall 2026 intake cohort.
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-xs">
                Fall 2026
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {SAMPLE_FUNNEL.map((stage, idx) => (
              <div key={idx} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-foreground flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">
                      {idx + 1}
                    </span>
                    {stage.stage}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-foreground">{stage.count} leads</span>
                    <span className="text-muted-foreground w-12 text-right">
                      {stage.percentage}%
                    </span>
                  </div>
                </div>
                {/* Visual Progress Bar */}
                <div className="h-2.5 w-full bg-muted/60 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-500"
                    style={{ width: `${stage.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Priority Today Tasks & Scheduled Sessions */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">Action Queue</CardTitle>
                <CardDescription>High-urgency admissions tasks.</CardDescription>
              </div>
              <Badge variant="warning" className="text-[10px]">
                {SAMPLE_FOLLOW_UPS.length} Pending
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {SAMPLE_FOLLOW_UPS.slice(0, 3).map((item) => (
              <div
                key={item.id}
                className="p-3 rounded-lg border border-border bg-card/80 hover:bg-muted/40 transition-colors flex flex-col gap-1.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs font-semibold text-foreground leading-snug">
                    {item.title}
                  </span>
                  <Badge
                    variant={item.priority === "urgent" ? "destructive" : "secondary"}
                    className="text-[9px] uppercase px-1.5 py-0"
                  >
                    {item.priority}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-1">
                  <span>Student: {item.studentName}</span>
                  <span className="text-primary font-medium">{item.assignedTo}</span>
                </div>
              </div>
            ))}

            <Link href="/follow-ups" prefetch={true} className="block pt-2">
              <Button variant="outline" size="sm" className="w-full text-xs">
                Open Follow-up Manager <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Recent High-Intent Inquiries Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-semibold">
                Active Student Inquiries
              </CardTitle>
              <CardDescription>
                Prospective students currently progressing through verification and counseling.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/leads" prefetch={true}>
                <Button variant="ghost" size="sm" className="text-xs">
                  View full pipeline <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
              </Link>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student Name</TableHead>
                <TableHead>Program Choice</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Counselor</TableHead>
                <TableHead>Intent Score</TableHead>
                <TableHead className="text-right">Quick Contact</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {SAMPLE_LEADS.slice(0, 5).map((lead) => (
                <TableRow key={lead.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-semibold text-foreground text-sm">
                        {lead.fullName}
                      </span>
                      <span className="text-xs text-muted-foreground">{lead.email}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs font-medium text-foreground">
                      {lead.programOfInterest}
                    </span>
                    <div className="text-[11px] text-muted-foreground">{lead.intakeSeason}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(lead.status)}>
                      {formatStatus(lead.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-muted-foreground">
                      {lead.assignedCounselor}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <div className="w-12 h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${lead.score}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold text-foreground">{lead.score}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Link href="/conversations" prefetch={true}>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          title="Message student"
                          aria-label="Message student"
                        >
                          <MessageSquare className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                        </Button>
                      </Link>
                      <Link href="/appointments" prefetch={true}>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          title="Schedule appointment"
                          aria-label="Schedule appointment"
                        >
                          <Calendar className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                        </Button>
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
