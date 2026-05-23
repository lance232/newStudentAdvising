import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { AlertCircle, User, Mail, RefreshCcw, Clock, MapPin } from 'lucide-react';
import { Calendar } from './ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { Input } from './ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';

interface StudentAppointmentBookingProps {
  onBack: () => void;
  onBooked?: () => void;
  initialTab?: 'book' | 'appointments';
  showInternalTabs?: boolean;
}

interface AssignedAdviserRow {
  adviserId?: number | string | null;
  AdviserId?: number | string | null;
  fullName?: string | null;
  FullName?: string | null;
  username?: string | null;
  Username?: string | null;
  email?: string | null;
  Email?: string | null;
}

interface AvailabilityRow {
  adviserId?: number | string | null;
  AdviserId?: number | string | null;
  dayOfWeek?: string | null;
  DayOfWeek?: string | null;
  startTime?: string | null;
  StartTime?: string | null;
  endTime?: string | null;
  EndTime?: string | null;
  location?: string | null;
  Location?: string | null;
  sessionMinutes?: number | string | null;
  SessionMinutes?: number | string | null;
  slots?: unknown;
  Slots?: unknown;
}

type SlotOption = {
  value: string;
  label: string;
  sortMinutes: number;
};

interface DashboardPayload {
  yearLevelName?: string | null;
  YearLevelName?: string | null;
  semesterId?: number | string | null;
  SemesterId?: number | string | null;
  currentSemesterId?: number | string | null;
  CurrentSemesterId?: number | string | null;
  enrollments?: Array<{ semesterId?: number | string | null; SemesterId?: number | string | null }>;
  Enrollments?: Array<{ semesterId?: number | string | null; SemesterId?: number | string | null }>;
}

interface SemesterRow {
  SemesterId?: number | string | null;
  Name?: string | null;
  IsCurrent?: boolean | null;
  IsActive?: boolean | null;
  StartDate?: string | null;
  EndDate?: string | null;
}

interface StudentAppointmentRow {
  appointmentId?: number | string | null;
  AppointmentId?: number | string | null;
  studentId?: number | string | null;
  StudentId?: number | string | null;
  adviserId?: number | string | null;
  AdviserId?: number | string | null;
  semesterId?: number | string | null;
  SemesterId?: number | string | null;
  appointmentType?: string | null;
  AppointmentType?: string | null;
  appointmentDate?: string | null;
  AppointmentDate?: string | null;
  appointmentTime?: string | null;
  AppointmentTime?: string | null;
  status?: string | null;
  Status?: string | null;
  notes?: string | null;
  Notes?: string | null;
  cancellationReason?: string | null;
  CancellationReason?: string | null;
}

const SEMESTER_ENDPOINTS = ['/Semesters/current', '/Semesters/active', '/Semesters'];
const STUDENT_OPEN_APPOINTMENT_KEY = 'student_open_appointment';

const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ?? 'https://localhost:53005/api';

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

  throw new Error('Unable to reach assigned advisers endpoint.');
}

async function fetchWithRouteCandidates(paths: string[], init?: RequestInit): Promise<Response> {
  let lastResponse: Response | null = null;

  for (const path of paths) {
    const response = await fetchWithApiFallback(path, init);
    if (response.status !== 404) {
      return response;
    }
    lastResponse = response;
  }

  if (lastResponse) {
    return lastResponse;
  }

  throw new Error('Unable to reach appointment endpoint.');
}

function getAuthToken(): string | null {
  const rawToken = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
  if (!rawToken) {
    return null;
  }

  return rawToken.replace(/^Bearer\s+/i, '').trim();
}

function getAuthStorage(): Storage {
  if (sessionStorage.getItem('auth_token')) {
    return sessionStorage;
  }
  return localStorage;
}

function getErrorMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== 'object') {
    return fallback;
  }

  const data = payload as {
    message?: string;
    error?: string;
    title?: string;
    errors?: Record<string, unknown>;
  };

  if (data.errors && typeof data.errors === 'object') {
    const allMessages = Object.values(data.errors)
      .flatMap((value) => (Array.isArray(value) ? value : [value]))
      .map((value) => String(value ?? '').trim())
      .filter((value) => value.length > 0);
    if (allMessages.length > 0) {
      return allMessages[0];
    }
  }

  return data.message || data.error || data.title || fallback;
}

function getHttpStatusMessage(status: number, payload: unknown, fallback: string): string {
  const backendMessage = getErrorMessage(payload, '');
  if (backendMessage) {
    return backendMessage;
  }

  if (status === 400) {
    return 'The booking request is invalid. Please check the required fields and try again.';
  }
  if (status === 404) {
    return 'Appointment booking endpoint was not found. Please verify backend routes.';
  }
  if (status >= 500) {
    return 'Backend server error while saving appointment. Please try again shortly.';
  }
  return fallback;
}

function getDirectBackendMessage(payload: unknown, status: number, fallback: string): string {
  const backendMessage = getErrorMessage(payload, '');
  if (backendMessage) {
    return backendMessage;
  }

  if (fallback.trim()) {
    return fallback;
  }

  return `Request failed with status ${status}.`;
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
    if (Array.isArray(record.availabilities)) {
      return record.availabilities as T[];
    }
    if (Array.isArray(record.Availabilities)) {
      return record.Availabilities as T[];
    }
  }

  return [];
}

function normalizeDay(dayValue: string): string {
  const day = dayValue.trim().toLowerCase();
  if (day === 'mon') return 'Monday';
  if (day === 'tue' || day === 'tues') return 'Tuesday';
  if (day === 'wed') return 'Wednesday';
  if (day === 'thu' || day === 'thur' || day === 'thurs') return 'Thursday';
  if (day === 'fri') return 'Friday';
  if (day === 'sat') return 'Saturday';
  if (day === 'sun') return 'Sunday';
  return dayValue.trim();
}

function isMondayToSaturday(dayValue: string): boolean {
  const normalized = normalizeDay(dayValue).toLowerCase();
  return normalized !== 'sunday';
}

function normalizeTimeValue(rawTime: string): string {
  const minutes = parseTimeToMinutes(rawTime);
  if (minutes < 0) {
    return String(rawTime ?? '').trim();
  }

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

function formatStandardTime(rawTime: string): string {
  const minutes = parseTimeToMinutes(rawTime);
  if (minutes < 0) {
    return String(rawTime ?? '').trim();
  }

  const hours24 = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const period = hours24 >= 12 ? 'pm' : 'am';
  const hours12 = hours24 % 12 || 12;
  return `${hours12}:${String(mins).padStart(2, '0')} ${period}`;
}

function normalizeSlots(rawSlots: unknown): SlotOption[] {
  if (!Array.isArray(rawSlots)) {
    return [];
  }

  const slots = rawSlots
    .map((slot) => {
      if (typeof slot === 'string') {
        const text = slot.trim();
        if (!text) {
          return null;
        }

        const parts = text.split('-').map((part) => part.trim()).filter(Boolean);
        if (parts.length >= 2) {
          return parseSlotOptionFromTimes(parts[0], parts[1]);
        }

        return parseSlotOptionFromTimes(text, '');
      }

      if (slot && typeof slot === 'object') {
        const record = slot as Record<string, unknown>;
        const direct = String(record.slot ?? record.Slot ?? record.time ?? record.Time ?? record.label ?? record.Label ?? '').trim();
        if (direct) {
          const parts = direct.split('-').map((part) => part.trim()).filter(Boolean);
          if (parts.length >= 2) {
            return parseSlotOptionFromTimes(parts[0], parts[1]);
          }

          return parseSlotOptionFromTimes(direct, '');
        }

        const start = String(record.startTime ?? record.StartTime ?? '').trim();
        const end = String(record.endTime ?? record.EndTime ?? '').trim();
        if (start || end) {
          return parseSlotOptionFromTimes(start, end);
        }
      }

      return null;
    })
    .filter((slot): slot is SlotOption => Boolean(slot));

  const unique = new Map<string, SlotOption>();
  slots.forEach((slot) => {
    if (!unique.has(slot.value)) {
      unique.set(slot.value, slot);
    }
  });

  return Array.from(unique.values());
}

function parseSlotOptionFromTimes(startTime: string, endTime: string): SlotOption | null {
  const start = String(startTime ?? '').trim();
  const end = String(endTime ?? '').trim();
  if (!start) {
    return null;
  }

  const startMinutes = parseTimeToMinutes(start);
  const endMinutes = parseTimeToMinutes(end);

  return {
    value: normalizeTimeValue(start),
    label: end ? `${formatStandardTime(start)} - ${formatStandardTime(end)}` : formatStandardTime(start),
    sortMinutes: startMinutes >= 0 ? startMinutes : endMinutes,
  };
}

function parseSessionMinutes(row: AvailabilityRow): number {
  const raw = row.sessionMinutes ?? row.SessionMinutes;
  const value = Number(raw);
  if (Number.isFinite(value) && value > 0) {
    return value;
  }
  return 30;
}

const DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function sortMondayToSaturday(days: string[]): string[] {
  return [...days].sort((a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b));
}

function formatDateValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDayNameFromDate(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'long' });
}

function isDateSelectable(date: Date, availableDays: string[]): boolean {
  const dayName = getDayNameFromDate(date);
  return date.getDay() !== 0 && availableDays.includes(dayName);
}

function findNextAvailableDate(availableDays: string[]): Date | undefined {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  for (let i = 0; i < 60; i += 1) {
    const candidate = new Date(start);
    candidate.setDate(start.getDate() + i);
    if (isDateSelectable(candidate, availableDays)) {
      return candidate;
    }
  }

  return undefined;
}

function extractStartTime(slot: string): string {
  const parts = slot.split('-').map((part) => part.trim()).filter(Boolean);
  return parts[0] ?? slot.trim();
}

function parseTimeToMinutes(time: string): number {
  const text = String(time ?? '').trim();
  if (!text) {
    return -1;
  }

  const match = text.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(am|pm)?$/i);
  if (!match) {
    return -1;
  }

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const meridian = match[3]?.toLowerCase();
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return -1;
  }

  if (meridian === 'pm' && hours < 12) {
    hours += 12;
  }

  if (meridian === 'am' && hours === 12) {
    hours = 0;
  }

  return hours * 60 + minutes;
}

function formatAppointmentDateTime(dateRaw: unknown, timeRaw: unknown): string {
  const dateText = String(dateRaw ?? '').trim();
  const timeText = String(timeRaw ?? '').trim();
  if (!dateText && !timeText) {
    return 'Not Set';
  }

  const datePart = dateText ? dateText.split('T')[0] : '';
  const combined = datePart && timeText ? `${datePart}T${timeText}` : dateText;
  const parsed = new Date(combined);
  if (Number.isNaN(parsed.getTime())) {
    return `${datePart || dateText} ${timeText}`.trim() || 'Not Set';
  }

  const formattedDate = parsed.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  const formattedTime = parsed.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  return `${formattedDate} ${formattedTime}`;
}

function normalizeAppointmentDate(value: unknown): string {
  const text = String(value ?? '').trim();
  if (!text) {
    return '';
  }
  return text.split('T')[0];
}

function normalizeAppointmentTime(value: unknown): string {
  const raw = String(value ?? '').trim();
  if (!raw) {
    return '';
  }
  return normalizeTimeValue(extractStartTime(raw));
}

function tryParseAppointmentPayload(raw: string): {
  appointmentId?: string;
  appointmentDate?: string;
  appointmentTime?: string;
} {
  try {
    const parsed = JSON.parse(raw) as {
      appointmentId?: string;
      appointmentDate?: string;
      appointmentTime?: string;
    };
    if (parsed && typeof parsed === 'object') {
      return parsed;
    }
  } catch {
    // ignore
  }
  return { appointmentId: raw };
}

function resolveSemesterId(dashboard: DashboardPayload | null): string {
  const topLevel = String(
    dashboard?.semesterId
      ?? dashboard?.SemesterId
      ?? dashboard?.currentSemesterId
      ?? dashboard?.CurrentSemesterId
      ?? '',
  ).trim();

  if (topLevel) {
    return topLevel;
  }

  const enrollments = dashboard?.enrollments ?? dashboard?.Enrollments ?? [];
  for (const enrollment of enrollments) {
    const value = String(enrollment?.semesterId ?? enrollment?.SemesterId ?? '').trim();
    if (value) {
      return value;
    }
  }

  return '';
}

function parseDateValue(input: unknown): number | null {
  const value = String(input ?? '').trim();
  if (!value) {
    return null;
  }
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? null : time;
}

function getSemesterRowsPayload(payload: unknown): SemesterRow[] {
  if (Array.isArray(payload)) {
    return payload as SemesterRow[];
  }

  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>;

    if (record.SemesterId != null) {
      return [record as SemesterRow];
    }

    if (Array.isArray(record.data)) {
      return record.data as SemesterRow[];
    }
    if (record.data && typeof record.data === 'object' && (record.data as Record<string, unknown>).SemesterId != null) {
      return [record.data as SemesterRow];
    }

    if (Array.isArray(record.items)) {
      return record.items as SemesterRow[];
    }
    if (record.items && typeof record.items === 'object' && (record.items as Record<string, unknown>).SemesterId != null) {
      return [record.items as SemesterRow];
    }
  }

  return [];
}

function pickSemesterId(rows: SemesterRow[]): string {
  if (rows.length === 0) {
    return '';
  }

  const directCurrent = rows.find((row) => Boolean(row.IsCurrent));
  if (directCurrent) {
    return String(directCurrent.SemesterId ?? '').trim();
  }

  const directActive = rows.find((row) => Boolean(row.IsActive));
  if (directActive) {
    return String(directActive.SemesterId ?? '').trim();
  }

  const now = Date.now();
  const byDateRange = rows.find((row) => {
    const start = parseDateValue(row.StartDate);
    const end = parseDateValue(row.EndDate);
    if (start === null || end === null) {
      return false;
    }
    return start <= now && now <= end;
  });
  if (byDateRange) {
    return String(byDateRange.SemesterId ?? '').trim();
  }

  const firstWithId = rows.find((row) => String(row.SemesterId ?? '').trim().length > 0);
  if (firstWithId) {
    return String(firstWithId.SemesterId ?? '').trim();
  }

  return '';
}

async function resolveSemesterIdFromApi(headers: Record<string, string>): Promise<{ semesterId: string; errorMessage: string }> {
  let firstBackendMessage = '';

  for (const path of SEMESTER_ENDPOINTS) {
    const response = await fetchWithApiFallback(path, { headers });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      const message = getErrorMessage(payload, response.statusText || `Semester request failed (${response.status}).`);
      if (message && !firstBackendMessage) {
        firstBackendMessage = message;
      }
      continue;
    }

    const rows = getSemesterRowsPayload(payload);
    const semesterId = pickSemesterId(rows);
    if (semesterId) {
      return { semesterId, errorMessage: '' };
    }

    const message = getErrorMessage(payload, '');
    if (message && !firstBackendMessage) {
      firstBackendMessage = message;
    }
  }

  return {
    semesterId: '',
    errorMessage: firstBackendMessage || 'No semester was returned by the backend.',
  };
}

export function StudentAppointmentBooking({
  onBack,
  onBooked,
  initialTab = 'book',
  showInternalTabs = true,
}: StudentAppointmentBookingProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');
  const [activeTab, setActiveTab] = useState<'book' | 'appointments'>(initialTab);
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);
  const [appointmentsTab, setAppointmentsTab] = useState<'upcoming' | 'cancelled'>('upcoming');
  const [assignedAdvisers, setAssignedAdvisers] = useState<AssignedAdviserRow[]>([]);
  const [availabilities, setAvailabilities] = useState<AvailabilityRow[]>([]);
  const [dashboard, setDashboard] = useState<DashboardPayload | null>(null);
  const [selectedAdviserId, setSelectedAdviserId] = useState('');
  const [selectedDay, setSelectedDay] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [appointmentType, setAppointmentType] = useState('');
  const [notes, setNotes] = useState('');
  const [resolvedSemesterId, setResolvedSemesterId] = useState('');
  const [studentAppointments, setStudentAppointments] = useState<StudentAppointmentRow[]>([]);
  const [allAppointments, setAllAppointments] = useState<StudentAppointmentRow[]>([]);
  const [activeCancelId, setActiveCancelId] = useState('');
  const [cancelReasonText, setCancelReasonText] = useState('');
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<StudentAppointmentRow | null>(null);
  const [hasLoadedAppointments, setHasLoadedAppointments] = useState(false);

  const loadBookingData = async () => {
    setIsLoading(true);
    setLoadError('');

    try {
      const token = getAuthToken();
      const headers = {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      const [adviserResponse, availabilityResponse, dashboardResponse] = await Promise.all([
        fetchWithApiFallback('/Students/me/assigned-advisers', { headers }),
        fetchWithApiFallback('/Students/me/adviser-availabilities', { headers }),
        fetchWithApiFallback('/Students/me/dashboard', { headers }),
      ]);

      const adviserPayload = await adviserResponse.json().catch(() => ([]));
      if (!adviserResponse.ok) {
        throw new Error(getErrorMessage(adviserPayload, 'Unable to load assigned advisers.'));
      }
      const adviserRows = getArrayPayload<AssignedAdviserRow>(adviserPayload);
      setAssignedAdvisers(adviserRows);

      const availabilityPayload = await availabilityResponse.json().catch(() => ([]));
      if (!availabilityResponse.ok) {
        throw new Error(getErrorMessage(availabilityPayload, 'Unable to load adviser availabilities.'));
      }
      const availabilityRows = getArrayPayload<AvailabilityRow>(availabilityPayload).filter((row) => {
        const day = String(row.dayOfWeek ?? row.DayOfWeek ?? '').trim();
        return day ? isMondayToSaturday(day) : false;
      });
      setAvailabilities(availabilityRows);

      const dashboardPayload = await dashboardResponse.json().catch(() => ({}));
      if (!dashboardResponse.ok) {
        throw new Error(getErrorMessage(dashboardPayload, 'Unable to load student dashboard.'));
      }
      const normalizedDashboard = dashboardPayload as DashboardPayload;
      setDashboard(normalizedDashboard);

      const selectedStudentId = String(
        normalizedDashboard.studentId
        ?? normalizedDashboard.StudentId
        ?? '',
      ).trim();

      const appointmentsResponse = await fetchWithApiFallback('/Appointments', { headers });
      const appointmentsPayload = await appointmentsResponse.json().catch(() => ([]));
      if (appointmentsResponse.ok) {
        const appointmentRows = getArrayPayload<StudentAppointmentRow>(appointmentsPayload);
        const filteredAppointments = appointmentRows.filter((row) => {
          const rowStudentId = String(row.studentId ?? row.StudentId ?? '').trim();
          return selectedStudentId.length > 0 && rowStudentId === selectedStudentId;
        });
        setStudentAppointments(filteredAppointments);
        setAllAppointments(appointmentRows);
      } else {
        setStudentAppointments([]);
        setAllAppointments([]);
      }

      let semesterIdFromContext = resolveSemesterId(normalizedDashboard);
      if (!semesterIdFromContext) {
        const resolved = await resolveSemesterIdFromApi(headers);
        semesterIdFromContext = resolved.semesterId;
      }
      setResolvedSemesterId(semesterIdFromContext);

      if (adviserRows.length > 0) {
        const firstId = String(adviserRows[0]?.adviserId ?? adviserRows[0]?.AdviserId ?? '').trim();
        setSelectedAdviserId(firstId);
      } else {
        setSelectedAdviserId('');
      }
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Unable to load booking data.');
      setAssignedAdvisers([]);
      setAvailabilities([]);
      setDashboard(null);
      setSelectedAdviserId('');
      setResolvedSemesterId('');
      setStudentAppointments([]);
      setAllAppointments([]);
    } finally {
      setIsLoading(false);
      setHasLoadedAppointments(true);
    }
  };

  useEffect(() => {
    loadBookingData();
  }, []);

  useEffect(() => {
    const handleAppointmentsRefresh = () => {
      loadBookingData();
    };

    window.addEventListener('appointments:refresh', handleAppointmentsRefresh);
    return () => {
      window.removeEventListener('appointments:refresh', handleAppointmentsRefresh);
    };
  }, []);

  useEffect(() => {
    if (isLoading || !hasLoadedAppointments) {
      return;
    }

    const consumeStoredAppointmentOpen = () => {
      const storage = getAuthStorage();
      const rawPayload = storage.getItem(STUDENT_OPEN_APPOINTMENT_KEY);
      if (!rawPayload) {
        return;
      }

      const payload = tryParseAppointmentPayload(rawPayload);
      const trimmedId = String(payload.appointmentId ?? '').trim();
      const matchDate = normalizeAppointmentDate(payload.appointmentDate);
      const matchTime = normalizeAppointmentTime(payload.appointmentTime);

      if (!trimmedId && !matchDate && !matchTime) {
        storage.removeItem(STUDENT_OPEN_APPOINTMENT_KEY);
        return;
      }

      let target = studentAppointments.find((row) => (
        String(row.appointmentId ?? row.AppointmentId ?? '').trim() === trimmedId
      )) ?? null;

      if (!target && (matchDate || matchTime)) {
        target = studentAppointments.find((row) => {
          const rowDate = normalizeAppointmentDate(row.appointmentDate ?? row.AppointmentDate);
          const rowTime = normalizeAppointmentTime(row.appointmentTime ?? row.AppointmentTime);
          if (matchDate && matchTime) {
            return rowDate === matchDate && rowTime === matchTime;
          }
          return matchDate ? rowDate === matchDate : rowTime === matchTime;
        }) ?? null;
      }

      if (target) {
        setActiveTab('appointments');
        setAppointmentsTab('upcoming');
        setSelectedAppointment(target);
        setDetailOpen(true);
      }

      storage.removeItem(STUDENT_OPEN_APPOINTMENT_KEY);
    };

    consumeStoredAppointmentOpen();

    const handleOpenEvent = () => {
      consumeStoredAppointmentOpen();
    };

    window.addEventListener('student-appointment:open', handleOpenEvent);
    return () => {
      window.removeEventListener('student-appointment:open', handleOpenEvent);
    };
  }, [isLoading, hasLoadedAppointments, studentAppointments]);

  const selectedAdviser = useMemo(() => {
    return assignedAdvisers.find((a) => String(a.adviserId ?? a.AdviserId ?? '').trim() === selectedAdviserId) ?? null;
  }, [assignedAdvisers, selectedAdviserId]);

  const adviserAvailabilities = useMemo(() => {
    return availabilities.filter((row) => String(row.adviserId ?? row.AdviserId ?? '').trim() === selectedAdviserId);
  }, [availabilities, selectedAdviserId]);

  const availableDays = useMemo(() => {
    const uniqueDays = Array.from(
      new Set(
        adviserAvailabilities
          .map((row) => String(row.dayOfWeek ?? row.DayOfWeek ?? '').trim())
          .filter((day) => day.length > 0)
          .map((day) => normalizeDay(day)),
      ),
    );
    return sortMondayToSaturday(uniqueDays.filter((day) => DAY_ORDER.includes(day)));
  }, [adviserAvailabilities]);

  useEffect(() => {
    if (availableDays.length === 0) {
      setSelectedDay('');
      setSelectedDate(undefined);
      setSelectedSlot('');
      return;
    }
    setSelectedDate((prev) => {
      const next = prev && isDateSelectable(prev, availableDays) ? prev : findNextAvailableDate(availableDays);
      setSelectedDay(next ? getDayNameFromDate(next) : '');
      if (!next) {
        setSelectedSlot('');
      }
      return next;
    });
  }, [availableDays, selectedDay]);

  useEffect(() => {
    if (!selectedDate) {
      setSelectedDay('');
      setSelectedSlot('');
      return;
    }
    const dayName = getDayNameFromDate(selectedDate);
    if (dayName !== selectedDay) {
      setSelectedDay(dayName);
      setSelectedSlot('');
    }
  }, [selectedDate, selectedDay]);

  const selectedDayAvailabilities = useMemo(() => {
    return adviserAvailabilities.filter((row) => normalizeDay(String(row.dayOfWeek ?? row.DayOfWeek ?? '')) === selectedDay);
  }, [adviserAvailabilities, selectedDay]);

  const bookedSlotTimes = useMemo(() => {
    if (!selectedDate || !selectedAdviserId) {
      return new Set<string>();
    }

    const selectedDateValue = formatDateValue(selectedDate);
    const booked = new Set<string>();
    allAppointments.forEach((row) => {
      const adviserId = String(row.adviserId ?? row.AdviserId ?? '').trim();
      if (!adviserId || adviserId !== selectedAdviserId) {
        return;
      }

      const status = String(row.status ?? row.Status ?? '').trim().toLowerCase();
      if (status.includes('cancel')) {
        return;
      }

      const isBlockedStatus = !status
        || status.includes('upcoming')
        || status.includes('complete')
        || status.includes('appeared')
        || status.includes('no-show');
      if (!isBlockedStatus) {
        return;
      }

      const appointmentDate = normalizeAppointmentDate(row.appointmentDate ?? row.AppointmentDate);
      if (!appointmentDate || appointmentDate !== selectedDateValue) {
        return;
      }

      const appointmentTime = normalizeAppointmentTime(row.appointmentTime ?? row.AppointmentTime);
      if (appointmentTime) {
        booked.add(appointmentTime);
      }
    });

    return booked;
  }, [allAppointments, selectedAdviserId, selectedDate]);

  const selectableSlots = useMemo(() => {
    const slots = selectedDayAvailabilities.flatMap((row) => {
      const normalizedSlots = normalizeSlots(row.slots ?? row.Slots);
      if (normalizedSlots.length > 0) {
        return normalizedSlots;
      }

      const startTime = String(row.startTime ?? row.StartTime ?? '').trim();
      const endTime = String(row.endTime ?? row.EndTime ?? '').trim();
      if (startTime) {
        return [parseSlotOptionFromTimes(startTime, endTime)];
      }

      return [];
    }).filter((slot): slot is SlotOption => Boolean(slot));

    const unique = new Map<string, SlotOption>();
    slots.forEach((slot) => {
      if (!unique.has(slot.value)) {
        unique.set(slot.value, slot);
      }
    });

    return Array.from(unique.values())
      .filter((slot) => !bookedSlotTimes.has(slot.value))
      .sort((left, right) => left.sortMinutes - right.sortMinutes);
  }, [selectedDayAvailabilities, bookedSlotTimes]);

  useEffect(() => {
    if (selectableSlots.length === 0) {
      setSelectedSlot('');
      return;
    }

    if (!selectableSlots.some((slot) => slot.value === selectedSlot)) {
      setSelectedSlot(selectableSlots[0].value);
    }
  }, [selectableSlots, selectedSlot]);

  const selectedLocation = String(
    selectedDayAvailabilities.find((row) => String(row.location ?? row.Location ?? '').trim().length > 0)?.location
      ?? selectedDayAvailabilities.find((row) => String(row.location ?? row.Location ?? '').trim().length > 0)?.Location
      ?? selectedDayAvailabilities[0]?.location
      ?? selectedDayAvailabilities[0]?.Location
      ?? '',
  ).trim();
  const selectedSessionMinutes = selectedDayAvailabilities.length > 0 ? parseSessionMinutes(selectedDayAvailabilities[0]) : 30;
  const yearLevelName = String(dashboard?.yearLevelName ?? dashboard?.YearLevelName ?? '').trim();

  const canSubmit = selectedAdviserId.length > 0 && Boolean(selectedDate) && selectedSlot.length > 0 && appointmentType.trim().length > 0;

  const sortedAppointments = useMemo(() => {
    return [...studentAppointments].sort((a, b) => {
      const aDate = String(a.appointmentDate ?? a.AppointmentDate ?? '').trim();
      const aTime = String(a.appointmentTime ?? a.AppointmentTime ?? '').trim();
      const bDate = String(b.appointmentDate ?? b.AppointmentDate ?? '').trim();
      const bTime = String(b.appointmentTime ?? b.AppointmentTime ?? '').trim();

      const aValue = new Date(aDate && aTime ? `${aDate.split('T')[0]}T${aTime}` : aDate).getTime();
      const bValue = new Date(bDate && bTime ? `${bDate.split('T')[0]}T${bTime}` : bDate).getTime();

      if (Number.isNaN(aValue) && Number.isNaN(bValue)) {
        return 0;
      }
      if (Number.isNaN(aValue)) {
        return 1;
      }
      if (Number.isNaN(bValue)) {
        return -1;
      }
      return bValue - aValue;
    });
  }, [studentAppointments]);

  const upcomingStudentAppointments = useMemo(() => {
    return sortedAppointments.filter((row) => {
      const status = String(row.status ?? row.Status ?? '').trim().toLowerCase();
      return status.includes('upcoming');
    });
  }, [sortedAppointments]);

  const cancelledStudentAppointments = useMemo(() => {
    return sortedAppointments.filter((row) => {
      const status = String(row.status ?? row.Status ?? '').trim().toLowerCase();
      return status.includes('cancel');
    });
  }, [sortedAppointments]);

  const handleStudentCancelAppointment = async (appointmentId: string) => {
    setSubmitError('');
    setSubmitSuccess('');

    const reason = cancelReasonText.trim();
    if (!reason) {
      setSubmitError('Please provide cancellation reason before submitting.');
      return;
    }

    const token = getAuthToken();
    if (!token) {
      setSubmitError('You are not authenticated. Please login again and retry cancellation.');
      return;
    }

    const base = studentAppointments.find((row) => String(row.appointmentId ?? row.AppointmentId ?? '').trim() === appointmentId);
    if (!base) {
      setSubmitError('Unable to find appointment to cancel. Please refresh and try again.');
      return;
    }

    setIsSubmitting(true);
    try {
      const body = {
        StudentId: String(base.studentId ?? base.StudentId ?? '').trim() || undefined,
        AdviserId: String(base.adviserId ?? base.AdviserId ?? '').trim() || undefined,
        SemesterId: String(base.semesterId ?? base.SemesterId ?? '').trim() || undefined,
        AppointmentType: String(base.appointmentType ?? base.AppointmentType ?? '').trim(),
        AppointmentDate: String(base.appointmentDate ?? base.AppointmentDate ?? '').trim(),
        AppointmentTime: String(base.appointmentTime ?? base.AppointmentTime ?? '').trim(),
        Status: 'Cancelled',
        CancellationReason: reason,
        CancellationDate: new Date().toISOString(),
      };

      const response = await fetchWithApiFallback(`/Appointments/${appointmentId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(getDirectBackendMessage(payload, response.status, 'Unable to cancel appointment.'));
      }

      setSubmitSuccess('Appointment cancelled successfully.');
      setActiveCancelId('');
      setCancelReasonText('');
      await loadBookingData();
      window.dispatchEvent(new Event('appointments:refresh'));
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Unable to cancel appointment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openAppointmentDetails = (item: StudentAppointmentRow) => {
    setSelectedAppointment(item);
    setDetailOpen(true);
  };

  const handleBookAppointment = async () => {
    setSubmitError('');
    setSubmitSuccess('');

    if (!canSubmit) {
      setSubmitError('Please select adviser, day, time slot, and appointment reason before booking.');
      return;
    }

    const token = getAuthToken();
    if (!token) {
      setSubmitError('You are not authenticated. Please login again and retry booking.');
      return;
    }

    if (!selectedDate) {
      setSubmitError('Please select an appointment date before booking.');
      return;
    }

    const appointmentDate = formatDateValue(selectedDate);

    setIsSubmitting(true);

    try {
      let semesterId = resolvedSemesterId;
      if (!semesterId) {
        const resolved = await resolveSemesterIdFromApi({ Authorization: `Bearer ${token}` });
        if (resolved.semesterId) {
          semesterId = resolved.semesterId;
          setResolvedSemesterId(resolved.semesterId);
        } else {
          semesterId = '0';
          if (resolved.errorMessage) {
            setSubmitError(resolved.errorMessage);
          }
        }
      }

      const appointmentTime = selectedSlot;
      const body = {
        AdviserId: selectedAdviserId,
        SemesterId: semesterId,
        AppointmentType: appointmentType.trim(),
        AppointmentDate: appointmentDate,
        AppointmentTime: appointmentTime,
        Status: 'Upcoming',
        Notes: notes.trim() || undefined,
        CancellationReason: notes.trim() || undefined,
      };

      const response = await fetchWithRouteCandidates(
        [
          '/Appointments',
          '/appointments',
          '/Appointments/create',
          '/appointments/create',
          '/Appointments/book',
          '/appointments/book',
        ],
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        },
      );

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(getDirectBackendMessage(payload, response.status, 'Unable to book appointment.'));
      }

      setSubmitSuccess('Appointment booked successfully. You can view it in your appointment calendar.');
      setAppointmentType('');
      setNotes('');
      await loadBookingData();
      window.dispatchEvent(new Event('appointments:refresh'));
      onBooked?.();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Unable to book appointment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="tracking-tight">Book Appointment</h2>
          <p className="text-gray-600">Select adviser, day, slot, and appointment reason</p>
        </div>
        <Button variant="outline" onClick={onBack}>Back</Button>
      </div>

      {yearLevelName && (
        <div className="flex items-center gap-2">
          <Badge className="bg-green-100 text-green-800 border-green-300">{yearLevelName}</Badge>
        </div>
      )}

      {loadError && (
        <div className="flex items-center justify-between gap-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            <span>{loadError}</span>
          </div>
          <Button size="sm" variant="outline" onClick={loadBookingData}>Retry</Button>
        </div>
      )}

      {submitError && (
        <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertCircle className="h-4 w-4" />
          <span>{submitError}</span>
        </div>
      )}

      {submitSuccess && (
        <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
          {submitSuccess}
        </div>
      )}

      {isLoading ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-500">Loading assigned advisers...</p>
          </CardContent>
        </Card>
      ) : assignedAdvisers.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-500">No adviser or chairman assigned to your year level yet.</p>
          </CardContent>
        </Card>
      ) : showInternalTabs ? (
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as 'book' | 'appointments')}
          className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)] items-start"
        >
          <div className="space-y-3 lg:sticky lg:top-6 self-start">
            <TabsList className="w-full flex flex-col items-stretch bg-white border border-gray-200 rounded-2xl p-3 gap-2 shadow-sm">
              <TabsTrigger value="book" className="w-full justify-start">
                Book Appointment
              </TabsTrigger>
              <TabsTrigger value="appointments" className="w-full justify-start">
                My Appointments
              </TabsTrigger>
            </TabsList>
            <Button variant="outline" onClick={loadBookingData} className="w-full">
              <RefreshCcw className="h-4 w-4 mr-2" />
              Refresh Data
            </Button>
          </div>

          <TabsContent value="book" className="space-y-6">
            <Card className="border-green-200 shadow-md">
              <CardContent className="pt-6">
                <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-green-900">
                        {String(selectedAdviser?.fullName ?? selectedAdviser?.FullName ?? selectedAdviser?.username ?? selectedAdviser?.Username ?? 'Adviser')}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">Only adviser-capable users (Adviser/Chairman) assigned to your year level are available for booking.</p>
                      <div className="mt-1 flex items-center gap-2 text-sm text-gray-600">
                        <Mail className="h-4 w-4" />
                        <span>{String(selectedAdviser?.email ?? selectedAdviser?.Email ?? 'Not Set')}</span>
                      </div>
                      {selectedLocation && (
                        <div className="mt-1 flex items-center gap-2 text-sm text-gray-600">
                          <MapPin className="h-4 w-4" />
                          <span>{selectedLocation}</span>
                        </div>
                      )}
                    </div>
                    <Badge className="bg-green-100 text-green-800 border-green-300">Assigned</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-green-200 shadow-md">
              <CardHeader className="bg-gradient-to-r from-green-50 to-yellow-50 border-b border-green-200">
                <CardTitle className="text-green-900">Appointment Details</CardTitle>
                <CardDescription>Select adviser, schedule, and reason in one step.</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Select Adviser/Chairman</label>
                  <Select value={selectedAdviserId} onValueChange={setSelectedAdviserId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select adviser/chairman" />
                    </SelectTrigger>
                    <SelectContent>
                      {assignedAdvisers.map((adviser, index) => {
                        const adviserId = String(adviser.adviserId ?? adviser.AdviserId ?? index).trim();
                        const fullName = String(adviser.fullName ?? adviser.FullName ?? '').trim();
                        const username = String(adviser.username ?? adviser.Username ?? '').trim();
                        const displayName = fullName || username || 'Adviser/Chairman';
                        return (
                          <SelectItem key={adviserId} value={adviserId}>{displayName}</SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-4 md:grid-cols-2 items-start">
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Select Date (Monday to Saturday)</label>
                      <div className="rounded-md border border-gray-200 bg-white">
                        <Calendar
                          mode="single"
                          selected={selectedDate}
                          onSelect={(date) => setSelectedDate(date ?? undefined)}
                          disabled={(date) => !isDateSelectable(date, availableDays)}
                        />
                      </div>
                      {selectedDate && (
                        <p className="text-sm text-gray-600">
                          Selected: {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      )}
                    </div>

                    <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
                      Session duration: {selectedSessionMinutes} minutes
                    </div>

                    {selectedLocation && (
                      <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        <span>Location: {selectedLocation}</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Select Time Slot</label>
                    {selectedAdviserId && availableDays.length === 0 ? (
                      <p className="text-sm text-gray-500">No available schedule for this adviser.</p>
                    ) : selectableSlots.length === 0 ? (
                      <p className="text-sm text-gray-500">No available schedule for this adviser.</p>
                    ) : (
                      <div className="space-y-2">
                        {selectableSlots.map((slot) => {
                          const isSelected = selectedSlot === slot.value;
                          return (
                            <button
                              key={slot.value}
                              type="button"
                              onClick={() => setSelectedSlot(slot.value)}
                              className={`w-full rounded-md border px-3 py-3 text-left flex items-center justify-between transition-colors ${isSelected ? 'border-green-400 bg-green-50' : 'border-gray-200 bg-white hover:bg-gray-50'}`}
                            >
                              <span className="flex items-center gap-2 font-medium text-gray-800">
                                <Clock className="h-4 w-4" />
                                {slot.label}
                              </span>
                              <Badge className={isSelected ? 'bg-green-100 text-green-800 border-green-300' : 'bg-gray-100 text-gray-700 border-gray-300'}>
                                {isSelected ? 'Selected' : 'Available'}
                              </Badge>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Appointment Reason</label>
                    <Input
                      value={appointmentType}
                      onChange={(e) => setAppointmentType(e.target.value)}
                      placeholder="Type your appointment reason"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Detailed Reason</label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add more context to your appointment reason..."
                    className="min-h-[120px]"
                  />
                </div>

                <Card className="border-blue-200 shadow-sm bg-blue-50/50">
                  <CardHeader>
                    <CardTitle className="text-blue-900 text-base">Advising Guidelines</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="text-sm text-blue-900 list-disc pl-5 space-y-1">
                      <li>Arrive 5-10 minutes early and bring your student ID.</li>
                      <li>Prepare your questions or concerns to make the session productive.</li>
                      <li>Cancel at least 24 hours ahead if you cannot attend.</li>
                    </ul>
                  </CardContent>
                </Card>

                <Button
                  onClick={handleBookAppointment}
                  disabled={!canSubmit || isSubmitting}
                  className="w-full bg-gradient-to-r from-green-400 to-yellow-400 hover:from-green-500 hover:to-yellow-500 text-white"
                >
                  {isSubmitting ? 'Booking...' : 'Book Appointment'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="appointments">
            <Card className="border-blue-200 shadow-md">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 border-b border-blue-200">
                <CardTitle className="text-blue-900">My Appointments</CardTitle>
                <CardDescription>Students can cancel upcoming appointments with a reason.</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-5">
                <Tabs
                  value={appointmentsTab}
                  onValueChange={(value) => setAppointmentsTab(value as 'upcoming' | 'cancelled')}
                >
                  <TabsList className="bg-blue-50">
                    <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
                    <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
                  </TabsList>

                  <TabsContent value="upcoming" className="space-y-3">
                    {upcomingStudentAppointments.length === 0 ? (
                      <p className="text-sm text-gray-500">No upcoming appointments.</p>
                    ) : (
                      upcomingStudentAppointments.map((item, index) => {
                        const appointmentId = String(item.appointmentId ?? item.AppointmentId ?? '').trim();
                        const isActiveCancel = activeCancelId === appointmentId;

                        return (
                          <div key={appointmentId || String(index)} className="rounded-md border border-gray-200 p-3 space-y-2">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                              <div>
                                <p className="font-medium text-gray-900">{String(item.appointmentType ?? item.AppointmentType ?? 'Not Set') || 'Not Set'}</p>
                                <p className="text-sm text-gray-600">{formatAppointmentDateTime(item.appointmentDate ?? item.AppointmentDate, item.appointmentTime ?? item.AppointmentTime)}</p>
                              </div>
                              <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300 w-fit">Upcoming</Badge>
                            </div>

                            {!isActiveCancel ? (
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  size="sm"
                                  className="bg-gradient-to-r from-green-500 to-yellow-400 hover:from-green-600 hover:to-yellow-500 text-white"
                                  onClick={() => openAppointmentDetails(item)}
                                  disabled={isSubmitting}
                                >
                                  View Details
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-gray-300 text-gray-700 hover:bg-gray-50"
                                  onClick={() => {
                                    setActiveCancelId(appointmentId);
                                    setCancelReasonText('');
                                  }}
                                  disabled={isSubmitting}
                                >
                                  Cancel Appointment
                                </Button>
                              </div>
                            ) : (
                              <div className="space-y-2 rounded-md border border-red-200 bg-red-50 p-3">
                                <Textarea
                                  value={cancelReasonText}
                                  onChange={(e) => setCancelReasonText(e.target.value)}
                                  placeholder="Reason for cancellation"
                                  className="min-h-[90px]"
                                  disabled={isSubmitting}
                                />
                                <div className="flex flex-wrap gap-2">
                                  <Button
                                    size="sm"
                                    className="bg-red-600 hover:bg-red-700"
                                    onClick={() => handleStudentCancelAppointment(appointmentId)}
                                    disabled={isSubmitting}
                                  >
                                    {isSubmitting ? 'Cancelling...' : 'Confirm Cancel'}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setActiveCancelId('');
                                      setCancelReasonText('');
                                    }}
                                    disabled={isSubmitting}
                                  >
                                    Close
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </TabsContent>

                  <TabsContent value="cancelled" className="space-y-3">
                    {cancelledStudentAppointments.length === 0 ? (
                      <p className="text-sm text-gray-500">No cancelled appointments.</p>
                    ) : (
                      cancelledStudentAppointments.map((item, index) => {
                        const reason = String(item.cancellationReason ?? item.CancellationReason ?? 'Not Set').trim() || 'Not Set';
                        return (
                          <div key={String(item.appointmentId ?? item.AppointmentId ?? index)} className="rounded-md border border-red-200 bg-red-50 p-3">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                              <div>
                                <p className="font-medium text-red-900">{String(item.appointmentType ?? item.AppointmentType ?? 'Not Set') || 'Not Set'}</p>
                                <p className="text-sm text-red-800">{formatAppointmentDateTime(item.appointmentDate ?? item.AppointmentDate, item.appointmentTime ?? item.AppointmentTime)}</p>
                                <p className="text-sm text-red-700 mt-1">Reason: {reason}</p>
                              </div>
                              <Badge className="bg-red-100 text-red-800 border-red-300 w-fit">Cancelled</Badge>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      ) : activeTab === 'book' ? (
        <>
          <Card className="border-green-200 shadow-md">
            <CardContent className="pt-6">
              <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-green-900">
                      {String(selectedAdviser?.fullName ?? selectedAdviser?.FullName ?? selectedAdviser?.username ?? selectedAdviser?.Username ?? 'Adviser')}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">Only adviser-capable users (Adviser/Chairman) assigned to your year level are available for booking.</p>
                    <div className="mt-1 flex items-center gap-2 text-sm text-gray-600">
                      <Mail className="h-4 w-4" />
                      <span>{String(selectedAdviser?.email ?? selectedAdviser?.Email ?? 'Not Set')}</span>
                    </div>
                    {selectedLocation && (
                      <div className="mt-1 flex items-center gap-2 text-sm text-gray-600">
                        <MapPin className="h-4 w-4" />
                        <span>{selectedLocation}</span>
                      </div>
                    )}
                  </div>
                  <Badge className="bg-green-100 text-green-800 border-green-300">Assigned</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-green-200 shadow-md mt-6">
            <CardHeader className="bg-gradient-to-r from-green-50 to-yellow-50 border-b border-green-200">
              <CardTitle className="text-green-900">Appointment Details</CardTitle>
              <CardDescription>Select adviser, schedule, and reason in one step.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Select Adviser/Chairman</label>
                <Select value={selectedAdviserId} onValueChange={setSelectedAdviserId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select adviser/chairman" />
                  </SelectTrigger>
                  <SelectContent>
                    {assignedAdvisers.map((adviser, index) => {
                      const adviserId = String(adviser.adviserId ?? adviser.AdviserId ?? index).trim();
                      const fullName = String(adviser.fullName ?? adviser.FullName ?? '').trim();
                      const username = String(adviser.username ?? adviser.Username ?? '').trim();
                      const displayName = fullName || username || 'Adviser/Chairman';
                      return (
                        <SelectItem key={adviserId} value={adviserId}>{displayName}</SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-4 md:grid-cols-2 items-start">
                <div className="space-y-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Select Date (Monday to Saturday)</label>
                    <div className="rounded-md border border-gray-200 bg-white">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={(date) => setSelectedDate(date ?? undefined)}
                        disabled={(date) => !isDateSelectable(date, availableDays)}
                      />
                    </div>
                    {selectedDate && (
                      <p className="text-sm text-gray-600">
                        Selected: {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    )}
                  </div>

                  <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
                    Session duration: {selectedSessionMinutes} minutes
                  </div>

                  {selectedLocation && (
                    <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      <span>Location: {selectedLocation}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Select Time Slot</label>
                  {selectedAdviserId && availableDays.length === 0 ? (
                    <p className="text-sm text-gray-500">No available schedule for this adviser.</p>
                  ) : selectableSlots.length === 0 ? (
                    <p className="text-sm text-gray-500">No available schedule for this adviser.</p>
                  ) : (
                    <div className="space-y-2">
                      {selectableSlots.map((slot) => {
                        const isSelected = selectedSlot === slot.value;
                        return (
                          <button
                            key={slot.value}
                            type="button"
                            onClick={() => setSelectedSlot(slot.value)}
                            className={`w-full rounded-md border px-3 py-3 text-left flex items-center justify-between transition-colors ${isSelected ? 'border-green-400 bg-green-50' : 'border-gray-200 bg-white hover:bg-gray-50'}`}
                          >
                            <span className="flex items-center gap-2 font-medium text-gray-800">
                              <Clock className="h-4 w-4" />
                              {slot.label}
                            </span>
                            <Badge className={isSelected ? 'bg-green-100 text-green-800 border-green-300' : 'bg-gray-100 text-gray-700 border-gray-300'}>
                              {isSelected ? 'Selected' : 'Available'}
                            </Badge>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Appointment Reason</label>
                  <Input
                    value={appointmentType}
                    onChange={(e) => setAppointmentType(e.target.value)}
                    placeholder="Type your appointment reason"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Detailed Reason</label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add more context to your appointment reason..."
                  className="min-h-[120px]"
                />
              </div>

              <Card className="border-blue-200 shadow-sm bg-blue-50/50">
                <CardHeader>
                  <CardTitle className="text-blue-900 text-base">Advising Guidelines</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm text-blue-900 list-disc pl-5 space-y-1">
                    <li>Arrive 5-10 minutes early and bring your student ID.</li>
                    <li>Prepare your questions or concerns to make the session productive.</li>
                    <li>Cancel at least 24 hours ahead if you cannot attend.</li>
                  </ul>
                </CardContent>
              </Card>

              <Button
                onClick={handleBookAppointment}
                disabled={!canSubmit || isSubmitting}
                className="w-full bg-gradient-to-r from-green-400 to-yellow-400 hover:from-green-500 hover:to-yellow-500 text-white"
              >
                {isSubmitting ? 'Booking...' : 'Book Appointment'}
              </Button>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card className="border-blue-200 shadow-md">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 border-b border-blue-200">
            <CardTitle className="text-blue-900">My Appointments</CardTitle>
            <CardDescription>Students can cancel upcoming appointments with a reason.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-5">
            <Tabs
              value={appointmentsTab}
              onValueChange={(value) => setAppointmentsTab(value as 'upcoming' | 'cancelled')}
            >
              <TabsList className="bg-blue-50">
                <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
                <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
              </TabsList>

              <TabsContent value="upcoming" className="space-y-3">
                {upcomingStudentAppointments.length === 0 ? (
                  <p className="text-sm text-gray-500">No upcoming appointments.</p>
                ) : (
                  upcomingStudentAppointments.map((item, index) => {
                    const appointmentId = String(item.appointmentId ?? item.AppointmentId ?? '').trim();
                    const isActiveCancel = activeCancelId === appointmentId;

                    return (
                      <div key={appointmentId || String(index)} className="rounded-md border border-gray-200 p-3 space-y-2">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="font-medium text-gray-900">{String(item.appointmentType ?? item.AppointmentType ?? 'Not Set') || 'Not Set'}</p>
                            <p className="text-sm text-gray-600">{formatAppointmentDateTime(item.appointmentDate ?? item.AppointmentDate, item.appointmentTime ?? item.AppointmentTime)}</p>
                          </div>
                          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300 w-fit">Upcoming</Badge>
                        </div>

                        {!isActiveCancel ? (
                          <div className="flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              className="bg-gradient-to-r from-green-500 to-yellow-400 hover:from-green-600 hover:to-yellow-500 text-white"
                              onClick={() => openAppointmentDetails(item)}
                              disabled={isSubmitting}
                            >
                              View Details
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-red-300 text-red-700 hover:bg-red-50"
                              onClick={() => {
                                setActiveCancelId(appointmentId);
                                setCancelReasonText('');
                              }}
                              disabled={isSubmitting}
                            >
                              Cancel Appointment
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-2 rounded-md border border-red-200 bg-red-50 p-3">
                            <Textarea
                              value={cancelReasonText}
                              onChange={(e) => setCancelReasonText(e.target.value)}
                              placeholder="Reason for cancellation"
                              className="min-h-[90px]"
                              disabled={isSubmitting}
                            />
                            <div className="flex flex-wrap gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-gray-300 text-gray-700 hover:bg-gray-50"
                                onClick={() => handleStudentCancelAppointment(appointmentId)}
                                disabled={isSubmitting}
                              >
                                {isSubmitting ? 'Cancelling...' : 'Confirm Cancel'}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setActiveCancelId('');
                                  setCancelReasonText('');
                                }}
                                disabled={isSubmitting}
                              >
                                Close
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </TabsContent>

              <TabsContent value="cancelled" className="space-y-3">
                {cancelledStudentAppointments.length === 0 ? (
                  <p className="text-sm text-gray-500">No cancelled appointments.</p>
                ) : (
                  cancelledStudentAppointments.map((item, index) => {
                    const reason = String(item.cancellationReason ?? item.CancellationReason ?? 'Not Set').trim() || 'Not Set';
                    return (
                      <div key={String(item.appointmentId ?? item.AppointmentId ?? index)} className="rounded-md border border-red-200 bg-red-50 p-3">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="font-medium text-red-900">{String(item.appointmentType ?? item.AppointmentType ?? 'Not Set') || 'Not Set'}</p>
                            <p className="text-sm text-red-800">{formatAppointmentDateTime(item.appointmentDate ?? item.AppointmentDate, item.appointmentTime ?? item.AppointmentTime)}</p>
                            <p className="text-sm text-red-700 mt-1">Reason: {reason}</p>
                          </div>
                          <Badge className="bg-red-100 text-red-800 border-red-300 w-fit">Cancelled</Badge>
                        </div>
                      </div>
                    );
                  })
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Appointment Details</DialogTitle>
            <DialogDescription>Review your appointment information.</DialogDescription>
          </DialogHeader>
          {selectedAppointment ? (
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-gray-500">Appointment Reason</span>
                <span className="font-medium text-gray-900">
                  {String(selectedAppointment.appointmentType ?? selectedAppointment.AppointmentType ?? 'Not Set') || 'Not Set'}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-gray-500">Schedule</span>
                <span className="font-medium text-gray-900">
                  {formatAppointmentDateTime(selectedAppointment.appointmentDate ?? selectedAppointment.AppointmentDate, selectedAppointment.appointmentTime ?? selectedAppointment.AppointmentTime)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-gray-500">Status</span>
                <span className="font-medium text-gray-900">
                  {String(selectedAppointment.status ?? selectedAppointment.Status ?? 'Not Set') || 'Not Set'}
                </span>
              </div>
              <div className="rounded-md border border-green-200 bg-green-50 p-3 text-green-900">
                <p className="text-xs uppercase tracking-wide">Detailed Reason</p>
                <p className="mt-1 text-sm">
                  {String(
                    selectedAppointment.notes
                      ?? selectedAppointment.Notes
                      ?? selectedAppointment.cancellationReason
                      ?? selectedAppointment.CancellationReason
                      ?? 'Not Set',
                  ) || 'Not Set'}
                </p>
              </div>
              {String(selectedAppointment.status ?? selectedAppointment.Status ?? '').toLowerCase().includes('cancel')
                && String(selectedAppointment.cancellationReason ?? selectedAppointment.CancellationReason ?? '').trim() ? (
                <div className="rounded-md border border-red-200 bg-red-50 p-3 text-red-800">
                  <p className="text-xs uppercase tracking-wide">Cancellation Reason</p>
                  <p className="mt-1 text-sm">
                    {String(selectedAppointment.cancellationReason ?? selectedAppointment.CancellationReason ?? '')}
                  </p>
                </div>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No appointment selected.</p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
