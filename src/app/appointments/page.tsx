"use client";

import * as React from "react";
import { useState, useEffect, useCallback } from "react";
import {
  Calendar,
  Clock,
  Video,
  MapPin,
  Plus,
  User,
  CheckCircle,
  ExternalLink,
  RefreshCw,
  Search,
  Filter,
  XCircle,
  CalendarCheck,
  CalendarDays,
  Settings,
  AlertCircle,
  Check,
  ChevronRight,
  ShieldCheck,
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
  getAppointmentsAction,
  bookAppointmentAction,
  rescheduleAppointmentAction,
  cancelAppointmentAction,
  completeAppointmentAction,
  getAvailableSlotsAction,
  configureAvailabilityAction,
  getCounsellorAvailabilityAction,
} from "@/app/actions/appointments";
import { getLeadsAction, getCounsellorsAction } from "@/app/actions/leads";
import type {
  AppointmentRecord,
  AvailableSlot,
  CounsellorAvailabilityRecord,
  AppointmentFormat,
  AppointmentStatus,
} from "@/types/appointment";

export default function AppointmentsPage() {
  const [activeTab, setActiveTab] = useState<"upcoming" | "completed" | "cancelled" | "availability">("upcoming");

  // Data states
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [availabilities, setAvailabilities] = useState<CounsellorAvailabilityRecord[]>([]);
  const [leads, setLeads] = useState<Array<{ id: string; studentName: string; courseInterest: string }>>([]);
  const [counsellors, setCounsellors] = useState<Array<{ id: string; fullName: string }>>([]);

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filterCounsellor, setFilterCounsellor] = useState<string>("all");
  const [filterFormat, setFilterFormat] = useState<string>("all");

  // Loading & Feedback
  const [loading, setLoading] = useState<boolean>(true);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Book Appointment Modal State
  const [isBookModalOpen, setIsBookModalOpen] = useState<boolean>(false);
  const [bookLeadId, setBookLeadId] = useState<string>("");
  const [bookCounsellorId, setBookCounsellorId] = useState<string>("");
  const [bookTitle, setBookTitle] = useState<string>("");
  const [bookDescription, setBookDescription] = useState<string>("");
  const [bookDate, setBookDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [bookSlotTime, setBookSlotTime] = useState<string>("");
  const [bookFormat, setBookFormat] = useState<AppointmentFormat>("virtual");
  const [bookMeetingLink, setBookMeetingLink] = useState<string>("");
  const [bookLocation, setBookLocation] = useState<string>("");
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState<boolean>(false);

  // Reschedule Modal State
  const [rescheduleTarget, setRescheduleTarget] = useState<AppointmentRecord | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [rescheduleSlotTime, setRescheduleSlotTime] = useState<string>("");
  const [rescheduleReason, setRescheduleReason] = useState<string>("");
  const [rescheduleSlots, setRescheduleSlots] = useState<AvailableSlot[]>([]);
  const [loadingRescheduleSlots, setLoadingRescheduleSlots] = useState<boolean>(false);

  // Configure Availability Modal State
  const [isAvailModalOpen, setIsAvailModalOpen] = useState<boolean>(false);
  const [availCounsellorId, setAvailCounsellorId] = useState<string>("");
  const [availDay, setAvailDay] = useState<number>(1);
  const [availStart, setAvailStart] = useState<string>("09:00");
  const [availEnd, setAvailEnd] = useState<string>("17:00");
  const [availDuration, setAvailDuration] = useState<number>(30);
  const [availBuffer, setAvailBuffer] = useState<number>(10);

  // Fetch initial data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [appRes, availRes, leadsRes, counsRes] = await Promise.all([
        getAppointmentsAction({ timeframe: activeTab === "availability" ? "all" : activeTab }),
        getCounsellorAvailabilityAction(),
        getLeadsAction({ pageSize: 100 }),
        getCounsellorsAction(),
      ]);

      if (appRes.success && appRes.data) setAppointments(appRes.data);
      if (availRes.success && availRes.data) setAvailabilities(availRes.data);
      if (leadsRes.success && leadsRes.data) {
        setLeads(leadsRes.data.leads.map((l: any) => ({
          id: l.id,
          studentName: l.studentName,
          courseInterest: l.courseInterest,
        })));
      }
      if (counsRes.success && counsRes.data) {
        setCounsellors(counsRes.data.map((c: any) => ({
          id: c.id,
          fullName: c.fullName,
        })));
        if (!bookCounsellorId && counsRes.data.length > 0) {
          setBookCounsellorId(counsRes.data[0].id);
          setAvailCounsellorId(counsRes.data[0].id);
        }
      }
    } catch {
      setFeedback({ type: "error", text: "Failed to load appointment records." });
    } finally {
      setLoading(false);
    }
  }, [activeTab, bookCounsellorId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Fetch available slots when counsellor or date changes in booking modal
  useEffect(() => {
    if (isBookModalOpen && bookCounsellorId && bookDate) {
      setLoadingSlots(true);
      getAvailableSlotsAction(bookCounsellorId, bookDate)
        .then((res) => {
          if (res.success && res.data) {
            setAvailableSlots(res.data);
            if (res.data.length > 0) {
              setBookSlotTime(res.data[0].startTime);
            } else {
              setBookSlotTime("");
            }
          }
        })
        .finally(() => setLoadingSlots(false));
    }
  }, [isBookModalOpen, bookCounsellorId, bookDate]);

  // Fetch available slots when rescheduling
  useEffect(() => {
    if (rescheduleTarget && rescheduleDate) {
      setLoadingRescheduleSlots(true);
      getAvailableSlotsAction(rescheduleTarget.counsellorId, rescheduleDate)
        .then((res) => {
          if (res.success && res.data) {
            setRescheduleSlots(res.data);
            if (res.data.length > 0) {
              setRescheduleSlotTime(res.data[0].startTime);
            } else {
              setRescheduleSlotTime("");
            }
          }
        })
        .finally(() => setLoadingRescheduleSlots(false));
    }
  }, [rescheduleTarget, rescheduleDate]);

  // Handle Book Submit
  const handleBookSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookLeadId || !bookCounsellorId || !bookSlotTime) {
      setFeedback({ type: "error", text: "Please select a student, counsellor, and bookable time slot." });
      return;
    }

    const res = await bookAppointmentAction({
      leadId: bookLeadId,
      counsellorId: bookCounsellorId,
      title: bookTitle || "Admissions Counselling Session",
      description: bookDescription,
      startTime: bookSlotTime,
      format: bookFormat,
      meetingLink: bookMeetingLink || undefined,
      location: bookLocation || undefined,
    });

    if (res.success) {
      setFeedback({ type: "success", text: "Appointment booked successfully. Lead stage updated to Counselling Booked." });
      setIsBookModalOpen(false);
      setBookTitle("");
      setBookDescription("");
      loadData();
    } else {
      setFeedback({ type: "error", text: res.error || "Failed to book appointment." });
    }
  };

  // Handle Reschedule Submit
  const handleRescheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rescheduleTarget || !rescheduleSlotTime) {
      setFeedback({ type: "error", text: "Please select a new time slot." });
      return;
    }

    const res = await rescheduleAppointmentAction({
      appointmentId: rescheduleTarget.id,
      newStartTime: rescheduleSlotTime,
      reason: rescheduleReason || "Student requested time adjustment",
    });

    if (res.success) {
      setFeedback({ type: "success", text: "Appointment rescheduled successfully." });
      setRescheduleTarget(null);
      setRescheduleReason("");
      loadData();
    } else {
      setFeedback({ type: "error", text: res.error || "Failed to reschedule appointment." });
    }
  };

  // Handle Cancel
  const handleCancelAppointment = async (appId: string) => {
    const reason = window.prompt("Reason for cancelling appointment:");
    if (!reason) return;

    const res = await cancelAppointmentAction({
      appointmentId: appId,
      reason,
    });

    if (res.success) {
      setFeedback({ type: "success", text: "Appointment cancelled." });
      loadData();
    } else {
      setFeedback({ type: "error", text: res.error || "Failed to cancel appointment." });
    }
  };

  // Handle Complete
  const handleCompleteAppointment = async (appId: string) => {
    const res = await completeAppointmentAction(appId);
    if (res.success) {
      setFeedback({ type: "success", text: "Appointment marked completed." });
      loadData();
    } else {
      setFeedback({ type: "error", text: res.error || "Failed to complete appointment." });
    }
  };

  // Handle Save Availability
  const handleSaveAvailability = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!availCounsellorId) return;

    const res = await configureAvailabilityAction({
      counsellorId: availCounsellorId,
      dayOfWeek: Number(availDay),
      startTime: availStart,
      endTime: availEnd,
      slotDurationMinutes: Number(availDuration),
      bufferMinutes: Number(availBuffer),
    });

    if (res.success) {
      setFeedback({ type: "success", text: "Counsellor working schedule saved successfully." });
      setIsAvailModalOpen(false);
      loadData();
    } else {
      setFeedback({ type: "error", text: res.error || "Failed to save schedule." });
    }
  };

  // Filtered appointments
  const filteredAppointments = appointments.filter((a) => {
    if (filterCounsellor !== "all" && a.counsellorId !== filterCounsellor) return false;
    if (filterFormat !== "all" && a.format !== filterFormat) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        a.title.toLowerCase().includes(q) ||
        (a.leadName && a.leadName.toLowerCase().includes(q)) ||
        (a.counsellorName && a.counsellorName.toLowerCase().includes(q)) ||
        (a.courseInterest && a.courseInterest.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  });

  const getFormatBadge = (format: AppointmentFormat) => {
    if (format === "virtual") {
      return (
        <Badge variant="outline" className="gap-1 text-xs bg-blue-500/10 text-blue-600 border-blue-200">
          <Video className="h-3 w-3" /> Virtual Session
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="gap-1 text-xs bg-purple-500/10 text-purple-600 border-purple-200">
        <MapPin className="h-3 w-3" /> Campus Visit
      </Badge>
    );
  };

  const getStatusBadge = (status: AppointmentStatus) => {
    switch (status) {
      case "scheduled":
      case "confirmed":
        return <Badge className="bg-blue-600 text-white text-xs">Scheduled</Badge>;
      case "completed":
        return <Badge className="bg-emerald-600 text-white text-xs">Completed</Badge>;
      case "rescheduled":
        return <Badge variant="secondary" className="text-xs">Rescheduled</Badge>;
      case "cancelled":
        return <Badge variant="destructive" className="text-xs">Cancelled</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">{status}</Badge>;
    }
  };

  const getDayName = (day: number) => {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    return days[day] || `Day ${day}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Counselling Appointments & Scheduling
            </h1>
            <Badge variant="outline" className="text-xs">
              Phase 7
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Configure counsellor availability, book conflict-free sessions, and track admissions interviews.
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
            variant="outline"
            size="sm"
            onClick={() => setIsAvailModalOpen(true)}
            className="flex items-center gap-1.5"
          >
            <Settings className="h-4 w-4" />
            Set Working Hours
          </Button>
          <Button
            size="sm"
            onClick={() => setIsBookModalOpen(true)}
            className="flex items-center gap-1.5 bg-primary text-primary-foreground"
          >
            <Plus className="h-4 w-4" />
            Book Appointment
          </Button>
        </div>
      </div>

      {/* Double Booking Guardrail Banner */}
      <div className="rounded-md border border-emerald-500/20 bg-emerald-500/10 p-3.5 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2.5">
        <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600" />
        <div>
          <span className="font-semibold">Transactional & Database Collision Guardrail Active: </span>
          Overlapping appointments for the same counsellor are prevented at the database trigger and application transaction layers.
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
            <AlertCircle className="h-4 w-4 shrink-0" />
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

      {/* Navigation Tabs */}
      <div className="flex border-b border-border space-x-6 text-sm font-medium">
        <button
          onClick={() => setActiveTab("upcoming")}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === "upcoming"
              ? "border-primary text-primary font-semibold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <CalendarDays className="h-4 w-4" />
          Upcoming Sessions
        </button>

        <button
          onClick={() => setActiveTab("completed")}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === "completed"
              ? "border-primary text-primary font-semibold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <CalendarCheck className="h-4 w-4" />
          Completed Sessions
        </button>

        <button
          onClick={() => setActiveTab("cancelled")}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === "cancelled"
              ? "border-primary text-primary font-semibold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <XCircle className="h-4 w-4" />
          Cancelled Sessions
        </button>

        <button
          onClick={() => setActiveTab("availability")}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === "availability"
              ? "border-primary text-primary font-semibold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Clock className="h-4 w-4" />
          Counsellor Working Hours ({availabilities.length})
        </button>
      </div>

      {/* Filter Bar */}
      {activeTab !== "availability" && (
        <Card>
          <CardContent className="p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search student, counsellor, or course..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <select
                value={filterCounsellor}
                onChange={(e) => setFilterCounsellor(e.target.value)}
                aria-label="Filter by counsellor"
                className="h-9 px-3 rounded-md border border-input bg-background text-xs"
              >
                <option value="all">All Counsellors</option>
                {counsellors.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.fullName}
                  </option>
                ))}
              </select>

              <select
                value={filterFormat}
                onChange={(e) => setFilterFormat(e.target.value)}
                aria-label="Filter by format"
                className="h-9 px-3 rounded-md border border-input bg-background text-xs"
              >
                <option value="all">All Formats</option>
                <option value="virtual">Virtual Session</option>
                <option value="in_person">Campus Visit</option>
              </select>

              {(filterCounsellor !== "all" || filterFormat !== "all" || searchQuery) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFilterCounsellor("all");
                    setFilterFormat("all");
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
      )}

      {/* APPOINTMENTS TABLE */}
      {activeTab !== "availability" && (
        <Card>
          <CardContent className="p-0">
            {filteredAppointments.length === 0 ? (
              <EmptyState
                icon={Calendar}
                title={`No ${activeTab} appointments found`}
                description="No appointment records match the selected filters. Book a new counseling session for a lead."
                actionLabel="Book Appointment"
                onAction={() => setIsBookModalOpen(true)}
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Session Details</TableHead>
                    <TableHead>Counsellor</TableHead>
                    <TableHead>Scheduled Time</TableHead>
                    <TableHead>Format & Link</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAppointments.map((app) => (
                    <TableRow key={app.id} className="hover:bg-muted/50">
                      <TableCell>
                        <div className="font-medium text-foreground">{app.leadName || "Student Prospect"}</div>
                        <div className="text-xs text-muted-foreground">{app.courseInterest || "General Admissions"}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-sm text-foreground">{app.title}</div>
                        {app.description && (
                          <div className="text-xs text-muted-foreground line-clamp-1">{app.description}</div>
                        )}
                        {app.cancellationReason && (
                          <div className="text-xs text-destructive mt-0.5">Reason: {app.cancellationReason}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-xs font-medium">{app.counsellorName}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs font-medium">
                          {new Date(app.startTime).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {new Date(app.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} –{" "}
                          {new Date(app.endTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} ({app.durationMinutes}m)
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {getFormatBadge(app.format)}
                          {app.meetingLink && (
                            <div>
                              <a
                                href={app.meetingLink}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[11px] text-primary hover:underline flex items-center gap-1"
                              >
                                Join Meeting <ExternalLink className="h-2.5 w-2.5" />
                              </a>
                            </div>
                          )}
                          {app.location && (
                            <div className="text-[11px] text-muted-foreground truncate max-w-[150px]">
                              📍 {app.location}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(app.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {app.status !== "completed" && app.status !== "cancelled" && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleCompleteAppointment(app.id)}
                                className="h-7 px-2 text-xs text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                                title="Mark Completed"
                              >
                                <Check className="h-3 w-3 mr-1" /> Complete
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setRescheduleTarget(app);
                                  setRescheduleDate(new Date(app.startTime).toISOString().slice(0, 10));
                                }}
                                className="h-7 px-2 text-xs"
                              >
                                Reschedule
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleCancelAppointment(app.id)}
                                className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10"
                              >
                                Cancel
                              </Button>
                            </>
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
      )}

      {/* COUNSELLOR AVAILABILITY TAB */}
      {activeTab === "availability" && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold">Counsellor Working Hours & Slot Buffers</CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Controls bookable calendar windows, appointment duration, and rest buffers between meetings.
                  </CardDescription>
                </div>
                <Button size="sm" onClick={() => setIsAvailModalOpen(true)} className="text-xs">
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Day Schedule
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0 pt-2">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Counsellor</TableHead>
                    <TableHead>Day of Week</TableHead>
                    <TableHead>Working Hours</TableHead>
                    <TableHead>Slot Duration</TableHead>
                    <TableHead>Buffer Time</TableHead>
                    <TableHead>Timezone</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {availabilities.map((av) => (
                    <TableRow key={av.id}>
                      <TableCell className="font-medium text-foreground">{av.counsellorName}</TableCell>
                      <TableCell className="font-semibold">{getDayName(av.dayOfWeek)}</TableCell>
                      <TableCell className="text-xs font-mono">
                        {av.startTime.slice(0, 5)} – {av.endTime.slice(0, 5)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">{av.slotDurationMinutes} mins</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">{av.bufferMinutes} mins buffer</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{av.timezone}</TableCell>
                      <TableCell>
                        <Badge className="bg-emerald-600 text-white text-xs">Active</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* BOOK APPOINTMENT MODAL */}
      {isBookModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-background rounded-lg border shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-semibold text-lg">Book Counselling Appointment</h3>
              <Button variant="ghost" size="sm" onClick={() => setIsBookModalOpen(false)} className="h-8 w-8 p-0">
                ✕
              </Button>
            </div>

            <form onSubmit={handleBookSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold">Select Student Prospect *</label>
                <select
                  value={bookLeadId}
                  onChange={(e) => {
                    setBookLeadId(e.target.value);
                    const l = leads.find((lead) => lead.id === e.target.value);
                    if (l && !bookTitle) {
                      setBookTitle(`Admissions Counselling: ${l.studentName}`);
                    }
                  }}
                  className="w-full h-9 mt-1 px-3 rounded-md border border-input bg-background"
                  required
                >
                  <option value="">-- Choose student lead --</option>
                  {leads.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.studentName} ({l.courseInterest})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold">Counsellor *</label>
                <select
                  value={bookCounsellorId}
                  onChange={(e) => setBookCounsellorId(e.target.value)}
                  className="w-full h-9 mt-1 px-3 rounded-md border border-input bg-background"
                  required
                >
                  {counsellors.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.fullName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold">Target Date *</label>
                  <Input
                    type="date"
                    value={bookDate}
                    onChange={(e) => setBookDate(e.target.value)}
                    required
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="font-semibold">Format</label>
                  <select
                    value={bookFormat}
                    onChange={(e) => setBookFormat(e.target.value as AppointmentFormat)}
                    className="w-full h-9 mt-1 px-3 rounded-md border border-input bg-background"
                  >
                    <option value="virtual">Virtual Video Meeting</option>
                    <option value="in_person">In-Person Campus Visit</option>
                  </select>
                </div>
              </div>

              {/* Available Slots Selector */}
              <div>
                <label className="font-semibold flex items-center justify-between">
                  <span>Available Bookable Slots (Collision-Free) *</span>
                  {loadingSlots && <span className="text-[11px] text-muted-foreground animate-pulse">Calculating slots...</span>}
                </label>
                {availableSlots.length === 0 && !loadingSlots ? (
                  <div className="p-3 bg-muted/40 rounded border text-muted-foreground text-[11px] mt-1">
                    No open slots available on this date for the selected counsellor. (Check working hours or choose another date).
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-1.5 mt-1 max-h-36 overflow-y-auto p-1 border rounded-md">
                    {availableSlots.map((slot, i) => {
                      const timeStr = new Date(slot.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                      const isSelected = bookSlotTime === slot.startTime;
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setBookSlotTime(slot.startTime)}
                          className={`p-2 rounded text-xs font-mono text-center border transition-all ${
                            isSelected
                              ? "bg-primary text-primary-foreground border-primary font-bold shadow-sm"
                              : "bg-background hover:bg-muted text-foreground border-input"
                          }`}
                        >
                          {timeStr}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <label className="font-semibold">Session Title *</label>
                <Input
                  value={bookTitle}
                  onChange={(e) => setBookTitle(e.target.value)}
                  placeholder="e.g. B.Tech Admissions Consultation"
                  required
                  className="mt-1"
                />
              </div>

              {bookFormat === "virtual" ? (
                <div>
                  <label className="font-semibold">Meeting URL (Optional)</label>
                  <Input
                    value={bookMeetingLink}
                    onChange={(e) => setBookMeetingLink(e.target.value)}
                    placeholder="https://meet.admitflow.com/session-id"
                    className="mt-1"
                  />
                </div>
              ) : (
                <div>
                  <label className="font-semibold">Campus Room / Location</label>
                  <Input
                    value={bookLocation}
                    onChange={(e) => setBookLocation(e.target.value)}
                    placeholder="e.g. AI Innovation Center Rm 302"
                    className="mt-1"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsBookModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={!bookSlotTime}>
                  Confirm Appointment
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESCHEDULE MODAL */}
      {rescheduleTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-background rounded-lg border shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-semibold text-lg">Reschedule Appointment</h3>
              <Button variant="ghost" size="sm" onClick={() => setRescheduleTarget(null)} className="h-8 w-8 p-0">
                ✕
              </Button>
            </div>

            <form onSubmit={handleRescheduleSubmit} className="space-y-3 text-xs">
              <div className="p-2.5 rounded bg-muted/40 border">
                <p className="font-semibold">{rescheduleTarget.title}</p>
                <p className="text-muted-foreground mt-0.5">
                  Student: {rescheduleTarget.leadName} • Counsellor: {rescheduleTarget.counsellorName}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Current: {new Date(rescheduleTarget.startTime).toLocaleString()}
                </p>
              </div>

              <div>
                <label className="font-semibold">New Target Date *</label>
                <Input
                  type="date"
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  required
                  className="mt-1"
                />
              </div>

              <div>
                <label className="font-semibold flex items-center justify-between">
                  <span>Select New Time Slot *</span>
                  {loadingRescheduleSlots && <span className="text-[11px] text-muted-foreground animate-pulse">Checking slots...</span>}
                </label>
                {rescheduleSlots.length === 0 && !loadingRescheduleSlots ? (
                  <div className="p-2.5 bg-muted/30 rounded border text-muted-foreground text-[11px] mt-1">
                    No open slots on this date.
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-1.5 mt-1 max-h-36 overflow-y-auto p-1 border rounded-md">
                    {rescheduleSlots.map((slot, i) => {
                      const timeStr = new Date(slot.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                      const isSelected = rescheduleSlotTime === slot.startTime;
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setRescheduleSlotTime(slot.startTime)}
                          className={`p-2 rounded text-xs font-mono text-center border transition-all ${
                            isSelected
                              ? "bg-primary text-primary-foreground border-primary font-bold shadow-sm"
                              : "bg-background hover:bg-muted text-foreground border-input"
                          }`}
                        >
                          {timeStr}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <label className="font-semibold">Reschedule Reason</label>
                <Input
                  value={rescheduleReason}
                  onChange={(e) => setRescheduleReason(e.target.value)}
                  placeholder="e.g. Schedule conflict with entrance exam"
                  className="mt-1"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t">
                <Button type="button" variant="outline" size="sm" onClick={() => setRescheduleTarget(null)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={!rescheduleSlotTime}>
                  Update Schedule
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIGURE WORKING HOURS MODAL */}
      {isAvailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-background rounded-lg border shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-semibold text-lg">Configure Working Hours</h3>
              <Button variant="ghost" size="sm" onClick={() => setIsAvailModalOpen(false)} className="h-8 w-8 p-0">
                ✕
              </Button>
            </div>

            <form onSubmit={handleSaveAvailability} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold">Counsellor *</label>
                <select
                  value={availCounsellorId}
                  onChange={(e) => setAvailCounsellorId(e.target.value)}
                  className="w-full h-9 mt-1 px-3 rounded-md border border-input bg-background"
                  required
                >
                  {counsellors.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.fullName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold">Day of Week *</label>
                <select
                  value={availDay}
                  onChange={(e) => setAvailDay(Number(e.target.value))}
                  className="w-full h-9 mt-1 px-3 rounded-md border border-input bg-background"
                >
                  <option value={1}>Monday</option>
                  <option value={2}>Tuesday</option>
                  <option value={3}>Wednesday</option>
                  <option value={4}>Thursday</option>
                  <option value={5}>Friday</option>
                  <option value={6}>Saturday</option>
                  <option value={0}>Sunday</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold">Start Time *</label>
                  <Input
                    type="time"
                    value={availStart}
                    onChange={(e) => setAvailStart(e.target.value)}
                    required
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="font-semibold">End Time *</label>
                  <Input
                    type="time"
                    value={availEnd}
                    onChange={(e) => setAvailEnd(e.target.value)}
                    required
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold">Session Duration (mins)</label>
                  <select
                    value={availDuration}
                    onChange={(e) => setAvailDuration(Number(e.target.value))}
                    className="w-full h-9 mt-1 px-3 rounded-md border border-input bg-background"
                  >
                    <option value={20}>20 minutes</option>
                    <option value={30}>30 minutes</option>
                    <option value={45}>45 minutes</option>
                    <option value={60}>60 minutes</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold">Buffer Between Slots (mins)</label>
                  <select
                    value={availBuffer}
                    onChange={(e) => setAvailBuffer(Number(e.target.value))}
                    className="w-full h-9 mt-1 px-3 rounded-md border border-input bg-background"
                  >
                    <option value={5}>5 minutes</option>
                    <option value={10}>10 minutes</option>
                    <option value={15}>15 minutes</option>
                    <option value={20}>20 minutes</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsAvailModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm">
                  Save Working Schedule
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
