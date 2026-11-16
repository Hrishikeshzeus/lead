"use server";

import { getServerAuthSession } from "@/lib/auth/session";
import { AnalyticsService } from "@/lib/analytics/service";
import type {
  AnalyticsReport,
  DateRangeFilter,
  PaymentRecord,
} from "@/types/analytics";

export interface ActionResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Fetch real database-backed recruitment and enrollment analytics report.
 */
export async function getAnalyticsReportAction(
  filter?: DateRangeFilter
): Promise<ActionResult<AnalyticsReport>> {
  try {
    const session = await getServerAuthSession();
    const report = await AnalyticsService.getAnalyticsReport(session, filter);
    return { success: true, data: report };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to generate analytics report." };
  }
}

/**
 * Record a verified payment for an admitted student.
 */
export async function recordPaymentAction(input: {
  leadId: string;
  courseId?: string;
  amount: number;
  paymentMethod?: string;
  transactionReference?: string;
}): Promise<ActionResult<PaymentRecord>> {
  try {
    const session = await getServerAuthSession();
    const payment = await AnalyticsService.recordPayment(session, input);
    return { success: true, data: payment };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to record payment." };
  }
}
