export type AdmissionAvailability = "open" | "closing_soon" | "waitlist" | "closed";
export type FeePeriod = "annual" | "per_semester" | "total" | "one_time";

export interface CourseRecord {
  id: string;
  tenantId: string;
  name: string;
  examCategory: string;
  description: string;
  eligibility: string;
  feeCurrency: string;
  feeAmount: number;
  feePeriod: FeePeriod;
  approvedFeeInfo: string;
  batchSchedule: string;
  duration: string;
  location: string;
  admissionAvailability: AdmissionAvailability;
  isPublished: boolean;
  isArchived: boolean;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCourseInput {
  name: string;
  examCategory: string;
  description?: string;
  eligibility?: string;
  feeCurrency?: string;
  feeAmount: number;
  feePeriod?: FeePeriod;
  approvedFeeInfo?: string;
  batchSchedule?: string;
  duration?: string;
  location?: string;
  admissionAvailability?: AdmissionAvailability;
  isPublished?: boolean;
}

export interface UpdateCourseInput {
  name?: string;
  examCategory?: string;
  description?: string;
  eligibility?: string;
  feeCurrency?: string;
  feeAmount?: number;
  feePeriod?: FeePeriod;
  approvedFeeInfo?: string;
  batchSchedule?: string;
  duration?: string;
  location?: string;
  admissionAvailability?: AdmissionAvailability;
  isPublished?: boolean;
}

export interface CourseFilterParams {
  search?: string;
  examCategory?: string;
  admissionAvailability?: AdmissionAvailability | "all";
  isPublished?: boolean | "all";
  isArchived?: boolean;
  sortBy?: "name" | "feeAmount" | "createdAt";
  sortOrder?: "asc" | "desc";
}
