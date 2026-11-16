import type { AuthSession, AppRole } from "../auth/types";
import type {
  CourseRecord,
  CreateCourseInput,
  UpdateCourseInput,
  CourseFilterParams,
  AdmissionAvailability,
  FeePeriod,
} from "../../types/course";
import { isSupabaseConfigured } from "../supabase/client.ts";
import { createClient } from "../supabase/server.ts";

class InMemoryCourseStore {
  private courses: Map<string, CourseRecord[]> = new Map();

  constructor() {
    this.seedDefaultData();
  }

  private seedDefaultData() {
    const apexId = "a0000000-0000-0000-0000-000000000001";
    const beaconId = "b0000000-0000-0000-0000-000000000002";

    const apexCourses: CourseRecord[] = [
      {
        id: "c1111111-0000-0000-0000-000000000001",
        tenantId: apexId,
        name: "B.Tech Artificial Intelligence & Robotics",
        examCategory: "Undergraduate Engineering",
        description:
          "Premier four-year undergraduate engineering degree specializing in machine learning, autonomous systems, and computer vision.",
        eligibility:
          "Minimum 70% in Grade 12 or equivalent with Physics, Mathematics, and Chemistry.",
        feeCurrency: "USD",
        feeAmount: 18500.0,
        feePeriod: "annual",
        approvedFeeInfo:
          "Tuition fee: $18,500/year. Lab and technology fees: $1,200/year. Merit scholarships available for top 10% applicants.",
        batchSchedule: "Monday to Friday, 8:30 AM - 1:30 PM (Morning Cohort)",
        duration: "4 Years (8 Semesters)",
        location: "Silicon Valley Main Campus",
        admissionAvailability: "open",
        isPublished: true,
        isArchived: false,
        archivedAt: null,
        createdAt: "2026-01-10T08:00:00Z",
        updatedAt: "2026-01-10T08:00:00Z",
      },
      {
        id: "c1111111-0000-0000-0000-000000000002",
        tenantId: apexId,
        name: "M.Sc Applied Cybersecurity",
        examCategory: "Postgraduate Technology",
        description:
          "Advanced cybersecurity curriculum covering ethical hacking, cloud security, cryptography, and defensive ops.",
        eligibility:
          "Bachelor degree in Computer Science, IT, or related engineering discipline with minimum 3.0 GPA.",
        feeCurrency: "USD",
        feeAmount: 22000.0,
        feePeriod: "annual",
        approvedFeeInfo:
          "Tuition fee: $22,000/year. Industry certification exam vouchers included. No tuition waivers for evening batch.",
        batchSchedule:
          "Tuesdays & Thursdays 6:00 PM - 9:30 PM + Alternate Saturdays",
        duration: "2 Years (4 Semesters)",
        location: "Silicon Valley Main Campus & Online Hybrid",
        admissionAvailability: "closing_soon",
        isPublished: true,
        isArchived: false,
        archivedAt: null,
        createdAt: "2026-01-12T08:00:00Z",
        updatedAt: "2026-01-12T08:00:00Z",
      },
      {
        id: "c1111111-0000-0000-0000-000000000003",
        tenantId: apexId,
        name: "Quantum Computing Summer Intensive",
        examCategory: "Professional Certificate",
        description:
          "8-week intensive workshop on Qiskit, quantum algorithms, and superconducting qubits.",
        eligibility: "Prerequisite: Linear Algebra and Python proficiency.",
        feeCurrency: "USD",
        feeAmount: 3500.0,
        feePeriod: "one_time",
        approvedFeeInfo:
          "Flat registration fee: $3,500. Corporate group discounts of 15% for 3+ delegates.",
        batchSchedule: "Saturdays 9:00 AM - 4:00 PM",
        duration: "8 Weeks",
        location: "Online Virtual Classroom",
        admissionAvailability: "open",
        isPublished: false, // Draft unpublished
        isArchived: false,
        archivedAt: null,
        createdAt: "2026-01-15T08:00:00Z",
        updatedAt: "2026-01-15T08:00:00Z",
      },
    ];

    const beaconCourses: CourseRecord[] = [
      {
        id: "c2222222-0000-0000-0000-000000000001",
        tenantId: beaconId,
        name: "MBA International Trade & Global Logistics",
        examCategory: "Graduate Business",
        description:
          "Dual-accredited MBA specializing in cross-border supply chains, trade finance, and geopolitical risk management.",
        eligibility:
          "Undergraduate degree in any discipline with minimum 2 years of professional work experience.",
        feeCurrency: "USD",
        feeAmount: 26000.0,
        feePeriod: "annual",
        approvedFeeInfo:
          "Tuition fee: $26,000/year. Global study tour fee: $4,000. Need-based bursaries available up to $5,000.",
        batchSchedule: "Monday to Thursday, 9:00 AM - 1:00 PM",
        duration: "2 Years",
        location: "Beacon Downtown Campus",
        admissionAvailability: "open",
        isPublished: true,
        isArchived: false,
        archivedAt: null,
        createdAt: "2026-01-10T08:00:00Z",
        updatedAt: "2026-01-10T08:00:00Z",
      },
      {
        id: "c2222222-0000-0000-0000-000000000002",
        tenantId: beaconId,
        name: "M.Sc Financial Engineering & Quantitative Trading",
        examCategory: "Quantitative Finance",
        description:
          "Rigorous quantitative finance program bridging stochastic calculus, algorithmic execution, and asset management.",
        eligibility:
          "Strong mathematical background in Multivariable Calculus, Probability, and C++ / Python.",
        feeCurrency: "USD",
        feeAmount: 28000.0,
        feePeriod: "annual",
        approvedFeeInfo:
          "Tuition fee: $28,000/year. Bloomberg Terminal lab fee: $1,500/year. No fee waivers permitted.",
        batchSchedule: "Weekend Cohort: Saturdays & Sundays 9:00 AM - 5:00 PM",
        duration: "1.5 Years",
        location: "Beacon Financial District Center",
        admissionAvailability: "waitlist",
        isPublished: true,
        isArchived: false,
        archivedAt: null,
        createdAt: "2026-01-12T08:00:00Z",
        updatedAt: "2026-01-12T08:00:00Z",
      },
    ];

    this.courses.set(apexId, apexCourses);
    this.courses.set(beaconId, beaconCourses);
  }

  public getTenantCourses(tenantId: string): CourseRecord[] {
    return this.courses.get(tenantId) || [];
  }

  public addCourse(tenantId: string, course: CourseRecord): void {
    const list = this.getTenantCourses(tenantId);
    this.courses.set(tenantId, [course, ...list]);
  }

  public updateCourse(tenantId: string, courseId: string, updates: Partial<CourseRecord>): CourseRecord | null {
    const list = this.getTenantCourses(tenantId);
    const idx = list.findIndex((c) => c.id === courseId);
    if (idx === -1) return null;
    const updated = { ...list[idx], ...updates, updatedAt: new Date().toISOString() };
    list[idx] = updated;
    this.courses.set(tenantId, list);
    return updated;
  }
}

const devCourseStore = new InMemoryCourseStore();

export class CourseService {
  private static getVerifiedTenantId(session: AuthSession): string {
    const tenantId =
      session.currentTenant?.id ||
      session.memberships?.[0]?.tenantId ||
      (session.user as any)?.tenantId;
    if (!session.isAuthenticated || !tenantId) {
      throw new Error("Authentication required: No verified tenant membership found in session.");
    }
    return tenantId;
  }

  private static assertInstituteAdmin(session: AuthSession): void {
    if (!session.isAuthenticated || !session.user) {
      throw new Error("Authentication required.");
    }
    if (session.user.isSuperAdmin) return;
    const role: AppRole | undefined =
      session.currentRole ||
      session.memberships?.[0]?.role ||
      (session.user as any)?.role;
    if (role !== "institute_admin") {
      throw new Error("Access denied: Only Institute Administrators can modify courses or publish settings.");
    }
  }

  /**
   * List courses for current authorized tenant.
   */
  public static async listCourses(
    session: AuthSession,
    params: CourseFilterParams = {}
  ): Promise<CourseRecord[]> {
    const tenantId = this.getVerifiedTenantId(session);

    if (isSupabaseConfigured()) {
      try {
        const supabase = await createClient();
        let query = supabase
          .from("courses")
          .select("*")
          .eq("tenant_id", tenantId);

        if (params.isArchived !== undefined) {
          query = query.eq("is_archived", params.isArchived);
        } else {
          query = query.eq("is_archived", false);
        }

        if (params.isPublished !== undefined && params.isPublished !== "all") {
          query = query.eq("is_published", params.isPublished);
        }

        if (params.examCategory) {
          query = query.ilike("exam_category", `%${params.examCategory}%`);
        }

        if (params.admissionAvailability && params.admissionAvailability !== "all") {
          query = query.eq("admission_availability", params.admissionAvailability);
        }

        if (params.search) {
          query = query.or(`name.ilike.%${params.search}%,description.ilike.%${params.search}%`);
        }

        const sortBy = params.sortBy === "feeAmount" ? "fee_amount" : params.sortBy === "name" ? "name" : "created_at";
        const ascending = params.sortOrder === "asc";
        query = query.order(sortBy, { ascending });

        const { data, error } = await query;
        if (error) throw error;
        if (data && data.length > 0) {
          return data.map(this.mapDbCourse);
        }
      } catch (err) {
        console.warn("[CourseService.listCourses] Supabase query failed, falling back to local store:", err);
      }
    }

    // Local / In-memory store fallback
    let list = [...devCourseStore.getTenantCourses(tenantId)];

    if (params.isArchived !== undefined) {
      list = list.filter((c) => c.isArchived === params.isArchived);
    } else {
      list = list.filter((c) => !c.isArchived);
    }

    if (params.isPublished !== undefined && params.isPublished !== "all") {
      list = list.filter((c) => c.isPublished === params.isPublished);
    }

    if (params.examCategory) {
      const cat = params.examCategory.toLowerCase();
      list = list.filter((c) => c.examCategory.toLowerCase().includes(cat));
    }

    if (params.admissionAvailability && params.admissionAvailability !== "all") {
      list = list.filter((c) => c.admissionAvailability === params.admissionAvailability);
    }

    if (params.search) {
      const q = params.search.toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q) ||
          c.examCategory.toLowerCase().includes(q)
      );
    }

    const sortOrder = params.sortOrder === "asc" ? 1 : -1;
    list.sort((a, b) => {
      if (params.sortBy === "feeAmount") {
        return (a.feeAmount - b.feeAmount) * sortOrder;
      }
      if (params.sortBy === "name") {
        return a.name.localeCompare(b.name) * sortOrder;
      }
      return (new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) * (sortOrder === 1 ? -1 : 1);
    });

    return list;
  }

  /**
   * Get single course by ID.
   */
  public static async getCourseById(
    session: AuthSession,
    courseId: string
  ): Promise<CourseRecord | null> {
    const tenantId = this.getVerifiedTenantId(session);

    if (isSupabaseConfigured()) {
      try {
        const supabase = await createClient();
        const { data, error } = await supabase
          .from("courses")
          .select("*")
          .eq("id", courseId)
          .eq("tenant_id", tenantId)
          .single();

        if (error && error.code !== "PGRST116") throw error;
        if (data) return this.mapDbCourse(data);
      } catch (err) {
        console.warn("[CourseService.getCourseById] Supabase fallback to local:", err);
      }
    }

    const list = devCourseStore.getTenantCourses(tenantId);
    return list.find((c) => c.id === courseId) || null;
  }

  /**
   * Create a new course (Admin only).
   */
  public static async createCourse(
    session: AuthSession,
    input: CreateCourseInput
  ): Promise<CourseRecord> {
    this.assertInstituteAdmin(session);
    const tenantId = this.getVerifiedTenantId(session);

    if (!input.name || input.name.trim().length === 0) {
      throw new Error("Course name is required.");
    }
    if (!input.examCategory || input.examCategory.trim().length === 0) {
      throw new Error("Exam category is required.");
    }

    const now = new Date().toISOString();
    const newCourse: CourseRecord = {
      id: crypto.randomUUID(),
      tenantId,
      name: input.name.trim(),
      examCategory: input.examCategory.trim(),
      description: input.description?.trim() || "",
      eligibility: input.eligibility?.trim() || "",
      feeCurrency: input.feeCurrency || "USD",
      feeAmount: Number(input.feeAmount) || 0,
      feePeriod: input.feePeriod || "annual",
      approvedFeeInfo: input.approvedFeeInfo?.trim() || "",
      batchSchedule: input.batchSchedule?.trim() || "",
      duration: input.duration?.trim() || "",
      location: input.location?.trim() || "",
      admissionAvailability: input.admissionAvailability || "open",
      isPublished: input.isPublished ?? false,
      isArchived: false,
      archivedAt: null,
      createdAt: now,
      updatedAt: now,
    };

    if (isSupabaseConfigured()) {
      try {
        const supabase = await createClient();
        const { data, error } = await supabase
          .from("courses")
          .insert({
            id: newCourse.id,
            tenant_id: newCourse.tenantId,
            name: newCourse.name,
            exam_category: newCourse.examCategory,
            description: newCourse.description,
            eligibility: newCourse.eligibility,
            fee_currency: newCourse.feeCurrency,
            fee_amount: newCourse.feeAmount,
            fee_period: newCourse.feePeriod,
            approved_fee_info: newCourse.approvedFeeInfo,
            batch_schedule: newCourse.batchSchedule,
            duration: newCourse.duration,
            location: newCourse.location,
            admission_availability: newCourse.admissionAvailability,
            is_published: newCourse.isPublished,
            is_archived: false,
          })
          .select("*")
          .single();

        if (error) throw error;
        if (data) return this.mapDbCourse(data);
      } catch (err) {
        console.warn("[CourseService.createCourse] Supabase failed, saving to local store:", err);
      }
    }

    devCourseStore.addCourse(tenantId, newCourse);
    return newCourse;
  }

  /**
   * Update an existing course (Admin only).
   */
  public static async updateCourse(
    session: AuthSession,
    courseId: string,
    input: UpdateCourseInput
  ): Promise<CourseRecord> {
    this.assertInstituteAdmin(session);
    const tenantId = this.getVerifiedTenantId(session);

    const existing = await this.getCourseById(session, courseId);
    if (!existing) {
      throw new Error("Course not found or access denied.");
    }

    const updates: Partial<CourseRecord> = {};
    if (input.name !== undefined) updates.name = input.name.trim();
    if (input.examCategory !== undefined) updates.examCategory = input.examCategory.trim();
    if (input.description !== undefined) updates.description = input.description.trim();
    if (input.eligibility !== undefined) updates.eligibility = input.eligibility.trim();
    if (input.feeCurrency !== undefined) updates.feeCurrency = input.feeCurrency;
    if (input.feeAmount !== undefined) updates.feeAmount = Number(input.feeAmount);
    if (input.feePeriod !== undefined) updates.feePeriod = input.feePeriod;
    if (input.approvedFeeInfo !== undefined) updates.approvedFeeInfo = input.approvedFeeInfo.trim();
    if (input.batchSchedule !== undefined) updates.batchSchedule = input.batchSchedule.trim();
    if (input.duration !== undefined) updates.duration = input.duration.trim();
    if (input.location !== undefined) updates.location = input.location.trim();
    if (input.admissionAvailability !== undefined) updates.admissionAvailability = input.admissionAvailability;
    if (input.isPublished !== undefined) updates.isPublished = input.isPublished;

    if (isSupabaseConfigured()) {
      try {
        const supabase = await createClient();
        const dbUpdates: any = { updated_at: new Date().toISOString() };
        if (updates.name !== undefined) dbUpdates.name = updates.name;
        if (updates.examCategory !== undefined) dbUpdates.exam_category = updates.examCategory;
        if (updates.description !== undefined) dbUpdates.description = updates.description;
        if (updates.eligibility !== undefined) dbUpdates.eligibility = updates.eligibility;
        if (updates.feeCurrency !== undefined) dbUpdates.fee_currency = updates.feeCurrency;
        if (updates.feeAmount !== undefined) dbUpdates.fee_amount = updates.feeAmount;
        if (updates.feePeriod !== undefined) dbUpdates.fee_period = updates.feePeriod;
        if (updates.approvedFeeInfo !== undefined) dbUpdates.approved_fee_info = updates.approvedFeeInfo;
        if (updates.batchSchedule !== undefined) dbUpdates.batch_schedule = updates.batchSchedule;
        if (updates.duration !== undefined) dbUpdates.duration = updates.duration;
        if (updates.location !== undefined) dbUpdates.location = updates.location;
        if (updates.admissionAvailability !== undefined) dbUpdates.admission_availability = updates.admissionAvailability;
        if (updates.isPublished !== undefined) dbUpdates.is_published = updates.isPublished;

        const { data, error } = await supabase
          .from("courses")
          .update(dbUpdates)
          .eq("id", courseId)
          .eq("tenant_id", tenantId)
          .select("*")
          .single();

        if (error) throw error;
        if (data) return this.mapDbCourse(data);
      } catch (err) {
        console.warn("[CourseService.updateCourse] Supabase failed, updating local store:", err);
      }
    }

    const updated = devCourseStore.updateCourse(tenantId, courseId, updates);
    if (!updated) throw new Error("Course not found in store.");
    return updated;
  }

  /**
   * Toggle publish status (Admin only).
   */
  public static async togglePublish(
    session: AuthSession,
    courseId: string,
    isPublished: boolean
  ): Promise<CourseRecord> {
    return this.updateCourse(session, courseId, { isPublished });
  }

  /**
   * Archive or restore a course (Admin only).
   */
  public static async archiveCourse(
    session: AuthSession,
    courseId: string,
    archive: boolean
  ): Promise<CourseRecord> {
    this.assertInstituteAdmin(session);
    const tenantId = this.getVerifiedTenantId(session);

    const now = new Date().toISOString();
    const updates: Partial<CourseRecord> = {
      isArchived: archive,
      archivedAt: archive ? now : null,
      isPublished: archive ? false : undefined, // If archived, auto-unpublish
    };

    if (isSupabaseConfigured()) {
      try {
        const supabase = await createClient();
        const { data, error } = await supabase
          .from("courses")
          .update({
            is_archived: archive,
            archived_at: archive ? now : null,
            is_published: archive ? false : undefined,
            updated_at: now,
          })
          .eq("id", courseId)
          .eq("tenant_id", tenantId)
          .select("*")
          .single();

        if (error) throw error;
        if (data) return this.mapDbCourse(data);
      } catch (err) {
        console.warn("[CourseService.archiveCourse] Supabase failed, updating local store:", err);
      }
    }

    const updated = devCourseStore.updateCourse(tenantId, courseId, updates);
    if (!updated) throw new Error("Course not found.");
    return updated;
  }

  private static mapDbCourse(row: any): CourseRecord {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      name: row.name,
      examCategory: row.exam_category,
      description: row.description || "",
      eligibility: row.eligibility || "",
      feeCurrency: row.fee_currency || "USD",
      feeAmount: Number(row.fee_amount) || 0,
      feePeriod: (row.fee_period as FeePeriod) || "annual",
      approvedFeeInfo: row.approved_fee_info || "",
      batchSchedule: row.batch_schedule || "",
      duration: row.duration || "",
      location: row.location || "",
      admissionAvailability: (row.admission_availability as AdmissionAvailability) || "open",
      isPublished: Boolean(row.is_published),
      isArchived: Boolean(row.is_archived),
      archivedAt: row.archived_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
