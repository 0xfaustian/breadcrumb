// types.ts

export interface User {
  id: string;
  username: string;
}

export type ScheduleType = 'daily' | 'weekly' | 'custom';

export interface ActivitySchedule {
  type: ScheduleType;
  daysOfWeek?: number[]; // 0 = Sunday, 1 = Monday, etc.
  customDays?: number; // number of days for custom schedule
}

export interface Activity {
  id: string;
  userId: string;
  name: string;
  schedule?: ActivitySchedule;
  createdAt: Date;
}

export interface ActivityMarker {
  id: string;
  activityId: string;
  label: string;
  isDefault?: boolean; // If true, this marker shows by default
  target?: number; // Daily target for this marker (e.g., 5 times per day)
  createdAt: Date;
}

export interface DailyRecord {
  id: string;
  userId: string;
  activityMarkerId: string;
  dateString: string; // YYYY-MM-DD format for easy comparison
  date: Date;
  completed: boolean;
  completedAt?: Date;
  createdAt: Date;
}