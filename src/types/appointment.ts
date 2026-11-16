export type AppointmentStatus =
  | "scheduled"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "rescheduled"
  | "no_show";

export type AppointmentFormat = "virtual" | "in_person";

export interface CounsellorAvailabilityRecord {
  id: string;
  tenantId: string;
  counsellorId: string;
  counsellorName?: string;
  dayOfWeek: number; // 0=Sun, 1=Mon, ..., 6=Sat
  startTime: string; // HH:mm:ss
  endTime: string;   // HH:mm:ss
  slotDurationMinutes: number;
  bufferMinutes: number;
  isActive: boolean;
  timezone: string;
  createdAt: string;
  updatedAt: string;
}

export interface AvailableSlot {
  counsellorId: string;
  counsellorName: string;
  date: string; // YYYY-MM-DD
  startTime: string; // ISO string
  endTime: string;   // ISO string
  durationMinutes: number;
  timezone: string;
}

export interface AppointmentRecord {
  id: string;
  tenantId: string;
  leadId: string;
  leadName?: string;
  leadEmail?: string | null;
  leadPhone?: string | null;
  courseInterest?: string;
  counsellorId: string;
  counsellorName?: string;
  title: string;
  description: string;
  startTime: string; // ISO string
  endTime: string;   // ISO string
  durationMinutes: number;
  bufferMinutes: number;
  format: AppointmentFormat;
  status: AppointmentStatus;
  meetingLink?: string | null;
  location?: string | null;
  timezone: string;
  rescheduledFromId?: string | null;
  cancellationReason?: string | null;
  notes?: string | null;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface BookAppointmentInput {
  leadId: string;
  counsellorId: string;
  title: string;
  description?: string;
  startTime: string; // ISO string
  durationMinutes?: number;
  bufferMinutes?: number;
  format?: AppointmentFormat;
  meetingLink?: string;
  location?: string;
  timezone?: string;
  notes?: string;
}

export interface RescheduleAppointmentInput {
  appointmentId: string;
  newStartTime: string; // ISO string
  durationMinutes?: number;
  reason?: string;
}

export interface CancelAppointmentInput {
  appointmentId: string;
  reason: string;
}

export interface ConfigureAvailabilityInput {
  counsellorId: string;
  dayOfWeek: number;
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
  slotDurationMinutes?: number;
  bufferMinutes?: number;
  isActive?: boolean;
  timezone?: string;
}

export interface AppointmentFilterParams {
  status?: string;
  counsellorId?: string;
  leadId?: string;
  format?: string;
  timeframe?: "upcoming" | "completed" | "cancelled" | "all";
  startDate?: string;
  endDate?: string;
  search?: string;
}
