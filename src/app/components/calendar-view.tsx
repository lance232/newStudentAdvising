import { useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { AlertCircle, Calendar as CalendarIcon, Clock, RefreshCcw, User } from 'lucide-react';

interface CalendarAppointment {
  appointmentId?: number | string | null;
  AppointmentId?: number | string | null;
  studentId?: number | string | null;
  StudentId?: number | string | null;
  studentName?: string | null;
  StudentName?: string | null;
  adviserId?: number | string | null;
  AdviserId?: number | string | null;
  adviserName?: string | null;
  AdviserName?: string | null;
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
  cancellationReason?: string | null;
  CancellationReason?: string | null;
  cancellationDate?: string | null;
  CancellationDate?: string | null;
  notes?: string | null;
  Notes?: string | null;
  adviserNotes?: string | null;
  AdviserNotes?: string | null;
  sessionNotes?: string | null;
  SessionNotes?: string | null;
}

interface CalendarPayload {
  upcomingAppointments?: CalendarAppointment[];
  completedAppointments?: CalendarAppointment[];
  cancelledAppointments?: CalendarAppointment[];
  UpcomingAppointments?: CalendarAppointment[];
  CompletedAppointments?: CalendarAppointment[];
  CancelledAppointments?: CalendarAppointment[];
}

interface AppointmentNoteRow {
  appointmentNoteId?: number | string | null;
  AppointmentNoteId?: number | string | null;
  appointmentId?: number | string | null;
  AppointmentId?: number | string | null;
  adviserId?: number | string | null;
  AdviserId?: number | string | null;
  adviserNotes?: string | null;
  AdviserNotes?: string | null;
}

const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ?? 'https://localhost:53005/api';

const CALENDAR_TAB_STORAGE_KEY = 'calendar_tab';
const CALENDAR_OPEN_APPOINTMENT_KEY = 'calendar_open_appointment';

function getTabStorage(): Storage {
  if (localStorage.getItem('auth_token')) {
    return localStorage;
  }
  if (sessionStorage.getItem('auth_token')) {
    return sessionStorage;
  }
  return localStorage;
}

function readStoredCalendarTab(): 'upcoming' | 'completed' | 'cancelled' {
  const value = getTabStorage().getItem(CALENDAR_TAB_STORAGE_KEY);
  if (value === 'completed' || value === 'cancelled') {
    return value;
  }
  return 'upcoming';
}

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

  throw new Error('Unable to reach calendar endpoint.');
}

function getAuthToken(): string | null {
  const rawToken = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
  if (!rawToken) {
    return null;
  }

  return rawToken.replace(/^Bearer\s+/i, '').trim();
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
    if (Array.isArray(record.notes)) {
      return record.notes as T[];
    }
    if (Array.isArray(record.Notes)) {
      return record.Notes as T[];
    }
  }

  return [];
}

async function fetchWithPathCandidates(paths: string[], init?: RequestInit): Promise<Response> {
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

  throw new Error('Unable to reach endpoint.');
}

function getHttpStatusMessage(status: number, payload: unknown, fallback: string): string {
  const backendMessage = getErrorMessage(payload, '');
  if (backendMessage) {
    return backendMessage;
  }

  if (status === 400) {
    return 'The submitted appointment update is invalid. Please review and try again.';
  }
  if (status === 404) {
    return 'Appointment update endpoint was not found. Please verify backend routes.';
  }
  if (status >= 500) {
    return 'Backend server error while saving appointment changes. Please try again.';
  }
  return fallback;
}

type AppointmentUpdateBody = {
  StudentId?: string | number;
  AdviserId?: string | number;
  SemesterId?: string | number;
  AppointmentType: string;
  AppointmentDate: string;
  AppointmentTime: string;
  Status: string;
  AttendanceStatus?: string;
  CancellationReason?: string;
  CancellationDate?: string | null;
};

function getAppointmentId(item: CalendarAppointment): string {
  return String(item.appointmentId ?? item.AppointmentId ?? '').trim();
}

function normalizeAppointments(payload: CalendarPayload, key: 'upcoming' | 'completed' | 'cancelled'): CalendarAppointment[] {
  if (key === 'upcoming') {
    return payload.upcomingAppointments ?? payload.UpcomingAppointments ?? [];
  }
  if (key === 'completed') {
    return payload.completedAppointments ?? payload.CompletedAppointments ?? [];
  }
  return payload.cancelledAppointments ?? payload.CancelledAppointments ?? [];
}

function formatDateTime(dateRaw: unknown, timeRaw: unknown): string {
  const dateText = String(dateRaw ?? '').trim();
  const timeText = String(timeRaw ?? '').trim();

  if (!dateText && !timeText) {
    return 'Not Set';
  }

  const datePart = dateText ? dateText.split('T')[0] : '';
  const combined = datePart && timeText ? `${datePart}T${timeText}` : dateText;
  const parsed = new Date(combined);

  if (Number.isNaN(parsed.getTime())) {
    if (datePart && timeText) {
      return `${datePart} ${timeText}`;
    }
    return dateText || timeText;
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

function getStatusBadgeClass(status: string): string {
  const normalized = status.toUpperCase();
  if (normalized.includes('UPCOMING')) {
    return 'bg-green-100 text-green-800 border-green-300';
  }
  if (normalized.includes('COMPLETED')) {
    return 'bg-blue-100 text-blue-800 border-blue-300';
  }
  if (normalized.includes('CANCELLED')) {
    return 'bg-red-100 text-red-800 border-red-300';
  }
  return 'bg-gray-100 text-gray-800 border-gray-300';
}

function renderAppointmentList(
  appointments: CalendarAppointment[],
  emptyMessage: string,
  showCancellationReason: boolean,
  isLoading: boolean,
  onViewDetails: (item: CalendarAppointment) => void,
) {
  if (isLoading) {
    return <p className="text-sm text-gray-500 py-6">Loading appointments...</p>;
  }

  if (appointments.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <CalendarIcon className="h-10 w-10 mx-auto mb-2 opacity-30" />
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {appointments.map((item, index) => {
        const studentId = String(item.studentId ?? item.StudentId ?? '').trim();
        const studentName = String(item.studentName ?? item.StudentName ?? '').trim() || studentId || 'Student';
        const appointmentType = String(item.appointmentType ?? item.AppointmentType ?? 'Not Set') || 'Not Set';
        const status = String(item.status ?? item.Status ?? 'Not Set') || 'Not Set';
        const cancellationReason = String(item.cancellationReason ?? item.CancellationReason ?? 'Not Set') || 'Not Set';
        const dateTimeText = formatDateTime(item.appointmentDate ?? item.AppointmentDate, item.appointmentTime ?? item.AppointmentTime);

        return (
          <div key={String(item.appointmentId ?? item.AppointmentId ?? index)} className="rounded-lg border border-gray-200 p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-gray-900 font-semibold">
                  <User className="h-4 w-4 text-green-700" />
                  <span>{studentName}</span>
                </div>
                <p className="text-sm text-gray-700">Reason: {appointmentType}</p>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock className="h-4 w-4" />
                  <span>{dateTimeText}</span>
                </div>
                {showCancellationReason && (
                  <p className="text-sm text-red-700">Cancellation Reason: {cancellationReason}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Badge className={getStatusBadgeClass(status)}>{status}</Badge>
                <Button size="sm" variant="outline" onClick={() => onViewDetails(item)}>View Details</Button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function CalendarView() {
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [upcomingAppointments, setUpcomingAppointments] = useState<CalendarAppointment[]>([]);
  const [completedAppointments, setCompletedAppointments] = useState<CalendarAppointment[]>([]);
  const [cancelledAppointments, setCancelledAppointments] = useState<CalendarAppointment[]>([]);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<CalendarAppointment | null>(null);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [adviserNotesText, setAdviserNotesText] = useState('');
  const [appointmentNoteId, setAppointmentNoteId] = useState('');
  const [activeTab, setActiveTab] = useState<'upcoming' | 'completed' | 'cancelled'>(() => readStoredCalendarTab());
  const [shouldAutoFocusNotes, setShouldAutoFocusNotes] = useState(false);
  const notesTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  const loadCalendar = async (): Promise<CalendarPayload | null> => {
    setIsLoading(true);
    setLoadError('');

    try {
      const token = getAuthToken();
      const headers = {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      const response = await fetchWithApiFallback('/Appointments/calendar', { headers });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(getErrorMessage(payload, 'Unable to load appointment calendar.'));
      }

      const normalized = payload as CalendarPayload;
      setUpcomingAppointments(normalizeAppointments(normalized, 'upcoming'));
      setCompletedAppointments(normalizeAppointments(normalized, 'completed'));
      setCancelledAppointments(normalizeAppointments(normalized, 'cancelled'));
      return normalized;
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Unable to load appointment calendar.');
      setUpcomingAppointments([]);
      setCompletedAppointments([]);
      setCancelledAppointments([]);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCalendar();
  }, []);

  useEffect(() => {
    getTabStorage().setItem(CALENDAR_TAB_STORAGE_KEY, activeTab);
  }, [activeTab]);

  useEffect(() => {
    const handleAppointmentsRefresh = () => {
      loadCalendar();
    };

    window.addEventListener('appointments:refresh', handleAppointmentsRefresh);
    return () => {
      window.removeEventListener('appointments:refresh', handleAppointmentsRefresh);
    };
  }, []);

  useEffect(() => {
    if (isLoading) {
      return;
    }

    const storage = getTabStorage();
    const pendingId = storage.getItem(CALENDAR_OPEN_APPOINTMENT_KEY);
    if (!pendingId) {
      return;
    }

    const appointmentId = pendingId.trim();
    if (!appointmentId) {
      storage.removeItem(CALENDAR_OPEN_APPOINTMENT_KEY);
      return;
    }

    const merged = [...upcomingAppointments, ...completedAppointments, ...cancelledAppointments];
    if (merged.length === 0) {
      return;
    }

    const target = merged.find((row) => getAppointmentId(row) === appointmentId) ?? null;
    if (target) {
      setActiveTab('completed');
      openDetails(target);
      setShouldAutoFocusNotes(true);
      storage.removeItem(CALENDAR_OPEN_APPOINTMENT_KEY);
      return;
    }

    storage.removeItem(CALENDAR_OPEN_APPOINTMENT_KEY);
  }, [isLoading, upcomingAppointments, completedAppointments, cancelledAppointments]);

  const totals = useMemo(() => ({
    upcoming: upcomingAppointments.length,
    completed: completedAppointments.length,
    cancelled: cancelledAppointments.length,
  }), [upcomingAppointments, completedAppointments, cancelledAppointments]);

  const openDetails = (item: CalendarAppointment) => {
    const dateRaw = String(item.appointmentDate ?? item.AppointmentDate ?? '').trim();
    const timeRaw = String(item.appointmentTime ?? item.AppointmentTime ?? '').trim();
    setSelectedAppointment(item);
    setActionError('');
    setActionSuccess('');
    setRescheduleDate(dateRaw ? dateRaw.split('T')[0] : '');
    setRescheduleTime(timeRaw);
    setAdviserNotesText('');
    setDetailOpen(true);
  };

  const loadAppointmentNotes = async (appointmentId: string) => {
    const token = getAuthToken();
    if (!token || !appointmentId) {
      setAdviserNotesText('');
      return;
    }

    const headers = {
      Authorization: `Bearer ${token}`,
    };

    try {
      const response = await fetchWithPathCandidates([
        `/AppointmentNotes?appointmentId=${encodeURIComponent(appointmentId)}`,
        `/AppointmentNotes?AppointmentId=${encodeURIComponent(appointmentId)}`,
        `/AppointmentNotes/appointment/${encodeURIComponent(appointmentId)}`,
        `/AppointmentNotes/by-appointment/${encodeURIComponent(appointmentId)}`,
      ], { headers });

      const payload = await response.json().catch(() => ([]));
      if (!response.ok) {
        throw new Error(getErrorMessage(payload, 'Unable to load advising notes.'));
      }

      const rows = getArrayPayload<AppointmentNoteRow>(payload);
      const matching = rows.find((row) => String(row.appointmentId ?? row.AppointmentId ?? '').trim() === appointmentId);
      setAdviserNotesText(String(matching?.adviserNotes ?? matching?.AdviserNotes ?? '').trim());
      setAppointmentNoteId(String(matching?.appointmentNoteId ?? matching?.AppointmentNoteId ?? '').trim());
    } catch {
      setAdviserNotesText('');
      setAppointmentNoteId('');
    }
  };

  useEffect(() => {
    if (!detailOpen || !selectedAppointment) {
      return;
    }

    const appointmentId = getAppointmentId(selectedAppointment);
    if (!appointmentId) {
      setAdviserNotesText('');
      return;
    }

    loadAppointmentNotes(appointmentId);
  }, [detailOpen, selectedAppointment]);

  const isValidId = (value: unknown): boolean => {
    const text = String(value ?? '').trim();
    return text.length > 0 && text !== '0';
  };

  const buildAppointmentUpdateBody = (
    base: CalendarAppointment,
    overrides: Partial<AppointmentUpdateBody>,
  ): AppointmentUpdateBody => {
    const body: AppointmentUpdateBody = {
      AppointmentType: String(base.appointmentType ?? base.AppointmentType ?? '').trim(),
      AppointmentDate: String(base.appointmentDate ?? base.AppointmentDate ?? '').trim(),
      AppointmentTime: String(base.appointmentTime ?? base.AppointmentTime ?? '').trim(),
      Status: String(base.status ?? base.Status ?? '').trim(),
      ...overrides,
    };

    const statusValue = String(body.Status ?? '').toLowerCase();
    const isCancelFlow = statusValue.includes('cancel');

    if (!isCancelFlow) {
      delete body.CancellationReason;
      delete body.CancellationDate;
    }

    const hasCancellationDateOverride = Object.prototype.hasOwnProperty.call(overrides, 'CancellationDate');
    if (hasCancellationDateOverride) {
      const overrideValue = overrides.CancellationDate;
      if (overrideValue === null) {
        body.CancellationDate = null;
      } else {
        const trimmedOverride = String(overrideValue ?? '').trim();
        if (trimmedOverride) {
          body.CancellationDate = trimmedOverride;
        } else {
          delete body.CancellationDate;
        }
      }
    } else {
      const existingCancellationDate = String(base.cancellationDate ?? base.CancellationDate ?? '').trim();
      if (existingCancellationDate) {
        body.CancellationDate = existingCancellationDate;
      }
    }

    const studentId = base.studentId ?? base.StudentId;
    if (isValidId(studentId)) {
      body.StudentId = String(studentId).trim();
    }

    const adviserId = base.adviserId ?? base.AdviserId;
    if (isValidId(adviserId)) {
      body.AdviserId = String(adviserId).trim();
    }

    const semesterId = base.semesterId ?? base.SemesterId;
    if (isValidId(semesterId)) {
      body.SemesterId = String(semesterId).trim();
    }

    return body;
  };

  const submitAppointmentAction = async (
    payload: Partial<AppointmentUpdateBody>,
    successMessage: string,
  ) => {
    if (!selectedAppointment) {
      return;
    }

    const appointmentId = getAppointmentId(selectedAppointment);
    if (!appointmentId) {
      setActionError('Unable to update appointment: missing appointment id.');
      return;
    }

    const token = getAuthToken();
    if (!token) {
      setActionError('You are not authenticated. Please login again.');
      return;
    }

    setIsActionLoading(true);
    setActionError('');
    setActionSuccess('');

    try {
      const requestBody = buildAppointmentUpdateBody(selectedAppointment, payload);
      const response = await fetchWithApiFallback(`/Appointments/${appointmentId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
      const responsePayload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(getHttpStatusMessage(response.status, responsePayload, 'Unable to update appointment.'));
      }

      setActionSuccess(successMessage);
      const refreshed = await loadCalendar();
      if (refreshed) {
        const merged = [
          ...normalizeAppointments(refreshed, 'upcoming'),
          ...normalizeAppointments(refreshed, 'completed'),
          ...normalizeAppointments(refreshed, 'cancelled'),
        ];
        const latest = merged.find((row) => getAppointmentId(row) === appointmentId) ?? null;
        setSelectedAppointment(latest);
      }
      window.dispatchEvent(new Event('appointments:refresh'));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to update appointment.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleReschedule = async () => {
    if (!rescheduleDate || !rescheduleTime) {
      setActionError('Please provide both reschedule date and time.');
      return;
    }

    await submitAppointmentAction(
      {
        AppointmentDate: rescheduleDate,
        AppointmentTime: rescheduleTime,
        Status: 'Upcoming',
      },
      'Appointment rescheduled successfully.',
    );
  };

  const handleMarkAttendance = async (attendanceStatus: 'Appeared' | 'No-Show') => {
    const isNoShow = attendanceStatus === 'No-Show';
    await submitAppointmentAction(
      {
        Status: isNoShow ? 'Cancelled' : 'Completed',
        AttendanceStatus: attendanceStatus,
        ...(isNoShow
          ? {
            CancellationReason: 'No-Show',
            CancellationDate: new Date().toISOString(),
          }
          : {}),
      },
      isNoShow
        ? 'Attendance updated: No-Show (moved to Cancelled appointments).'
        : 'Attendance updated: Appeared',
    );
  };

  const handleSaveNotes = async () => {
    if (!selectedAppointment) {
      return;
    }

    const appointmentId = getAppointmentId(selectedAppointment);
    if (!appointmentId) {
      setActionError('Unable to save notes: missing appointment id.');
      return;
    }

    const adviserId = String(selectedAppointment.adviserId ?? selectedAppointment.AdviserId ?? '').trim();
    if (!adviserId || adviserId === '0') {
      setActionError('Unable to save notes: missing adviser id.');
      return;
    }

    const token = getAuthToken();
    if (!token) {
      setActionError('You are not authenticated. Please login again.');
      return;
    }

    setIsActionLoading(true);
    setActionError('');
    setActionSuccess('');

    try {
      const noteId = appointmentNoteId.trim();
      const body = {
        AppointmentId: appointmentId,
        AdviserId: adviserId,
        AdviserNotes: adviserNotesText.trim(),
        ...(noteId ? { AppointmentNoteId: noteId } : {}),
      };

      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      let response: Response | null = null;
      if (noteId) {
        response = await fetchWithPathCandidates([
          `/AppointmentNotes/${encodeURIComponent(noteId)}`,
          `/appointmentnotes/${encodeURIComponent(noteId)}`,
        ], {
          method: 'PUT',
          headers,
          body: JSON.stringify(body),
        });
      }

      if (!response || !response.ok) {
        response = await fetchWithPathCandidates(['/AppointmentNotes', '/appointmentnotes'], {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
        });
      }

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(getErrorMessage(payload, 'Unable to save advising notes.'));
      }

      setActionSuccess('Advising notes saved successfully.');
      await loadAppointmentNotes(appointmentId);
      const refreshed = await loadCalendar();
      if (refreshed) {
        const merged = [
          ...normalizeAppointments(refreshed, 'upcoming'),
          ...normalizeAppointments(refreshed, 'completed'),
          ...normalizeAppointments(refreshed, 'cancelled'),
        ];
        const latest = merged.find((row) => getAppointmentId(row) === appointmentId) ?? null;
        setSelectedAppointment(latest);
      }
      window.dispatchEvent(new Event('appointments:refresh'));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to save advising notes.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const selectedStatus = String(selectedAppointment?.status ?? selectedAppointment?.Status ?? '').trim().toLowerCase();
  const isUpcomingSelected = selectedStatus.includes('upcoming');
  const isCompletedSelected = selectedStatus.includes('completed');
  const selectedStudent = String(selectedAppointment?.studentName ?? selectedAppointment?.StudentName ?? '').trim() || 'Student';
  const selectedType = String(selectedAppointment?.appointmentType ?? selectedAppointment?.AppointmentType ?? '').trim() || 'Not Set';
  const rawSelectedNotes = String(selectedAppointment?.notes ?? selectedAppointment?.Notes ?? '').trim();
  const rawCancellationReason = String(selectedAppointment?.cancellationReason ?? selectedAppointment?.CancellationReason ?? '').trim();
  const selectedNotes = rawSelectedNotes || (!selectedStatus.includes('cancel') ? rawCancellationReason : '');
  const selectedDateTime = formatDateTime(selectedAppointment?.appointmentDate ?? selectedAppointment?.AppointmentDate, selectedAppointment?.appointmentTime ?? selectedAppointment?.AppointmentTime);

  useEffect(() => {
    if (!detailOpen || !isCompletedSelected || !shouldAutoFocusNotes) {
      return;
    }

    notesTextareaRef.current?.focus();
    setShouldAutoFocusNotes(false);
  }, [detailOpen, isCompletedSelected, shouldAutoFocusNotes]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="tracking-tight">Appointment Calendar</h2>
          <p className="text-gray-600">Track and manage upcoming, completed, and cancelled advising appointments.</p>
        </div>
        <Button
          variant="outline"
          className="border-green-300 text-green-800 hover:bg-green-50"
          onClick={loadCalendar}
          disabled={isLoading}
        >
          <RefreshCcw className="h-4 w-4 mr-2" />
          {isLoading ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {loadError && (
        <div className="flex items-center justify-between gap-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            <span>{loadError}</span>
          </div>
          <Button size="sm" variant="outline" onClick={loadCalendar}>Retry</Button>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'upcoming' | 'completed' | 'cancelled')} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="upcoming">Upcoming Appointments ({totals.upcoming})</TabsTrigger>
          <TabsTrigger value="completed">Completed Appointments ({totals.completed})</TabsTrigger>
          <TabsTrigger value="cancelled">Cancelled Appointments ({totals.cancelled})</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="space-y-4">
          <Card className="border-green-200 shadow-md">
            <CardHeader className="bg-gradient-to-r from-green-50 to-yellow-50 border-b border-green-200">
              <CardTitle className="text-green-900">Upcoming Appointments</CardTitle>
              <CardDescription>Appointments relevant to your assigned student scope.</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              {renderAppointmentList(
                upcomingAppointments,
                'No upcoming appointments for your assigned year level(s).',
                false,
                isLoading,
                openDetails,
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          <Card className="border-blue-200 shadow-md">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 border-b border-blue-200">
              <CardTitle className="text-blue-900">Completed Appointments</CardTitle>
              <CardDescription>Finished advising sessions</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              {renderAppointmentList(
                completedAppointments,
                'No completed appointments yet.',
                false,
                isLoading,
                openDetails,
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cancelled" className="space-y-4">
          <Card className="border-red-200 shadow-md">
            <CardHeader className="bg-gradient-to-r from-red-50 to-orange-50 border-b border-red-200">
              <CardTitle className="text-red-900">Cancelled Appointments</CardTitle>
              <CardDescription>Sessions cancelled by either student or adviser/chairman</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              {renderAppointmentList(
                cancelledAppointments,
                'No cancelled appointments.',
                true,
                isLoading,
                openDetails,
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Appointment Details</DialogTitle>
            <DialogDescription>View details, reschedule, and notes.</DialogDescription>
          </DialogHeader>

          {selectedAppointment ? (
            <div className="space-y-4">
              <div className="rounded-md border border-green-200 bg-green-50 p-3">
                <p className="font-semibold text-green-900">{selectedStudent}</p>
                <p className="text-sm text-gray-700">Reason: {selectedType}</p>
                <p className="text-sm text-gray-700">{selectedDateTime}</p>
                {selectedNotes && (
                  <p className="text-sm text-gray-700">Detailed Reason: {selectedNotes}</p>
                )}
                <div className="mt-2 flex items-center gap-2">
                  <Badge className={getStatusBadgeClass(String(selectedAppointment.status ?? selectedAppointment.Status ?? 'Not Set'))}>
                    {String(selectedAppointment.status ?? selectedAppointment.Status ?? 'Not Set')}
                  </Badge>
                </div>
              </div>

              {actionError && (
                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {actionError}
                </div>
              )}

              {actionSuccess && (
                <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
                  {actionSuccess}
                </div>
              )}

              {isUpcomingSelected && (
                <div className="space-y-3 rounded-md border border-blue-200 bg-blue-50 p-3">
                  <p className="text-sm font-semibold text-blue-900">Mark Attendance</p>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleMarkAttendance('Appeared')} disabled={isActionLoading}>
                      Student Appeared
                    </Button>
                    <Button size="sm" className="bg-red-600 hover:bg-red-700" onClick={() => handleMarkAttendance('No-Show')} disabled={isActionLoading}>
                      No-Show
                    </Button>
                  </div>
                </div>
              )}

              {isUpcomingSelected && (
                <div className="space-y-3 rounded-md border border-yellow-200 bg-yellow-50 p-3">
                  <p className="text-sm font-semibold text-yellow-900">Reschedule Appointment</p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <Input type="date" value={rescheduleDate} onChange={(e) => setRescheduleDate(e.target.value)} disabled={isActionLoading} />
                    <Input type="time" value={rescheduleTime} onChange={(e) => setRescheduleTime(e.target.value)} disabled={isActionLoading} />
                  </div>
                  <Button size="sm" variant="outline" onClick={handleReschedule} disabled={isActionLoading}>
                    Reschedule
                  </Button>
                </div>
              )}

              {isCompletedSelected && (
                <div className="space-y-3 rounded-md border border-indigo-200 bg-indigo-50 p-3">
                  <p className="text-sm font-semibold text-indigo-900">Add Appointment Notes</p>
                  <Textarea
                    ref={notesTextareaRef}
                    value={adviserNotesText}
                    onChange={(e) => setAdviserNotesText(e.target.value)}
                    placeholder="Write notes for this completed appointment..."
                    className="min-h-[110px]"
                    disabled={isActionLoading}
                  />
                  <Button size="sm" onClick={handleSaveNotes} disabled={isActionLoading}>
                    Save Notes
                  </Button>
                </div>
              )}

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
