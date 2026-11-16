"use client";

import * as React from "react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Upload,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ArrowRight,
  ArrowLeft,
  Loader2,
  FileText,
} from "lucide-react";
import {
  LeadImportPreviewRow,
  LeadImportResult,
} from "@/types/lead";
import {
  previewCsvImportAction,
  executeCsvImportAction,
} from "@/app/actions/leads";

interface CsvImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (result: LeadImportResult) => void;
}

type Step = "upload" | "mapping" | "preview" | "summary";

const REQUIRED_TARGET_FIELDS = [
  { key: "student_name", label: "Student Name", required: true },
  { key: "email", label: "Email Address", required: true },
  { key: "phone", label: "Phone Number", required: false },
  { key: "course_interest", label: "Course / Program Interest", required: false },
  { key: "target_exam", label: "Target Exam", required: false },
  { key: "preferred_batch", label: "Preferred Batch", required: false },
  { key: "source", label: "Lead Source", required: false },
  { key: "budget_range", label: "Budget Range", required: false },
  { key: "joining_timeline", label: "Joining Timeline", required: false },
  { key: "notes", label: "Notes", required: false },
  { key: "status", label: "Lead Status", required: false },
];

const SAMPLE_CSV = `student_name,email,phone,course_interest,target_exam,source,status
Aarav Sharma,aarav.sharma@example.com,+1-555-8801,B.Tech Computer Science,JEE Main,website,new
Pooja Reddy,pooja.reddy@example.com,+1-555-8802,M.Sc Artificial Intelligence,GATE,whatsapp,contacted
Rohan Deshmukh,rohan.deshmukh@example.com,+1-555-8803,MBA Tech Management,CAT,referral,qualified
Alex Rivera,alex.rivera@example.com,+1-555-1101,B.Tech AI & Robotics,JEE Advanced,website,qualified`;

export function CsvImportModal({
  open,
  onOpenChange,
  onSuccess,
}: CsvImportModalProps) {
  const [step, setStep] = useState<Step>("upload");
  const [rawCsv, setRawCsv] = useState<string>("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [sampleValues, setSampleValues] = useState<Record<string, string>>({});
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [previewRows, setPreviewRows] = useState<LeadImportPreviewRow[]>([]);
  const [duplicateResolution, setDuplicateResolution] = useState<"skip" | "update">("skip");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importSummary, setImportSummary] = useState<LeadImportResult | null>(null);

  const resetState = () => {
    setStep("upload");
    setRawCsv("");
    setHeaders([]);
    setSampleValues({});
    setColumnMapping({});
    setPreviewRows([]);
    setDuplicateResolution("skip");
    setIsLoading(false);
    setError(null);
    setImportSummary(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setRawCsv(content);
      parseCsvHeaders(content);
    };
    reader.readAsText(file);
  };

  const loadSampleData = () => {
    setRawCsv(SAMPLE_CSV);
    parseCsvHeaders(SAMPLE_CSV);
  };

  const parseCsvHeaders = (content: string) => {
    setError(null);
    try {
      const lines = content
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);

      if (lines.length < 2) {
        setError("CSV must contain at least a header row and one data row.");
        return;
      }

      const splitRow = (row: string): string[] => {
        const result: string[] = [];
        let curr = "";
        let insideQuotes = false;
        for (let i = 0; i < row.length; i++) {
          const char = row[i];
          if (char === '"' || char === "'") {
            insideQuotes = !insideQuotes;
          } else if (char === "," && !insideQuotes) {
            result.push(curr.trim().replace(/^["']|["']$/g, ""));
            curr = "";
          } else {
            curr += char;
          }
        }
        result.push(curr.trim().replace(/^["']|["']$/g, ""));
        return result;
      };

      const parsedHeaders = splitRow(lines[0]);
      const firstRowValues = splitRow(lines[1]);
      const samples: Record<string, string> = {};
      parsedHeaders.forEach((h, idx) => {
        samples[h] = firstRowValues[idx] || "";
      });

      setHeaders(parsedHeaders);
      setSampleValues(samples);

      // Auto-guess column mappings
      const initialMapping: Record<string, string> = {};
      REQUIRED_TARGET_FIELDS.forEach((tf) => {
        const found = parsedHeaders.find((h) => {
          const lowerH = h.toLowerCase().replace(/[^a-z0-9]/g, "");
          const lowerT = tf.key.toLowerCase().replace(/[^a-z0-9]/g, "");
          const lowerL = tf.label.toLowerCase().replace(/[^a-z0-9]/g, "");
          return lowerH === lowerT || lowerH === lowerL || lowerH.includes(lowerT);
        });
        if (found) {
          initialMapping[tf.key] = found;
        }
      });
      setColumnMapping(initialMapping);
      setStep("mapping");
    } catch (err: any) {
      setError(err.message || "Failed to parse CSV file");
    }
  };

  const handleGeneratePreview = async () => {
    setError(null);
    if (!columnMapping.student_name && !columnMapping.email) {
      setError("Please map Student Name and Email Address columns before continuing.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await previewCsvImportAction(rawCsv, columnMapping);
      if (!res.success || !res.data) {
        setError(res.error || "Failed to generate import preview");
        setIsLoading(false);
        return;
      }

      setPreviewRows(res.data);
      setStep("preview");
    } catch (err: any) {
      setError(err.message || "Error generating preview");
    } finally {
      setIsLoading(false);
    }
  };

  const handleExecuteImport = async () => {
    setError(null);
    setIsLoading(true);
    try {
      const validRowsToImport = previewRows.filter((r) => r.isValid);
      const res = await executeCsvImportAction(
        validRowsToImport,
        duplicateResolution === "skip"
      );

      if (!res.success || !res.data) {
        setError(res.error || "Failed to execute CSV import");
        setIsLoading(false);
        return;
      }

      setImportSummary(res.data);
      setStep("summary");
      onSuccess(res.data);
    } catch (err: any) {
      setError(err.message || "Error executing import");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) resetState();
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-[760px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2.5 text-primary">
            <div className="p-2 rounded-lg bg-primary/10">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold">Import Leads from CSV</DialogTitle>
              <DialogDescription className="text-xs">
                Upload student spreadsheets with automatic column mapping and duplicate detection.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {error && (
          <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Step Indicator */}
        <div className="flex items-center justify-between px-2 py-1 border-b text-xs text-muted-foreground">
          <div className={`flex items-center gap-1.5 font-medium ${step === "upload" ? "text-primary font-bold" : ""}`}>
            <span className="w-5 h-5 rounded-full border flex items-center justify-center text-[11px]">1</span>
            Upload
          </div>
          <ArrowRight className="h-3 w-3 text-muted-foreground/40" />
          <div className={`flex items-center gap-1.5 font-medium ${step === "mapping" ? "text-primary font-bold" : ""}`}>
            <span className="w-5 h-5 rounded-full border flex items-center justify-center text-[11px]">2</span>
            Column Mapping
          </div>
          <ArrowRight className="h-3 w-3 text-muted-foreground/40" />
          <div className={`flex items-center gap-1.5 font-medium ${step === "preview" ? "text-primary font-bold" : ""}`}>
            <span className="w-5 h-5 rounded-full border flex items-center justify-center text-[11px]">3</span>
            Validation & Preview
          </div>
          <ArrowRight className="h-3 w-3 text-muted-foreground/40" />
          <div className={`flex items-center gap-1.5 font-medium ${step === "summary" ? "text-primary font-bold" : ""}`}>
            <span className="w-5 h-5 rounded-full border flex items-center justify-center text-[11px]">4</span>
            Summary
          </div>
        </div>

        {/* STEP 1: Upload */}
        {step === "upload" && (
          <div className="space-y-4 py-4">
            <div className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:bg-muted/30 transition-colors">
              <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm font-semibold text-foreground">Select a CSV File</p>
              <p className="text-xs text-muted-foreground mt-0.5 mb-3">
                Drag and drop your lead spreadsheet or click to browse
              </p>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileUpload}
                className="block w-full text-xs text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground pt-2">
              <span>Need a test file or quick verification?</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={loadSampleData}
              >
                <FileText className="mr-1.5 h-3.5 w-3.5" />
                Load Sample Leads CSV
              </Button>
            </div>
          </div>
        )}

        {/* STEP 2: Column Mapping */}
        {step === "mapping" && (
          <div className="space-y-4 py-3">
            <div className="bg-muted/40 p-3 rounded-lg text-xs space-y-1">
              <p className="font-semibold text-foreground">Detected {headers.length} CSV Headers</p>
              <p className="text-muted-foreground">Match the columns from your uploaded file to AdmitFlow CRM fields.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[340px] overflow-y-auto pr-1">
              {REQUIRED_TARGET_FIELDS.map((field) => (
                <div key={field.key} className="space-y-1 p-2.5 rounded-lg border bg-card">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold">
                      {field.label} {field.required && <span className="text-destructive">*</span>}
                    </Label>
                    {field.required && (
                      <span className="text-[10px] uppercase font-bold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded">
                        Required
                      </span>
                    )}
                  </div>
                  <select
                    className="flex h-8 w-full rounded-md border border-input bg-background px-2.5 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={columnMapping[field.key] || ""}
                    onChange={(e) =>
                      setColumnMapping({ ...columnMapping, [field.key]: e.target.value })
                    }
                  >
                    <option value="">-- Ignore / Not in CSV --</option>
                    {headers.map((h) => (
                      <option key={h} value={h}>
                        {h} {sampleValues[h] ? `(e.g. "${sampleValues[h]}")` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            <div className="flex justify-between pt-3 border-t">
              <Button variant="outline" size="sm" onClick={() => setStep("upload")}>
                <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Back
              </Button>
              <Button size="sm" onClick={handleGeneratePreview} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Verifying...
                  </>
                ) : (
                  <>
                    Next: Validate & Preview <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: Preview & Duplicate Handling */}
        {step === "preview" && (
          <div className="space-y-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-muted/40 p-3 rounded-lg text-xs">
              <div>
                <p className="font-semibold text-foreground">
                  Previewing {previewRows.length} Rows
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="flex items-center gap-1 text-emerald-600 font-medium">
                    <CheckCircle2 className="h-3 w-3" />
                    {previewRows.filter((r) => r.isValid && !r.isDuplicate).length} New
                  </span>
                  <span className="flex items-center gap-1 text-amber-600 font-medium">
                    <AlertTriangle className="h-3 w-3" />
                    {previewRows.filter((r) => r.isDuplicate).length} Duplicates Detected
                  </span>
                  <span className="flex items-center gap-1 text-rose-600 font-medium">
                    <XCircle className="h-3 w-3" />
                    {previewRows.filter((r) => !r.isValid).length} Invalid
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Label htmlFor="dup-strategy" className="text-xs whitespace-nowrap">
                  Duplicate Policy:
                </Label>
                <select
                  id="dup-strategy"
                  className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                  value={duplicateResolution}
                  onChange={(e) => setDuplicateResolution(e.target.value as "skip" | "update")}
                >
                  <option value="skip">Skip duplicates (Safe)</option>
                  <option value="update">Update existing records</option>
                </select>
              </div>
            </div>

            {/* Table Preview */}
            <div className="border rounded-md max-h-[300px] overflow-auto text-xs">
              <table className="w-full border-collapse">
                <thead className="bg-muted sticky top-0">
                  <tr className="border-b">
                    <th className="p-2 text-left">Status</th>
                    <th className="p-2 text-left">Student Name</th>
                    <th className="p-2 text-left">Email</th>
                    <th className="p-2 text-left">Phone</th>
                    <th className="p-2 text-left">Course</th>
                    <th className="p-2 text-left">Notes / Issues</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {previewRows.map((item) => (
                    <tr
                      key={item.rowNumber}
                      className={
                        !item.isValid
                          ? "bg-rose-50/50 dark:bg-rose-950/20"
                          : item.isDuplicate
                          ? "bg-amber-50/50 dark:bg-amber-950/20"
                          : ""
                      }
                    >
                      <td className="p-2 whitespace-nowrap">
                        {!item.isValid ? (
                          <Badge variant="destructive" className="text-[10px]">
                            Invalid
                          </Badge>
                        ) : item.isDuplicate ? (
                          <Badge variant="warning" className="text-[10px]">
                            Duplicate ({item.duplicateReason})
                          </Badge>
                        ) : (
                          <Badge variant="success" className="text-[10px]">
                            Ready to Import
                          </Badge>
                        )}
                      </td>
                      <td className="p-2 font-medium">{item.studentName || "—"}</td>
                      <td className="p-2">{item.email || "—"}</td>
                      <td className="p-2">{item.phone || "—"}</td>
                      <td className="p-2">{item.courseInterest || "—"}</td>
                      <td className="p-2 text-muted-foreground">
                        {item.validationErrors.length > 0
                          ? item.validationErrors.join(", ")
                          : item.isDuplicate
                          ? `Duplicate: ${item.duplicateReason}`
                          : "Valid"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between pt-3 border-t">
              <Button variant="outline" size="sm" onClick={() => setStep("mapping")}>
                <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Back to Mapping
              </Button>
              <Button
                size="sm"
                onClick={handleExecuteImport}
                disabled={isLoading || previewRows.filter((r) => r.isValid).length === 0}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Importing...
                  </>
                ) : (
                  <>Execute Import ({previewRows.filter((r) => r.isValid).length} Records)</>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* STEP 4: Summary */}
        {step === "summary" && importSummary && (
          <div className="space-y-4 py-4 text-center">
            <div className="w-12 h-12 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-2">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold">CSV Import Completed</h3>
            <p className="text-xs text-muted-foreground">
              Lead records have been processed and added to your institute admissions pipeline.
            </p>

            <div className="grid grid-cols-3 gap-3 p-4 bg-muted/40 rounded-xl text-left max-w-md mx-auto">
              <div className="space-y-0.5">
                <span className="text-[11px] text-muted-foreground font-medium">Successfully Imported</span>
                <p className="text-xl font-bold text-emerald-600">{importSummary.imported}</p>
              </div>
              <div className="space-y-0.5">
                <span className="text-[11px] text-muted-foreground font-medium">Skipped (Duplicates)</span>
                <p className="text-xl font-bold text-amber-600">{importSummary.skippedDuplicates}</p>
              </div>
              <div className="space-y-0.5">
                <span className="text-[11px] text-muted-foreground font-medium">Errors</span>
                <p className="text-xl font-bold text-rose-600">{importSummary.errorsCount}</p>
              </div>
            </div>

            <div className="pt-4 border-t">
              <Button
                onClick={() => {
                  resetState();
                  onOpenChange(false);
                }}
              >
                Close & View Leads
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
