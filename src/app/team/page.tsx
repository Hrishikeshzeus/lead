"use client";

import * as React from "react";
import { useState } from "react";
import {
  UserCheck,
  Plus,
  Mail,
  Shield,
  Briefcase,
  TrendingUp,
  Sparkles,
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
import { SAMPLE_TEAM_MEMBERS } from "@/lib/sample-data";

export default function TeamPage() {
  const [team] = useState(SAMPLE_TEAM_MEMBERS);

  const getStatusBadge = (status: "online" | "in_meeting" | "offline") => {
    switch (status) {
      case "online":
        return (
          <Badge variant="success" className="gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Online
          </Badge>
        );
      case "in_meeting":
        return (
          <Badge variant="warning" className="gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            In Session
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
            Offline
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Admissions Staff & Counselors
            </h1>
            <SampleDataBadge />
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Manage counselor quotas, role permissions, active caseloads, and recruitment performance.
          </p>
        </div>

        <Button className="gap-1.5 self-start sm:self-auto">
          <Plus className="h-4 w-4" /> Invite Staff Member
        </Button>
      </div>

      {/* Team Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Counselors On Duty
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-foreground">
              {team.filter((m) => m.status !== "offline").length} of {team.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Available for live inquiries</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Average Active Caseload
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-foreground">
              {Math.round(team.reduce((acc, m) => acc + m.activeLeads, 0) / team.length)} Leads
            </div>
            <p className="text-xs text-muted-foreground mt-1">Per admissions counselor</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Team Conversion Average
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-emerald-600">
              {(team.reduce((acc, m) => acc + m.conversionRatePercent, 0) / team.length).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">Inquiry to enrolled deposit</p>
          </CardContent>
        </Card>
      </div>

      {/* Staff Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Staff Member</TableHead>
              <TableHead>Role & Department</TableHead>
              <TableHead>Current Status</TableHead>
              <TableHead>Active Leads</TableHead>
              <TableHead>Conversion Rate</TableHead>
              <TableHead>Tenure</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {team.map((member) => (
              <TableRow key={member.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs border border-primary/20">
                      {member.fullName
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </div>
                    <div>
                      <span className="font-semibold text-sm text-foreground block">
                        {member.fullName}
                      </span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Mail className="h-3 w-3" /> {member.email}
                      </span>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-foreground">
                      {member.role}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {member.department}
                    </span>
                  </div>
                </TableCell>
                <TableCell>{getStatusBadge(member.status)}</TableCell>
                <TableCell>
                  <span className="text-xs font-bold text-foreground">
                    {member.activeLeads} active leads
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      {member.conversionRatePercent}%
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-xs text-muted-foreground">
                    Since {member.joinedDate}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" className="text-xs h-8">
                    Edit Role
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
