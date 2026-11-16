"use client";

import * as React from "react";
import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Mail,
  Phone,
  UserCheck,
  Edit,
  Archive,
  RotateCcw,
  PlusCircle,
  Activity,
  Send,
  Loader2,
  AlertCircle,
  BookOpen,
  Globe,
  MessageCircle,
  Share2,
  PhoneCall,
  FileText,
  CheckCircle,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { LeadRecord, LeadActivity, LeadStatus, LeadSource } from "@/types/lead";
import {
  getLeadDetailsAction,
  updateLeadStatusAction,
  assignCounsellorAction,
  addLeadNoteAction,
  archiveLeadAction,
  getCounsellorsAction,
} from "@/app/actions/leads";
import { LeadFormModal } from "@/components/modals/lead-form-modal";

const STATUS_CONFIG: Record<
  LeadStatus,
  { label: string; variant: "default" | "secondary" | "success" | "warning" | "destructive" | "info" }
> = {
  new: { label: "New Lead", variant: "secondary" },
  contacted: { label: "Contacted", variant: "info" },
  qualified: { label: "Qualified", variant: "default" },
  counselling_booked: { label: "Counselling Booked", variant: "warning" },
  admitted: { label: "Admitted", variant: "success" },
  lost: { label: "Lost / Closed", variant: "destructive" },
};

export default function LeadDetailPage() {
  const params = useParams();
  const leadId = params?.id as string;

  const [lead, setLead] = useState<LeadRecord | null>(null);
  const [activities, setActivities] = useState<LeadActivity[]>([]);
  const [counselors, setCounselors] = useState<
    Array<{ id: string; fullName: string; email: string }>
  >([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);
  const [noteContent, setNoteContent] = useState("");
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!leadId) return;
    setIsLoading(true);
    try {
      const [leadRes, counselorsRes] = await Promise.all([
        getLeadDetailsAction(leadId),
        getCounsellorsAction(),
      ]);

      if (leadRes.success && leadRes.data) {
        setLead(leadRes.data.lead);
        setActivities(leadRes.data.activities);
      } else {
        setError(leadRes.error || "Lead not found");
      }

      if (counselorsRes.success && counselorsRes.data) {
        setCounselors(counselorsRes.data);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load lead details");
    } finally {
      setIsLoading(false);
    }
  }, [leadId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleStatusChange = async (newStatus: LeadStatus) => {
    if (!lead || lead.status === newStatus) return;
    setIsUpdatingStatus(true);
    try {
      const res = await updateLeadStatusAction(lead.id, newStatus);
      if (res.success && res.data) {
        setLead(res.data);
        await loadData();
      } else {
        alert(res.error || "Failed to update status");
      }
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleCounselorChange = async (newCounselorId: string) => {
    if (!lead) return;
    setIsAssigning(true);
    try {
      const res = await assignCounsellorAction(lead.id, newCounselorId || null);
      if (res.success && res.data) {
        setLead(res.data);
        await loadData();
      } else {
        alert(res.error || "Failed to assign counsellor");
      }
    } finally {
      setIsAssigning(false);
    }
  };

  const handleArchiveToggle = async () => {
    if (!lead) return;
    setIsArchiving(true);
    try {
      const shouldArchive = !lead.isArchived;
      const res = await archiveLeadAction(lead.id, shouldArchive);
      if (res.success && res.data) {
        setLead(res.data);
        await loadData();
      } else {
        alert(res.error || "Failed to change archive state");
      }
    } finally {
      setIsArchiving(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead || !noteContent.trim()) return;

    setIsSubmittingNote(true);
    try {
      const res = await addLeadNoteAction(lead.id, noteContent.trim());
      if (res.success) {
        setNoteContent("");
        await loadData();
      } else {
        alert(res.error || "Failed to record counselor note");
      }
    } finally {
      setIsSubmittingNote(false);
    }
  };

  const renderSourceIcon = (source?: LeadSource) => {
    switch (source) {
      case "website":
        return <Globe className="h-3.5 w-3.5 text-blue-500" />;
      case "whatsapp":
        return <MessageCircle className="h-3.5 w-3.5 text-emerald-500" />;
      case "instagram":
        return <Share2 className="h-3.5 w-3.5 text-pink-500" />;
      case "facebook":
        return <Share2 className="h-3.5 w-3.5 text-indigo-500" />;
      case "phone":
        return <PhoneCall className="h-3.5 w-3.5 text-amber-500" />;
      case "referral":
        return <UserCheck className="h-3.5 w-3.5 text-purple-500" />;
      default:
        return <FileText className="h-3.5 w-3.5 text-gray-500" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground font-medium">Loading lead dossier & timeline...</p>
      </div>
    );
  }

  if (error || !lead) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center max-w-md mx-auto space-y-4">
        <div className="p-3 rounded-full bg-destructive/10 text-destructive">
          <AlertCircle className="h-8 w-8" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Lead Record Unavailable</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {error || "The requested lead could not be located or belongs to another institute."}
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/leads">
            <ArrowLeft className="mr-2 h-4 w-4" /> Return to Leads CRM
          </Link>
        </Button>
      </div>
    );
  }

  const assignedCounselorObj = counselors.find((c) => c.id === lead.assignedCounsellorId);
  const studentDisplayName = lead.studentName || "Prospective Student";

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Navigation & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm" className="h-9 px-2.5">
            <Link href="/leads">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                {studentDisplayName}
              </h1>
              <Badge variant={STATUS_CONFIG[lead.status]?.variant || "secondary"}>
                {STATUS_CONFIG[lead.status]?.label || lead.status}
              </Badge>
              {lead.isArchived && (
                <Badge variant="destructive" className="text-xs">
                  Archived
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
              <span>Lead ID: {lead.id.slice(0, 8)}...</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                {renderSourceIcon(lead.source)}
                Source: <span className="capitalize font-medium">{lead.source}</span>
              </span>
              <span>•</span>
              <span>Added {new Date(lead.createdAt).toLocaleDateString()}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditModalOpen(true)}
            className="h-9"
          >
            <Edit className="h-4 w-4 mr-1.5" /> Edit Details
          </Button>
          <Button
            variant={lead.isArchived ? "secondary" : "outline"}
            size="sm"
            onClick={handleArchiveToggle}
            disabled={isArchiving}
            className="h-9"
          >
            {isArchiving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : lead.isArchived ? (
              <>
                <RotateCcw className="h-4 w-4 mr-1.5" /> Restore Lead
              </>
            ) : (
              <>
                <Archive className="h-4 w-4 mr-1.5 text-muted-foreground" /> Archive Lead
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Main Grid: Details + Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Lead Information */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick Actions & Status Workflow */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center justify-between">
                <span>Admissions Pipeline Status</span>
                {isUpdatingStatus && (
                  <span className="flex items-center text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin mr-1" /> Updating status...
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(STATUS_CONFIG) as LeadStatus[]).map((st) => {
                  const isCurrent = lead.status === st;
                  return (
                    <button
                      key={st}
                      type="button"
                      disabled={isUpdatingStatus}
                      onClick={() => handleStatusChange(st)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                        isCurrent
                          ? "bg-primary text-primary-foreground border-primary shadow-sm"
                          : "bg-background hover:bg-muted text-muted-foreground hover:text-foreground border-border"
                      }`}
                    >
                      {isCurrent && "✓ "}
                      {STATUS_CONFIG[st].label}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Academic Profile & Intake Parameters */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary" /> Academic Profile & Intake Intent
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="p-3 rounded-lg border bg-muted/20 space-y-1">
                  <span className="text-xs font-medium text-muted-foreground">Course / Program</span>
                  <p className="font-semibold text-foreground">
                    {lead.courseInterest || "Not Specified"}
                  </p>
                </div>

                <div className="p-3 rounded-lg border bg-muted/20 space-y-1">
                  <span className="text-xs font-medium text-muted-foreground">Target Exam</span>
                  <p className="font-semibold text-foreground">
                    {lead.targetExam || "None / Direct Admission"}
                  </p>
                </div>

                <div className="p-3 rounded-lg border bg-muted/20 space-y-1">
                  <span className="text-xs font-medium text-muted-foreground">Preferred Batch</span>
                  <p className="font-semibold text-foreground">
                    {lead.preferredBatch || "Standard Morning"}
                  </p>
                </div>

                <div className="p-3 rounded-lg border bg-muted/20 space-y-1">
                  <span className="text-xs font-medium text-muted-foreground">Joining Timeline</span>
                  <p className="font-semibold text-foreground">
                    {lead.joiningTimeline || "Next 30 Days"}
                  </p>
                </div>

                <div className="p-3 rounded-lg border bg-muted/20 space-y-1">
                  <span className="text-xs font-medium text-muted-foreground">Budget Range</span>
                  <p className="font-semibold text-foreground">
                    {lead.budgetRange || "$2,500 - $5,000"}
                  </p>
                </div>

                <div className="p-3 rounded-lg border bg-muted/20 space-y-1">
                  <span className="text-xs font-medium text-muted-foreground">Consent & Privacy</span>
                  <p className="font-semibold text-emerald-600 flex items-center gap-1.5">
                    <CheckCircle className="h-4 w-4" />
                    {lead.consentStatus ? "Explicit Consent Granted" : "Consent Pending"}
                  </p>
                </div>
              </div>

              {lead.notes && (
                <div className="mt-4 p-3 rounded-lg border bg-card space-y-1">
                  <span className="text-xs font-semibold text-muted-foreground">Internal Notes:</span>
                  <p className="text-xs text-foreground whitespace-pre-wrap">{lead.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Contact & Assignment Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-primary" /> Contact & Counsellor Assignment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground font-medium">Email Address</span>
                  <div className="flex items-center gap-2">
                    <a
                      href={`mailto:${lead.email}`}
                      className="text-sm font-semibold text-primary hover:underline flex items-center gap-1"
                    >
                      <Mail className="h-3.5 w-3.5" />
                      {lead.email}
                    </a>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground font-medium">Phone Number</span>
                  <div className="flex items-center gap-2">
                    <a
                      href={`tel:${lead.phone}`}
                      className="text-sm font-semibold text-primary hover:underline flex items-center gap-1"
                    >
                      <Phone className="h-3.5 w-3.5" />
                      {lead.phone}
                    </a>
                  </div>
                </div>
              </div>

              {/* Assignment Controls */}
              <div className="pt-3 border-t space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="assign-counselor" className="text-xs font-semibold">
                    Assigned Counsellor
                  </Label>
                  {isAssigning && (
                    <span className="text-[11px] text-muted-foreground flex items-center">
                      <Loader2 className="h-3 w-3 animate-spin mr-1" /> Reassigning...
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <select
                    id="assign-counselor"
                    className="flex h-9 max-w-sm rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={lead.assignedCounsellorId || ""}
                    disabled={isAssigning}
                    onChange={(e) => handleCounselorChange(e.target.value)}
                  >
                    <option value="">Unassigned</option>
                    {counselors.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.fullName} ({c.email})
                      </option>
                    ))}
                  </select>
                  {assignedCounselorObj && (
                    <span className="text-xs text-muted-foreground">
                      Active Counsellor: <strong className="text-foreground">{assignedCounselorObj.fullName}</strong>
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Add Counselor Note Form */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <PlusCircle className="h-4 w-4 text-primary" /> Post Counsellor Note to Timeline
              </CardTitle>
              <CardDescription className="text-xs">
                Log counselling phone calls, student inquiries, academic remarks, or admissions follow-ups.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddNote} className="space-y-3">
                <Textarea
                  placeholder="Record note or call outcome (e.g. Conducted 20-min counselling session. Student is interested in Robotics scholarship and will confirm enrollment by Friday)..."
                  rows={3}
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  required
                />
                <div className="flex justify-end">
                  <Button type="submit" size="sm" disabled={isSubmittingNote || !noteContent.trim()}>
                    {isSubmittingNote ? (
                      <>
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Recording...
                      </>
                    ) : (
                      <>
                        <Send className="mr-1.5 h-3.5 w-3.5" /> Post Note
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Activity Audit Stream */}
        <div className="space-y-6">
          <Card className="h-full flex flex-col">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base font-semibold flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" /> Audit Trail & Activity
                </span>
                <Badge variant="outline" className="text-[11px] font-normal">
                  {activities.length} Events
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs">
                Full chronological history of all state changes, notes and assignments.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 flex-1 overflow-y-auto max-h-[640px]">
              {activities.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-xs">
                  No activity recorded yet.
                </div>
              ) : (
                <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-[1.5px] before:bg-border">
                  {activities.map((act) => {
                    const dateFormatted = new Date(act.createdAt).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    });

                    return (
                      <div key={act.id} className="relative group">
                        {/* Dot indicator */}
                        <div className="absolute -left-[27.5px] top-1 w-3 h-3 rounded-full bg-background border-2 border-primary group-hover:scale-125 transition-transform" />

                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-foreground">{act.actorName}</span>
                            <span className="text-[11px] text-muted-foreground">{dateFormatted}</span>
                          </div>

                          <p className="text-xs text-foreground/90 font-medium">
                            {act.description}
                          </p>

                          {act.metadata && Object.keys(act.metadata).length > 0 && (
                            <div className="text-[11px] text-muted-foreground bg-muted/30 p-2 rounded border font-mono">
                              {Object.entries(act.metadata).map(([k, v]) => (
                                <div key={k}>
                                  <span className="font-semibold">{k}:</span> {String(v)}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Lead Modal */}
      {lead && (
        <LeadFormModal
          open={editModalOpen}
          onOpenChange={setEditModalOpen}
          leadToEdit={lead}
          onSuccess={(updated) => {
            setLead(updated);
            loadData();
          }}
        />
      )}
    </div>
  );
}
