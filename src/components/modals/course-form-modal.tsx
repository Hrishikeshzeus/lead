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
import { GraduationCap, Edit3, Loader2, AlertCircle } from "lucide-react";
import {
  CourseRecord,
  CreateCourseInput,
  UpdateCourseInput,
  AdmissionAvailability,
  FeePeriod,
} from "@/types/course";
import { createCourseAction, updateCourseAction } from "@/app/actions/courses";

interface CourseFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseToEdit?: CourseRecord | null;
  onSuccess: (course: CourseRecord) => void;
}

const AVAILABILITY_OPTIONS: { label: string; value: AdmissionAvailability }[] = [
  { label: "Open for Applications", value: "open" },
  { label: "Closing Soon", value: "closing_soon" },
  { label: "Waitlist Only", value: "waitlist" },
  { label: "Closed", value: "closed" },
];

const PERIOD_OPTIONS: { label: string; value: FeePeriod }[] = [
  { label: "Annual Tuition", value: "annual" },
  { label: "Per Semester", value: "per_semester" },
  { label: "Total Program Fee", value: "total" },
  { label: "One-Time Registration", value: "one_time" },
];

export function CourseFormModal({
  open,
  onOpenChange,
  courseToEdit,
  onSuccess,
}: CourseFormModalProps) {
  const isEditing = Boolean(courseToEdit);

  const [name, setName] = useState("");
  const [examCategory, setExamCategory] = useState("Undergraduate Engineering");
  const [description, setDescription] = useState("");
  const [eligibility, setEligibility] = useState("");
  const [feeCurrency, setFeeCurrency] = useState("USD");
  const [feeAmount, setFeeAmount] = useState<number>(15000);
  const [feePeriod, setFeePeriod] = useState<FeePeriod>("annual");
  const [approvedFeeInfo, setApprovedFeeInfo] = useState("");
  const [batchSchedule, setBatchSchedule] = useState("");
  const [duration, setDuration] = useState("4 Years");
  const [location, setLocation] = useState("Main Campus");
  const [admissionAvailability, setAdmissionAvailability] = useState<AdmissionAvailability>("open");
  const [isPublished, setIsPublished] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (courseToEdit) {
      setName(courseToEdit.name || "");
      setExamCategory(courseToEdit.examCategory || "Undergraduate Engineering");
      setDescription(courseToEdit.description || "");
      setEligibility(courseToEdit.eligibility || "");
      setFeeCurrency(courseToEdit.feeCurrency || "USD");
      setFeeAmount(courseToEdit.feeAmount || 0);
      setFeePeriod(courseToEdit.feePeriod || "annual");
      setApprovedFeeInfo(courseToEdit.approvedFeeInfo || "");
      setBatchSchedule(courseToEdit.batchSchedule || "");
      setDuration(courseToEdit.duration || "");
      setLocation(courseToEdit.location || "");
      setAdmissionAvailability(courseToEdit.admissionAvailability || "open");
      setIsPublished(courseToEdit.isPublished ?? true);
    } else {
      setName("");
      setExamCategory("Undergraduate Engineering");
      setDescription("");
      setEligibility("");
      setFeeCurrency("USD");
      setFeeAmount(15000);
      setFeePeriod("annual");
      setApprovedFeeInfo("");
      setBatchSchedule("Monday - Friday, 9:00 AM - 1:00 PM");
      setDuration("4 Years");
      setLocation("Main Campus");
      setAdmissionAvailability("open");
      setIsPublished(true);
    }
    setError(null);
  }, [courseToEdit, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (isEditing && courseToEdit) {
        const updatePayload: UpdateCourseInput = {
          name: name.trim(),
          examCategory: examCategory.trim(),
          description: description.trim(),
          eligibility: eligibility.trim(),
          feeCurrency,
          feeAmount: Number(feeAmount) || 0,
          feePeriod,
          approvedFeeInfo: approvedFeeInfo.trim(),
          batchSchedule: batchSchedule.trim(),
          duration: duration.trim(),
          location: location.trim(),
          admissionAvailability,
          isPublished,
        };

        const res = await updateCourseAction(courseToEdit.id, updatePayload);
        if (!res.success || !res.data) {
          setError(res.error || "Failed to update course.");
          setIsSubmitting(false);
          return;
        }

        onSuccess(res.data);
        onOpenChange(false);
      } else {
        const createPayload: CreateCourseInput = {
          name: name.trim(),
          examCategory: examCategory.trim(),
          description: description.trim(),
          eligibility: eligibility.trim(),
          feeCurrency,
          feeAmount: Number(feeAmount) || 0,
          feePeriod,
          approvedFeeInfo: approvedFeeInfo.trim(),
          batchSchedule: batchSchedule.trim(),
          duration: duration.trim(),
          location: location.trim(),
          admissionAvailability,
          isPublished,
        };

        const res = await createCourseAction(createPayload);
        if (!res.success || !res.data) {
          setError(res.error || "Failed to create course.");
          setIsSubmitting(false);
          return;
        }

        onSuccess(res.data);
        onOpenChange(false);
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[720px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2.5 text-primary">
            <div className="p-2 rounded-lg bg-primary/10">
              {isEditing ? <Edit3 className="h-5 w-5" /> : <GraduationCap className="h-5 w-5" />}
            </div>
            <div>
              <DialogTitle className="text-xl font-bold">
                {isEditing ? "Edit Academic Course" : "Add Academic Course"}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Manage curriculum details, approved fee schedules, eligibility criteria, and admission status.
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
          {/* Basic Course Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="course-name">Course / Program Name *</Label>
              <Input
                id="course-name"
                placeholder="e.g. B.Tech Artificial Intelligence & Robotics"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="exam-category">Exam Category / Department *</Label>
              <Input
                id="exam-category"
                placeholder="e.g. Undergraduate Engineering, JEE, Medical"
                value={examCategory}
                onChange={(e) => setExamCategory(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="duration">Program Duration</Label>
              <Input
                id="duration"
                placeholder="e.g. 4 Years (8 Semesters)"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="description">Course Description</Label>
              <Textarea
                id="description"
                placeholder="Comprehensive description of the academic curriculum, outcomes, and focus areas..."
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>

          {/* Fee & Financial Schedule */}
          <div className="space-y-3 pt-2 border-t">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Approved Fee Structure & Financial Policy
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="fee-currency">Currency</Label>
                <select
                  id="fee-currency"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                  value={feeCurrency}
                  onChange={(e) => setFeeCurrency(e.target.value)}
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="INR">INR (₹)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="fee-amount">Base Fee Amount *</Label>
                <Input
                  id="fee-amount"
                  type="number"
                  step="0.01"
                  placeholder="15000"
                  value={feeAmount}
                  onChange={(e) => setFeeAmount(Number(e.target.value))}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="fee-period">Fee Period</Label>
                <select
                  id="fee-period"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                  value={feePeriod}
                  onChange={(e) => setFeePeriod(e.target.value as FeePeriod)}
                >
                  {PERIOD_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="approved-fee-info">Approved Fee Breakdown & Terms</Label>
              <Textarea
                id="approved-fee-info"
                placeholder="Itemized tuition, lab charges, scholarship eligibility, installment deadlines..."
                rows={2}
                value={approvedFeeInfo}
                onChange={(e) => setApprovedFeeInfo(e.target.value)}
              />
            </div>
          </div>

          {/* Academic Eligibility & Operations */}
          <div className="space-y-3 pt-2 border-t">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Eligibility & Batch Logistics
            </h4>

            <div className="space-y-1.5">
              <Label htmlFor="eligibility">Eligibility Criteria</Label>
              <Textarea
                id="eligibility"
                placeholder="e.g. Minimum 70% in Grade 12 with Math and Physics, or qualifying score in entrance exam..."
                rows={2}
                value={eligibility}
                onChange={(e) => setEligibility(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="batch-schedule">Batch Schedule</Label>
                <Input
                  id="batch-schedule"
                  placeholder="e.g. Mon-Fri 8:30 AM - 1:30 PM, Weekend intensive"
                  value={batchSchedule}
                  onChange={(e) => setBatchSchedule(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="location">Location / Campus</Label>
                <Input
                  id="location"
                  placeholder="e.g. Silicon Valley Main Campus, Online Hybrid"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="admission-availability">Admission Availability</Label>
                <select
                  id="admission-availability"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                  value={admissionAvailability}
                  onChange={(e) => setAdmissionAvailability(e.target.value as AdmissionAvailability)}
                >
                  {AVAILABILITY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center space-x-2 pt-6">
                <input
                  type="checkbox"
                  id="is-published"
                  checked={isPublished}
                  onChange={(e) => setIsPublished(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <Label htmlFor="is-published" className="text-xs font-semibold cursor-pointer">
                  Publish course (Visible to AI admissions assistant & prospective applicants)
                </Label>
              </div>
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
                  Saving...
                </>
              ) : isEditing ? (
                "Update Course"
              ) : (
                "Create Course"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
