"use client";

import * as React from "react";
import { useState, useEffect, useCallback } from "react";
import {
  BarChart3,
  TrendingUp,
  PieChart as PieChartIcon,
  ArrowUpRight,
  Globe2,
  Calendar,
  Sparkles,
  Download,
  Users,
  CalendarCheck,
  GraduationCap,
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
  DollarSign,
  ShieldCheck,
  ShieldAlert,
  RefreshCw,
  Layers,
  Activity,
  Briefcase,
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
import { Input } from "@/components/ui/input";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  AreaChart,
  Area,
} from "recharts";
import { getAnalyticsReportAction } from "@/app/actions/analytics";
import type {
  AnalyticsReport,
  AnalyticsDatePreset,
  DateRangeFilter,
} from "@/types/analytics";

const SOURCE_COLORS = [
  "#2563eb", // blue
  "#10b981", // emerald
  "#f59e0b", // amber
  "#8b5cf6", // purple
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#64748b", // slate
];

export default function AnalyticsPage() {
  const [preset, setPreset] = useState<AnalyticsDatePreset>("all");
  const [customStart, setCustomStart] = useState<string>("");
  const [customEnd, setCustomEnd] = useState<string>("");
  const [report, setReport] = useState<AnalyticsReport | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const filter: DateRangeFilter = {
        preset,
        startDate: preset === "custom" && customStart ? customStart : undefined,
        endDate: preset === "custom" && customEnd ? customEnd : undefined,
      };

      const res = await getAnalyticsReportAction(filter);
      if (res.success && res.data) {
        setReport(res.data);
      } else {
        setError(res.error || "Failed to load analytics report.");
      }
    } catch {
      setError("Error connecting to analytics engine.");
    } finally {
      setLoading(false);
    }
  }, [preset, customStart, customEnd]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleExportCsv = () => {
    if (!report) return;
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [
        ["Metric", "Value"],
        ["Total Enquiries", report.totalEnquiries],
        ["New Leads", report.newLeads],
        ["Qualified Leads", report.qualifiedLeads],
        ["Counselling Appointments", report.counsellingAppointments],
        ["Confirmed Admissions", report.admissions],
        ["Lost Leads", report.lostLeads],
        ["Lead to Appointment Conversion Rate (%)", report.leadToAppointmentRate],
        ["Lead to Admission Conversion Rate (%)", report.leadToAdmissionRate],
        ["Average First Response Time (hours)", report.averageFirstResponseHours],
        ["Actual Realized Revenue ($)", report.revenue.actualRealizedRevenue],
        ["Estimated Pipeline Value ($)", report.revenue.estimatedPipelineValue],
        ["Verified Payments Count", report.revenue.recordedPaymentsCount],
      ]
        .map((row) => row.join(","))
        .join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `admitflow-analytics-${preset}-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Recruitment & Enrollment Analytics
            </h1>
            <Badge variant="outline" className="text-xs">
              Phase 7
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Database-backed inquiry velocity, source attribution, counsellor workload, and verified revenue realization.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchReport}
            disabled={loading}
            className="flex items-center gap-1.5"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={handleExportCsv}
            disabled={!report || loading}
            className="gap-1.5"
          >
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Date Range Selector Card */}
      <Card>
        <CardContent className="p-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground mr-1">Period:</span>
            {(
              [
                { id: "7d", label: "Last 7 Days" },
                { id: "30d", label: "Last 30 Days" },
                { id: "90d", label: "Last 90 Days" },
                { id: "ytd", label: "Year to Date" },
                { id: "all", label: "All Time" },
                { id: "custom", label: "Custom Range" },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                onClick={() => setPreset(item.id)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  preset === item.id
                    ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                    : "bg-muted/50 hover:bg-muted text-foreground border border-input"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {preset === "custom" && (
            <div className="flex items-center gap-2 text-xs">
              <Input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="h-8 text-xs w-36"
              />
              <span className="text-muted-foreground">to</span>
              <Input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="h-8 text-xs w-36"
              />
              <Button size="sm" onClick={fetchReport} className="h-8 text-xs px-2.5">
                Apply
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Strict Revenue Attribution Notice */}
      <div className="rounded-md border border-blue-500/20 bg-blue-500/10 p-4 text-xs text-blue-900 dark:text-blue-300 flex items-start gap-3">
        <ShieldCheck className="h-5 w-5 shrink-0 text-blue-600 mt-0.5" />
        <div>
          <p className="font-semibold text-sm">Strict Revenue Realization Policy</p>
          <p className="opacity-90 mt-0.5">
            Actual Realized Revenue is strictly attributed only when a verified admission is accompanied by a completed, recorded payment transaction. Potential pipeline fees from interested leads are explicitly labeled as Estimated Pipeline Value and never recognized as revenue.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-lg border bg-destructive/10 text-destructive border-destructive/20 text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading && !report ? (
        <div className="py-20 text-center space-y-3">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-sm text-muted-foreground font-medium">Aggregating database analytics...</p>
        </div>
      ) : !report || report.totalEnquiries === 0 ? (
        <EmptyState
          icon={BarChart3}
          title="No analytics records found"
          description="There are no student enquiries or activity recorded within the selected date range."
          actionLabel="View All Time"
          onAction={() => setPreset("all")}
        />
      ) : (
        <div className="space-y-6">
          {/* Top KPI Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-l-4 border-l-blue-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Total Enquiries</p>
                    <p className="text-2xl font-bold text-foreground mt-1">{report.totalEnquiries}</p>
                  </div>
                  <div className="h-9 w-9 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-600">
                    <Users className="h-5 w-5" />
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                  <span className="text-emerald-600 font-medium">{report.qualifiedLeads} qualified</span>
                  <span>•</span>
                  <span>{report.newLeads} new</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-purple-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Counseling Sessions</p>
                    <p className="text-2xl font-bold text-purple-600 mt-1">{report.counsellingAppointments}</p>
                  </div>
                  <div className="h-9 w-9 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-600">
                    <CalendarCheck className="h-5 w-5" />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  <span className="font-semibold text-foreground">{report.leadToAppointmentRate}%</span> lead-to-session conversion
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-emerald-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Confirmed Admissions</p>
                    <p className="text-2xl font-bold text-emerald-600 mt-1">{report.admissions}</p>
                  </div>
                  <div className="h-9 w-9 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                    <GraduationCap className="h-5 w-5" />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  <span className="font-semibold text-foreground">{report.leadToAdmissionRate}%</span> overall admission velocity
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-amber-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Avg First Response</p>
                    <p className="text-2xl font-bold text-amber-600 mt-1">{report.averageFirstResponseHours}h</p>
                  </div>
                  <div className="h-9 w-9 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-600">
                    <Clock className="h-5 w-5" />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  <span className="font-semibold text-foreground">{report.followUpMetrics.completionRatePercent}%</span> follow-up completion rate
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Revenue Attribution KPI Split */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-emerald-500/5 border-emerald-500/20">
              <CardHeader className="p-4 pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <CardTitle className="text-sm font-semibold text-emerald-900 dark:text-emerald-300">
                      Actual Realized Revenue
                    </CardTitle>
                  </div>
                  <Badge className="bg-emerald-600 text-white text-[11px]">
                    Verified Admissions
                  </Badge>
                </div>
                <CardDescription className="text-xs">
                  Backed by {report.revenue.recordedPaymentsCount} confirmed tuition & deposit payment transaction(s).
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-1">
                <div className="text-3xl font-bold text-emerald-600">
                  ${report.revenue.actualRealizedRevenue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  100% realized revenue attributed to enrolled students with bank/card confirmation.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-muted/40 border-border">
              <CardHeader className="p-4 pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <CardTitle className="text-sm font-semibold text-foreground">
                      Estimated Pipeline Value (Unconfirmed)
                    </CardTitle>
                  </div>
                  <Badge variant="outline" className="text-[11px] text-muted-foreground border-border">
                    Unrealized Pipeline
                  </Badge>
                </div>
                <CardDescription className="text-xs">
                  Projected tuition value from qualified & counseling stage applicants.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-1">
                <div className="text-3xl font-bold text-muted-foreground">
                  ${report.revenue.estimatedPipelineValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  *Not recognized as revenue until official offer acceptance and payment receipt.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row 1: Funnel & Lead Sources */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recruitment Funnel */}
            <Card>
              <CardHeader className="p-4 pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-semibold">Admissions Conversion Funnel</CardTitle>
                    <CardDescription className="text-xs">
                      Progression from initial inquiry to confirmed enrollment.
                    </CardDescription>
                  </div>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-2">
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={report.funnelStages}
                      margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip
                        formatter={(val: any) => [val, "Students"]}
                        contentStyle={{ backgroundColor: "var(--background)", borderColor: "var(--border)", fontSize: "12px", borderRadius: "6px" }}
                      />
                      <Bar dataKey="count" fill="#2563eb" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="grid grid-cols-5 gap-1 pt-2 border-t text-center text-[11px]">
                  {report.funnelStages.map((stage, i) => (
                    <div key={i}>
                      <p className="font-semibold">{stage.count}</p>
                      <p className="text-muted-foreground">{stage.conversionFromTotal}%</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Lead Source Performance */}
            <Card>
              <CardHeader className="p-4 pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-semibold">Lead Source Attribution</CardTitle>
                    <CardDescription className="text-xs">
                      Inquiry share and confirmed admissions by recruitment channel.
                    </CardDescription>
                  </div>
                  <Globe2 className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-2">
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={report.leadSourcePerformance.filter((s) => s.leadsCount > 0)}
                      margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
                      <XAxis dataKey="source" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "var(--background)", borderColor: "var(--border)", fontSize: "12px", borderRadius: "6px" }}
                      />
                      <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "5px" }} />
                      <Bar dataKey="leadsCount" name="Total Inquiries" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="admissionsCount" name="Admissions" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="pt-2 border-t">
                  <Table>
                    <TableHeader>
                      <TableRow className="text-[11px]">
                        <TableHead className="h-7">Source</TableHead>
                        <TableHead className="h-7 text-right">Inquiries</TableHead>
                        <TableHead className="h-7 text-right">Admitted</TableHead>
                        <TableHead className="h-7 text-right">Conv %</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {report.leadSourcePerformance
                        .filter((s) => s.leadsCount > 0)
                        .slice(0, 4)
                        .map((s, idx) => (
                          <TableRow key={idx} className="text-xs">
                            <TableCell className="py-1 capitalize font-medium">{s.source}</TableCell>
                            <TableCell className="py-1 text-right">{s.leadsCount}</TableCell>
                            <TableCell className="py-1 text-right">{s.admissionsCount}</TableCell>
                            <TableCell className="py-1 text-right font-semibold text-emerald-600">{s.conversionRate}%</TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row 2: Counsellor Workload & Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Counsellor Workload Breakdown */}
            <Card className="lg:col-span-2">
              <CardHeader className="p-4 pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-semibold">Counsellor Workload & Performance</CardTitle>
                    <CardDescription className="text-xs">
                      Assigned leads, scheduled counseling interviews, and closed admissions per counselor.
                    </CardDescription>
                  </div>
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-2">
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={report.counsellorWorkload}
                      margin={{ top: 10, right: 10, left: -20, bottom: 10 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
                      <XAxis dataKey="counsellorName" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "var(--background)", borderColor: "var(--border)", fontSize: "12px", borderRadius: "6px" }}
                      />
                      <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "5px" }} />
                      <Bar dataKey="assignedLeads" name="Assigned Leads" fill="#6366f1" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="appointmentsScheduled" name="Interviews Booked" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="admissionsCount" name="Admitted" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Follow-up Task Completion Meter */}
            <Card>
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-base font-semibold">Follow-up Velocity</CardTitle>
                <CardDescription className="text-xs">
                  Admissions task queue completion rate.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-4 space-y-4">
                <div className="text-center p-4 rounded-xl bg-muted/40 border">
                  <p className="text-3xl font-extrabold text-foreground">
                    {report.followUpMetrics.completionRatePercent}%
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Tasks Completed On Schedule</p>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center py-1 border-b">
                    <span className="text-muted-foreground">Total Tasks</span>
                    <span className="font-semibold">{report.followUpMetrics.totalTasks}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b">
                    <span className="text-emerald-600 font-medium">Completed Tasks</span>
                    <span className="font-semibold text-emerald-600">{report.followUpMetrics.completedTasks}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b">
                    <span className="text-blue-600 font-medium">Due Tasks</span>
                    <span className="font-semibold text-blue-600">{report.followUpMetrics.dueTasks}</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-destructive font-medium">Overdue Tasks</span>
                    <span className="font-semibold text-destructive">{report.followUpMetrics.overdueTasks}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
