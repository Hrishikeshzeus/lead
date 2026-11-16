"use client";

import * as React from "react";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Users,
  Search,
  Plus,
  Mail,
  Phone,
  Download,
  Upload,
  Archive,
  RotateCcw,
  Edit,
  Eye,
  Globe,
  MessageCircle,
  Share2,
  PhoneCall,
  FileText,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
} from "lucide-react";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { LeadFormModal } from "@/components/modals/lead-form-modal";
import { CsvImportModal } from "@/components/modals/csv-import-modal";
import {
  LeadRecord,
  LeadStatus,
  LeadSource,
  LeadFilterParams,
} from "@/types/lead";
import {
  getLeadsAction,
  archiveLeadAction,
  exportLeadsCsvAction,
  getCounsellorsAction,
} from "@/app/actions/leads";

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

export default function LeadsPage() {
  // Query & filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [counselorFilter, setCounselorFilter] = useState<string>("all");
  const [showArchived, setShowArchived] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<"createdAt" | "studentName" | "status" | "score">("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState<number>(1);
  const pageSize = 10;

  // Data states
  const [leads, setLeads] = useState<LeadRecord[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [counselors, setCounselors] = useState<Array<{ id: string; fullName: string; email: string }>>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [leadToEdit, setLeadToEdit] = useState<LeadRecord | null>(null);
  const [importModalOpen, setImportModalOpen] = useState(false);

  // Load counselors
  useEffect(() => {
    getCounsellorsAction().then((res) => {
      if (res.success && res.data) {
        setCounselors(res.data);
      }
    });
  }, []);

  // Fetch leads with server-side filters
  const fetchLeads = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params: LeadFilterParams = {
        search: searchTerm.trim() || undefined,
        status: statusFilter !== "all" ? (statusFilter as LeadStatus) : undefined,
        source: sourceFilter !== "all" ? (sourceFilter as LeadSource) : undefined,
        counsellorId: counselorFilter !== "all" ? counselorFilter : undefined,
        isArchived: showArchived,
        sortBy,
        sortOrder,
        page,
        pageSize,
      };

      const res = await getLeadsAction(params);
      if (res.success && res.data) {
        setLeads(res.data.leads);
        setTotalCount(res.data.total);
        setTotalPages(res.data.totalPages || 1);
      } else {
        setError(res.error || "Failed to load leads");
      }
    } catch (err: any) {
      setError(err.message || "Failed to communicate with admissions database");
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, statusFilter, sourceFilter, counselorFilter, showArchived, sortBy, sortOrder, page]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  // Handle lead archiving toggle
  const handleArchive = async (lead: LeadRecord) => {
    const shouldArchive = !lead.isArchived;
    const res = await archiveLeadAction(lead.id, shouldArchive);
    if (res.success) {
      fetchLeads();
    } else {
      alert(res.error || "Failed to update archive status");
    }
  };

  // Handle Export CSV
  const handleExportCsv = async () => {
    setIsExporting(true);
    try {
      const params: LeadFilterParams = {
        search: searchTerm.trim() || undefined,
        status: statusFilter !== "all" ? (statusFilter as LeadStatus) : undefined,
        source: sourceFilter !== "all" ? (sourceFilter as LeadSource) : undefined,
        counsellorId: counselorFilter !== "all" ? counselorFilter : undefined,
        isArchived: showArchived,
      };

      const res = await exportLeadsCsvAction(params);
      if (res.success && res.data) {
        const blob = new Blob([res.data], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute(
          "download",
          `admitflow_leads_${new Date().toISOString().slice(0, 10)}.csv`
        );
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        alert(res.error || "Failed to export leads");
      }
    } finally {
      setIsExporting(false);
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

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Admissions CRM Leads
            </h1>
            <Badge variant="outline" className="font-semibold text-xs">
              {totalCount} Total
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Database-backed student inquiry lifecycle with multi-tenant isolation, source tracking and activity audit trail.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            disabled={isExporting || totalCount === 0}
            className="h-9"
          >
            {isExporting ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-1.5 h-4 w-4" />
            )}
            Export CSV
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setImportModalOpen(true)}
            className="h-9"
          >
            <Upload className="mr-1.5 h-4 w-4" /> Import CSV
          </Button>

          <Button
            size="sm"
            onClick={() => {
              setLeadToEdit(null);
              setFormModalOpen(true);
            }}
            className="h-9"
          >
            <Plus className="mr-1.5 h-4 w-4" /> Register Lead
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Search */}
            <div className="relative lg:col-span-2">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by student name, email, phone, or course..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                className="pl-9 h-9 text-xs"
              />
            </div>

            {/* Status Filter */}
            <div>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="all">All Statuses</option>
                <option value="new">New Lead</option>
                <option value="contacted">Contacted</option>
                <option value="qualified">Qualified</option>
                <option value="counselling_booked">Counselling Booked</option>
                <option value="admitted">Admitted</option>
                <option value="lost">Lost / Closed</option>
              </select>
            </div>

            {/* Source Filter */}
            <div>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={sourceFilter}
                onChange={(e) => {
                  setSourceFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="all">All Sources</option>
                <option value="website">Website</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="instagram">Instagram</option>
                <option value="facebook">Facebook</option>
                <option value="referral">Referral</option>
                <option value="phone">Phone Call</option>
                <option value="manual">Manual Entry</option>
              </select>
            </div>

            {/* Counsellor Filter */}
            <div>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={counselorFilter}
                onChange={(e) => {
                  setCounselorFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="all">All Counsellors</option>
                {counselors.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.fullName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t text-xs text-muted-foreground">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showArchived}
                  onChange={(e) => {
                    setShowArchived(e.target.checked);
                    setPage(1);
                  }}
                  className="rounded border-gray-300 text-primary focus:ring-primary h-3.5 w-3.5"
                />
                <span>Include Archived Leads</span>
              </label>
            </div>

            <div className="flex items-center gap-2">
              <span>Sort by:</span>
              <button
                type="button"
                onClick={() => {
                  if (sortBy === "createdAt") {
                    setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                  } else {
                    setSortBy("createdAt");
                    setSortOrder("desc");
                  }
                }}
                className={`px-2 py-0.5 rounded border ${sortBy === "createdAt" ? "bg-muted font-semibold text-foreground" : ""}`}
              >
                Date {sortBy === "createdAt" && (sortOrder === "asc" ? "↑" : "↓")}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (sortBy === "studentName") {
                    setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                  } else {
                    setSortBy("studentName");
                    setSortOrder("asc");
                  }
                }}
                className={`px-2 py-0.5 rounded border ${sortBy === "studentName" ? "bg-muted font-semibold text-foreground" : ""}`}
              >
                Name {sortBy === "studentName" && (sortOrder === "asc" ? "↑" : "↓")}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (sortBy === "score") {
                    setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                  } else {
                    setSortBy("score");
                    setSortOrder("desc");
                  }
                }}
                className={`px-2 py-0.5 rounded border ${sortBy === "score" ? "bg-muted font-semibold text-foreground" : ""}`}
              >
                Score {sortBy === "score" && (sortOrder === "asc" ? "↑" : "↓")}
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Leads Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground font-medium">Loading leads from database...</p>
            </div>
          ) : leads.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No Leads Found"
              description="No admissions leads matched your active search query or filter criteria."
              actionLabel="Register Student Lead"
              onAction={() => {
                setLeadToEdit(null);
                setFormModalOpen(true);
              }}
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Student Details</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Course & Exam</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Counsellor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leads.map((lead) => {
                    const studentName = lead.studentName || "Prospective Student";
                    const courseName = lead.courseInterest || "General Admissions";
                    const counselorObj = counselors.find((c) => c.id === lead.assignedCounsellorId);

                    return (
                      <TableRow key={lead.id} className="hover:bg-muted/40">
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs uppercase shrink-0">
                              {studentName.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <Link
                                href={`/leads/${lead.id}`}
                                className="font-semibold text-foreground hover:text-primary transition-colors hover:underline text-xs block truncate"
                              >
                                {studentName}
                              </Link>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-[11px] text-muted-foreground">
                                  Score: {lead.score}
                                </span>
                                {lead.isArchived && (
                                  <Badge variant="destructive" className="text-[9px] px-1 py-0 h-4">
                                    Archived
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="space-y-0.5 text-xs">
                            <div className="flex items-center gap-1.5 text-foreground truncate max-w-[160px]">
                              <Mail className="h-3 w-3 text-muted-foreground shrink-0" />
                              <span className="truncate">{lead.email}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                              <Phone className="h-3 w-3 shrink-0" />
                              <span>{lead.phone}</span>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="text-xs space-y-0.5">
                            <p className="font-medium text-foreground truncate max-w-[170px]">
                              {courseName}
                            </p>
                            {lead.targetExam ? (
                              <p className="text-[11px] text-muted-foreground truncate">
                                Exam: {lead.targetExam}
                              </p>
                            ) : (
                              <p className="text-[11px] text-muted-foreground">
                                Batch: {lead.preferredBatch || "Regular"}
                              </p>
                            )}
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center gap-1.5 text-xs text-foreground">
                            {renderSourceIcon(lead.source)}
                            <span className="capitalize">{lead.source}</span>
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="text-xs">
                            {counselorObj ? (
                              <span className="font-medium text-foreground">{counselorObj.fullName}</span>
                            ) : (
                              <span className="text-muted-foreground italic">Unassigned</span>
                            )}
                          </div>
                        </TableCell>

                        <TableCell>
                          <Badge variant={STATUS_CONFIG[lead.status]?.variant || "secondary"} className="text-[11px]">
                            {STATUS_CONFIG[lead.status]?.label || lead.status}
                          </Badge>
                        </TableCell>

                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button asChild variant="ghost" size="sm" className="h-8 w-8 p-0" title="View Dossier">
                              <Link href={`/leads/${lead.id}`}>
                                <Eye className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                              </Link>
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              title="Edit Lead"
                              onClick={() => {
                                setLeadToEdit(lead);
                                setFormModalOpen(true);
                              }}
                            >
                              <Edit className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              title={lead.isArchived ? "Restore Lead" : "Archive Lead"}
                              onClick={() => handleArchive(lead)}
                            >
                              {lead.isArchived ? (
                                <RotateCcw className="h-4 w-4 text-emerald-500" />
                              ) : (
                                <Archive className="h-4 w-4 text-muted-foreground hover:text-rose-500" />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination Footer */}
          {!isLoading && leads.length > 0 && (
            <div className="flex items-center justify-between px-4 py-3 border-t text-xs text-muted-foreground">
              <div>
                Showing page <strong className="text-foreground">{page}</strong> of{" "}
                <strong className="text-foreground">{totalPages}</strong> ({totalCount} total leads)
              </div>

              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-2.5 text-xs"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-2.5 text-xs"
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  Next <ChevronRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      <LeadFormModal
        open={formModalOpen}
        onOpenChange={setFormModalOpen}
        leadToEdit={leadToEdit}
        onSuccess={() => {
          fetchLeads();
        }}
      />

      <CsvImportModal
        open={importModalOpen}
        onOpenChange={setImportModalOpen}
        onSuccess={() => {
          fetchLeads();
        }}
      />
    </div>
  );
}
