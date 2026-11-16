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
import { Upload, FileText, Loader2, AlertCircle } from "lucide-react";
import { KnowledgeDocumentRecord } from "@/types/knowledge";
import { uploadKnowledgeDocumentAction } from "@/app/actions/knowledge";

interface DocumentUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (doc: KnowledgeDocumentRecord) => void;
}

const CATEGORIES = [
  "Institutional Policies",
  "Fee Regulations & Refund Rules",
  "Visa & International Compliance",
  "Curriculum & Syllabi",
  "Hostel & Campus Regulations",
  "Admissions Brochure",
];

const SAMPLE_DOC_CONTENT = `APEX INSTITUTE OF TECHNOLOGY - ACADEMIC REGULATIONS 2026-2027

1. ADMISSIONS & SEAT ALLOCATION
Admissions to all undergraduate engineering cohorts are conducted through centralized merit ranking. Seats are allocated across three counseling rounds. An acceptance fee deposit of $2,000 must be submitted within 7 calendar days of seat offer.

2. TUITION FEES & INSTALLMENT POLICY
Annual tuition fees must be remitted in two equal installments: Semester 1 (due August 1) and Semester 2 (due January 10). Late payments incur a fee of $50 per week.

3. REFUND POLICY
Withdrawals submitted prior to the orientation week are eligible for a 90% tuition refund. Withdrawals submitted within the first 14 days of instruction receive a 50% refund. No refunds are granted after day 14.

4. ATTENDANCE & GRADING MANDATES
Students must maintain a minimum 75% classroom attendance in every registered subject to appear for end-semester examinations. Medical leave exemptions require physician certification submitted within 48 hours.`;

export function DocumentUploadModal({
  open,
  onOpenChange,
  onSuccess,
}: DocumentUploadModalProps) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [file, setFile] = useState<File | null>(null);
  const [rawTextOverride, setRawTextOverride] = useState<string | null>(null);

  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (selected.size > 10 * 1024 * 1024) {
      setError("File exceeds maximum permitted limit of 10MB.");
      setFile(null);
      return;
    }

    setFile(selected);
    setRawTextOverride(null);
    if (!title) {
      setTitle(selected.name.replace(/\.[^/.]+$/, ""));
    }
  };

  const handleLoadSample = () => {
    setTitle("Apex Institute Academic Regulations 2026-2027");
    setCategory("Institutional Policies");
    setRawTextOverride(SAMPLE_DOC_CONTENT);
    setFile(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsUploading(true);

    try {
      if (rawTextOverride) {
        // Upload sample text document
        const res = await uploadKnowledgeDocumentAction({
          title: title.trim() || "Institutional Regulations 2026",
          category,
          fileName: `${(title || "regulations").replace(/[^a-z0-9]/gi, "_")}.txt`,
          fileSize: Buffer.byteLength(rawTextOverride, "utf-8"),
          mimeType: "text/plain",
          rawContent: rawTextOverride,
        });

        if (!res.success || !res.data) {
          setError(res.error || "Failed to upload document.");
          setIsUploading(false);
          return;
        }

        onSuccess(res.data);
        onOpenChange(false);
      } else if (file) {
        const reader = new FileReader();
        reader.onload = async () => {
          try {
            const base64Data = (reader.result as string).split(",")[1];
            const res = await uploadKnowledgeDocumentAction({
              title: title.trim() || file.name,
              category,
              fileName: file.name,
              fileSize: file.size,
              mimeType: file.type || "application/octet-stream",
              fileContentBase64: base64Data,
            });

            if (!res.success || !res.data) {
              setError(res.error || "Failed to upload document.");
              setIsUploading(false);
              return;
            }

            onSuccess(res.data);
            onOpenChange(false);
          } catch (err: any) {
            setError(err.message || "Failed to process document upload.");
            setIsUploading(false);
          }
        };

        reader.readAsDataURL(file);
      } else {
        setError("Please select a file or load a sample document.");
        setIsUploading(false);
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[580px]">
        <DialogHeader>
          <div className="flex items-center gap-2.5 text-primary">
            <div className="p-2 rounded-lg bg-primary/10">
              <Upload className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold">Upload Source Document</DialogTitle>
              <DialogDescription className="text-xs">
                Upload official handbooks, fee regulations, and policies (PDF, DOCX, TXT, MD up to 10MB).
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
            <Label htmlFor="doc-title">Document Title *</Label>
            <Input
              id="doc-title"
              placeholder="e.g. Academic Regulations & Fee Schedule 2026"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="doc-category">Document Category</Label>
            <select
              id="doc-category"
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* File input container */}
          <div className="border-2 border-dashed border-border rounded-xl p-5 text-center space-y-2">
            <Upload className="h-8 w-8 text-muted-foreground mx-auto" />
            <div className="text-xs text-muted-foreground">
              {rawTextOverride ? (
                <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded font-semibold text-xs">
                  ✓ Sample document staged ({rawTextOverride.length} characters)
                </div>
              ) : file ? (
                <div className="font-semibold text-foreground">
                  Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
                </div>
              ) : (
                <>
                  <span className="font-semibold text-foreground">Select PDF, DOCX, TXT or MD</span>
                  <p className="text-[11px] mt-0.5">Maximum file size: 10MB</p>
                </>
              )}
            </div>

            <input
              type="file"
              accept=".pdf,.docx,.txt,.md,.markdown"
              onChange={handleFileChange}
              className="block w-full text-xs text-muted-foreground file:mr-4 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer pt-2"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-muted-foreground">Need sample institutional text?</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={handleLoadSample}
            >
              <FileText className="h-3.5 w-3.5 mr-1" /> Load Sample Handbook
            </Button>
          </div>

          <DialogFooter className="pt-3 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isUploading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isUploading || (!file && !rawTextOverride)}>
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading & Chunking...
                </>
              ) : (
                "Upload & Parse Chunks"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
