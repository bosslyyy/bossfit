import type {
  BossProfile,
  CalendarDay,
  CompletionCalendarEntry,
  Habit,
  HabitHistoryPoint,
  ProgressChartPoint,
  WeeklySummary
} from "@/types/habit";

export interface CoachNote {
  id: string;
  title: string;
  body: string;
  noteType: "general" | "performance" | "injury" | "nutrition" | "mindset" | "followup";
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string;
}

export interface CoachAlert {
  id: string;
  title: string;
  body: string;
  severity: "info" | "warning" | "success" | "urgent";
  createdAt: string;
  updatedAt: string;
  readAt?: string;
  dismissedAt?: string;
  expiresAt?: string;
  archivedAt?: string;
}

export interface CoachMessage {
  id: string;
  body: string;
  senderUserId: string;
  senderRole: "coach" | "member";
  createdAt: string;
  updatedAt: string;
  readAt?: string;
  deletedAt?: string;
}

export interface CoachLiveHabitStatus {
  habitId: string;
  name: string;
  trackingMode: Habit["trackingMode"];
  targetSets: number;
  repsPerSet: number;
  secondsPerSet?: number;
  completedSets: number;
  remainingSets: number;
  isCompleted: boolean;
  color: Habit["color"];
  icon: Habit["icon"];
  updatedAt: string;
}

export interface CoachHabitHistoryEntry {
  habit: Habit;
  history: HabitHistoryPoint[];
}

export interface CoachMemberDetail {
  userId: string;
  assignmentId: string;
  name: string;
  email: string;
  username?: string;
  groupName: string;
  planName: string;
  assignmentStatus: string;
  joinedAt?: string;
  currentStreak: number;
  bestStreak: number;
  totalPoints: number;
  level: number;
  weeklyCompliance: number;
  lastActivityLabel: string;
  activeHabits: number;
  completedToday: number;
  scheduledToday: number;
}

export interface CoachMemberDetailResponse {
  member: CoachMemberDetail;
  bossProfile: BossProfile;
  weeklySummary: WeeklySummary;
  recentDays: CompletionCalendarEntry[];
  chartData: ProgressChartPoint[];
  calendarDays: CalendarDay[];
  monthLabel: string;
  liveToday: {
    dateKey: string;
    completedSets: number;
    totalSets: number;
    habits: CoachLiveHabitStatus[];
  };
  habitHistory: CoachHabitHistoryEntry[];
  habits: Habit[];
  notes: CoachNote[];
  alerts: CoachAlert[];
  messages: CoachMessage[];
  lastSyncedAt?: string;
  updatedAt?: string;
}

export interface MemberInboxResponse {
  coach: {
    userId: string;
    name: string;
    email: string;
    gymName: string;
    groupName: string;
  } | null;
  alerts: CoachAlert[];
  messages: CoachMessage[];
  unreadAlerts: number;
  unreadMessages: number;
}

