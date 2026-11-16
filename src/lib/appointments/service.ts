import type { AuthSession, AppRole } from "../auth/types.ts";
import type {
  CounsellorAvailabilityRecord,
  AvailableSlot,
  AppointmentRecord,
  BookAppointmentInput,
  RescheduleAppointmentInput,
  CancelAppointmentInput,
  ConfigureAvailabilityInput,
  AppointmentFilterParams,
  AppointmentStatus,
} from "../../types/appointment.ts";
import { LeadService } from "../leads/service.ts";

class InMemoryAppointmentStore {
  private availabilities: Map<string, CounsellorAvailabilityRecord[]> = new Map();
  private appointments: Map<string, AppointmentRecord[]> = new Map();

  constructor() {
    this.seedDefaultData();
  }

  private seedDefaultData() {
    const apexId = "a0000000-0000-0000-0000-000000000001";
    const beaconId = "b0000000-0000-0000-0000-000000000002";
    const now = new Date();

    // 1. Apex Availability: Ada Lovelace (Monday through Friday, 09:00 - 17:00, 30 min, 10 min buffer)
    const apexAvail: CounsellorAvailabilityRecord[] = [1, 2, 3, 4, 5].map((day) => ({
      id: `c0000001-0000-0000-0000-00000000000${day}`,
      tenantId: apexId,
      counsellorId: "10000000-0000-0000-0000-000000000002",
      counsellorName: "Ada Lovelace",
      dayOfWeek: day,
      startTime: "09:00:00",
      endTime: "17:00:00",
      slotDurationMinutes: 30,
      bufferMinutes: 10,
      isActive: true,
      timezone: "America/Los_Angeles",
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    }));
    this.availabilities.set(apexId, apexAvail);

    // 2. Beacon Availability: Claude Shannon (Monday through Friday, 10:00 - 18:00, 45 min, 15 min buffer)
    const beaconAvail: CounsellorAvailabilityRecord[] = [1, 2, 3, 4, 5].map((day) => ({
      id: `c0000002-0000-0000-0000-00000000000${day}`,
      tenantId: beaconId,
      counsellorId: "20000000-0000-0000-0000-000000000002",
      counsellorName: "Claude Shannon",
      dayOfWeek: day,
      startTime: "10:00:00",
      endTime: "18:00:00",
      slotDurationMinutes: 45,
      bufferMinutes: 15,
      isActive: true,
      timezone: "America/New_York",
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    }));
    this.availabilities.set(beaconId, beaconAvail);

    // 3. Apex Seed Appointments
    const apexAppointments: AppointmentRecord[] = [
      {
        id: "00000007-0000-0000-0000-000000000001",
        tenantId: apexId,
        leadId: "a1111111-0000-0000-0000-000000000001",
        leadName: "Alex Rivera",
        leadEmail: "alex.rivera@example.com",
        leadPhone: "+1-555-1101",
        courseInterest: "B.Tech AI & Robotics",
        counsellorId: "10000000-0000-0000-0000-000000000002",
        counsellorName: "Ada Lovelace",
        title: "B.Tech AI Admissions & Curriculum Evaluation",
        description: "Detailed portfolio review and scholarship consultation.",
        startTime: new Date(now.getTime() - 24 * 3600000).toISOString(),
        endTime: new Date(now.getTime() - 23.5 * 3600000).toISOString(),
        durationMinutes: 30,
        bufferMinutes: 10,
        format: "virtual",
        status: "completed",
        meetingLink: "https://meet.admitflow.com/apex-alex-rivera",
        location: null,
        timezone: "America/Los_Angeles",
        metadata: {},
        createdAt: new Date(now.getTime() - 48 * 3600000).toISOString(),
        updatedAt: new Date(now.getTime() - 23.5 * 3600000).toISOString(),
      },
      {
        id: "00000007-0000-0000-0000-000000000002",
        tenantId: apexId,
        leadId: "a1111111-0000-0000-0000-000000000002",
        leadName: "Samira Mehta",
        leadEmail: "samira.mehta@example.com",
        leadPhone: "+1-555-1102",
        courseInterest: "M.Sc Cybersecurity",
        counsellorId: "10000000-0000-0000-0000-000000000002",
        counsellorName: "Ada Lovelace",
        title: "M.Sc Cybersecurity Lab Tour & Batch Scheduling",
        description: "Discussion of morning vs weekend cohort schedules.",
        startTime: new Date(now.getTime() + 24 * 3600000).toISOString(),
        endTime: new Date(now.getTime() + 24.5 * 3600000).toISOString(),
        durationMinutes: 30,
        bufferMinutes: 10,
        format: "in_person",
        status: "scheduled",
        meetingLink: null,
        location: "Main Campus, AI Innovation Center Rm 302",
        timezone: "America/Los_Angeles",
        metadata: {},
        createdAt: new Date(now.getTime() - 12 * 3600000).toISOString(),
        updatedAt: new Date(now.getTime() - 12 * 3600000).toISOString(),
      },
    ];
    this.appointments.set(apexId, apexAppointments);

    // 4. Beacon Seed Appointments
    const beaconAppointments: AppointmentRecord[] = [
      {
        id: "00000007-0000-0000-0000-000000000003",
        tenantId: beaconId,
        leadId: "b2222222-0000-0000-0000-000000000002",
        leadName: "Chloe Vance",
        leadEmail: "chloe.vance@example.com",
        leadPhone: "+1-555-2202",
        courseInterest: "M.Sc Financial Engineering",
        counsellorId: "20000000-0000-0000-0000-000000000002",
        counsellorName: "Claude Shannon",
        title: "M.Sc Financial Engineering Intake Interview",
        description: "Final enrollment document checklist and orientation overview.",
        startTime: new Date(now.getTime() - 48 * 3600000).toISOString(),
        endTime: new Date(now.getTime() - 47.25 * 3600000).toISOString(),
        durationMinutes: 45,
        bufferMinutes: 15,
        format: "virtual",
        status: "completed",
        meetingLink: "https://meet.beacon.edu/chloe-vance",
        location: null,
        timezone: "America/New_York",
        metadata: {},
        createdAt: new Date(now.getTime() - 72 * 3600000).toISOString(),
        updatedAt: new Date(now.getTime() - 47.25 * 3600000).toISOString(),
      },
      {
        id: "00000007-0000-0000-0000-000000000004",
        tenantId: beaconId,
        leadId: "b2222222-0000-0000-0000-000000000001",
        leadName: "Liam Dubois",
        leadEmail: "liam.dubois@example.com",
        leadPhone: "+1-555-2201",
        courseInterest: "MBA International Trade",
        counsellorId: "20000000-0000-0000-0000-000000000002",
        counsellorName: "Claude Shannon",
        title: "MBA Program Overview & Credit Transfer",
        description: "Review of 2-year professional work experience credits.",
        startTime: new Date(now.getTime() + 18 * 3600000).toISOString(),
        endTime: new Date(now.getTime() + 18.75 * 3600000).toISOString(),
        durationMinutes: 45,
        bufferMinutes: 15,
        format: "virtual",
        status: "scheduled",
        meetingLink: "https://meet.beacon.edu/liam-dubois",
        location: null,
        timezone: "America/New_York",
        metadata: {},
        createdAt: new Date(now.getTime() - 6 * 3600000).toISOString(),
        updatedAt: new Date(now.getTime() - 6 * 3600000).toISOString(),
      },
    ];
    this.appointments.set(beaconId, beaconAppointments);
  }

  public getTenantAvailabilities(tenantId: string): CounsellorAvailabilityRecord[] {
    if (!this.availabilities.has(tenantId)) {
      this.availabilities.set(tenantId, []);
    }
    return this.availabilities.get(tenantId)!;
  }

  public saveAvailability(record: CounsellorAvailabilityRecord): void {
    const list = this.getTenantAvailabilities(record.tenantId);
    const idx = list.findIndex(
      (a) =>
        a.counsellorId === record.counsellorId && a.dayOfWeek === record.dayOfWeek
    );
    if (idx >= 0) {
      list[idx] = record;
    } else {
      list.push(record);
    }
  }

  public getTenantAppointments(tenantId: string): AppointmentRecord[] {
    if (!this.appointments.has(tenantId)) {
      this.appointments.set(tenantId, []);
    }
    return this.appointments.get(tenantId)!;
  }

  public getAppointment(tenantId: string, id: string): AppointmentRecord | null {
    return this.getTenantAppointments(tenantId).find((a) => a.id === id) || null;
  }

  public saveAppointment(app: AppointmentRecord): void {
    const list = this.getTenantAppointments(app.tenantId);
    const idx = list.findIndex((a) => a.id === app.id);
    if (idx >= 0) {
      list[idx] = app;
    } else {
      list.unshift(app);
    }
  }
}

export const devAppointmentStore = new InMemoryAppointmentStore();

export class AppointmentService {
  private static getVerifiedTenantId(session: AuthSession): string {
    const tenantId =
      session.currentTenant?.id ||
      session.memberships?.[0]?.tenantId ||
      (session.user as any)?.tenantId;
    if (!session.isAuthenticated || !tenantId) {
      throw new Error("Authentication required: No verified tenant membership found.");
    }
    return tenantId;
  }

  /**
   * Configure counsellor working availability schedule.
   */
  public static async configureAvailability(
    session: AuthSession,
    input: ConfigureAvailabilityInput
  ): Promise<CounsellorAvailabilityRecord> {
    const tenantId = this.getVerifiedTenantId(session);

    if (input.dayOfWeek < 0 || input.dayOfWeek > 6) {
      throw new Error("Invalid day of week: must be between 0 (Sunday) and 6 (Saturday).");
    }
    if (!input.startTime || !input.endTime) {
      throw new Error("Start time and end time are required.");
    }

    const counsellorName =
      input.counsellorId === "10000000-0000-0000-0000-000000000002"
        ? "Ada Lovelace"
        : input.counsellorId === "20000000-0000-0000-0000-000000000002"
        ? "Claude Shannon"
        : session.user?.fullName || "Admissions Counsellor";

    const record: CounsellorAvailabilityRecord = {
      id: crypto.randomUUID(),
      tenantId,
      counsellorId: input.counsellorId,
      counsellorName,
      dayOfWeek: input.dayOfWeek,
      startTime: input.startTime.includes(":") && input.startTime.split(":").length === 2 ? `${input.startTime}:00` : input.startTime,
      endTime: input.endTime.includes(":") && input.endTime.split(":").length === 2 ? `${input.endTime}:00` : input.endTime,
      slotDurationMinutes: input.slotDurationMinutes || 30,
      bufferMinutes: input.bufferMinutes !== undefined ? input.bufferMinutes : 10,
      isActive: input.isActive !== undefined ? input.isActive : true,
      timezone: input.timezone || "UTC",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    devAppointmentStore.saveAvailability(record);
    return record;
  }

  /**
   * List counsellor availability schedules for the tenant.
   */
  public static async listAvailability(
    session: AuthSession,
    counsellorId?: string
  ): Promise<CounsellorAvailabilityRecord[]> {
    const tenantId = this.getVerifiedTenantId(session);
    let list = devAppointmentStore.getTenantAvailabilities(tenantId);

    if (counsellorId) {
      list = list.filter((a) => a.counsellorId === counsellorId);
    }

    return list.sort((a, b) => a.dayOfWeek - b.dayOfWeek);
  }

  /**
   * Generate available bookable time slots for a given counsellor and date.
   * Takes into account counsellor working hours, slot duration, buffer times,
   * and already booked active appointments to prevent collisions.
   */
  public static async getAvailableSlots(
    session: AuthSession,
    counsellorId: string,
    dateStr: string // YYYY-MM-DD
  ): Promise<AvailableSlot[]> {
    const tenantId = this.getVerifiedTenantId(session);
    const dateObj = new Date(`${dateStr}T00:00:00`);
    const dayOfWeek = dateObj.getDay();

    const availabilities = devAppointmentStore.getTenantAvailabilities(tenantId);
    const schedule = availabilities.find(
      (a) => a.counsellorId === counsellorId && a.dayOfWeek === dayOfWeek && a.isActive
    );

    if (!schedule) {
      return []; // Counsellor does not work on this day
    }

    // Parse start and end hours
    const [startH, startM] = schedule.startTime.split(":").map(Number);
    const [endH, endM] = schedule.endTime.split(":").map(Number);

    const slotDurationMs = schedule.slotDurationMinutes * 60_000;
    const bufferMs = schedule.bufferMinutes * 60_000;
    const stepMs = slotDurationMs + bufferMs;

    const windowStart = new Date(`${dateStr}T${String(startH).padStart(2, "0")}:${String(startM).padStart(2, "0")}:00`);
    const windowEnd = new Date(`${dateStr}T${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}:00`);

    // Existing active appointments for this counsellor on this day
    const existing = devAppointmentStore
      .getTenantAppointments(tenantId)
      .filter(
        (a) =>
          a.counsellorId === counsellorId &&
          (a.status === "scheduled" || a.status === "confirmed")
      );

    const slots: AvailableSlot[] = [];
    let current = windowStart.getTime();

    while (current + slotDurationMs <= windowEnd.getTime()) {
      const slotStart = new Date(current);
      const slotEnd = new Date(current + slotDurationMs);

      // Check overlap with any active appointment
      const hasConflict = existing.some((app) => {
        const appStart = new Date(app.startTime).getTime();
        const appEnd = new Date(app.endTime).getTime();
        return slotStart.getTime() < appEnd && slotEnd.getTime() > appStart;
      });

      if (!hasConflict) {
        slots.push({
          counsellorId,
          counsellorName: schedule.counsellorName || "Admissions Counsellor",
          date: dateStr,
          startTime: slotStart.toISOString(),
          endTime: slotEnd.toISOString(),
          durationMinutes: schedule.slotDurationMinutes,
          timezone: schedule.timezone,
        });
      }

      current += stepMs;
    }

    return slots;
  }

  /**
   * Book an appointment with strict double-booking prevention.
   */
  public static async bookAppointment(
    session: AuthSession,
    input: BookAppointmentInput
  ): Promise<AppointmentRecord> {
    const tenantId = this.getVerifiedTenantId(session);

    if (!input.leadId) throw new Error("Lead ID is required.");
    if (!input.counsellorId) throw new Error("Counsellor ID is required.");
    if (!input.title || !input.title.trim()) throw new Error("Appointment title is required.");
    if (!input.startTime) throw new Error("Start time is required.");

    const leadDetails = await LeadService.getLeadById(session, input.leadId);
    const lead = leadDetails?.lead;
    if (!lead) {
      throw new Error(`Lead ${input.leadId} not found.`);
    }

    const durationMinutes = input.durationMinutes || 30;
    const bufferMinutes = input.bufferMinutes !== undefined ? input.bufferMinutes : 10;
    const startMs = new Date(input.startTime).getTime();
    const endMs = startMs + durationMinutes * 60_000;
    const startTimeISO = new Date(startMs).toISOString();
    const endTimeISO = new Date(endMs).toISOString();

    // 1. Transactional Double Booking Check
    const existingAppointments = devAppointmentStore.getTenantAppointments(tenantId);
    const hasCollision = existingAppointments.some((a) => {
      if (a.counsellorId !== input.counsellorId) return false;
      if (a.status !== "scheduled" && a.status !== "confirmed") return false;
      const existingStart = new Date(a.startTime).getTime();
      const existingEnd = new Date(a.endTime).getTime();
      return startMs < existingEnd && endMs > existingStart;
    });

    if (hasCollision) {
      throw new Error(
        "Double booking conflict: Counsellor is already booked for this time window."
      );
    }

    const counsellorName =
      input.counsellorId === "10000000-0000-0000-0000-000000000002"
        ? "Ada Lovelace"
        : input.counsellorId === "20000000-0000-0000-0000-000000000002"
        ? "Claude Shannon"
        : session.user?.fullName || "Admissions Counsellor";

    const newApp: AppointmentRecord = {
      id: crypto.randomUUID(),
      tenantId,
      leadId: input.leadId,
      leadName: lead.studentName,
      leadEmail: lead.email,
      leadPhone: lead.phone,
      courseInterest: lead.courseInterest,
      counsellorId: input.counsellorId,
      counsellorName,
      title: input.title.trim(),
      description: input.description?.trim() || "",
      startTime: startTimeISO,
      endTime: endTimeISO,
      durationMinutes,
      bufferMinutes,
      format: input.format || "virtual",
      status: "scheduled",
      meetingLink:
        input.meetingLink ||
        (input.format !== "in_person"
          ? `https://meet.admitflow.com/${input.leadId.slice(0, 8)}`
          : null),
      location: input.location || (input.format === "in_person" ? "Admissions Center Rm 101" : null),
      timezone: input.timezone || "UTC",
      notes: input.notes?.trim() || null,
      metadata: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    devAppointmentStore.saveAppointment(newApp);

    // Update lead CRM stage to 'counselling_booked' if not yet admitted
    if (lead.status !== "admitted") {
      try {
        await LeadService.updateLead(session, input.leadId, { status: "counselling_booked" });
      } catch {
        // Non-fatal
      }
    }

    try {
      await LeadService.addNoteActivity(
        session,
        input.leadId,
        `Appointment booked: "${newApp.title}" on ${new Date(newApp.startTime).toLocaleString()} with ${counsellorName}`
      );
    } catch {
      // Non-fatal
    }

    return newApp;
  }

  /**
   * Reschedule an appointment to a new time with conflict checking.
   */
  public static async rescheduleAppointment(
    session: AuthSession,
    input: RescheduleAppointmentInput
  ): Promise<AppointmentRecord> {
    const tenantId = this.getVerifiedTenantId(session);
    const appointment = devAppointmentStore.getAppointment(tenantId, input.appointmentId);

    if (!appointment) {
      throw new Error(`Appointment ${input.appointmentId} not found.`);
    }

    const durationMinutes = input.durationMinutes || appointment.durationMinutes;
    const startMs = new Date(input.newStartTime).getTime();
    const endMs = startMs + durationMinutes * 60_000;

    // Check collision against other appointments
    const existingAppointments = devAppointmentStore.getTenantAppointments(tenantId);
    const hasCollision = existingAppointments.some((a) => {
      if (a.id === appointment.id) return false;
      if (a.counsellorId !== appointment.counsellorId) return false;
      if (a.status !== "scheduled" && a.status !== "confirmed") return false;
      const existingStart = new Date(a.startTime).getTime();
      const existingEnd = new Date(a.endTime).getTime();
      return startMs < existingEnd && endMs > existingStart;
    });

    if (hasCollision) {
      throw new Error(
        "Double booking conflict: Counsellor is already booked for this new time window."
      );
    }

    const now = new Date().toISOString();
    const updated: AppointmentRecord = {
      ...appointment,
      startTime: new Date(startMs).toISOString(),
      endTime: new Date(endMs).toISOString(),
      durationMinutes,
      status: "rescheduled",
      rescheduledFromId: appointment.id,
      notes: input.reason
        ? `${appointment.notes ? appointment.notes + " | " : ""}Rescheduled: ${input.reason}`
        : appointment.notes,
      updatedAt: now,
    };

    devAppointmentStore.saveAppointment(updated);

    try {
      await LeadService.addNoteActivity(
        session,
        appointment.leadId,
        `Appointment rescheduled to ${new Date(updated.startTime).toLocaleString()}${input.reason ? ` (${input.reason})` : ""}`
      );
    } catch {
      // Non-fatal
    }

    return updated;
  }

  /**
   * Cancel an appointment.
   */
  public static async cancelAppointment(
    session: AuthSession,
    input: CancelAppointmentInput
  ): Promise<AppointmentRecord> {
    const tenantId = this.getVerifiedTenantId(session);
    const appointment = devAppointmentStore.getAppointment(tenantId, input.appointmentId);

    if (!appointment) {
      throw new Error(`Appointment ${input.appointmentId} not found.`);
    }

    const now = new Date().toISOString();
    const updated: AppointmentRecord = {
      ...appointment,
      status: "cancelled",
      cancellationReason: input.reason || "Cancelled by admissions staff.",
      updatedAt: now,
    };

    devAppointmentStore.saveAppointment(updated);

    try {
      await LeadService.addNoteActivity(
        session,
        appointment.leadId,
        `Appointment cancelled: ${updated.cancellationReason}`
      );
    } catch {
      // Non-fatal
    }

    return updated;
  }

  /**
   * Complete an appointment.
   */
  public static async completeAppointment(
    session: AuthSession,
    appointmentId: string
  ): Promise<AppointmentRecord> {
    const tenantId = this.getVerifiedTenantId(session);
    const appointment = devAppointmentStore.getAppointment(tenantId, appointmentId);

    if (!appointment) {
      throw new Error(`Appointment ${appointmentId} not found.`);
    }

    const now = new Date().toISOString();
    const updated: AppointmentRecord = {
      ...appointment,
      status: "completed",
      updatedAt: now,
    };

    devAppointmentStore.saveAppointment(updated);

    try {
      await LeadService.addNoteActivity(
        session,
        appointment.leadId,
        `Appointment completed: "${appointment.title}"`
      );
    } catch {
      // Non-fatal
    }

    return updated;
  }

  /**
   * List appointments with filter parameters and timeframe sorting.
   */
  public static async listAppointments(
    session: AuthSession,
    params: AppointmentFilterParams = {}
  ): Promise<AppointmentRecord[]> {
    const tenantId = this.getVerifiedTenantId(session);
    const now = new Date();
    let list = devAppointmentStore.getTenantAppointments(tenantId);

    if (params.status && params.status !== "all") {
      list = list.filter((a) => a.status === params.status);
    }

    if (params.counsellorId && params.counsellorId !== "all") {
      list = list.filter((a) => a.counsellorId === params.counsellorId);
    }

    if (params.leadId) {
      list = list.filter((a) => a.leadId === params.leadId);
    }

    if (params.format && params.format !== "all") {
      list = list.filter((a) => a.format === params.format);
    }

    if (params.timeframe === "upcoming") {
      list = list.filter(
        (a) =>
          (a.status === "scheduled" || a.status === "confirmed" || a.status === "rescheduled") &&
          new Date(a.startTime) >= now
      );
      return list.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    }

    if (params.timeframe === "completed") {
      list = list.filter(
        (a) => a.status === "completed" || (new Date(a.startTime) < now && a.status !== "cancelled")
      );
      return list.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
    }

    if (params.timeframe === "cancelled") {
      list = list.filter((a) => a.status === "cancelled");
      return list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    }

    if (params.search && params.search.trim()) {
      const q = params.search.toLowerCase().trim();
      list = list.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          (a.leadName && a.leadName.toLowerCase().includes(q)) ||
          (a.counsellorName && a.counsellorName.toLowerCase().includes(q)) ||
          (a.courseInterest && a.courseInterest.toLowerCase().includes(q))
      );
    }

    return list.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
  }
}
