export interface User {
  id: string;
  username: string;
  password: string;
  fullName: string;
  role: 'admin' | 'parent';
  childrenIds: string[];
  email?: string;
  emailNotifications?: boolean;
}

export interface SmtpSettings {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  fromName: string;
  fromEmail: string;
}

export interface Student {
  id: string;
  firstName: string;
  lastName: string;
  classId: string;
  parentIds: string[];
}

export interface SchoolClass {
  id: string;
  name: string;
  grade: number;
}

export interface Subject {
  id: string;
  name: string;
  shortName: string;
  color: string;
}

export interface ScheduleEntry {
  id: string;
  classId: string;
  subjectId: string;
  dayOfWeek: number; // 0=Monday, 4=Friday
  periodId: string; // reference to Period.id
  room?: string;
}

export interface SchoolYear {
  startDate: string;
  endDate: string;
}

export interface Period {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  isBreak?: boolean; // true = odmor, ne prikazuje se v urniku predmetov
}

export type Recurrence = 'none' | 'daily' | 'weekly' | 'biweekly' | 'triweekly' | 'monthly';

export interface DayEvent {
  id: string;
  date: string; // YYYY-MM-DD (start date for recurring)
  title: string;
  color: string;
  classIds: string[]; // empty = all classes
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  recurrence: Recurrence;
}

export interface StudentNote {
  id: string;
  studentId: string;
  date: string;
  content: string;
  createdAt: string;
}

export interface AfternoonEntry {
  id: string;
  classId: string;
  dayOfWeek: number; // 0=Monday, 4=Friday
  name: string;
  color: string;
  startTime: string;
  endTime: string;
}

export interface BusRide {
  id: string;
  direction: 'to_school' | 'from_school';
  departureTime: string; // HH:MM
  arrivalTime: string;   // HH:MM
  label?: string;        // optional label like "1. vožnja"
}

export interface AppNotification {
  id: string;
  userId: string;
  message: string;
  type: 'info' | 'warning' | 'success';
  read: boolean;
  createdAt: string;
}

export type Page =
  | 'login'
  | 'dashboard'
  | 'schedule'
  | 'students'
  | 'subjects'
  | 'classes'
  | 'users'
  | 'parents'
  | 'school-year'
  | 'class-schedule'
  | 'periods'
  | 'events'
  | 'notes';
  | 'bus';
  | 'email-settings';
