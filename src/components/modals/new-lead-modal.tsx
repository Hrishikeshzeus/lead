"use client";

import * as React from "react";
import { useState } from "react";
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
import { UserPlus, Sparkles, CheckCircle2 } from "lucide-react";

interface NewLeadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (lead: { fullName: string; email: string; program: string }) => void;
}

export function NewLeadModal({ open, onOpenChange, onSuccess }: NewLeadModalProps) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [program, setProgram] = useState("B.Tech Computer Science & AI");
  const [intake, setIntake] = useState("Fall 2026");
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    // Simulate frontend form submission for visual shell
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitted(true);
      if (onSuccess) {
        onSuccess({ fullName, email, program });
      }
      setTimeout(() => {
        setSubmitted(false);
        onOpenChange(false);
        setFullName("");
        setEmail("");
        setPhone("");
        setNotes("");
      }, 1400);
    }, 600);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px]">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary">
            <div className="p-2 rounded-lg bg-primary/10">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl">Register Prospective Student</DialogTitle>
              <DialogDescription className="text-xs">
                Add a new student inquiry into the AdmitFlow admissions pipeline.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {submitted ? (
          <div className="py-8 flex flex-col items-center justify-center text-center animate-in fade-in zoom-in-95">
            <CheckCircle2 className="h-12 w-12 text-emerald-500 mb-3" />
            <h4 className="text-base font-semibold text-foreground">Inquiry Successfully Registered</h4>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs">
              {fullName} has been queued for counseling assignment.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="lead-name">Student Full Name *</Label>
                <Input
                  id="lead-name"
                  placeholder="e.g. Maya Patel"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
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
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="lead-phone">Phone / WhatsApp</Label>
                <Input
                  id="lead-phone"
                  placeholder="+1 (555) 019-2834"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="lead-intake">Intake Season</Label>
                <select
                  id="lead-intake"
                  value={intake}
                  onChange={(e) => setIntake(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="Fall 2026">Fall 2026</option>
                  <option value="Spring 2027">Spring 2027</option>
                  <option value="Summer 2026">Summer 2026</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="lead-program">Target Program</Label>
              <select
                id="lead-program"
                value={program}
                onChange={(e) => setProgram(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="B.Tech Computer Science & AI">B.Tech Computer Science & AI</option>
                <option value="M.Sc International Management">M.Sc International Management</option>
                <option value="B.Sc Biomedical Engineering">B.Sc Biomedical Engineering</option>
                <option value="Master of Business Administration (MBA)">Master of Business Administration (MBA)</option>
                <option value="M.Sc Advanced Data Science">M.Sc Advanced Data Science</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="lead-notes">Counselor Initial Notes</Label>
              <Textarea
                id="lead-notes"
                placeholder="Prior academic background, standardized test scores, scholarship inquiries..."
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div className="p-3 bg-muted/50 rounded-lg text-xs text-muted-foreground flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-500 shrink-0" />
              <span>Phase 1 Visual Form: Demonstrates form validation, inputs, and feedback states.</span>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" isLoading={isSubmitting}>
                Save Inquiry
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
