export type AnalyticsDatePreset = "7d" | "30d" | "90d" | "ytd" | "all" | "custom";

export interface DateRangeFilter {
  preset: AnalyticsDatePreset;
  startDate?: string;
  endDate?: string;
}

export interface SourcePerformanceMetric {
  source: string;
  leadsCount: number;
  appointmentsCount: number;
  admissionsCount: number;
  conversionRate: number; // Percentage
  sharePercent: number;   // Percentage of total leads
}

export interface CounsellorWorkloadMetric {
  counsellorId: string;
  counsellorName: string;
  assignedLeads: number;
  appointmentsScheduled: number;
  appointmentsCompleted: number;
  admissionsCount: number;
  conversionRate: number; // Percentage
}

export interface FunnelStageMetric {
  stage: string;
  label: string;
  count: number;
  conversionFromPrevious: number; // Percentage
  conversionFromTotal: number;    // Percentage
}

export interface FollowUpCompletionMetric {
  totalTasks: number;
  completedTasks: number;
  dueTasks: number;
  overdueTasks: number;
  completionRatePercent: number;
}

export interface RevenueAttributionMetric {
  actualRealizedRevenue: number;     // Verified payments from confirmed admissions
  estimatedPipelineValue: number;    // Unconfirmed potential fees (explicitly labeled as estimated)
  recordedPaymentsCount: number;     // Count of verified payments
  currency: string;
}

export interface AnalyticsReport {
  dateRange: {
    preset: AnalyticsDatePreset;
    startDate: string;
    endDate: string;
  };
  totalEnquiries: number;
  newLeads: number;
  qualifiedLeads: number;
  counsellingAppointments: number;
  completedAppointments: number;
  admissions: number;
  lostLeads: number;
  leadToAppointmentRate: number;     // Percentage
  leadToAdmissionRate: number;       // Percentage
  averageFirstResponseHours: number; // Hours to first staff activity
  leadSourcePerformance: SourcePerformanceMetric[];
  counsellorWorkload: CounsellorWorkloadMetric[];
  funnelStages: FunnelStageMetric[];
  followUpMetrics: FollowUpCompletionMetric;
  revenue: RevenueAttributionMetric;
}

export interface PaymentRecord {
  id: string;
  tenantId: string;
  leadId: string;
  courseId?: string | null;
  amount: number;
  currency: string;
  status: "pending" | "completed" | "failed" | "refunded";
  paymentMethod: string;
  transactionReference?: string | null;
  recordedBy?: string | null;
  recordedAt: string;
  createdAt: string;
}
