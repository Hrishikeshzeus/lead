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
import { HelpCircle, Loader2, AlertCircle } from "lucide-react";
import { KnowledgeDocumentRecord } from "@/types/knowledge";
import { createFaqAction } from "@/app/actions/knowledge";

interface FaqFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (doc: KnowledgeDocumentRecord) => void;
}

const FAQ_CATEGORIES = [
  "Admissions & Eligibility",
  "Tuition, Fees & Refunds",
  "Scholarships & Financial Aid",
  "Visa & International Students",
  "Hostel & Campus Facilities",
  "Examinations & Academic Schedule",
  "General Inquiries",
];

export function FaqFormModal({
  open,
  onOpenChange,
  onSuccess,
}: FaqFormModalProps) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [category, setCategory] = useState(FAQ_CATEGORIES[0]);
  const [autoApprove, setAutoApprove] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await createFaqAction({
        question: question.trim(),
        answer: answer.trim(),
        category,
        autoApprove,
      });

      if (!res.success || !res.data) {
        setError(res.error || "Failed to create FAQ entry.");
        setIsSubmitting(false);
        return;
      }

      onSuccess(res.data);
      onOpenChange(false);
      setQuestion("");
      setAnswer("");
    } catch (err: any) {
      setError(err.message || "Failed to save FAQ.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <div className="flex items-center gap-2.5 text-primary">
            <div className="p-2 rounded-lg bg-primary/10">
              <HelpCircle className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold">Add Admissions FAQ</DialogTitle>
              <DialogDescription className="text-xs">
                Create verified institutional question & answer records for counseling staff and the AI admissions assistant.
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
          <div className="space-y-1.5">
            <Label htmlFor="faq-question">Question / Subject *</Label>
            <Input
              id="faq-question"
              placeholder="e.g. What scholarships are offered for international applicants?"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="faq-category">Knowledge Category</Label>
            <select
              id="faq-category"
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {FAQ_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="faq-answer">Approved Answer Text *</Label>
            <Textarea
              id="faq-answer"
              placeholder="Provide exact approved institutional policy, fee figures, and requirements..."
              rows={4}
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              required
            />
          </div>

          <div className="flex items-center space-x-2 pt-2">
            <input
              type="checkbox"
              id="auto-approve"
              checked={autoApprove}
              onChange={(e) => setAutoApprove(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <Label htmlFor="auto-approve" className="text-xs font-semibold cursor-pointer">
              Mark as Approved (Immediately authorizes this answer for AI queries)
            </Label>
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
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                </>
              ) : (
                "Save FAQ"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
