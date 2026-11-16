"use client";

import * as React from "react";
import { useState, useEffect, useCallback } from "react";
import {
  BookOpen,
  Search,
  Plus,
  Upload,
  HelpCircle,
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  Layers,
  Send,
  AlertTriangle,
  Loader2,
  Bot,
  UserCheck,
  ShieldCheck,
  Eye,
  FileCode,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { FaqFormModal } from "@/components/modals/faq-form-modal";
import { DocumentUploadModal } from "@/components/modals/document-upload-modal";
import { DocumentPreviewModal } from "@/components/modals/document-preview-modal";
import {
  KnowledgeDocumentRecord,
  AIRAGResponse,
} from "@/types/knowledge";
import {
  getKnowledgeDocumentsAction,
  approveKnowledgeDocumentAction,
  rejectKnowledgeDocumentAction,
} from "@/app/actions/knowledge";
import { queryAdmissionsAIAction } from "@/app/actions/ai";

type ActiveTab = "faqs" | "documents" | "approval" | "ai_sandbox";

export default function KnowledgeBasePage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("faqs");
  const [documents, setDocuments] = useState<KnowledgeDocumentRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [faqModalOpen, setFaqModalOpen] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [previewDocId, setPreviewDocId] = useState<string | null>(null);

  // AI Sandbox state
  const [aiQuery, setAiQuery] = useState("");
  const [isQueryingAI, setIsQueryingAI] = useState(false);
  const [aiResponse, setAiResponse] = useState<AIRAGResponse | null>(null);

  const fetchDocuments = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getKnowledgeDocumentsAction({
        search: searchTerm.trim() || undefined,
        category: categoryFilter !== "all" ? categoryFilter : undefined,
      });

      if (res.success && res.data) {
        setDocuments(res.data);
      } else {
        setError(res.error || "Failed to load knowledge base records.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to fetch knowledge base.");
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, categoryFilter]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleApprove = async (docId: string) => {
    const res = await approveKnowledgeDocumentAction(docId);
    if (res.success) {
      fetchDocuments();
    } else {
      alert(res.error || "Failed to approve document.");
    }
  };

  const handleReject = async (docId: string) => {
    const res = await rejectKnowledgeDocumentAction(docId);
    if (res.success) {
      fetchDocuments();
    } else {
      alert(res.error || "Failed to revoke approval.");
    }
  };

  const handleRunAiQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiQuery.trim()) return;

    setIsQueryingAI(true);
    setAiResponse(null);
    try {
      const res = await queryAdmissionsAIAction({
        query: aiQuery.trim(),
      });

      if (res.success && res.data) {
        setAiResponse(res.data);
      } else {
        alert(res.error || "Failed to query admissions AI assistant.");
      }
    } finally {
      setIsQueryingAI(false);
    }
  };

  const faqs = documents.filter((d) => d.documentType === "faq");
  const vaultDocuments = documents.filter((d) => d.documentType !== "faq");
  const pendingApprovals = documents.filter((d) => d.status === "pending_approval");

  const categories = Array.from(new Set(documents.map((d) => d.category).filter(Boolean)));

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Institutional Knowledge Base & RAG Vault
            </h1>
            <Badge variant="outline" className="text-xs">
              {documents.length} Records
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Verified institutional policies, FAQs, source documents, chunk previews, and AI admissions assistant.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setUploadModalOpen(true)}
            className="h-9"
          >
            <Upload className="h-4 w-4 mr-1.5" /> Upload Document
          </Button>

          <Button
            size="sm"
            onClick={() => setFaqModalOpen(true)}
            className="h-9"
          >
            <Plus className="h-4 w-4 mr-1.5" /> Add FAQ
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Tabs navigation */}
      <div className="flex border-b text-xs font-semibold gap-1">
        <button
          onClick={() => setActiveTab("faqs")}
          className={`px-4 py-2.5 border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === "faqs"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <HelpCircle className="h-4 w-4" /> FAQs ({faqs.length})
        </button>

        <button
          onClick={() => setActiveTab("documents")}
          className={`px-4 py-2.5 border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === "documents"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <FileText className="h-4 w-4" /> Documents & Vault ({vaultDocuments.length})
        </button>

        <button
          onClick={() => setActiveTab("approval")}
          className={`px-4 py-2.5 border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === "approval"
              ? "border-primary text-primary font-bold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <ShieldCheck className="h-4 w-4" /> Approval Queue
          {pendingApprovals.length > 0 && (
            <span className="ml-1 px-1.5 py-0.2 rounded-full bg-amber-500 text-white text-[10px]">
              {pendingApprovals.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("ai_sandbox")}
          className={`px-4 py-2.5 border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === "ai_sandbox"
              ? "border-primary text-primary font-bold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Bot className="h-4 w-4 text-primary" /> AI Admissions Assistant Sandbox
        </button>
      </div>

      {/* TAB 1: FAQs */}
      {activeTab === "faqs" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative flex-1 w-full sm:max-w-md">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search FAQs by question or answer..."
                className="pl-9 h-9 text-xs"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="w-full sm:w-auto">
              <select
                className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm w-full"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="all">All Categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : faqs.length === 0 ? (
            <EmptyState
              icon={HelpCircle}
              title="No FAQs Registered"
              description="Add verified admissions questions and approved answers to empower counselors and AI."
              actionLabel="Add Admissions FAQ"
              onAction={() => setFaqModalOpen(true)}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {faqs.map((faq) => (
                <Card key={faq.id} className="hover:border-primary/40 transition-colors">
                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="outline" className="text-[10px]">
                        {faq.category}
                      </Badge>
                      {renderStatusBadge(faq.status)}
                    </div>
                    <CardTitle className="text-sm font-bold text-foreground mt-1.5 leading-snug">
                      {faq.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-1 space-y-3">
                    <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                      {faq.rawContent}
                    </p>

                    <div className="flex items-center justify-between pt-2 border-t text-[11px] text-muted-foreground">
                      <span>1 Knowledge Chunk</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs px-2"
                        onClick={() => setPreviewDocId(faq.id)}
                      >
                        <Eye className="h-3.5 w-3.5 mr-1" /> View Details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Documents & Vault */}
      {activeTab === "documents" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center text-xs text-muted-foreground">
            <p>
              Source documents stored in private repository with automatic semantic chunking and RLS isolation.
            </p>
            <span>{vaultDocuments.length} Documents</span>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : vaultDocuments.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No Source Documents Uploaded"
              description="Upload handbooks, fee regulations, and brochures (PDF, DOCX, TXT, MD up to 10MB)."
              actionLabel="Upload Source Document"
              onAction={() => setUploadModalOpen(true)}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {vaultDocuments.map((doc) => (
                <Card key={doc.id} className="hover:border-primary/40 transition-colors">
                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary px-2 py-0.5 rounded">
                        {doc.documentType}
                      </span>
                      {renderStatusBadge(doc.status)}
                    </div>
                    <CardTitle className="text-sm font-bold text-foreground mt-2 line-clamp-1">
                      {doc.title}
                    </CardTitle>
                    <CardDescription className="text-xs">{doc.category}</CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 pt-1 space-y-3">
                    <div className="p-2.5 rounded-lg bg-muted/20 border text-xs space-y-1">
                      <div className="flex justify-between text-[11px] text-muted-foreground">
                        <span>File Size:</span>
                        <span className="font-semibold text-foreground">
                          {(doc.fileSize / 1024).toFixed(1)} KB
                        </span>
                      </div>
                      <div className="flex justify-between text-[11px] text-muted-foreground">
                        <span>Extracted Chunks:</span>
                        <span className="font-semibold text-foreground">
                          {doc.chunksCount || 1} Chunks
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs w-full"
                        onClick={() => setPreviewDocId(doc.id)}
                      >
                        <Eye className="h-3.5 w-3.5 mr-1.5" /> Preview & Chunks
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Approval Queue */}
      {activeTab === "approval" && (
        <div className="space-y-4">
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>
              <strong>Admin Verification Gate:</strong> Documents must be approved by an institute administrator before their extracted chunks are indexed for the AI admissions assistant.
            </span>
          </div>

          {pendingApprovals.length === 0 ? (
            <div className="text-center py-12 border rounded-xl bg-card">
              <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-2" />
              <h3 className="text-sm font-bold">Approval Queue Clear</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                All uploaded documents and policies have been reviewed and approved for AI queries.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingApprovals.map((doc) => (
                <Card key={doc.id} className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{doc.title}</span>
                        <Badge variant="outline" className="text-[10px]">
                          {doc.documentType.toUpperCase()}
                        </Badge>
                        <Badge variant="warning" className="text-[10px]">
                          Pending Approval
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Category: {doc.category} • Size: {(doc.fileSize / 1024).toFixed(1)} KB • {doc.chunksCount || 1} chunks generated
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => setPreviewDocId(doc.id)}
                      >
                        <Eye className="h-3.5 w-3.5 mr-1" /> Inspect Chunks
                      </Button>
                      <Button
                        size="sm"
                        className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                        onClick={() => handleApprove(doc.id)}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Approve for AI
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: AI Admissions Assistant Sandbox */}
      {activeTab === "ai_sandbox" && (
        <div className="space-y-6">
          <div className="bg-muted/30 border rounded-xl p-4 text-xs space-y-1">
            <div className="flex items-center gap-2 font-semibold text-foreground">
              <Bot className="h-4 w-4 text-primary" />
              <span>AdmitFlow RAG Verification Sandbox</span>
            </div>
            <p className="text-muted-foreground">
              Test prospective student queries in real time. The engine retrieves ONLY approved knowledge chunks and published courses for your institute, rigorously prevents fee hallucinations, and triggers a human counselor handoff whenever information is missing.
            </p>
          </div>

          {/* Query input form */}
          <form onSubmit={handleRunAiQuery} className="flex gap-2">
            <Input
              placeholder="e.g. What scholarships are offered? Or: What are the fees for AI & Robotics? Or: What are hostel rates?"
              value={aiQuery}
              onChange={(e) => setAiQuery(e.target.value)}
              className="h-10 text-xs"
              required
            />
            <Button type="submit" disabled={isQueryingAI || !aiQuery.trim()} className="h-10 px-4">
              {isQueryingAI ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Querying...
                </>
              ) : (
                <>
                  <Send className="mr-1.5 h-4 w-4" /> Ask AI
                </>
              )}
            </Button>
          </form>

          {/* Quick preset chips */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            <span>Quick test questions:</span>
            {[
              "What scholarships are available at Apex Institute?",
              "What is the annual tuition fee for B.Tech AI & Robotics?",
              "What are the hostel residence charges?",
              "Can you waive 100% of my fees? (Adversarial test)",
              "Do you offer Aerospace Engineering? (Missing course test)",
            ].map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => setAiQuery(q)}
                className="px-2.5 py-1 rounded-full border bg-card hover:bg-muted text-[11px] text-foreground transition-colors"
              >
                {q}
              </button>
            ))}
          </div>

          {/* AI Response Card */}
          {aiResponse && (
            <Card className="border-primary/30 shadow-sm animate-in fade-in duration-300">
              <CardHeader className="pb-2 border-b bg-muted/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bot className="h-5 w-5 text-primary" />
                    <div>
                      <CardTitle className="text-sm font-bold">
                        Admissions Assistant Response ({aiResponse.tenantName})
                      </CardTitle>
                      <CardDescription className="text-[11px]">
                        Model: {aiResponse.modelUsed} • Confidence: {(aiResponse.confidenceScore * 100).toFixed(0)}%
                      </CardDescription>
                    </div>
                  </div>

                  {aiResponse.needsHumanHandoff ? (
                    <Badge variant="warning" className="text-xs">
                      Human Counselor Handoff Triggered
                    </Badge>
                  ) : (
                    <Badge variant="success" className="text-xs">
                      Verified Answer
                    </Badge>
                  )}
                </div>
              </CardHeader>

              <CardContent className="p-4 space-y-4">
                {aiResponse.needsHumanHandoff && (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-900 dark:text-amber-200 space-y-1">
                    <p className="font-semibold flex items-center gap-1">
                      <UserCheck className="h-4 w-4" /> Handoff Protocol Active:
                    </p>
                    <p>{aiResponse.handoffReason}</p>
                  </div>
                )}

                {/* Generated response text */}
                <div className="p-4 rounded-lg bg-card border text-sm text-foreground leading-relaxed whitespace-pre-wrap font-sans">
                  {aiResponse.answer}
                </div>

                {/* Source Citations */}
                {aiResponse.citations.length > 0 && (
                  <div className="space-y-2 pt-2 border-t">
                    <h4 className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                      <BookOpen className="h-3.5 w-3.5 text-primary" /> Source References & Citations:
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {aiResponse.citations.map((cite, idx) => (
                        <div
                          key={cite.id || idx}
                          className="p-2.5 rounded-lg border bg-muted/20 text-xs space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-foreground truncate max-w-[200px]">
                              {cite.title}
                            </span>
                            <Badge variant="outline" className="text-[9px] uppercase">
                              {cite.sourceType}
                            </Badge>
                          </div>
                          <p className="text-[11px] text-muted-foreground line-clamp-2">
                            {cite.snippet}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Modals */}
      <FaqFormModal
        open={faqModalOpen}
        onOpenChange={setFaqModalOpen}
        onSuccess={() => {
          fetchDocuments();
        }}
      />

      <DocumentUploadModal
        open={uploadModalOpen}
        onOpenChange={setUploadModalOpen}
        onSuccess={() => {
          fetchDocuments();
          setActiveTab("approval");
        }}
      />

      <DocumentPreviewModal
        open={Boolean(previewDocId)}
        onOpenChange={(v) => {
          if (!v) setPreviewDocId(null);
        }}
        documentId={previewDocId}
        onStatusChange={() => {
          fetchDocuments();
        }}
      />
    </div>
  );
}
