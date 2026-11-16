"use server";

import { revalidatePath } from "next/cache";
import { getServerAuthSession } from "@/lib/auth/session";
import { LeadService } from "@/lib/leads/service";
import {
  CreateLeadInput,
  UpdateLeadInput,
  LeadFilterParams,
  LeadPaginationResult,
  LeadRecord,
  LeadActivity,
  LeadImportRow,
  LeadImportPreviewRow,
  LeadImportResult,
  LeadStatus,
  LeadSource,
} from "@/types/lead";

export interface ActionResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Fetch paginated, filtered leads for current authorized tenant.
 */
export async function getLeadsAction(
  params: LeadFilterParams = {}
): Promise<ActionResult<LeadPaginationResult>> {
  try {
    const session = await getServerAuthSession();
    if (!session.isAuthenticated) {
      return { success: false, error: "Authentication required" };
    }
    const result = await LeadService.listLeads(session, params);
    return { success: true, data: result };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to fetch leads" };
  }
}

/**
 * Fetch a single lead with its activity audit timeline.
 */
export async function getLeadDetailsAction(
  leadId: string
): Promise<ActionResult<{ lead: LeadRecord; activities: LeadActivity[] }>> {
  try {
    const session = await getServerAuthSession();
    if (!session.isAuthenticated) {
      return { success: false, error: "Authentication required" };
    }
    const result = await LeadService.getLeadById(session, leadId);
    if (!result) {
      return { success: false, error: "Lead not found or access denied" };
    }
    return { success: true, data: result };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Create a new lead record.
 */
export async function createLeadAction(
  input: CreateLeadInput
): Promise<ActionResult<LeadRecord>> {
  try {
    const session = await getServerAuthSession();
    if (!session.isAuthenticated) {
      return { success: false, error: "Authentication required" };
    }

    const lead = await LeadService.createLead(session, input);
    revalidatePath("/leads");
    revalidatePath(`/leads/${lead.id}`);
    revalidatePath("/");
    return { success: true, data: lead };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to create lead" };
  }
}

/**
 * Update an existing lead record.
 */
export async function updateLeadAction(
  leadId: string,
  input: UpdateLeadInput
): Promise<ActionResult<LeadRecord>> {
  try {
    const session = await getServerAuthSession();
    if (!session.isAuthenticated) {
      return { success: false, error: "Authentication required" };
    }

    const lead = await LeadService.updateLead(session, leadId, input);
    revalidatePath("/leads");
    revalidatePath(`/leads/${leadId}`);
    return { success: true, data: lead };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to update lead" };
  }
}

/**
 * Archive or restore a lead.
 */
export async function archiveLeadAction(
  leadId: string,
  archive: boolean
): Promise<ActionResult<LeadRecord>> {
  try {
    const session = await getServerAuthSession();
    if (!session.isAuthenticated) {
      return { success: false, error: "Authentication required" };
    }

    const lead = await LeadService.archiveLead(session, leadId, archive);
    revalidatePath("/leads");
    revalidatePath(`/leads/${leadId}`);
    return { success: true, data: lead };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to update lead archive state" };
  }
}

/**
 * Assign or reassign a counselor to a lead.
 */
export async function assignCounsellorAction(
  leadId: string,
  counsellorId: string | null
): Promise<ActionResult<LeadRecord>> {
  try {
    const session = await getServerAuthSession();
    if (!session.isAuthenticated) {
      return { success: false, error: "Authentication required" };
    }

    const lead = await LeadService.assignCounsellor(session, leadId, counsellorId);
    revalidatePath("/leads");
    revalidatePath(`/leads/${leadId}`);
    return { success: true, data: lead };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to assign counselor" };
  }
}

/**
 * Update a lead's recruitment status.
 */
export async function updateLeadStatusAction(
  leadId: string,
  status: LeadStatus
): Promise<ActionResult<LeadRecord>> {
  try {
    const session = await getServerAuthSession();
    if (!session.isAuthenticated) {
      return { success: false, error: "Authentication required" };
    }

    const lead = await LeadService.updateLead(session, leadId, { status });
    revalidatePath("/leads");
    revalidatePath(`/leads/${leadId}`);
    return { success: true, data: lead };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to update status" };
  }
}

/**
 * Add a timeline note activity.
 */
export async function addLeadNoteAction(
  leadId: string,
  noteText: string
): Promise<ActionResult<LeadActivity>> {
  try {
    const session = await getServerAuthSession();
    if (!session.isAuthenticated) {
      return { success: false, error: "Authentication required" };
    }

    const activity = await LeadService.addNoteActivity(session, leadId, noteText);
    revalidatePath(`/leads/${leadId}`);
    return { success: true, data: activity };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to record activity note" };
  }
}

/**
 * Preview CSV import with column mapping and duplicate check.
 */
export async function previewCsvImportAction(
  csvContent: string,
  columnMap: Record<string, string>
): Promise<ActionResult<LeadImportPreviewRow[]>> {
  try {
    const session = await getServerAuthSession();
    if (!session.isAuthenticated) {
      return { success: false, error: "Authentication required" };
    }

    const rows = await LeadService.previewCsvImport(session, csvContent, columnMap);
    return { success: true, data: rows };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to parse and preview CSV" };
  }
}

/**
 * Execute batch CSV import.
 */
export async function executeCsvImportAction(
  rows: LeadImportRow[],
  skipDuplicates: boolean
): Promise<ActionResult<LeadImportResult>> {
  try {
    const session = await getServerAuthSession();
    if (!session.isAuthenticated) {
      return { success: false, error: "Authentication required" };
    }

    const result = await LeadService.executeCsvImport(session, rows, skipDuplicates);
    revalidatePath("/leads");
    return { success: true, data: result };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to execute CSV import" };
  }
}

/**
 * Export authorized tenant leads to CSV.
 */
export async function exportLeadsCsvAction(
  params: LeadFilterParams = {}
): Promise<ActionResult<string>> {
  try {
    const session = await getServerAuthSession();
    if (!session.isAuthenticated) {
      return { success: false, error: "Authentication required" };
    }

    const csvData = await LeadService.exportLeadsToCsv(session, params);
    return { success: true, data: csvData };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to export leads" };
  }
}

/**
 * Fetch counselors for current tenant.
 */
export async function getCounsellorsAction(): Promise<
  ActionResult<Array<{ id: string; fullName: string; email: string }>>
> {
  try {
    const session = await getServerAuthSession();
    if (!session.isAuthenticated) {
      return { success: false, error: "Authentication required" };
    }

    const list = await LeadService.getCounsellors(session);
    return { success: true, data: list };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
