export type LeadStatus =
  | "new"
  | "contacted"
  | "counseling_scheduled"
  | "application_submitted"
  | "accepted"
  | "enrolled"
  | "lost";

export type LeadSource = "website" | "referral" | "education_fair" | "social_media" | "direct_inquiry";

export interface Lead {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  programOfInterest: string;
  intakeSeason: string;
  status: LeadStatus;
  source: LeadSource;
  assignedCounselor: string;
  score: number;
  lastContactDate: string;
  createdAt: string;
  notes?: string;
}

export type ChannelType = "whatsapp" | "email" | "sms" | "phone";

export interface ConversationMessage {
  id: string;
  conversationId: string;
  sender: "student" | "counselor" | "system";
  content: string;
  timestamp: string;
  channel: ChannelType;
}

export interface Conversation {
  id: string;
  leadId: string;
  studentName: string;
  studentEmail: string;
  avatarUrl?: string;
  channel: ChannelType;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  status: "open" | "waiting_student" | "resolved";
  assignedCounselor: string;
}

export type FollowUpPriority = "low" | "medium" | "high" | "urgent";
export type FollowUpStatus = "pending" | "completed" | "overdue";
export type FollowUpType = "call" | "email" | "whatsapp" | "document_request" | "meeting";

export interface FollowUp {
  id: string;
  leadId: string;
  studentName: string;
  title: string;
  type: FollowUpType;
  dueDate: string;
  priority: FollowUpPriority;
  status: FollowUpStatus;
  assignedTo: string;
  notes?: string;
}

export type AppointmentType = "campus_tour" | "admission_interview" | "general_counseling" | "financial_aid_review";
export type AppointmentStatus = "scheduled" | "completed" | "rescheduled" | "cancelled" | "no_show";

export interface Appointment {
  id: string;
  leadId: string;
  studentName: string;
  studentEmail: string;
  counselorName: string;
  type: AppointmentType;
  scheduledAt: string;
  durationMinutes: number;
  status: AppointmentStatus;
  meetingFormat: "in_person" | "virtual";
  meetingLinkOrRoom: string;
}

export interface Course {
  id: string;
  code: string;
  name: string;
  department: string;
  level: "Undergraduate" | "Postgraduate" | "Doctorate" | "Diploma";
  durationMonths: number;
  intakeTerm: string;
  totalSeats: number;
  enrolledSeats: number;
  tuitionFeeUSD: number;
  status: "open" | "closing_soon" | "waitlist_only" | "closed";
}

export interface KnowledgeArticle {
  id: string;
  title: string;
  category: "Eligibility" | "Tuition & Aid" | "Visa Guidelines" | "Application Steps" | "Deadlines";
  summary: string;
  content: string;
  tags: string[];
  lastUpdated: string;
  views: number;
}

export interface TeamMember {
  id: string;
  fullName: string;
  email: string;
  role: "Admissions Director" | "Senior Counselor" | "Admissions Counselor" | "Operations Specialist";
  department: string;
  activeLeads: number;
  conversionRatePercent: number;
  status: "online" | "in_meeting" | "offline";
  joinedDate: string;
}

export interface DashboardMetric {
  title: string;
  value: string;
  change: string;
  isPositive: boolean;
  secondaryText: string;
}

export interface FunnelStage {
  stage: string;
  count: number;
  percentage: number;
}
