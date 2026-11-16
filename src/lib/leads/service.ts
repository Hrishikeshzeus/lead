import type { AuthSession } from "../auth/types.ts";
import type {
  LeadRecord,
  LeadActivity,
  CreateLeadInput,
  UpdateLeadInput,
  LeadFilterParams,
  LeadPaginationResult,
  LeadImportRow,
  LeadImportPreviewRow,
  LeadImportResult,
  LeadStatus,
  LeadSource,
} from "../../types/lead.ts";
import { isSupabaseConfigured } from "../supabase/client.ts";
import { createClient } from "../supabase/server.ts";

// Valid options for validation
export const VALID_STATUSES: LeadStatus[] = [
  "new",
  "contacted",
  "qualified",
  "counselling_booked",
  "admitted",
  "lost",
];

export const VALID_SOURCES: LeadSource[] = [
  "website",
  "whatsapp",
  "instagram",
  "facebook",
  "referral",
  "phone",
  "manual",
];

// In-memory tenant-isolated store for development / test runtime
// Ensures full functionality without requiring an external hosted database
class InMemoryLeadStore {
  private leads: Map<string, LeadRecord[]> = new Map();
  private activities: Map<string, LeadActivity[]> = new Map();

  constructor() {
    this.seedDefaultData();
  }

  private seedDefaultData() {
    const apexId = "a0000000-0000-0000-0000-000000000001";
    const beaconId = "b0000000-0000-0000-0000-000000000002";

    const apexLeads: LeadRecord[] = [
      {
        id: "a1111111-0000-0000-0000-000000000001",
        tenantId: apexId,
        studentName: "Alex Rivera",
        email: "alex.rivera@example.com",
        phone: "+1-555-1101",
        courseInterest: "B.Tech Computer Science & AI",
        targetExam: "SAT (1450)",
        preferredBatch: "Fall 2026 Morning Batch",
        source: "website",
        budgetRange: "$20,000 - $35,000/yr",
        joiningTimeline: "Fall 2026",
        notes: "Excellent high school mathematics background. Interested in merit aid.",
        consentStatus: true,
        assignedCounsellorId: "10000000-0000-0000-0000-000000000002",
        assignedCounsellorName: "Ada Lovelace",
        status: "counselling_booked",
        score: 88,
        isArchived: false,
        archivedAt: null,
        createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
      },
      {
        id: "a1111111-0000-0000-0000-000000000002",
        tenantId: apexId,
        studentName: "Samira Mehta",
        email: "samira.mehta@example.com",
        phone: "+1-555-1102",
        courseInterest: "M.Sc Cybersecurity & Cloud",
        targetExam: "GRE (322)",
        preferredBatch: "Fall 2026 Evening Cohort",
        source: "whatsapp",
        budgetRange: "$25,000 - $40,000/yr",
        joiningTimeline: "Immediate",
        notes: "Completed undergraduate in Information Systems. Awaiting recommendation letters.",
        consentStatus: true,
        assignedCounsellorId: "10000000-0000-0000-0000-000000000002",
        assignedCounsellorName: "Ada Lovelace",
        status: "qualified",
        score: 92,
        isArchived: false,
        archivedAt: null,
        createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 1 * 86400000).toISOString(),
      },
      {
        id: "a1111111-0000-0000-0000-000000000003",
        tenantId: apexId,
        studentName: "Rohan Varma",
        email: "rohan.v@example.com",
        phone: "+91-98765-12345",
        courseInterest: "B.Sc Data Science",
        targetExam: "JEE Advanced",
        preferredBatch: "Fall 2026",
        source: "instagram",
        budgetRange: "$15,000 - $25,000/yr",
        joiningTimeline: "1-3 Months",
        notes: "Inquired via Instagram story ad. Downloaded syllabus.",
        consentStatus: true,
        assignedCounsellorId: "10000000-0000-0000-0000-000000000001",
        assignedCounsellorName: "Dr. Alan Turing",
        status: "new",
        score: 72,
        isArchived: false,
        archivedAt: null,
        createdAt: new Date(Date.now() - 1 * 86400000).toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "a1111111-0000-0000-0000-000000000004",
        tenantId: apexId,
        studentName: "Priya Sharma",
        email: "priya.s@example.org",
        phone: "+1-555-9876",
        courseInterest: "B.Tech Robotics",
        targetExam: "SAT (1520)",
        preferredBatch: "Fall 2026",
        source: "referral",
        budgetRange: "$30,000+/yr",
        joiningTimeline: "Fall 2026",
        notes: "Offer letter issued. Deposit confirmed.",
        consentStatus: true,
        assignedCounsellorId: "10000000-0000-0000-0000-000000000002",
        assignedCounsellorName: "Ada Lovelace",
        status: "admitted",
        score: 98,
        isArchived: false,
        archivedAt: null,
        createdAt: new Date(Date.now() - 14 * 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 4 * 86400000).toISOString(),
      },
    ];

    const beaconLeads: LeadRecord[] = [
      {
        id: "b2222222-0000-0000-0000-000000000001",
        tenantId: beaconId,
        studentName: "Liam Dubois",
        email: "liam.dubois@example.com",
        phone: "+1-555-2201",
        courseInterest: "MBA International Trade",
        targetExam: "GMAT (680)",
        preferredBatch: "Executive Weekend",
        source: "website",
        budgetRange: "$40,000 - $60,000",
        joiningTimeline: "Fall 2026",
        notes: "4 years corporate marketing experience.",
        consentStatus: true,
        assignedCounsellorId: "20000000-0000-0000-0000-000000000002",
        assignedCounsellorName: "Claude Shannon",
        status: "new",
        score: 75,
        isArchived: false,
        archivedAt: null,
        createdAt: new Date(Date.now() - 6 * 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 6 * 86400000).toISOString(),
      },
      {
        id: "b2222222-0000-0000-0000-000000000002",
        tenantId: beaconId,
        studentName: "Chloe Vance",
        email: "chloe.vance@example.com",
        phone: "+1-555-2202",
        courseInterest: "M.Sc Financial Engineering",
        targetExam: "GRE (326)",
        preferredBatch: "Fall 2026",
        source: "phone",
        budgetRange: "$35,000 - $50,000",
        joiningTimeline: "Immediate",
        notes: "Enrolled student; visa sponsorship in progress.",
        consentStatus: true,
        assignedCounsellorId: "20000000-0000-0000-0000-000000000002",
        assignedCounsellorName: "Claude Shannon",
        status: "admitted",
        score: 99,
        isArchived: false,
        archivedAt: null,
        createdAt: new Date(Date.now() - 20 * 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
      },
    ];

    this.leads.set(apexId, apexLeads);
    this.leads.set(beaconId, beaconLeads);

    // Initial seed activities
    const apexActivities: LeadActivity[] = [
      {
        id: "act-1",
        tenantId: apexId,
        leadId: "a1111111-0000-0000-0000-000000000001",
        userId: "10000000-0000-0000-0000-000000000001",
        actorName: "Dr. Alan Turing",
        actionType: "lead_created",
        description: "Inquiry received via University Website admissions portal.",
        metadata: { source: "website", exam: "SAT" },
        createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
      },
      {
        id: "act-2",
        tenantId: apexId,
        leadId: "a1111111-0000-0000-0000-000000000001",
        userId: "10000000-0000-0000-0000-000000000001",
        actorName: "Dr. Alan Turing",
        actionType: "counsellor_assigned",
        description: "Assigned counselor Ada Lovelace to lead.",
        metadata: { assignedTo: "Ada Lovelace" },
        createdAt: new Date(Date.now() - 4 * 86400000).toISOString(),
      },
      {
        id: "act-3",
        tenantId: apexId,
        leadId: "a1111111-0000-0000-0000-000000000001",
        userId: "10000000-0000-0000-0000-000000000002",
        actorName: "Ada Lovelace",
        actionType: "status_changed",
        description: "Status changed from new to counselling_booked.",
        metadata: { oldStatus: "new", newStatus: "counselling_booked" },
        createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
      },
    ];

    this.activities.set("a1111111-0000-0000-0000-000000000001", apexActivities);
  }

  public getTenantLeads(tenantId: string): LeadRecord[] {
    if (!this.leads.has(tenantId)) {
      this.leads.set(tenantId, []);
    }
    return this.leads.get(tenantId)!;
  }

  public getLead(tenantId: string, id: string): LeadRecord | null {
    const list = this.getTenantLeads(tenantId);
    return list.find((l) => l.id === id) || null;
  }

  public insertLead(lead: LeadRecord): void {
    const list = this.getTenantLeads(lead.tenantId);
    list.unshift(lead);
  }

  public updateLead(tenantId: string, lead: LeadRecord): void {
    const list = this.getTenantLeads(tenantId);
    const index = list.findIndex((l) => l.id === lead.id);
    if (index !== -1) {
      list[index] = lead;
    }
  }

  public addActivity(activity: LeadActivity): void {
    if (!this.activities.has(activity.leadId)) {
      this.activities.set(activity.leadId, []);
    }
    this.activities.get(activity.leadId)!.unshift(activity);
  }

  public getActivities(leadId: string): LeadActivity[] {
    return this.activities.get(leadId) || [];
  }
}

// Global in-memory instance for dev runtime
const devStore = new InMemoryLeadStore();

export class LeadService {
  /**
   * Helper: validates tenant context strictly from verified session.
   */
  private static getVerifiedTenantId(session: AuthSession): string {
    if (!session.isAuthenticated || !session.currentTenant?.id) {
      throw new Error("401 Unauthorized: Valid tenant session required.");
    }
    return session.currentTenant.id;
  }

  /**
   * List leads with filtering, search, sorting, and pagination.
   */
  public static async listLeads(
    session: AuthSession,
    params: LeadFilterParams = {}
  ): Promise<LeadPaginationResult> {
    const tenantId = this.getVerifiedTenantId(session);

    let list = [...devStore.getTenantLeads(tenantId)];

    // Archive filter (default: active leads only)
    const isArchived = Boolean(params.isArchived);
    list = list.filter((l) => l.isArchived === isArchived);

    // Status filter
    if (params.status && params.status !== "all") {
      list = list.filter((l) => l.status === params.status);
    }

    // Source filter
    if (params.source && params.source !== "all") {
      list = list.filter((l) => l.source === params.source);
    }

    // Counselor filter
    if (params.counsellorId && params.counsellorId !== "all") {
      list = list.filter((l) => l.assignedCounsellorId === params.counsellorId);
    }

    // Search query
    if (params.search && params.search.trim()) {
      const q = params.search.trim().toLowerCase();
      list = list.filter(
        (l) =>
          l.studentName.toLowerCase().includes(q) ||
          (l.email && l.email.toLowerCase().includes(q)) ||
          (l.phone && l.phone.toLowerCase().includes(q)) ||
          l.courseInterest.toLowerCase().includes(q) ||
          (l.targetExam && l.targetExam.toLowerCase().includes(q))
      );
    }

    // Sorting
    const sortBy = params.sortBy || "createdAt";
    const sortOrder = params.sortOrder || "desc";
    list.sort((a, b) => {
      let valA: any = a[sortBy] ?? "";
      let valB: any = b[sortBy] ?? "";

      if (sortBy === "createdAt") {
        valA = new Date(valA).getTime();
        valB = new Date(valB).getTime();
      }

      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    // Pagination
    const page = Math.max(1, params.page || 1);
    const pageSize = Math.max(1, params.pageSize || 10);
    const total = list.length;
    const totalPages = Math.ceil(total / pageSize) || 1;
    const startIndex = (page - 1) * pageSize;
    const paginatedLeads = list.slice(startIndex, startIndex + pageSize);

    return {
      leads: paginatedLeads,
      total,
      page,
      pageSize,
      totalPages,
    };
  }

  /**
   * Get single lead by ID with its audit activity timeline.
   */
  public static async getLeadById(
    session: AuthSession,
    leadId: string
  ): Promise<{ lead: LeadRecord; activities: LeadActivity[] } | null> {
    const tenantId = this.getVerifiedTenantId(session);
    const lead = devStore.getLead(tenantId, leadId);

    if (!lead) return null;

    const activities = devStore.getActivities(leadId);
    return { lead, activities };
  }

  /**
   * Create a new lead record with audit logging.
   */
  public static async createLead(
    session: AuthSession,
    input: CreateLeadInput
  ): Promise<LeadRecord> {
    const tenantId = this.getVerifiedTenantId(session);

    if (!input.studentName || !input.studentName.trim()) {
      throw new Error("Student name is required.");
    }
    if (!input.courseInterest || !input.courseInterest.trim()) {
      throw new Error("Course of interest is required.");
    }

    const counsellors = await this.getCounsellors(session);
    const counsellor = counsellors.find((c) => c.id === input.assignedCounsellorId);

    const newLead: LeadRecord = {
      id: crypto.randomUUID(),
      tenantId,
      studentName: input.studentName.trim(),
      email: input.email?.trim().toLowerCase() || null,
      phone: input.phone?.trim() || null,
      courseInterest: input.courseInterest.trim(),
      targetExam: input.targetExam?.trim() || null,
      preferredBatch: input.preferredBatch?.trim() || null,
      source: input.source || "manual",
      budgetRange: input.budgetRange?.trim() || null,
      joiningTimeline: input.joiningTimeline?.trim() || null,
      notes: input.notes?.trim() || null,
      consentStatus: input.consentStatus ?? true,
      assignedCounsellorId: input.assignedCounsellorId || null,
      assignedCounsellorName: counsellor?.fullName || null,
      status: input.status || "new",
      score: 60,
      isArchived: false,
      archivedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    devStore.insertLead(newLead);

    // Audit Event
    devStore.addActivity({
      id: crypto.randomUUID(),
      tenantId,
      leadId: newLead.id,
      userId: session.user?.id || null,
      actorName: session.user?.fullName || "Admissions Staff",
      actionType: "lead_created",
      description: `Lead registered manually via CRM portal.`,
      metadata: {
        source: newLead.source,
        status: newLead.status,
        courseInterest: newLead.courseInterest,
      },
      createdAt: new Date().toISOString(),
    });

    if (newLead.assignedCounsellorId && counsellor) {
      devStore.addActivity({
        id: crypto.randomUUID(),
        tenantId,
        leadId: newLead.id,
        userId: session.user?.id || null,
        actorName: session.user?.fullName || "Admissions Staff",
        actionType: "counsellor_assigned",
        description: `Assigned counselor ${counsellor.fullName} to lead.`,
        metadata: {
          assignedCounsellorId: counsellor.id,
          assignedCounsellorName: counsellor.fullName,
        },
        createdAt: new Date().toISOString(),
      });
    }

    return newLead;
  }

  /**
   * Update lead fields and record audit events for changes.
   */
  public static async updateLead(
    session: AuthSession,
    leadId: string,
    input: UpdateLeadInput
  ): Promise<LeadRecord> {
    const tenantId = this.getVerifiedTenantId(session);
    const existing = devStore.getLead(tenantId, leadId);

    if (!existing) {
      throw new Error("Lead not found or access denied.");
    }

    const changedFields: string[] = [];
    const counsellors = await this.getCounsellors(session);

    // Status change audit
    if (input.status && input.status !== existing.status) {
      devStore.addActivity({
        id: crypto.randomUUID(),
        tenantId,
        leadId,
        userId: session.user?.id || null,
        actorName: session.user?.fullName || "Admissions Staff",
        actionType: "status_changed",
        description: `Status changed from ${existing.status} to ${input.status}.`,
        metadata: {
          oldStatus: existing.status,
          newStatus: input.status,
        },
        createdAt: new Date().toISOString(),
      });
      changedFields.push("status");
    }

    // Counsellor assignment audit
    if (
      input.assignedCounsellorId !== undefined &&
      input.assignedCounsellorId !== existing.assignedCounsellorId
    ) {
      const newCounsellor = counsellors.find((c) => c.id === input.assignedCounsellorId);
      devStore.addActivity({
        id: crypto.randomUUID(),
        tenantId,
        leadId,
        userId: session.user?.id || null,
        actorName: session.user?.fullName || "Admissions Staff",
        actionType: "counsellor_assigned",
        description: newCounsellor
          ? `Assigned counselor ${newCounsellor.fullName}.`
          : "Unassigned counselor.",
        metadata: {
          oldCounsellorId: existing.assignedCounsellorId,
          newCounsellorId: input.assignedCounsellorId,
        },
        createdAt: new Date().toISOString(),
      });
      changedFields.push("assignedCounsellor");
    }

    const updatedCounsellor = counsellors.find(
      (c) =>
        c.id ===
        (input.assignedCounsellorId !== undefined
          ? input.assignedCounsellorId
          : existing.assignedCounsellorId)
    );

    const updatedLead: LeadRecord = {
      ...existing,
      studentName: input.studentName?.trim() || existing.studentName,
      email: input.email !== undefined ? input.email?.trim().toLowerCase() || null : existing.email,
      phone: input.phone !== undefined ? input.phone?.trim() || null : existing.phone,
      courseInterest: input.courseInterest?.trim() || existing.courseInterest,
      targetExam: input.targetExam !== undefined ? input.targetExam?.trim() || null : existing.targetExam,
      preferredBatch: input.preferredBatch !== undefined ? input.preferredBatch?.trim() || null : existing.preferredBatch,
      source: input.source || existing.source,
      budgetRange: input.budgetRange !== undefined ? input.budgetRange?.trim() || null : existing.budgetRange,
      joiningTimeline: input.joiningTimeline !== undefined ? input.joiningTimeline?.trim() || null : existing.joiningTimeline,
      notes: input.notes !== undefined ? input.notes?.trim() || null : existing.notes,
      consentStatus: input.consentStatus !== undefined ? input.consentStatus : existing.consentStatus,
      assignedCounsellorId:
        input.assignedCounsellorId !== undefined
          ? input.assignedCounsellorId
          : existing.assignedCounsellorId,
      assignedCounsellorName: updatedCounsellor?.fullName || null,
      status: input.status || existing.status,
      updatedAt: new Date().toISOString(),
    };

    devStore.updateLead(tenantId, updatedLead);

    // General update audit if other fields changed
    if (changedFields.length === 0 || changedFields.length > 0) {
      devStore.addActivity({
        id: crypto.randomUUID(),
        tenantId,
        leadId,
        userId: session.user?.id || null,
        actorName: session.user?.fullName || "Admissions Staff",
        actionType: "lead_updated",
        description: `Lead profile information updated.`,
        metadata: { changedFields },
        createdAt: new Date().toISOString(),
      });
    }

    return updatedLead;
  }

  /**
   * Archive or unarchive a lead.
   */
  public static async archiveLead(
    session: AuthSession,
    leadId: string,
    archive: boolean
  ): Promise<LeadRecord> {
    const tenantId = this.getVerifiedTenantId(session);
    const lead = devStore.getLead(tenantId, leadId);

    if (!lead) {
      throw new Error("Lead not found or access denied.");
    }

    lead.isArchived = archive;
    lead.archivedAt = archive ? new Date().toISOString() : null;
    lead.updatedAt = new Date().toISOString();

    devStore.updateLead(tenantId, lead);

    devStore.addActivity({
      id: crypto.randomUUID(),
      tenantId,
      leadId,
      userId: session.user?.id || null,
      actorName: session.user?.fullName || "Admissions Staff",
      actionType: archive ? "lead_archived" : "lead_unarchived",
      description: archive
        ? "Lead archived from active pipeline."
        : "Lead restored to active pipeline.",
      metadata: { isArchived: archive },
      createdAt: new Date().toISOString(),
    });

    return lead;
  }

  /**
   * Counsellor assignment convenience method.
   */
  public static async assignCounsellor(
    session: AuthSession,
    leadId: string,
    counsellorId: string | null
  ): Promise<LeadRecord> {
    return this.updateLead(session, leadId, { assignedCounsellorId: counsellorId });
  }

  /**
   * Add a counsellor progress note to a lead's activity timeline.
   */
  public static async addNoteActivity(
    session: AuthSession,
    leadId: string,
    noteText: string
  ): Promise<LeadActivity> {
    const tenantId = this.getVerifiedTenantId(session);
    const lead = devStore.getLead(tenantId, leadId);

    if (!lead) {
      throw new Error("Lead not found or access denied.");
    }

    const activity: LeadActivity = {
      id: crypto.randomUUID(),
      tenantId,
      leadId,
      userId: session.user?.id || null,
      actorName: session.user?.fullName || "Admissions Staff",
      actionType: "note_added",
      description: noteText.trim(),
      metadata: {},
      createdAt: new Date().toISOString(),
    };

    devStore.addActivity(activity);
    return activity;
  }

  /**
   * Parse CSV, perform validation, column mapping and duplicate detection for preview.
   */
  public static async previewCsvImport(
    session: AuthSession,
    csvContent: string,
    columnMap: Record<string, string>
  ): Promise<LeadImportPreviewRow[]> {
    const tenantId = this.getVerifiedTenantId(session);
    const existingLeads = devStore.getTenantLeads(tenantId);

    const existingEmails = new Set(
      existingLeads.map((l) => l.email?.toLowerCase()).filter(Boolean)
    );
    const existingPhones = new Set(
      existingLeads.map((l) => l.phone?.replace(/[^0-9]/g, "")).filter(Boolean)
    );

    const lines = csvContent
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length < 2) {
      throw new Error("CSV file must contain a header row and at least one data row.");
    }

    const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
    const previewRows: LeadImportPreviewRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      // Basic comma-separated value parser
      const values = lines[i].split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
      const rawRow: Record<string, string> = {};

      headers.forEach((header, idx) => {
        rawRow[header] = values[idx] || "";
      });

      // Map values using user's column mapping
      const studentName = rawRow[columnMap["studentName"] || "studentName"] || rawRow["Name"] || rawRow["student_name"] || "";
      const email = (rawRow[columnMap["email"] || "email"] || rawRow["Email"] || "").toLowerCase();
      const phone = rawRow[columnMap["phone"] || "phone"] || rawRow["Phone"] || "";
      const courseInterest = rawRow[columnMap["courseInterest"] || "courseInterest"] || rawRow["Course"] || rawRow["course_interest"] || "General Admissions";
      const targetExam = rawRow[columnMap["targetExam"] || "targetExam"] || rawRow["Target Exam"] || "";
      const preferredBatch = rawRow[columnMap["preferredBatch"] || "preferredBatch"] || rawRow["Batch"] || "";
      const rawSource = (rawRow[columnMap["source"] || "source"] || rawRow["Source"] || "website").toLowerCase();
      const budgetRange = rawRow[columnMap["budgetRange"] || "budgetRange"] || rawRow["Budget"] || "";
      const joiningTimeline = rawRow[columnMap["joiningTimeline"] || "joiningTimeline"] || rawRow["Timeline"] || "";
      const notes = rawRow[columnMap["notes"] || "notes"] || rawRow["Notes"] || "";

      const validationErrors: string[] = [];

      if (!studentName) {
        validationErrors.push("Student name is required");
      }
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        validationErrors.push("Invalid email format");
      }

      // Normalize source
      let source: LeadSource = "manual";
      if (VALID_SOURCES.includes(rawSource as LeadSource)) {
        source = rawSource as LeadSource;
      }

      // Duplicate detection
      let isDuplicate = false;
      let duplicateReason: string | undefined = undefined;

      if (email && existingEmails.has(email)) {
        isDuplicate = true;
        duplicateReason = `Email ${email} already exists in your institute`;
      } else if (phone && existingPhones.has(phone.replace(/[^0-9]/g, ""))) {
        isDuplicate = true;
        duplicateReason = `Phone ${phone} already exists in your institute`;
      }

      previewRows.push({
        rowNumber: i,
        studentName,
        email: email || undefined,
        phone: phone || undefined,
        courseInterest,
        targetExam: targetExam || undefined,
        preferredBatch: preferredBatch || undefined,
        source,
        budgetRange: budgetRange || undefined,
        joiningTimeline: joiningTimeline || undefined,
        notes: notes || undefined,
        consentStatus: true,
        status: "new",
        isValid: validationErrors.length === 0,
        validationErrors,
        isDuplicate,
        duplicateReason,
      });
    }

    return previewRows;
  }

  /**
   * Execute CSV batch import.
   */
  public static async executeCsvImport(
    session: AuthSession,
    rows: LeadImportRow[],
    skipDuplicates: boolean = true
  ): Promise<LeadImportResult> {
    const tenantId = this.getVerifiedTenantId(session);
    const existingLeads = devStore.getTenantLeads(tenantId);

    const existingEmails = new Set(
      existingLeads.map((l) => l.email?.toLowerCase()).filter(Boolean)
    );
    const existingPhones = new Set(
      existingLeads.map((l) => l.phone?.replace(/[^0-9]/g, "")).filter(Boolean)
    );

    let imported = 0;
    let skippedDuplicates = 0;
    const errorRows: Array<{ rowNumber: number; reason: string }> = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 1;

      if (!row.studentName || !row.studentName.trim()) {
        errorRows.push({ rowNumber: rowNum, reason: "Missing student name" });
        continue;
      }

      const email = row.email?.trim().toLowerCase();
      const phoneDigits = row.phone?.replace(/[^0-9]/g, "");

      const isDup =
        (email && existingEmails.has(email)) ||
        (phoneDigits && existingPhones.has(phoneDigits));

      if (isDup) {
        if (skipDuplicates) {
          skippedDuplicates++;
          continue;
        }
      }

      const newLead: LeadRecord = {
        id: crypto.randomUUID(),
        tenantId,
        studentName: row.studentName.trim(),
        email: email || null,
        phone: row.phone?.trim() || null,
        courseInterest: row.courseInterest?.trim() || "General Admissions",
        targetExam: row.targetExam?.trim() || null,
        preferredBatch: row.preferredBatch?.trim() || null,
        source: row.source && VALID_SOURCES.includes(row.source) ? row.source : "manual",
        budgetRange: row.budgetRange?.trim() || null,
        joiningTimeline: row.joiningTimeline?.trim() || null,
        notes: row.notes?.trim() || null,
        consentStatus: row.consentStatus ?? true,
        assignedCounsellorId: null,
        status: row.status && VALID_STATUSES.includes(row.status) ? row.status : "new",
        score: 60,
        isArchived: false,
        archivedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      devStore.insertLead(newLead);
      if (email) existingEmails.add(email);
      if (phoneDigits) existingPhones.add(phoneDigits);
      imported++;

      // Audit event
      devStore.addActivity({
        id: crypto.randomUUID(),
        tenantId,
        leadId: newLead.id,
        userId: session.user?.id || null,
        actorName: session.user?.fullName || "Admissions Staff",
        actionType: "imported_from_csv",
        description: `Lead imported from bulk CSV upload.`,
        metadata: { rowNumber: rowNum },
        createdAt: new Date().toISOString(),
      });
    }

    return {
      totalProcessed: rows.length,
      imported,
      skippedDuplicates,
      errorsCount: errorRows.length,
      errorRows,
    };
  }

  /**
   * Export authorized tenant leads to CSV string.
   */
  public static async exportLeadsToCsv(
    session: AuthSession,
    params: LeadFilterParams = {}
  ): Promise<string> {
    const { leads } = await this.listLeads(session, {
      ...params,
      pageSize: 10000, // Export all matching
    });

    const headers = [
      "Student Name",
      "Email",
      "Phone",
      "Course Interest",
      "Target Exam",
      "Preferred Batch",
      "Source",
      "Budget Range",
      "Joining Timeline",
      "Status",
      "Assigned Counselor",
      "Score",
      "Notes",
      "Created Date",
    ];

    const escapeCsv = (val: string | number | null | undefined) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = leads.map((l) =>
      [
        escapeCsv(l.studentName),
        escapeCsv(l.email),
        escapeCsv(l.phone),
        escapeCsv(l.courseInterest),
        escapeCsv(l.targetExam),
        escapeCsv(l.preferredBatch),
        escapeCsv(l.source),
        escapeCsv(l.budgetRange),
        escapeCsv(l.joiningTimeline),
        escapeCsv(l.status),
        escapeCsv(l.assignedCounsellorName || "Unassigned"),
        escapeCsv(l.score),
        escapeCsv(l.notes),
        escapeCsv(l.createdAt),
      ].join(",")
    );

    return [headers.join(","), ...rows].join("\n");
  }

  /**
   * List counselors for current tenant for assignment selector.
   */
  public static async getCounsellors(
    session: AuthSession
  ): Promise<Array<{ id: string; fullName: string; email: string }>> {
    const tenantId = this.getVerifiedTenantId(session);

    // Default counselors for Apex and Beacon
    if (tenantId === "a0000000-0000-0000-0000-000000000001") {
      return [
        {
          id: "10000000-0000-0000-0000-000000000001",
          fullName: "Dr. Alan Turing",
          email: "admin@apex.edu",
        },
        {
          id: "10000000-0000-0000-0000-000000000002",
          fullName: "Ada Lovelace",
          email: "counsellor@apex.edu",
        },
      ];
    } else if (tenantId === "b0000000-0000-0000-0000-000000000002") {
      return [
        {
          id: "20000000-0000-0000-0000-000000000001",
          fullName: "Dr. Grace Hopper",
          email: "admin@beacon.edu",
        },
        {
          id: "20000000-0000-0000-0000-000000000002",
          fullName: "Claude Shannon",
          email: "counsellor@beacon.edu",
        },
      ];
    }

    // Default current user if newly created institute
    return [
      {
        id: session.user?.id || "curr-user",
        fullName: session.user?.fullName || "Admissions Staff",
        email: session.user?.email || "staff@admitflow.edu",
      },
    ];
  }
}
