import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
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
}

interface CalendarPayload {
  upcomingAppointments?: CalendarAppointment[];
  completedAppointments?: CalendarAppointment[];
  cancelledAppointments?: CalendarAppointment[];
  UpcomingAppointments?: CalendarAppointment[];
  CompletedAppointments?: CalendarAppointment[];
  CancelledAppointments?: CalendarAppointment[];
}

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

  const data = payload as { message?: string; error?: string; title?: string };
  return data.message || data.error || data.title || fallback;
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
                <p className="text-sm text-gray-700">{appointmentType}</p>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock className="h-4 w-4" />
                  <span>{dateTimeText}</span>
                </div>
                {showCancellationReason && (
                  <p className="text-sm text-red-700">Cancellation Reason: {cancellationReason}</p>
                )}
              </div>
              <Badge className={getStatusBadgeClass(status)}>{status}</Badge>
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

  const loadCalendar = async () => {
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
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Unable to load appointment calendar.');
      setUpcomingAppointments([]);
      setCompletedAppointments([]);
      setCancelledAppointments([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCalendar();
  }, []);

  const totals = useMemo(() => ({
    upcoming: upcomingAppointments.length,
    completed: completedAppointments.length,
    cancelled: cancelledAppointments.length,
  }), [upcomingAppointments, completedAppointments, cancelledAppointments]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="tracking-tight">Appointment Calendar</h2>
          <p className="text-gray-600">Live appointments from backend endpoint /api/Appointments/calendar</p>
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

      <Tabs defaultValue="upcoming" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="upcoming">Upcoming Appointments ({totals.upcoming})</TabsTrigger>
          <TabsTrigger value="completed">Completed Appointments ({totals.completed})</TabsTrigger>
          <TabsTrigger value="cancelled">Cancelled Appointments ({totals.cancelled})</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="space-y-4">
          <Card className="border-green-200 shadow-md">
            <CardHeader className="bg-gradient-to-r from-green-50 to-yellow-50 border-b border-green-200">
              <CardTitle className="text-green-900">Upcoming Appointments</CardTitle>
              <CardDescription>Filtered by backend based on your assigned year level scope</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              {renderAppointmentList(
                upcomingAppointments,
                'No upcoming appointments for your assigned year level(s).',
                false,
                isLoading,
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
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cancelled" className="space-y-4">
          <Card className="border-red-200 shadow-md">
            <CardHeader className="bg-gradient-to-r from-red-50 to-orange-50 border-b border-red-200">
              <CardTitle className="text-red-900">Cancelled Appointments</CardTitle>
              <CardDescription>Sessions cancelled by either student or adviser</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              {renderAppointmentList(
                cancelledAppointments,
                'No cancelled appointments.',
                true,
                isLoading,
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
