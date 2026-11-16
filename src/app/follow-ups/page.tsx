"use client";

import * as React from "react";
import { useState, useEffect, useCallback } from "react";
import {
  CalendarClock,
  CheckCircle2,
  AlertCircle,
  Clock,
  Plus,
  PhoneCall,
  Mail,
  FileCheck,
  Calendar,
  Sparkles,
  MessageSquare,
  ShieldCheck,
  Search,
  Filter,
  Play,
  Pause,
  RefreshCw,
  AlertTriangle,
  XCircle,
  Eye,
  Check,
  User,
  ChevronRight,
  ListTodo,
  Layers,
  Activity,
  UserCheck,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import {
  getFollowUpTasksAction,
  createFollowUpTaskAction,
  completeFollowUpTaskAction,
  cancelFollowUpTaskAction,
  reviewAIDraftAction,
  getInactiveLeadsAction,
  getFollowUpSequencesAction,
  toggleSequenceActiveAction,
  createFollowUpSequenceAction,
  enrollLeadInSequenceAction,
  getJobQueueAction,
  getJobLogsAction,
  processScheduledJobsAction,
  cancelJobAction,
} from "@/app/actions/followups";
import { getLeadsAction } from "@/app/actions/leads";
import type {
  FollowUpTaskRecord,
  FollowUpSequenceRecord,
  InactiveLeadRecoveryItem,
  JobQueueRecord,
  JobLogRecord,
  FollowUpChannel,
  FollowUpPriority,
  FollowUpTaskStatus,
} from "@/types/followup";

export default function FollowUpsPage() {
  const [activeTab, setActiveTab] = useState<
    "tasks" | "recovery" | "sequences" | "jobs"
  >("tasks");

  // Data states
  const [tasks, setTasks] = useState<FollowUpTaskRecord[]>([]);
  const [inactiveLeads, setInactiveLeads] = useState<InactiveLeadRecoveryItem[]>([]);
  const [sequences, setSequences] = useState<FollowUpSequenceRecord[]>([]);
  const [jobQueue, setJobQueue] = useState<JobQueueRecord[]>([]);
  const [jobLogs, setJobLogs] = useState<JobLogRecord[]>([]);
  const [leadsList, setLeadsList] = useState<
    Array<{ id: string; studentName: string; courseInterest: string; phone?: string | null }>
  >([]);

  // Filter states
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterChannel, setFilterChannel] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [dormancyDays, setDormancyDays] = useState<number>(3);

  // Loading & Feedback
  const [loading, setLoading] = useState<boolean>(true);
  const [isProcessingJobs, setIsProcessingJobs] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Modals
  const [selectedTaskForDraft, setSelectedTaskForDraft] =
    useState<FollowUpTaskRecord | null>(null);
  const [editedDraftContent, setEditedDraftContent] = useState<string>("");
  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState<boolean>(false);

  // Create Task Form State
  const [newTaskLeadId, setNewTaskLeadId] = useState<string>("");
  const [newTaskTitle, setNewTaskTitle] = useState<string>("");
  const [newTaskDescription, setNewTaskDescription] = useState<string>("");
  const [newTaskChannel, setNewTaskChannel] = useState<FollowUpChannel>("call");
  const [newTaskPriority, setNewTaskPriority] = useState<FollowUpPriority>("medium");
  const [newTaskDueAt, setNewTaskDueAt] = useState<string>("");
  const [newTaskGenerateDraft, setNewTaskGenerateDraft] = useState<boolean>(true);

  // Fetch all initial data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [tasksRes, recoveryRes, seqsRes, queueRes, logsRes, leadsRes] =
        await Promise.all([
          getFollowUpTasksAction(),
          getInactiveLeadsAction(dormancyDays),
          getFollowUpSequencesAction(),
          getJobQueueAction(),
          getJobLogsAction(50),
          getLeadsAction({ pageSize: 50 }),
        ]);

      if (tasksRes.success && tasksRes.data) setTasks(tasksRes.data);
      if (recoveryRes.success && recoveryRes.data) setInactiveLeads(recoveryRes.data);
      if (seqsRes.success && seqsRes.data) setSequences(seqsRes.data);
      if (queueRes.success && queueRes.data) setJobQueue(queueRes.data);
      if (logsRes.success && logsRes.data) setJobLogs(logsRes.data);
      if (leadsRes.success && leadsRes.data) {
        setLeadsList(
          leadsRes.data.leads.map((l: any) => ({
            id: l.id,
            studentName: l.studentName,
            courseInterest: l.courseInterest,
            phone: l.phone,
          }))
        );
      }
    } catch {
      setFeedback({ type: "error", text: "Failed to load follow-up records." });
    } finally {
      setLoading(false);
    }
  }, [dormancyDays]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Complete Task
  const handleCompleteTask = async (taskId: string) => {
    const res = await completeFollowUpTaskAction(taskId);
    if (res.success) {
      setFeedback({
        type: "success",
        text: `Task marked completed successfully.`,
      });
      loadData();
    } else {
      setFeedback({
        type: "error",
        text: res.error || "Failed to complete task.",
      });
    }
  };

  // Handle Cancel Task
  const handleCancelTask = async (taskId: string) => {
    const reason = window.prompt("Reason for cancelling this follow-up task:");
    if (!reason) return;

    const res = await cancelFollowUpTaskAction(taskId, reason);
    if (res.success) {
      setFeedback({
        type: "success",
        text: "Follow-up task cancelled.",
      });
      loadData();
    } else {
      setFeedback({
        type: "error",
        text: res.error || "Failed to cancel task.",
      });
    }
  };

  // Handle Draft Review (Approve/Reject)
  const handleReviewDraft = async (status: "approved" | "rejected") => {
    if (!selectedTaskForDraft) return;

    const res = await reviewAIDraftAction({
      taskId: selectedTaskForDraft.id,
      status,
      editedDraft: editedDraftContent,
    });

    if (res.success) {
      setFeedback({
        type: "success",
        text: `AI Draft ${status === "approved" ? "approved" : "rejected"} successfully.`,
      });
      setSelectedTaskForDraft(null);
      loadData();
    } else {
      setFeedback({
        type: "error",
        text: res.error || "Failed to review draft.",
      });
    }
  };

  // Handle Create Task Submit
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskLeadId || !newTaskTitle || !newTaskDueAt) {
      setFeedback({
        type: "error",
        text: "Please select a student lead, enter a title, and specify due time.",
      });
      return;
    }

    const res = await createFollowUpTaskAction({
      leadId: newTaskLeadId,
      title: newTaskTitle,
      description: newTaskDescription,
      channel: newTaskChannel,
      priority: newTaskPriority,
      dueAt: new Date(newTaskDueAt).toISOString(),
      generateDraft: newTaskGenerateDraft,
    });

    if (res.success) {
      setFeedback({
        type: "success",
        text: `Follow-up task scheduled successfully.`,
      });
      setIsCreateTaskModalOpen(false);
      setNewTaskLeadId("");
      setNewTaskTitle("");
      setNewTaskDescription("");
      setNewTaskDueAt("");
      loadData();
    } else {
      setFeedback({
        type: "error",
        text: res.error || "Failed to schedule follow-up task.",
      });
    }
  };

  // Handle Sequence Toggle
  const handleToggleSequence = async (sequenceId: string, current: boolean) => {
    const res = await toggleSequenceActiveAction(sequenceId, !current);
    if (res.success) {
      setFeedback({
        type: "success",
        text: `Sequence ${!current ? "activated" : "deactivated"} successfully.`,
      });
      loadData();
    } else {
      setFeedback({
        type: "error",
        text: res.error || "Failed to update sequence.",
      });
    }
  };

  // Handle Inactive Lead Enrollment
  const handleEnrollLead = async (leadId: string, sequenceId: string) => {
    const res = await enrollLeadInSequenceAction(leadId, sequenceId);
    if (res.success) {
      setFeedback({
        type: "success",
        text: `Lead enrolled in sequence. Scheduled ${res.data?.length || 0} follow-up steps into job queue.`,
      });
      loadData();
    } else {
      setFeedback({
        type: "error",
        text: res.error || "Failed to enroll lead.",
      });
    }
  };

  // Process Scheduled Jobs Tick
  const handleProcessJobs = async () => {
    setIsProcessingJobs(true);
    setFeedback(null);
    try {
      const res = await processScheduledJobsAction();
      if (res.success && res.data) {
        setFeedback({
          type: "success",
          text: `Worker processed ${res.data.processed} scheduled job(s): ${res.data.completed} completed, ${res.data.skipped} skipped (stop conditions/opt-out), ${res.data.failed} failed.`,
        });
        loadData();
      } else {
        setFeedback({
          type: "error",
          text: res.error || "Failed to trigger scheduled job queue.",
        });
      }
    } catch {
      setFeedback({
        type: "error",
        text: "Error executing background job queue.",
      });
    } finally {
      setIsProcessingJobs(false);
    }
  };

  // Cancel Scheduled Job
  const handleCancelJob = async (jobId: string) => {
    const res = await cancelJobAction(jobId, "Cancelled by counsellor");
    if (res.success) {
      setFeedback({
        type: "success",
        text: "Job cancelled from queue.",
      });
      loadData();
    } else {
      setFeedback({
        type: "error",
        text: res.error || "Failed to cancel job.",
      });
    }
  };

  // Filtered Tasks
  const filteredTasks = tasks.filter((t) => {
    if (filterStatus !== "all" && t.status !== filterStatus) return false;
    if (filterChannel !== "all" && t.channel !== filterChannel) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        t.title.toLowerCase().includes(q) ||
        (t.studentName && t.studentName.toLowerCase().includes(q)) ||
        (t.courseInterest && t.courseInterest.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  });

  // Task Counts
  const dueCount = tasks.filter((t) => t.status === "due").length;
  const overdueCount = tasks.filter((t) => t.status === "overdue").length;
  const completedCount = tasks.filter((t) => t.status === "completed").length;
  const cancelledCount = tasks.filter((t) => t.status === "cancelled").length;

  const getPriorityBadge = (priority: FollowUpPriority) => {
    switch (priority) {
      case "urgent":
        return <Badge variant="destructive">Urgent</Badge>;
      case "high":
        return <Badge className="bg-amber-500/15 text-amber-600 border-amber-200">High</Badge>;
      case "medium":
        return <Badge variant="secondary">Medium</Badge>;
      default:
        return <Badge variant="outline">Low</Badge>;
    }
  };

  const getStatusBadge = (status: FollowUpTaskStatus) => {
    switch (status) {
      case "overdue":
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" /> Overdue
          </Badge>
        );
      case "due":
        return (
          <Badge className="bg-blue-500/15 text-blue-600 border-blue-200 flex items-center gap-1">
            <Clock className="h-3 w-3" /> Due
          </Badge>
        );
      case "completed":
        return (
          <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-200 flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" /> Completed
          </Badge>
        );
      case "cancelled":
        return (
          <Badge variant="outline" className="text-muted-foreground flex items-center gap-1">
            <XCircle className="h-3 w-3" /> Cancelled
          </Badge>
        );
    }
  };

  const getChannelIcon = (channel: FollowUpChannel) => {
    switch (channel) {
      case "call":
        return <PhoneCall className="h-4 w-4 text-blue-500" />;
      case "whatsapp":
        return <MessageSquare className="h-4 w-4 text-emerald-500" />;
      case "email":
        return <Mail className="h-4 w-4 text-indigo-500" />;
      case "in_person":
        return <User className="h-4 w-4 text-purple-500" />;
      default:
        return <FileCheck className="h-4 w-4 text-slate-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Follow-ups & Lead Recovery
            </h1>
            <Badge variant="outline" className="text-xs">
              Phase 6
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Automated re-engagement sequences, timezone-aware task queue, and AI-drafted counsellor reminders.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-1.5"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => setIsCreateTaskModalOpen(true)}
            className="flex items-center gap-1.5 bg-primary text-primary-foreground"
          >
            <Plus className="h-4 w-4" />
            Schedule Follow-up
          </Button>
        </div>
      </div>

      {/* Strict Guardrail Notice */}
      <div className="rounded-md border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-300 flex items-start gap-3">
        <ShieldAlert className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
        <div>
          <p className="font-medium">Human-in-the-Loop Guardrail Active</p>
          <p className="text-xs opacity-90 mt-0.5">
            Follow-up sequences generate reminders and reviewable drafts. No unsolicited marketing messages are dispatched automatically without verified human counsellor review.
          </p>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-3.5 rounded-lg border text-sm flex items-center justify-between ${
            feedback.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800"
              : "bg-destructive/10 text-destructive border-destructive/20"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setFeedback(null)}
            className="h-6 px-2 text-xs"
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-destructive">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Overdue Tasks</p>
                <p className="text-2xl font-bold text-destructive mt-1">{overdueCount}</p>
              </div>
              <div className="h-9 w-9 rounded-full bg-destructive/10 flex items-center justify-center text-destructive">
                <AlertTriangle className="h-5 w-5" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Requires immediate attention</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Due Tasks</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">{dueCount}</p>
              </div>
              <div className="h-9 w-9 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-600">
                <Clock className="h-5 w-5" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Scheduled for today & soon</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Completed Tasks</p>
                <p className="text-2xl font-bold text-emerald-600 mt-1">{completedCount}</p>
              </div>
              <div className="h-9 w-9 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Successfully completed</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Inactive Leads</p>
                <p className="text-2xl font-bold text-amber-600 mt-1">{inactiveLeads.length}</p>
              </div>
              <div className="h-9 w-9 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-600">
                <UserCheck className="h-5 w-5" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Eligible for lead recovery</p>
          </CardContent>
        </Card>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-border space-x-6 text-sm font-medium">
        <button
          onClick={() => setActiveTab("tasks")}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === "tasks"
              ? "border-primary text-primary font-semibold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <ListTodo className="h-4 w-4" />
          Task Queue ({tasks.length})
        </button>

        <button
          onClick={() => setActiveTab("recovery")}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === "recovery"
              ? "border-primary text-primary font-semibold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <UserCheck className="h-4 w-4" />
          Lead Recovery View ({inactiveLeads.length})
        </button>

        <button
          onClick={() => setActiveTab("sequences")}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === "sequences"
              ? "border-primary text-primary font-semibold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Layers className="h-4 w-4" />
          Sequences & Automation ({sequences.length})
        </button>

        <button
          onClick={() => setActiveTab("jobs")}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === "jobs"
              ? "border-primary text-primary font-semibold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Activity className="h-4 w-4" />
          Job Queue & Audit Logs ({jobQueue.length})
        </button>
      </div>

      {/* TAB 1: Tasks & Workbench */}
      {activeTab === "tasks" && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <Card>
            <CardContent className="p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
              <div className="relative w-full md:w-80">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search task, student, or course..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                {/* Status Filter */}
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  aria-label="Filter tasks by status"
                  className="h-9 px-3 rounded-md border border-input bg-background text-xs"
                >
                  <option value="all">All Statuses ({tasks.length})</option>
                  <option value="overdue">Overdue ({overdueCount})</option>
                  <option value="due">Due ({dueCount})</option>
                  <option value="completed">Completed ({completedCount})</option>
                  <option value="cancelled">Cancelled ({cancelledCount})</option>
                </select>

                {/* Channel Filter */}
                <select
                  value={filterChannel}
                  onChange={(e) => setFilterChannel(e.target.value)}
                  aria-label="Filter tasks by channel"
                  className="h-9 px-3 rounded-md border border-input bg-background text-xs"
                >
                  <option value="all">All Channels</option>
                  <option value="call">Phone Call</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="email">Email</option>
                  <option value="in_person">In-Person</option>
                </select>

                {(filterStatus !== "all" || filterChannel !== "all" || searchQuery) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setFilterStatus("all");
                      setFilterChannel("all");
                      setSearchQuery("");
                    }}
                    className="text-xs h-9"
                  >
                    Reset
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Tasks Table */}
          <Card>
            <CardContent className="p-0">
              {filteredTasks.length === 0 ? (
                <EmptyState
                  icon={CalendarClock}
                  title="No follow-up tasks found"
                  description="No tasks match the active filters. Create a new task or enroll a dormant lead in a sequence."
                  actionLabel="Schedule Follow-up"
                  onAction={() => setIsCreateTaskModalOpen(true)}
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">Status</TableHead>
                      <TableHead>Student & Course</TableHead>
                      <TableHead>Task & Channel</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Scheduled Due</TableHead>
                      <TableHead>AI Draft Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTasks.map((task) => (
                      <TableRow key={task.id} className="hover:bg-muted/50">
                        <TableCell>{getStatusBadge(task.status)}</TableCell>
                        <TableCell>
                          <div className="font-medium text-foreground">
                            {task.studentName || "Unassigned Student"}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {task.courseInterest || "General Inquiry"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getChannelIcon(task.channel)}
                            <div>
                              <div className="text-sm font-medium text-foreground">
                                {task.title}
                              </div>
                              {task.suggestedAction && (
                                <div className="text-xs text-muted-foreground line-clamp-1">
                                  {task.suggestedAction}
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{getPriorityBadge(task.priority)}</TableCell>
                        <TableCell>
                          <div className="text-xs font-medium">
                            {new Date(task.dueAt).toLocaleDateString()}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {new Date(task.dueAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}{" "}
                            ({task.timezone})
                          </div>
                        </TableCell>
                        <TableCell>
                          {task.aiDraft ? (
                            <div className="flex items-center gap-1.5">
                              <Badge
                                variant="outline"
                                className={`text-[11px] ${
                                  task.aiDraftStatus === "approved"
                                    ? "bg-emerald-500/10 text-emerald-600 border-emerald-200"
                                    : task.aiDraftStatus === "pending_review"
                                    ? "bg-amber-500/10 text-amber-600 border-amber-200"
                                    : "text-muted-foreground"
                                }`}
                              >
                                <Sparkles className="h-3 w-3 mr-1" />
                                {task.aiDraftStatus === "pending_review"
                                  ? "Pending Review"
                                  : task.aiDraftStatus === "approved"
                                  ? "Approved"
                                  : task.aiDraftStatus}
                              </Badge>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedTaskForDraft(task);
                                  setEditedDraftContent(task.aiDraft);
                                }}
                                className="h-6 w-6 p-0"
                                title="Inspect & Review AI Draft"
                              >
                                <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {task.status !== "completed" && task.status !== "cancelled" && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleCompleteTask(task.id)}
                                  className="h-8 px-2 text-xs text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                                  title="Mark Completed"
                                >
                                  <Check className="h-3.5 w-3.5 mr-1" />
                                  Complete
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleCancelTask(task.id)}
                                  className="h-8 px-2 text-xs text-destructive hover:bg-destructive/10"
                                  title="Cancel Task"
                                >
                                  <XCircle className="h-3.5 w-3.5" />
                                </Button>
                              </>
                            )}
                            {task.status === "completed" && (
                              <span className="text-xs text-emerald-600 font-medium">Done</span>
                            )}
                            {task.status === "cancelled" && (
                              <span className="text-xs text-muted-foreground italic">Cancelled</span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 2: Lead Recovery View */}
      {activeTab === "recovery" && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="p-4 pb-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-base font-semibold">
                    Dormant Leads Recovery Engine
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Surfaces leads with no recent interactions and recommends personalized recovery sequences.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Inactive threshold:</span>
                  <select
                    value={dormancyDays}
                    onChange={(e) => setDormancyDays(Number(e.target.value))}
                    aria-label="Select dormancy days threshold"
                    className="h-8 px-2 rounded-md border border-input bg-background text-xs"
                  >
                    <option value={2}>2+ days dormant</option>
                    <option value={3}>3+ days dormant (Recommended)</option>
                    <option value={7}>7+ days dormant</option>
                    <option value={14}>14+ days dormant</option>
                  </select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0 pt-2">
              {inactiveLeads.length === 0 ? (
                <EmptyState
                  icon={UserCheck}
                  title="No dormant leads found"
                  description={`All active leads have had interactions within the last ${dormancyDays} days.`}
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Stage</TableHead>
                      <TableHead>Inactivity</TableHead>
                      <TableHead>Suggested Next Action</TableHead>
                      <TableHead>Active Tasks</TableHead>
                      <TableHead className="text-right">Re-engagement</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inactiveLeads.map((item) => (
                      <TableRow key={item.leadId}>
                        <TableCell>
                          <div className="font-medium text-foreground">{item.studentName}</div>
                          <div className="text-xs text-muted-foreground">
                            {item.courseInterest} {item.phone ? `• ${item.phone}` : ""}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs capitalize">
                            {item.leadStatus.replace("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="destructive" className="text-xs">
                            {item.daysInactive} days dormant
                          </Badge>
                          <div className="text-[11px] text-muted-foreground mt-0.5">
                            Last: {new Date(item.lastActivityDate).toLocaleDateString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-xs text-foreground font-medium max-w-sm">
                            {item.suggestedAction}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs font-medium">
                            {item.activeFollowupCount} active
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {sequences.length > 0 && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  handleEnrollLead(
                                    item.leadId,
                                    item.recommendedSequenceId || sequences[0].id
                                  )
                                }
                                className="h-8 text-xs flex items-center gap-1"
                              >
                                <Play className="h-3 w-3 text-emerald-500" />
                                Enroll in Sequence
                              </Button>
                            )}
                            <Button
                              size="sm"
                              onClick={() => {
                                setNewTaskLeadId(item.leadId);
                                setNewTaskTitle(`Recovery check-in: ${item.studentName}`);
                                setNewTaskDescription(item.suggestedAction);
                                setNewTaskDueAt(new Date(Date.now() + 3600000).toISOString().slice(0, 16));
                                setIsCreateTaskModalOpen(true);
                              }}
                              className="h-8 text-xs"
                            >
                              Follow up
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 3: Sequences & Automation */}
      {activeTab === "sequences" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold">Configurable Follow-up Sequences</h2>
              <p className="text-xs text-muted-foreground">
                Automated multi-step schedules with automatic stop conditions (reply, opt-out, admission, lost, handoff).
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sequences.map((seq) => (
              <Card key={seq.id} className="relative overflow-hidden">
                <div
                  className={`h-1.5 w-full ${
                    seq.isActive ? "bg-emerald-500" : "bg-muted"
                  }`}
                />
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base">{seq.name}</CardTitle>
                        <Badge
                          variant={seq.isActive ? "outline" : "secondary"}
                          className={`text-xs ${
                            seq.isActive
                              ? "bg-emerald-500/10 text-emerald-600 border-emerald-200"
                              : "text-muted-foreground"
                          }`}
                        >
                          {seq.isActive ? "Active" : "Paused"}
                        </Badge>
                      </div>
                      <CardDescription className="text-xs mt-1">
                        Audience: <span className="font-medium text-foreground">{seq.targetAudience.replace("_", " ")}</span>
                      </CardDescription>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleSequence(seq.id, seq.isActive)}
                      className="h-7 text-xs"
                    >
                      {seq.isActive ? (
                        <>
                          <Pause className="h-3 w-3 mr-1" /> Pause
                        </>
                      ) : (
                        <>
                          <Play className="h-3 w-3 mr-1" /> Activate
                        </>
                      )}
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="p-4 pt-2 space-y-3">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-1.5">
                      Sequence Workflow ({seq.steps.length} steps):
                    </p>
                    <div className="space-y-2">
                      {seq.steps.map((st, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 p-2 rounded-md bg-muted/40 text-xs border border-border/50"
                        >
                          <span className="font-bold text-muted-foreground w-4">
                            #{st.stepNumber}
                          </span>
                          <Badge variant="outline" className="text-[11px] font-mono">
                            +{st.delayHours}h
                          </Badge>
                          <div className="flex items-center gap-1">
                            {getChannelIcon(st.channel)}
                            <span className="capitalize font-medium">{st.channel}</span>
                          </div>
                          <span className="text-muted-foreground truncate flex-1">
                            {st.templateTitle}
                          </span>
                          <Badge variant="secondary" className="text-[10px]">
                            {st.actionType === "ai_draft_review" ? "AI Draft" : "Reminder"}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-[11px] font-semibold text-muted-foreground mb-1">
                      Safety Stop Conditions:
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {seq.stopConditions.map((cond, ci) => (
                        <Badge
                          key={ci}
                          variant="outline"
                          className="text-[10px] bg-background text-muted-foreground border-border"
                        >
                          Stop on {cond}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: Job Execution Queue & Audit Logs */}
      {activeTab === "jobs" && (
        <div className="space-y-6">
          {/* Action Header */}
          <Card>
            <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  Persistent Background Job Queue
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Database-backed task processor with idempotent execution, exponential backoff retries, and stop condition validation.
                </p>
              </div>

              <Button
                onClick={handleProcessJobs}
                disabled={isProcessingJobs}
                className="bg-primary text-primary-foreground flex items-center gap-2"
                size="sm"
              >
                <Play className={`h-4 w-4 ${isProcessingJobs ? "animate-spin" : ""}`} />
                {isProcessingJobs ? "Executing Queue..." : "Run Scheduled Jobs Now"}
              </Button>
            </CardContent>
          </Card>

          {/* Jobs Queue Table */}
          <Card>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-semibold">
                Job Queue Records ({jobQueue.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {jobQueue.length === 0 ? (
                <EmptyState
                  icon={Clock}
                  title="Queue is empty"
                  description="No pending background jobs found in the queue."
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>Job Type & Key</TableHead>
                      <TableHead>Scheduled For</TableHead>
                      <TableHead>Attempts</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {jobQueue.map((job) => (
                      <TableRow key={job.id}>
                        <TableCell>
                          <Badge
                            variant={
                              job.status === "completed"
                                ? "outline"
                                : job.status === "failed"
                                ? "destructive"
                                : job.status === "skipped"
                                ? "secondary"
                                : "default"
                            }
                            className={`text-xs capitalize ${
                              job.status === "completed"
                                ? "bg-emerald-500/10 text-emerald-600 border-emerald-200"
                                : ""
                            }`}
                          >
                            {job.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="font-mono text-xs font-semibold text-foreground">
                            {job.jobType}
                          </div>
                          <div className="text-[11px] text-muted-foreground font-mono truncate max-w-xs">
                            {job.idempotencyKey}
                          </div>
                          {job.lastError && (
                            <div className="text-[11px] text-destructive mt-0.5">
                              Error: {job.lastError}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="text-xs">
                            {new Date(job.scheduledFor).toLocaleString()}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {job.timezone}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs font-mono">
                            {job.attempts} / {job.maxAttempts}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          {job.status === "scheduled" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCancelJob(job.id)}
                              className="text-xs h-7 text-destructive"
                            >
                              Cancel
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Audit Logs */}
          <Card>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-semibold">
                Execution Audit Logs ({jobLogs.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {jobLogs.length === 0 ? (
                <EmptyState
                  icon={Activity}
                  title="No execution logs"
                  description="Execution audit logs will appear here once background workers process tasks."
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {jobLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })}
                        </TableCell>
                        <TableCell className="text-xs font-mono font-medium">
                          {log.action}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              log.status === "sent"
                                ? "outline"
                                : log.status === "failed"
                                ? "destructive"
                                : log.status === "skipped"
                                ? "secondary"
                                : "outline"
                            }
                            className={`text-[11px] ${
                              log.status === "sent"
                                ? "bg-emerald-500/10 text-emerald-600 border-emerald-200"
                                : ""
                            }`}
                          >
                            {log.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-foreground max-w-md">
                          {log.details}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* AI Draft Review Modal */}
      {selectedTaskForDraft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-background rounded-lg border shadow-xl max-w-xl w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-lg">AI Follow-up Draft Review</h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedTaskForDraft(null)}
                className="h-8 w-8 p-0"
              >
                ✕
              </Button>
            </div>

            <div className="text-xs text-muted-foreground space-y-1">
              <div>
                Student: <span className="font-semibold text-foreground">{selectedTaskForDraft.studentName}</span>
              </div>
              <div>
                Course: <span className="font-semibold text-foreground">{selectedTaskForDraft.courseInterest}</span>
              </div>
              <div>
                Channel: <span className="font-semibold text-foreground capitalize">{selectedTaskForDraft.channel}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Draft Script / Message (Editable):
              </label>
              <textarea
                value={editedDraftContent}
                onChange={(e) => setEditedDraftContent(e.target.value)}
                rows={6}
                className="w-full text-xs font-mono p-3 rounded-md border border-input bg-muted/30 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="rounded bg-muted/40 p-2 text-[11px] text-muted-foreground">
              ⚠️ Strict Safeguard: Reviewing or approving this draft does not send unsolicited automated outreach. It equips counsellors with verified speaking points.
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleReviewDraft("rejected")}
                className="text-destructive border-destructive/20 hover:bg-destructive/10"
              >
                Reject Draft
              </Button>
              <Button
                size="sm"
                onClick={() => handleReviewDraft("approved")}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Approve Speaking Points
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Follow-up Modal */}
      {isCreateTaskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-background rounded-lg border shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-semibold text-lg">Schedule Follow-up Task</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsCreateTaskModalOpen(false)}
                className="h-8 w-8 p-0"
              >
                ✕
              </Button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-3">
              <div>
                <label className="text-xs font-semibold">Select Prospective Student *</label>
                <select
                  value={newTaskLeadId}
                  onChange={(e) => {
                    setNewTaskLeadId(e.target.value);
                    const lead = leadsList.find((l) => l.id === e.target.value);
                    if (lead && !newTaskTitle) {
                      setNewTaskTitle(`Follow-up check-in: ${lead.studentName}`);
                    }
                  }}
                  className="w-full h-9 mt-1 px-3 rounded-md border border-input bg-background text-xs"
                  required
                >
                  <option value="">-- Choose a student lead --</option>
                  {leadsList.map((lead) => (
                    <option key={lead.id} value={lead.id}>
                      {lead.studentName} ({lead.courseInterest})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold">Task Title *</label>
                <Input
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="e.g. Schedule entrance exam prep call"
                  required
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold">Channel</label>
                  <select
                    value={newTaskChannel}
                    onChange={(e) => setNewTaskChannel(e.target.value as FollowUpChannel)}
                    className="w-full h-9 mt-1 px-3 rounded-md border border-input bg-background text-xs"
                  >
                    <option value="call">Phone Call</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="email">Email</option>
                    <option value="in_person">In-Person</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold">Priority</label>
                  <select
                    value={newTaskPriority}
                    onChange={(e) => setNewTaskPriority(e.target.value as FollowUpPriority)}
                    className="w-full h-9 mt-1 px-3 rounded-md border border-input bg-background text-xs"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold">Scheduled Due Date & Time *</label>
                <Input
                  type="datetime-local"
                  value={newTaskDueAt}
                  onChange={(e) => setNewTaskDueAt(e.target.value)}
                  required
                  className="mt-1"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="generateDraft"
                  checked={newTaskGenerateDraft}
                  onChange={(e) => setNewTaskGenerateDraft(e.target.checked)}
                  className="rounded border-input text-primary"
                />
                <label htmlFor="generateDraft" className="text-xs text-foreground cursor-pointer">
                  Auto-generate AI follow-up draft for counsellor review
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCreateTaskModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm">
                  Schedule Task
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
