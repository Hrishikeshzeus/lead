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
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  AlertCircle,
  Layers,
} from "lucide-react";
import { KnowledgeDocumentRecord, KnowledgeChunkRecord } from "@/types/knowledge";
import {
  getKnowledgeDocumentDetailsAction,
  approveKnowledgeDocumentAction,
  rejectKnowledgeDocumentAction,
} from "@/app/actions/knowledge";

interface DocumentPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: string | null;
  onStatusChange?: () => void;
}

export function DocumentPreviewModal({
  open,
  onOpenChange,
  documentId,
  onStatusChange,
}: DocumentPreviewModalProps) {
  const [doc, setDoc] = useState<KnowledgeDocumentRecord | null>(null);
  const [chunks, setChunks] = useState<KnowledgeChunkRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && documentId) {
      setIsLoading(true);
      setError(null);
      getKnowledgeDocumentDetailsAction(documentId)
        .then((res) => {
          if (res.success && res.data) {
            setDoc(res.data.document);
            setChunks(res.data.chunks);
          } else {
            setError(res.error || "Failed to load document details.");
          }
        })
        .catch((err) => setError(err.message))
        .finally(() => setIsLoading(false));
    }
  }, [open, documentId]);

  const handleApprove = async () => {
    if (!doc) return;
    setIsProcessing(true);
    try {
      const res = await approveKnowledgeDocumentAction(doc.id);
      if (res.success && res.data) {
        setDoc(res.data);
        setChunks((prev) => prev.map((c) => ({ ...c, isApproved: true })));
        onStatusChange?.();
      } else {
        alert(res.error || "Failed to approve document.");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!doc) return;
    setIsProcessing(true);
    try {
      const res = await rejectKnowledgeDocumentAction(doc.id);
      if (res.success && res.data) {
        setDoc(res.data);
        setChunks((prev) => prev.map((c) => ({ ...c, isApproved: false })));
        onStatusChange?.();
      } else {
        alert(res.error || "Failed to revoke approval.");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge variant="success">Approved for AI</Badge>;
      case "pending_approval":
        return <Badge variant="warning">Pending Review</Badge>;
      case "archived":
        return <Badge variant="destructive">Archived</Badge>;
      default:
        return <Badge variant="secondary">Draft</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[760px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2.5 text-primary">
            <div className="p-2 rounded-lg bg-primary/10">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold">
                {doc ? doc.title : "Document Preview & Chunks"}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Inspect extracted knowledge chunks and control AI access permissions.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-xs text-muted-foreground">Loading chunks and metadata...</p>
          </div>
        ) : error || !doc ? (
          <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error || "Document not found."}</span>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {/* Meta summary card */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-lg border bg-muted/20 text-xs">
              <div>
                <span className="text-muted-foreground block text-[11px]">Type / Format</span>
                <span className="font-semibold uppercase">{doc.documentType}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Category</span>
                <span className="font-semibold">{doc.category}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Status</span>
                <div className="mt-0.5">{renderStatusBadge(doc.status)}</div>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Chunks Generated</span>
                <span className="font-semibold">{chunks.length} Chunks</span>
              </div>
            </div>

            {/* Extracted Chunks List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Layers className="h-4 w-4 text-primary" /> Extracted Searchable Knowledge Chunks
                </h4>
                <span className="text-[11px] text-muted-foreground">
                  {chunks.filter((c) => c.isApproved).length} of {chunks.length} Approved
                </span>
              </div>

              <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                {chunks.map((chunk) => (
                  <div
                    key={chunk.id}
                    className="p-3 rounded-lg border bg-card text-xs space-y-1.5 hover:border-primary/40 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground">
                        Chunk #{chunk.chunkIndex + 1}: {chunk.title}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground">
                          ~{chunk.tokenCount} tokens
                        </span>
                        {chunk.isApproved ? (
                          <span className="text-[10px] bg-emerald-500/10 text-emerald-600 font-semibold px-1.5 py-0.5 rounded">
                            Approved
                          </span>
                        ) : (
                          <span className="text-[10px] bg-amber-500/10 text-amber-600 font-semibold px-1.5 py-0.5 rounded">
                            Unapproved
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-foreground/90 whitespace-pre-wrap leading-relaxed text-[11px] bg-muted/10 p-2 rounded">
                      {chunk.content}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <DialogFooter className="pt-3 border-t flex items-center justify-between sm:justify-between">
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                Close
              </Button>

              <div className="flex items-center gap-2">
                {doc.status === "approved" ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleReject}
                    disabled={isProcessing}
                    className="text-destructive hover:bg-destructive/10"
                  >
                    {isProcessing ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                    ) : (
                      <XCircle className="h-4 w-4 mr-1.5" />
                    )}
                    Revoke Approval
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={handleApprove}
                    disabled={isProcessing}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    {isProcessing ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 mr-1.5" />
                    )}
                    Approve for AI Queries
                  </Button>
                )}
              </div>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
