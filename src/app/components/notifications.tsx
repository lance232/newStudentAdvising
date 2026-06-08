import { useEffect, useMemo, useState } from "react";
import { Bell, X, Check, AlertCircle, BookOpen } from "lucide-react";
import { normalizeSemesterLabel } from "./semester-utils";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";

interface Notification {
  id: string;
  type: 'warning' | 'info' | 'success';
  title: string;
  message: string;
  time: string;
  read: boolean;
  createdAt: number;
  action?: NotificationAction;
}

type NotificationAction =
  | { kind: 'student-booking' }
  | { kind: 'student-appointment'; appointmentId: string; appointmentDate?: string; appointmentTime?: string }
  | { kind: 'calendar'; tab: 'upcoming' | 'cancelled' }
  | { kind: 'students' };

type UserRole = 'adviser' | 'student' | 'chairman' | 'admin';

interface NotificationsProps {
  userRole: UserRole;
  onStudentBooking?: () => void;
  onStudentAppointmentOpen?: (appointment: {
    appointmentId: string;
    appointmentDate?: string;
    appointmentTime?: string;
  }) => void;
  onCalendarNavigate?: (tab: 'upcoming' | 'cancelled') => void;
  onStudentsNavigate?: () => void;
}

interface DashboardGrade {
  semesterId?: number | string | null;
  SemesterId?: number | string | null;
  gradeValue?: string | number | null;
  GradeValue?: string | number | null;
  currentGrade?: string | number | null;
  CurrentGrade?: string | number | null;
  courseName?: string | null;
  CourseName?: string | null;
  courseCode?: string | null;
  CourseCode?: string | null;
  semesterName?: string | null;
  SemesterName?: string | null;
  schoolYear?: string | null;
  SchoolYear?: string | null;
}

interface DashboardPayload {
  studentId?: number | string | null;
  StudentId?: number | string | null;
  grades?: DashboardGrade[];
  Grades?: DashboardGrade[];
}

interface AppointmentRow {
  appointmentId?: number | string | null;
  AppointmentId?: number | string | null;
  studentId?: number | string | null;
  StudentId?: number | string | null;
  studentName?: string | null;
  StudentName?: string | null;
  adviserName?: string | null;
  AdviserName?: string | null;
  appointmentType?: string | null;
  AppointmentType?: string | null;
  appointmentDate?: string | null;
  AppointmentDate?: string | null;
  appointmentTime?: string | null;
  AppointmentTime?: string | null;
  status?: string | null;
  Status?: string | null;
  cancellationReason?: string | null;
  CancellationReason?: string | null;
  cancellationDate?: string | null;
  CancellationDate?: string | null;
}

interface CalendarPayload {
  upcomingAppointments?: AppointmentRow[];
  cancelledAppointments?: AppointmentRow[];
  UpcomingAppointments?: AppointmentRow[];
  CancelledAppointments?: AppointmentRow[];
}

interface AdviserAssignmentRow {
  adviserAssignmentId?: number | string | null;
  adviserId?: number | string | null;
  yearLevelId?: number | string | null;
  assignedAt?: string | null;
  isDeleted?: boolean | null;
  deleteDate?: string | null;
  deleteName?: string | null;
  advisorId?: number | string | null;
  adviserUserId?: number | string | null;
  userId?: number | string | null;
  yearlevelId?: number | string | null;
  levelId?: number | string | null;
  yearLevelName?: string | null;
  YearLevelName?: string | null;
  yearLevel?: string | null;
  assignedYearLevel?: string | null;
  year?: string | null;
  advisorAssignmentId?: number | string | null;
  assignmentId?: number | string | null;
  id?: number | string | null;
  createdAt?: string | null;
  CreatedAt?: string | null;
}

interface SemesterRow {
  semesterId?: number | string | null;
  SemesterId?: number | string | null;
  name?: string | null;
  Name?: string | null;
  isCurrent?: boolean | null;
  IsCurrent?: boolean | null;
  isActive?: boolean | null;
  IsActive?: boolean | null;
  startDate?: string | null;
  StartDate?: string | null;
  endDate?: string | null;
  EndDate?: string | null;
}

const API_BASE_URL =
  (((import.meta as ImportMeta & { env?: { VITE_API_BASE_URL?: string } }).env?.VITE_API_BASE_URL) as string | undefined)?.replace(/\/$/, '')
  ?? 'https://localhost:53005/api';

const DAILY_FAILED_REMINDER_KEY = 'student_failed_grade_last_reminder';
const APPOINTMENT_REMINDER_KEY = 'appointment_day_before_reminder';
const SEMESTER_ENDPOINTS = ['/Semesters/current', '/Semesters/active', '/Semesters'];
const NOTIFICATION_READ_KEY = 'notification_read_state';
const SESSION_STORAGE_KEY = 'app_session';

function getApiBaseCandidates(): string[] {
  const candidates: string[] = [];

  if (API_BASE_URL) {
    candidates.push(API_BASE_URL);
  }

  if (API_BASE_URL.endsWith('/api')) {
    candidates.push(API_BASE_URL.slice(0, -4));
  } else {
    candidates.push(`${API_BASE_URL}/api`);
  }

  return Array.from(new Set(candidates.map((value) => value.replace(/\/$/, ''))));
}

async function fetchWithApiFallback(path: string, init?: RequestInit): Promise<Response> {
  const bases = getApiBaseCandidates();
  let lastResponse: Response | null = null;

  for (const base of bases) {
    const response = await fetch(`${base}${path}`, init);
    if (response.status !== 404) {
      return response;
    }

    lastResponse = response;
  }

  if (lastResponse) {
    return lastResponse;
  }

  throw new Error('Unable to reach notifications endpoint.');
}

function getAuthToken(): string | null {
  const rawToken = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
  if (!rawToken) {
    return null;
  }

  return rawToken.replace(/^Bearer\s+/i, '').trim();
}

function getCurrentUserId(): string {
  const rawSession = sessionStorage.getItem(SESSION_STORAGE_KEY)
    ?? localStorage.getItem(SESSION_STORAGE_KEY)
    ?? '';
  if (!rawSession) {
    return '';
  }

  try {
    const session = JSON.parse(rawSession) as { currentUser?: { id?: string } };
    return String(session?.currentUser?.id ?? '').trim();
  } catch {
    return '';
  }
}

function buildReadStateKey(userRole: UserRole, userId: string): string {
  return `${NOTIFICATION_READ_KEY}:${userRole}:${userId || 'unknown'}`;
}

function loadReadIds(key: string): Set<string> {
  const raw = sessionStorage.getItem(key);
  if (!raw) {
    return new Set();
  }

  try {
    const parsed = JSON.parse(raw) as string[];
    if (Array.isArray(parsed)) {
      return new Set(parsed.filter((value) => typeof value === 'string' && value.trim()));
    }
  } catch {
    return new Set();
  }

  return new Set();
}

function persistReadIds(key: string, ids: Set<string>) {
  sessionStorage.setItem(key, JSON.stringify(Array.from(ids)));
}

type StreamNotificationPayload = {
  id?: string;
  type?: 'warning' | 'info' | 'success';
  title?: string;
  message?: string;
  createdAt?: string;
  action?: {
    kind?: 'student-booking' | 'student-appointment' | 'calendar' | 'students';
    appointmentId?: string;
    appointmentDate?: string;
    appointmentTime?: string;
  };
};

async function consumeEventStream(
  stream: ReadableStream<Uint8Array>,
  onEvent: (eventName: string, data: string) => void,
): Promise<void> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let currentEvent = '';
  let dataLines: string[] = [];

  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });

    let newlineIndex = buffer.indexOf('\n');
    while (newlineIndex >= 0) {
      const rawLine = buffer.slice(0, newlineIndex);
      buffer = buffer.slice(newlineIndex + 1);
      const line = rawLine.replace(/\r$/, '');

      if (!line) {
        if (dataLines.length > 0) {
          onEvent(currentEvent || 'message', dataLines.join('\n'));
        }
        currentEvent = '';
        dataLines = [];
      } else if (line.startsWith(':')) {
        // Heartbeat comment.
      } else {
        const [field, ...rest] = line.split(':');
        const valueText = rest.join(':').trimStart();
        if (field === 'event') {
          currentEvent = valueText;
        } else if (field === 'data') {
          dataLines.push(valueText);
        }
      }

      newlineIndex = buffer.indexOf('\n');
    }
  }
}


function getArrayPayload<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) {
    return payload as T[];
  }

  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>;
    if (Array.isArray(record.data)) {
      return record.data as T[];
    }
    if (Array.isArray(record.items)) {
      return record.items as T[];
    }
  }

  return [];
}

function getSemesterRowsPayload(payload: unknown): SemesterRow[] {
  if (Array.isArray(payload)) {
    return payload as SemesterRow[];
  }

  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>;

    if (record.SemesterId != null || record.semesterId != null) {
      return [record as SemesterRow];
    }

    if (Array.isArray(record.data)) {
      return record.data as SemesterRow[];
    }
    if (record.data && typeof record.data === 'object') {
      const dataRecord = record.data as Record<string, unknown>;
      if (dataRecord.SemesterId != null || dataRecord.semesterId != null) {
        return [record.data as SemesterRow];
      }
    }

    if (Array.isArray(record.items)) {
      return record.items as SemesterRow[];
    }
    if (record.items && typeof record.items === 'object') {
      const itemsRecord = record.items as Record<string, unknown>;
      if (itemsRecord.SemesterId != null || itemsRecord.semesterId != null) {
        return [record.items as SemesterRow];
      }
    }
  }

  return [];
}

function parseDateMillis(input: unknown): number | null {
  const value = String(input ?? '').trim();
  if (!value) {
    return null;
  }
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? null : time;
}

function pickSemesterRow(rows: SemesterRow[]): SemesterRow | null {
  if (rows.length === 0) {
    return null;
  }

  const directCurrent = rows.find((row) => Boolean(row.IsCurrent ?? row.isCurrent));
  if (directCurrent) {
    return directCurrent;
  }

  const directActive = rows.find((row) => Boolean(row.IsActive ?? row.isActive));
  if (directActive) {
    return directActive;
  }

  const now = Date.now();
  const byDateRange = rows.find((row) => {
    const start = parseDateMillis(row.StartDate ?? row.startDate);
    const end = parseDateMillis(row.EndDate ?? row.endDate);
    if (start === null || end === null) {
      return false;
    }
    return start <= now && now <= end;
  });
  if (byDateRange) {
    return byDateRange;
  }

  return rows.find((row) => String(row.SemesterId ?? row.semesterId ?? '').trim().length > 0) ?? null;
}

function getSemesterPrefix(label: string): string {
  const normalized = normalizeSemesterLabel(label).toLowerCase();
  if (normalized.startsWith('1st semester')) {
    return '1st semester';
  }
  if (normalized.startsWith('2nd semester')) {
    return '2nd semester';
  }
  if (normalized.startsWith('summer')) {
    return 'summer';
  }
  return '';
}

function matchesCurrentSemesterLabel(currentLabel: string, gradeLabel: string): boolean {
  const normalizedCurrent = normalizeSemesterLabel(currentLabel);
  const normalizedGrade = normalizeSemesterLabel(gradeLabel);
  const currentHasYear = /\b\d{4}\b/.test(normalizedCurrent);

  if (currentHasYear) {
    return normalizedCurrent === normalizedGrade;
  }

  const currentPrefix = getSemesterPrefix(normalizedCurrent);
  const gradePrefix = getSemesterPrefix(normalizedGrade);
  return currentPrefix.length > 0 && currentPrefix === gradePrefix;
}

async function resolveCurrentSemester(headers: Record<string, string>): Promise<{ semesterId: string; label: string }> {
  let fallbackLabel = '';

  for (const path of SEMESTER_ENDPOINTS) {
    const response = await fetchWithApiFallback(path, { headers });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      continue;
    }

    const rows = getSemesterRowsPayload(payload);
    const chosen = pickSemesterRow(rows);
    if (!chosen) {
      continue;
    }

    const semesterId = String(chosen.SemesterId ?? chosen.semesterId ?? '').trim();
    const label = normalizeSemesterLabel(chosen.Name ?? chosen.name ?? '');
    if (label && !fallbackLabel) {
      fallbackLabel = label;
    }
    if (semesterId || label) {
      return { semesterId, label: label || fallbackLabel };
    }
  }

  return { semesterId: '', label: fallbackLabel };
}

function getTodayKey(): string {
  return new Date().toISOString().split('T')[0];
}

function parseDateValue(input: unknown): Date | null {
  const value = String(input ?? '').trim();
  if (!value) {
    return null;
  }

  const normalized = value.split('T')[0];
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

function parseDateTimeMillis(dateValue: unknown, timeValue: unknown): number | null {
  const dateText = String(dateValue ?? '').trim();
  const timeText = String(timeValue ?? '').trim();
  if (!dateText && !timeText) {
    return null;
  }

  const datePart = dateText ? dateText.split('T')[0] : '';
  const combined = datePart && timeText ? `${datePart}T${timeText}` : dateText;
  const parsed = new Date(combined);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.getTime();
}

function getAppointmentSortTimestamp(appointment: AppointmentRow): number {
  const rawId = String(appointment.appointmentId ?? appointment.AppointmentId ?? '').trim();
  const numericId = Number(rawId);
  if (Number.isFinite(numericId) && numericId > 0) {
    return numericId;
  }

  return parseDateTimeMillis(
    appointment.appointmentDate ?? appointment.AppointmentDate,
    appointment.appointmentTime ?? appointment.AppointmentTime,
  ) ?? Date.now();
}

function getAssignmentSortTimestamp(assignment: AdviserAssignmentRow): number {
  return parseDateMillis(assignment.assignedAt ?? assignment.createdAt ?? assignment.CreatedAt) ?? 0;
}

function getAssignmentYearLevelLabel(assignment: AdviserAssignmentRow): string {
  const label = String(
    assignment.yearLevelName
      ?? assignment.YearLevelName
      ?? assignment.yearLevel
      ?? assignment.assignedYearLevel
      ?? assignment.year
      ?? '',
  ).trim();

  if (label) {
    return label;
  }

  const yearLevelId = String(
    assignment.yearLevelId
      ?? assignment.yearlevelId
      ?? assignment.levelId
      ?? '',
  ).trim();
  return yearLevelId ? `Year Level ${yearLevelId}` : 'a year level';
}

function formatIsoDateTime(value: unknown): string {
  const text = String(value ?? '').trim();
  if (!text) {
    return 'Recently';
  }

  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) {
    return text;
  }

  return parsed.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function sortNotifications(items: Notification[]): Notification[] {
  return [...items].sort((a, b) => b.createdAt - a.createdAt);
}

function isTomorrow(dateValue: unknown): boolean {
  const parsed = parseDateValue(dateValue);
  if (!parsed) {
    return false;
  }

  const now = new Date();
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return parsed.getFullYear() === tomorrow.getFullYear()
    && parsed.getMonth() === tomorrow.getMonth()
    && parsed.getDate() === tomorrow.getDate();
}

function isToday(dateValue: unknown): boolean {
  const parsed = parseDateValue(dateValue);
  if (!parsed) {
    return false;
  }

  const now = new Date();
  return parsed.getFullYear() === now.getFullYear()
    && parsed.getMonth() === now.getMonth()
    && parsed.getDate() === now.getDate();
}

function formatDateTime(dateValue: unknown, timeValue: unknown): string {
  const dateText = String(dateValue ?? '').trim();
  const timeText = String(timeValue ?? '').trim();
  if (!dateText && !timeText) {
    return 'Not Set';
  }

  const datePart = dateText ? dateText.split('T')[0] : '';
  const combined = datePart && timeText ? `${datePart}T${timeText}` : dateText;
  const parsed = new Date(combined);
  if (Number.isNaN(parsed.getTime())) {
    return `${datePart || dateText} ${timeText}`.trim() || 'Not Set';
  }

  return parsed.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function normalizeStatus(value: unknown): string {
  return String(value ?? '').trim().toLowerCase();
}

function parseGradeValue(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value.trim());
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function isFailedGrade(grade: DashboardGrade): boolean {
  const value =
    parseGradeValue(grade.currentGrade)
    ?? parseGradeValue(grade.CurrentGrade)
    ?? parseGradeValue(grade.gradeValue)
    ?? parseGradeValue(grade.GradeValue);

  if (value !== null) {
    return value > 3.0;
  }

  const raw = String(grade.gradeValue ?? grade.GradeValue ?? grade.currentGrade ?? grade.CurrentGrade ?? '').trim().toLowerCase();
  return raw.includes('fail') || raw === 'f';
}

function getNotificationKey(prefix: string, id: string): string {
  return `${prefix}:${id}`;
}

function getLastReminderDate(prefix: string, id: string): string {
  return localStorage.getItem(getNotificationKey(prefix, id)) ?? '';
}

function setLastReminderDate(prefix: string, id: string, dateKey: string) {
  localStorage.setItem(getNotificationKey(prefix, id), dateKey);
}

export function Notifications({
  userRole,
  onStudentBooking,
  onStudentAppointmentOpen,
  onCalendarNavigate,
  onStudentsNavigate,
}: NotificationsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const readStateKey = useMemo(() => buildReadStateKey(userRole, getCurrentUserId()), [userRole]);

  const updateReadIds = (mutate: (ids: Set<string>) => void) => {
    const ids = loadReadIds(readStateKey);
    mutate(ids);
    persistReadIds(readStateKey, ids);
  };

  const loadNotifications = async () => {
    const shouldShowLoading = notifications.length === 0;
    if (shouldShowLoading) {
      setIsLoading(true);
      setLoadError('');
    }

    const token = getAuthToken();
    if (!token) {
      if (shouldShowLoading) {
        setNotifications([]);
        setIsLoading(false);
      }
      return;
    }

    try {
      const headers = {
        Authorization: `Bearer ${token}`,
      };

      if (userRole === 'student') {
        const [dashboardResponse, appointmentsResponse] = await Promise.all([
          fetchWithApiFallback('/Students/me/dashboard', { headers }),
          fetchWithApiFallback('/Appointments', { headers }),
        ]);

        const dashboardPayload = await dashboardResponse.json().catch(() => ({}));
        if (!dashboardResponse.ok) {
          throw new Error('Unable to load student dashboard for notifications.');
        }

        const appointmentPayload = await appointmentsResponse.json().catch(() => ([]));
        const dashboard = dashboardPayload as DashboardPayload;
        const studentId = String(dashboard.studentId ?? dashboard.StudentId ?? '').trim();
        const grades = (dashboard.grades ?? dashboard.Grades ?? []) as DashboardGrade[];
        const gradeRows = grades;
        const appointments = getArrayPayload<AppointmentRow>(appointmentPayload).filter((row) => {
          const rowStudentId = String(row.studentId ?? row.StudentId ?? '').trim();
          return studentId && rowStudentId === studentId;
        });

        const todayKey = getTodayKey();
        const failedGrades = gradeRows.filter(isFailedGrade);
        const upcomingAppointments = appointments.filter((row) => normalizeStatus(row.status ?? row.Status).includes('upcoming'));

        const items: Notification[] = [];
        const baseTimestamp = Date.now();
        let notificationIndex = 0;
        const nextTimestamp = () => {
          const value = baseTimestamp + notificationIndex;
          notificationIndex += 1;
          return value;
        };

        if (failedGrades.length > 0) {
          items.push({
            id: `failed-grade-${todayKey}`,
            type: 'warning',
            title: 'Advising Required',
            message: 'You have a failed grade. Please book an appointment with your adviser to discuss next steps.',
            time: 'Today',
            read: false,
            createdAt: nextTimestamp(),
            action: { kind: 'student-booking' },
          });
          setLastReminderDate(DAILY_FAILED_REMINDER_KEY, studentId || 'student', todayKey);
        }

        upcomingAppointments.forEach((appointment) => {
          const rawAppointmentId = String(appointment.appointmentId ?? appointment.AppointmentId ?? '').trim();
          const appointmentId = rawAppointmentId || '';
          const appointmentType = String(appointment.appointmentType ?? appointment.AppointmentType ?? 'Advising').trim() || 'Advising';
          const appointmentDate = String(appointment.appointmentDate ?? appointment.AppointmentDate ?? '').trim();
          const appointmentTimeRaw = String(appointment.appointmentTime ?? appointment.AppointmentTime ?? '').trim();
          const appointmentTime = formatDateTime(appointment.appointmentDate ?? appointment.AppointmentDate, appointment.appointmentTime ?? appointment.AppointmentTime);
          const appointmentKey = appointmentId || `${appointmentDate}-${appointmentTimeRaw}` || 'upcoming';

          if (isToday(appointment.appointmentDate ?? appointment.AppointmentDate)) {
            items.push({
              id: `appt-today-${appointmentKey}`,
              type: 'info',
              title: 'Appointment Reminder',
              message: `Today you have an appointment with your adviser at ${appointmentTime}.`,
              time: 'Today',
              read: false,
              createdAt: nextTimestamp(),
              action: {
                kind: 'student-appointment',
                appointmentId,
                appointmentDate,
                appointmentTime: appointmentTimeRaw,
              },
            });
          }

          if (isTomorrow(appointment.appointmentDate ?? appointment.AppointmentDate)) {
            items.push({
              id: `appt-reminder-${appointmentKey}`,
              type: 'info',
              title: 'Appointment Reminder',
              message: `Tomorrow you have an appointment with your adviser at ${appointmentTime}.`,
              time: 'Today',
              read: false,
              createdAt: nextTimestamp(),
              action: {
                kind: 'student-appointment',
                appointmentId,
                appointmentDate,
                appointmentTime: appointmentTimeRaw,
              },
            });
            const reminderKey = `${appointmentId}-${todayKey}`;
            setLastReminderDate(APPOINTMENT_REMINDER_KEY, reminderKey, todayKey);
          }
        });

        const storedReadIds = loadReadIds(readStateKey);
        setNotifications((prev) => mergeReadState(prev, items, storedReadIds));
        return;
      }

      if (userRole === 'adviser' || userRole === 'chairman') {
        const [calendarResponse, assignmentResponse, advisersResponse] = await Promise.all([
          fetchWithApiFallback('/Appointments/calendar', { headers }),
          fetchWithApiFallback('/AdviserAssignments', { headers }),
          fetchWithApiFallback('/Advisers', { headers }),
        ]);

        const calendarPayload = await calendarResponse.json().catch(() => ({}));
        if (!calendarResponse.ok) {
          throw new Error('Unable to load appointment calendar for notifications.');
        }

        const assignmentPayload = await assignmentResponse.json().catch(() => ([]));
        const assignments = assignmentResponse.ok
          ? getArrayPayload<AdviserAssignmentRow>(assignmentPayload)
          : [];

        const advisersPayload = await advisersResponse.json().catch(() => ([]));
        const adviserRows = advisersResponse.ok && Array.isArray(advisersPayload) ? advisersPayload : [];

        const calendar = calendarPayload as CalendarPayload;
        const upcomingAppointments = calendar.upcomingAppointments ?? calendar.UpcomingAppointments ?? [];
        const cancelledAppointments = calendar.cancelledAppointments ?? calendar.CancelledAppointments ?? [];
        const todayKey = getTodayKey();

        const items: Notification[] = [];
        const baseTimestamp = Date.now();
        let notificationIndex = 0;
        const nextTimestamp = () => {
          const value = baseTimestamp + notificationIndex;
          notificationIndex += 1;
          return value;
        };
        const currentUserId = getCurrentUserId();
        const adviserMatchKeys = new Set<string>();
        if (currentUserId) {
          adviserMatchKeys.add(currentUserId);
        }

        adviserRows.forEach((adviser: any) => {
          const id = String(adviser.id ?? '').trim();
          const adviserId = String(adviser.adviserId ?? adviser.advisorId ?? '').trim();
          const userId = String(adviser.userId ?? adviser.user?.userId ?? '').trim();
          const username = String(adviser.username ?? adviser.userName ?? adviser.user?.username ?? '').trim();
          if (!currentUserId) {
            return;
          }
          if (currentUserId === id || currentUserId === adviserId || currentUserId === userId || currentUserId === username) {
            [id, adviserId, userId, username].filter(Boolean).forEach((key) => adviserMatchKeys.add(key));
          }
        });

        const assignmentItems: Notification[] = [];
        assignments.forEach((assignment) => {
          if (assignment.isDeleted) {
            return;
          }

          const assignmentAdviserId = String(
            assignment.adviserId
              ?? assignment.advisorId
              ?? assignment.adviserUserId
              ?? assignment.userId
              ?? '',
          ).trim();
          if (!assignmentAdviserId || !adviserMatchKeys.has(assignmentAdviserId)) {
            return;
          }

          const assignmentId = String(
            assignment.adviserAssignmentId
              ?? assignment.advisorAssignmentId
              ?? assignment.assignmentId
              ?? assignment.id
              ?? assignmentAdviserId,
          ).trim();
          const yearLevelId = String(
            assignment.yearLevelId
              ?? assignment.yearlevelId
              ?? assignment.levelId
              ?? '',
          ).trim();
          const yearLevelLabel = getAssignmentYearLevelLabel(assignment);
          const assignedTime = formatIsoDateTime(assignment.assignedAt ?? assignment.createdAt ?? assignment.CreatedAt);
          assignmentItems.push({
            id: `adviser-assigned-${assignmentId}-${yearLevelId || yearLevelLabel}`,
            type: 'success',
            title: 'Adviser Assignment',
            message: `You have been assigned to ${yearLevelLabel}.`,
            time: assignedTime,
            read: false,
            createdAt: getAssignmentSortTimestamp(assignment),
            action: { kind: 'students' },
          });
        });

        items.push(...assignmentItems);

        upcomingAppointments.forEach((appointment) => {
          const appointmentId = String(appointment.appointmentId ?? appointment.AppointmentId ?? '').trim() || 'upcoming';
          const appointmentTime = formatDateTime(appointment.appointmentDate ?? appointment.AppointmentDate, appointment.appointmentTime ?? appointment.AppointmentTime);
          const studentName = String(appointment.studentName ?? appointment.StudentName ?? 'Student').trim() || 'Student';
          items.push({
            id: `appt-${appointmentId}`,
            type: 'info',
            title: 'Upcoming Appointment',
            message: `${studentName} booked an appointment on ${appointmentTime}.`,
            time: appointmentTime,
            read: false,
            createdAt: getAppointmentSortTimestamp(appointment),
            action: { kind: 'calendar', tab: 'upcoming' },
          });

          if (isTomorrow(appointment.appointmentDate ?? appointment.AppointmentDate)) {
            items.push({
              id: `appt-reminder-${appointmentId}`,
              type: 'warning',
              title: 'Appointment Reminder',
              message: `Reminder: ${studentName} has an appointment tomorrow at ${appointmentTime}.`,
              time: 'Today',
              read: false,
              createdAt: nextTimestamp(),
              action: { kind: 'calendar', tab: 'upcoming' },
            });
            const reminderKey = `${appointmentId}-${todayKey}`;
            setLastReminderDate(APPOINTMENT_REMINDER_KEY, reminderKey, todayKey);
          }

          if (isToday(appointment.appointmentDate ?? appointment.AppointmentDate)) {
            items.push({
              id: `appt-today-${appointmentId}`,
              type: 'warning',
              title: 'Appointment Reminder',
              message: `Reminder: ${studentName} has an appointment today at ${appointmentTime}.`,
              time: 'Today',
              read: false,
              createdAt: nextTimestamp(),
              action: { kind: 'calendar', tab: 'upcoming' },
            });
          }
        });

        cancelledAppointments.forEach((appointment) => {
          const appointmentId = String(appointment.appointmentId ?? appointment.AppointmentId ?? '').trim() || 'cancelled';
          const appointmentTime = formatDateTime(appointment.appointmentDate ?? appointment.AppointmentDate, appointment.appointmentTime ?? appointment.AppointmentTime);
          const studentName = String(appointment.studentName ?? appointment.StudentName ?? 'Student').trim() || 'Student';
          const reason = String(appointment.cancellationReason ?? appointment.CancellationReason ?? '').trim();
          const cancelledAt = parseDateMillis(appointment.cancellationDate ?? appointment.CancellationDate);
          items.push({
            id: `appt-cancel-${appointmentId}`,
            type: 'warning',
            title: 'Appointment Cancelled',
            message: `${studentName} cancelled their appointment on ${appointmentTime}.`,
            time: appointmentTime,
            read: false,
            createdAt: cancelledAt ?? getAppointmentSortTimestamp(appointment),
            action: { kind: 'calendar', tab: 'cancelled' },
          });
        });

        const storedReadIds = loadReadIds(readStateKey);
        setNotifications((prev) => mergeReadState(prev, items, storedReadIds));
        return;
      }

      if (shouldShowLoading) {
        setNotifications([]);
      }
    } catch (err) {
      if (shouldShowLoading) {
        setLoadError(err instanceof Error ? err.message : 'Unable to load notifications.');
        setNotifications([]);
      }
    } finally {
      if (shouldShowLoading) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    loadNotifications();

    const handleAppointmentsRefresh = () => {
      loadNotifications();
    };

    const intervalMs = (userRole === 'adviser' || userRole === 'chairman')
      ? 10 * 1000
      : 60 * 60 * 1000;
    const interval = window.setInterval(() => {
      loadNotifications();
    }, intervalMs);

    window.addEventListener('appointments:refresh', handleAppointmentsRefresh);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('appointments:refresh', handleAppointmentsRefresh);
    };
  }, [userRole]);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      return;
    }

    let isActive = true;
    let retryDelay = 1000;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let controller: AbortController | null = null;

    const scheduleReconnect = () => {
      if (!isActive) {
        return;
      }
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
      reconnectTimer = setTimeout(() => {
        retryDelay = Math.min(retryDelay * 2, 30000);
        connect();
      }, retryDelay);
    };

    const handleStreamEvent = (eventName: string, data: string) => {
      if (eventName !== 'notification') {
        return;
      }

      try {
        JSON.parse(data) as StreamNotificationPayload;
      } catch {
        return;
      }

      loadNotifications();
      window.dispatchEvent(new Event('appointments:refresh'));
    };

    const connect = async () => {
      if (!isActive) {
        return;
      }

      controller?.abort();
      controller = new AbortController();

      try {
        const response = await fetchWithApiFallback('/notifications/stream', {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'text/event-stream',
          },
          signal: controller.signal,
        });

        if (!response.ok || !response.body) {
          scheduleReconnect();
          return;
        }

        retryDelay = 1000;
        await consumeEventStream(response.body, handleStreamEvent);
        scheduleReconnect();
      } catch {
        scheduleReconnect();
      }
    };

    connect();

    return () => {
      isActive = false;
      controller?.abort();
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
    };
  }, [userRole]);


  const markAsRead = (id: string) => {
    setNotifications((prev) => prev.map(n => 
      n.id === id ? { ...n, read: true } : n
    ));
    updateReadIds((ids) => ids.add(id));
  };

  const markAllAsRead = () => {
    setNotifications((prev) => {
      const next = prev.map(n => ({ ...n, read: true }));
      updateReadIds((ids) => {
        next.forEach((item) => ids.add(item.id));
      });
      return next;
    });
  };

  const deleteNotification = (id: string) => {
    setNotifications((prev) => prev.filter(n => n.id !== id));
    updateReadIds((ids) => ids.delete(id));
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.action) {
      return;
    }

    if (!notification.read) {
      markAsRead(notification.id);
    }

    if (notification.action.kind === 'student-booking') {
      onStudentBooking?.();
      setIsOpen(false);
      return;
    }

    if (notification.action.kind === 'student-appointment') {
      onStudentAppointmentOpen?.({
        appointmentId: notification.action.appointmentId,
        appointmentDate: notification.action.appointmentDate,
        appointmentTime: notification.action.appointmentTime,
      });
      setIsOpen(false);
      return;
    }

    if (notification.action.kind === 'calendar') {
      onCalendarNavigate?.(notification.action.tab);
      setIsOpen(false);
      return;
    }

    if (notification.action.kind === 'students') {
      onStudentsNavigate?.();
      setIsOpen(false);
    }
  };

  const unreadCount = useMemo(() => notifications.filter(n => !n.read).length, [notifications]);

  function mergeReadState(current: Notification[], next: Notification[], storedReadIds: Set<string>): Notification[] {
    const readMap = new Map(current.map((item) => [item.id, item.read]));
    const merged = next.map((item) => ({
      ...item,
      read: storedReadIds.has(item.id) || readMap.get(item.id) || item.read,
    }));
    return sortNotifications(merged);
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-orange-600" />;
      case 'success':
        return <Check className="h-5 w-5 text-green-600" />;
      case 'info':
      default:
        return <BookOpen className="h-5 w-5 text-blue-600" />;
    }
  };

  return (
    <div className="relative">
      <Button 
        variant="ghost" 
        size="sm" 
        className="relative"
        onClick={() => {
          setIsOpen((prev) => {
            const next = !prev;
            if (next) {
              loadNotifications();
            }
            return next;
          });
        }}
      >
        <Bell className="h-5 w-5 text-gray-600" />
        {unreadCount > 0 && (
          <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-gradient-to-r from-green-600 to-yellow-500">
            {unreadCount}
          </Badge>
        )}
      </Button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-12 z-50 w-96 max-h-[600px] overflow-hidden">
            <Card className="shadow-xl border-green-200">
              <CardHeader className="bg-gradient-to-r from-green-50 to-yellow-50 border-b border-green-200">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-green-900">Notifications</CardTitle>
                    <CardDescription>{unreadCount} unread notifications</CardDescription>
                  </div>
                  {unreadCount > 0 && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={markAllAsRead}
                      className="text-green-700 hover:text-green-900 hover:bg-green-100"
                    >
                      Mark all read
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-0 max-h-[500px] overflow-y-auto">
                {isLoading ? (
                  <div className="text-center py-8 text-gray-500">
                    <p>Loading notifications...</p>
                  </div>
                ) : loadError ? (
                  <div className="text-center py-8 text-red-600 text-sm">
                    <p>{loadError}</p>
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Bell className="h-12 w-12 mx-auto mb-2 opacity-30" />
                    <p>No notifications</p>
                  </div>
                ) : (
                  <div>
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        onClick={() => handleNotificationClick(notification)}
                        className={`border-b border-gray-100 p-4 hover:bg-gray-50 transition-colors ${
                          !notification.read ? 'bg-green-50/30' : ''
                        } ${notification.action ? 'cursor-pointer' : ''}`}
                      >
                        <div className="flex gap-3">
                          <div className="flex-shrink-0 mt-1">
                            {getIcon(notification.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <h4 className={`text-sm font-semibold ${!notification.read ? 'text-green-900' : 'text-gray-900'}`}>
                                {notification.title}
                              </h4>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  deleteNotification(notification.id);
                                }}
                                className="h-6 w-6 p-0 hover:bg-red-100"
                              >
                                <X className="h-3 w-3 text-gray-500" />
                              </Button>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-xs text-gray-500">{notification.time}</span>
                              {!notification.read && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    markAsRead(notification.id);
                                  }}
                                  className="h-6 px-2 text-xs text-green-700 hover:text-green-900 hover:bg-green-100"
                                >
                                  Mark as read
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}