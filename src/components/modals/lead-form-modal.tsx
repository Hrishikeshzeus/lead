"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { UserPlus, Edit3, Loader2, AlertCircle } from "lucide-react";
import {
  LeadRecord,
  CreateLeadInput,
  UpdateLeadInput,
  LeadStatus,
  LeadSource,
} from "@/types/lead";
import { createLeadAction, updateLeadAction, getCounsellorsAction } from "@/app/actions/leads";

interface LeadFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadToEdit?: LeadRecord | null;
  onSuccess: (lead: LeadRecord) => void;
}

const STATUS_OPTIONS: { label: string; value: LeadStatus }[] = [
  { label: "New Lead", value: "new" },
  { label: "Contacted", value: "contacted" },
  { label: "Qualified", value: "qualified" },
  { label: "Counselling Booked", value: "counselling_booked" },
  { label: "Admitted", value: "admitted" },
  { label: "Lost", value: "lost" },
];

const SOURCE_OPTIONS: { label: string; value: LeadSource }[] = [
  { label: "Website", value: "website" },
  { label: "WhatsApp", value: "whatsapp" },
  { label: "Instagram", value: "instagram" },
  { label: "Facebook", value: "facebook" },
  { label: "Referral", value: "referral" },
  { label: "Phone Call", value: "phone" },
  { label: "Manual Entry", value: "manual" },
];

const BATCH_OPTIONS = [
  "Morning Batch (8:00 AM - 12:00 PM)",
  "Afternoon Batch (1:00 PM - 5:00 PM)",
  "Evening Batch (6:00 PM - 9:00 PM)",
  "Weekend Intensive",
  "Self-Paced / Hybrid",
];

const TIMELINE_OPTIONS = [
  "Immediate (Within 7 Days)",
  "Next 30 Days",
  "Next Quarter",
  "Next Academic Year",
  "Exploring Options",
];

const BUDGET_OPTIONS = [
  "Under $2,500",
  "$2,500 - $5,000",
  "$5,000 - $10,000",
  "$10,000+",
  "Seeking Financial Aid / Scholarship",
];

export function LeadFormModal({
  open,
  onOpenChange,
  leadToEdit,
  onSuccess,
}: LeadFormModalProps) {
  const isEditing = Boolean(leadToEdit);

  // Form states
  const [studentName, setStudentName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [courseInterest, setCourseInterest] = useState("");
  const [targetExam, setTargetExam] = useState("");
  const [preferredBatch, setPreferredBatch] = useState(BATCH_OPTIONS[0]);
  const [source, setSource] = useState<LeadSource>("website");
  const [budgetRange, setBudgetRange] = useState(BUDGET_OPTIONS[1]);
  const [joiningTimeline, setJoiningTimeline] = useState(TIMELINE_OPTIONS[1]);
  const [notes, setNotes] = useState("");
  const [consentStatus, setConsentStatus] = useState(true);
  const [assignedCounsellorId, setAssignedCounsellorId] = useState<string>("");
  const [status, setStatus] = useState<LeadStatus>("new");

  // Auxiliary states
  const [counselors, setCounselors] = useState<
    Array<{ id: string; fullName: string; email: string }>
  >([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load counselors on open
  useEffect(() => {
    if (open) {
      getCounsellorsAction().then((res) => {
        if (res.success && res.data) {
          setCounselors(res.data);
          if (!assignedCounsellorId && res.data.length > 0 && !isEditing) {
            setAssignedCounsellorId(res.data[0].id);
          }
        }
      });
    }
  }, [open, isEditing, assignedCounsellorId]);

  // Populate form if editing
  useEffect(() => {
    if (leadToEdit) {
      setStudentName(leadToEdit.studentName || "");
      setEmail(leadToEdit.email || "");
      setPhone(leadToEdit.phone || "");
      setCourseInterest(leadToEdit.courseInterest || "");
      setTargetExam(leadToEdit.targetExam || "");
      setPreferredBatch(leadToEdit.preferredBatch || BATCH_OPTIONS[0]);
      setSource(leadToEdit.source || "website");
      setBudgetRange(leadToEdit.budgetRange || BUDGET_OPTIONS[1]);
      setJoiningTimeline(leadToEdit.joiningTimeline || TIMELINE_OPTIONS[1]);
      setNotes(leadToEdit.notes || "");
      setConsentStatus(leadToEdit.consentStatus ?? true);
      setAssignedCounsellorId(leadToEdit.assignedCounsellorId || "");
      setStatus(leadToEdit.status || "new");
    } else {
      setStudentName("");
      setEmail("");
      setPhone("");
      setCourseInterest("B.Tech Computer Science & AI");
      setTargetExam("JEE Advanced / Main");
      setPreferredBatch(BATCH_OPTIONS[0]);
      setSource("website");
      setBudgetRange(BUDGET_OPTIONS[1]);
      setJoiningTimeline(TIMELINE_OPTIONS[1]);
      setNotes("");
      setConsentStatus(true);
      setStatus("new");
    }
    setError(null);
  }, [leadToEdit, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (isEditing && leadToEdit) {
        const updatePayload: UpdateLeadInput = {
          studentName: studentName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          courseInterest: courseInterest.trim(),
          targetExam: targetExam.trim() || undefined,
          preferredBatch,
          source,
          budgetRange,
          joiningTimeline,
          notes: notes.trim() || undefined,
          consentStatus,
          assignedCounsellorId: assignedCounsellorId || undefined,
          status,
        };

        const res = await updateLeadAction(leadToEdit.id, updatePayload);
        if (!res.success || !res.data) {
          setError(res.error || "Failed to update lead record");
          setIsSubmitting(false);
          return;
        }

        onSuccess(res.data);
        onOpenChange(false);
      } else {
        const createPayload: CreateLeadInput = {
          studentName: studentName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          courseInterest: courseInterest.trim(),
          targetExam: targetExam.trim() || undefined,
          preferredBatch,
          source,
          budgetRange,
          joiningTimeline,
          notes: notes.trim() || undefined,
          consentStatus,
          assignedCounsellorId: assignedCounsellorId || undefined,
          status,
        };

        const res = await createLeadAction(createPayload);
        if (!res.success || !res.data) {
          setError(res.error || "Failed to register lead");
          setIsSubmitting(false);
          return;
        }

        onSuccess(res.data);
        onOpenChange(false);
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2.5 text-primary">
            <div className="p-2 rounded-lg bg-primary/10">
              {isEditing ? (
                <Edit3 className="h-5 w-5" />
              ) : (
                <UserPlus className="h-5 w-5" />
              )}
            </div>
            <div>
              <DialogTitle className="text-xl font-bold">
                {isEditing ? "Edit Student Lead" : "Register Student Lead"}
              </DialogTitle>
              <DialogDescription className="text-xs">
                {isEditing
                  ? "Update student information, course interests, and status."
                  : "Add a prospective student with complete CRM intake details."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {error && (
          <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Section 1: Contact Details */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b pb-1">
              Contact & Identification
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5 sm:col-span-1">
                <Label htmlFor="lead-name">Student Full Name *</Label>
                <Input
                  id="lead-name"
                  placeholder="e.g. Maya Patel"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5 sm:col-span-1">
                <Label htmlFor="lead-email">Email Address *</Label>
                <Input
                  id="lead-email"
                  type="email"
                  placeholder="maya.p@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5 sm:col-span-1">
                <Label htmlFor="lead-phone">Phone Number *</Label>
                <Input
                  id="lead-phone"
                  placeholder="+1-555-0199"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          {/* Section 2: Academic & Intake Preferences */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b pb-1">
              Academic & Intake Details
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="lead-course">Course / Program of Interest *</Label>
                <Input
                  id="lead-course"
                  placeholder="e.g. B.Tech Computer Science & AI"
                  value={courseInterest}
                  onChange={(e) => setCourseInterest(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="lead-target-exam">Target Exam</Label>
                <Input
                  id="lead-target-exam"
                  placeholder="e.g. JEE Advanced, NEET, SAT, GMAT"
                  value={targetExam}
                  onChange={(e) => setTargetExam(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="lead-batch">Preferred Batch</Label>
                <select
                  id="lead-batch"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={preferredBatch}
                  onChange={(e) => setPreferredBatch(e.target.value)}
                >
                  {BATCH_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="lead-timeline">Joining Timeline</Label>
                <select
                  id="lead-timeline"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={joiningTimeline}
                  onChange={(e) => setJoiningTimeline(e.target.value)}
                >
                  {TIMELINE_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="lead-budget">Budget Range</Label>
                <select
                  id="lead-budget"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={budgetRange}
                  onChange={(e) => setBudgetRange(e.target.value)}
                >
                  {BUDGET_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="lead-source">Lead Source</Label>
                <select
                  id="lead-source"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={source}
                  onChange={(e) => setSource(e.target.value as LeadSource)}
                >
                  {SOURCE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section 3: CRM Assignment & Status */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b pb-1">
              CRM Status & Counsellor Assignment
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="lead-status">Lead Status</Label>
                <select
                  id="lead-status"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as LeadStatus)}
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="lead-counselor">Assigned Counsellor</Label>
                <select
                  id="lead-counselor"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={assignedCounsellorId}
                  onChange={(e) => setAssignedCounsellorId(e.target.value)}
                >
                  <option value="">Unassigned</option>
                  {counselors.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.fullName} ({c.email})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5 pt-1">
              <Label htmlFor="lead-notes">Internal Notes & Context</Label>
              <Textarea
                id="lead-notes"
                placeholder="Initial student background, inquiries, test scores, scholarship needs..."
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div className="flex items-center space-x-2 pt-1">
              <input
                type="checkbox"
                id="lead-consent"
                checked={consentStatus}
                onChange={(e) => setConsentStatus(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <Label
                htmlFor="lead-consent"
                className="text-xs font-normal text-muted-foreground cursor-pointer"
              >
                Explicit student consent obtained for admissions communications via phone, email and messaging.
              </Label>
            </div>
          </div>

          <DialogFooter className="pt-3 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isEditing ? "Updating..." : "Registering..."}
                </>
              ) : isEditing ? (
                "Update Lead"
              ) : (
                "Save Lead"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
