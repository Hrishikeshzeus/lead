"use server";

import { getServerAuthSession } from "@/lib/auth/session";
import { AppointmentService } from "@/lib/appointments/service";
import type {
  AppointmentRecord,
  BookAppointmentInput,
  RescheduleAppointmentInput,
  CancelAppointmentInput,
  ConfigureAvailabilityInput,
  CounsellorAvailabilityRecord,
  AvailableSlot,
  AppointmentFilterParams,
} from "@/types/appointment";

export interface ActionResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * List appointments with filters and timeframe sorting.
 */
export async function getAppointmentsAction(
  params?: AppointmentFilterParams
): Promise<ActionResult<AppointmentRecord[]>> {
  try {
    const session = await getServerAuthSession();
    const appointments = await AppointmentService.listAppointments(session, params);
    return { success: true, data: appointments };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to fetch appointments." };
  }
}

/**
 * Book an appointment with strict double-booking collision checks.
 */
export async function bookAppointmentAction(
  input: BookAppointmentInput
): Promise<ActionResult<AppointmentRecord>> {
  try {
    const session = await getServerAuthSession();
    const appointment = await AppointmentService.bookAppointment(session, input);
    return { success: true, data: appointment };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to book appointment." };
  }
}

/**
 * Reschedule an appointment to a new slot.
 */
export async function rescheduleAppointmentAction(
  input: RescheduleAppointmentInput
): Promise<ActionResult<AppointmentRecord>> {
  try {
    const session = await getServerAuthSession();
    const appointment = await AppointmentService.rescheduleAppointment(session, input);
    return { success: true, data: appointment };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to reschedule appointment." };
  }
}

/**
 * Cancel an appointment.
 */
export async function cancelAppointmentAction(
  input: CancelAppointmentInput
): Promise<ActionResult<AppointmentRecord>> {
  try {
    const session = await getServerAuthSession();
    const appointment = await AppointmentService.cancelAppointment(session, input);
    return { success: true, data: appointment };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to cancel appointment." };
  }
}

/**
 * Mark appointment completed.
 */
export async function completeAppointmentAction(
  appointmentId: string
): Promise<ActionResult<AppointmentRecord>> {
  try {
    const session = await getServerAuthSession();
    const appointment = await AppointmentService.completeAppointment(session, appointmentId);
    return { success: true, data: appointment };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to complete appointment." };
  }
}

/**
 * Get available bookable slots for a counsellor on a given date.
 */
export async function getAvailableSlotsAction(
  counsellorId: string,
  dateStr: string
): Promise<ActionResult<AvailableSlot[]>> {
  try {
    const session = await getServerAuthSession();
    const slots = await AppointmentService.getAvailableSlots(session, counsellorId, dateStr);
    return { success: true, data: slots };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to calculate available slots." };
  }
}

/**
 * Configure counsellor working hours and buffer duration.
 */
export async function configureAvailabilityAction(
  input: ConfigureAvailabilityInput
): Promise<ActionResult<CounsellorAvailabilityRecord>> {
  try {
    const session = await getServerAuthSession();
    const schedule = await AppointmentService.configureAvailability(session, input);
    return { success: true, data: schedule };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to configure availability." };
  }
}

/**
 * List counsellor availability schedules.
 */
export async function getCounsellorAvailabilityAction(
  counsellorId?: string
): Promise<ActionResult<CounsellorAvailabilityRecord[]>> {
  try {
    const session = await getServerAuthSession();
    const schedules = await AppointmentService.listAvailability(session, counsellorId);
    return { success: true, data: schedules };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to fetch availability schedules." };
  }
}
