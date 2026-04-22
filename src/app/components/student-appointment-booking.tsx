import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { AlertCircle, User, Mail, RefreshCcw, Clock, MapPin } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { Input } from './ui/input';

interface StudentAppointmentBookingProps {
  onBack: () => void;
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
  location?: string | null;
  Location?: string | null;
  sessionMinutes?: number | string | null;
  SessionMinutes?: number | string | null;
  slots?: unknown;
  Slots?: unknown;
}

interface DashboardPayload {
  yearLevelName?: string | null;
  YearLevelName?: string | null;
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

  throw new Error('Unable to reach assigned advisers endpoint.');
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

function normalizeSlots(rawSlots: unknown): string[] {
  if (!Array.isArray(rawSlots)) {
    return [];
  }

  const slots = rawSlots
    .map((slot) => {
      if (typeof slot === 'string') {
        return slot.trim();
      }

      if (slot && typeof slot === 'object') {
        const record = slot as Record<string, unknown>;
        const direct = String(record.slot ?? record.Slot ?? record.time ?? record.Time ?? record.label ?? record.Label ?? '').trim();
        if (direct) {
          return direct;
        }

        const start = String(record.startTime ?? record.StartTime ?? '').trim();
        const end = String(record.endTime ?? record.EndTime ?? '').trim();
        if (start && end) {
          return `${start} - ${end}`;
        }
      }

      return '';
    })
    .filter((slotText) => slotText.length > 0);

  return Array.from(new Set(slots));
}

function parseSessionMinutes(row: AvailabilityRow): number {
  const raw = row.sessionMinutes ?? row.SessionMinutes;
  const value = Number(raw);
  if (Number.isFinite(value) && value > 0) {
    return value;
  }
  return 30;
}

export function StudentAppointmentBooking({ onBack }: StudentAppointmentBookingProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [assignedAdvisers, setAssignedAdvisers] = useState<AssignedAdviserRow[]>([]);
  const [availabilities, setAvailabilities] = useState<AvailabilityRow[]>([]);
  const [dashboard, setDashboard] = useState<DashboardPayload | null>(null);
  const [selectedAdviserId, setSelectedAdviserId] = useState('');
  const [selectedDay, setSelectedDay] = useState('');
  const [selectedSlot, setSelectedSlot] = useState('');
  const [appointmentType, setAppointmentType] = useState('');
  const [notes, setNotes] = useState('');

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
      setDashboard(dashboardPayload as DashboardPayload);

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
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBookingData();
  }, []);

  const selectedAdviser = useMemo(() => {
    return assignedAdvisers.find((a) => String(a.adviserId ?? a.AdviserId ?? '').trim() === selectedAdviserId) ?? null;
  }, [assignedAdvisers, selectedAdviserId]);

  const adviserAvailabilities = useMemo(() => {
    return availabilities.filter((row) => String(row.adviserId ?? row.AdviserId ?? '').trim() === selectedAdviserId);
  }, [availabilities, selectedAdviserId]);

  const availableDays = useMemo(() => {
    return Array.from(
      new Set(
        adviserAvailabilities
          .map((row) => String(row.dayOfWeek ?? row.DayOfWeek ?? '').trim())
          .filter((day) => day.length > 0)
          .map((day) => normalizeDay(day)),
      ),
    );
  }, [adviserAvailabilities]);

  useEffect(() => {
    if (availableDays.length === 0) {
      setSelectedDay('');
      setSelectedSlot('');
      return;
    }

    if (!availableDays.includes(selectedDay)) {
      setSelectedDay(availableDays[0]);
      setSelectedSlot('');
    }
  }, [availableDays, selectedDay]);

  const selectedDayAvailability = useMemo(() => {
    return adviserAvailabilities.find((row) => normalizeDay(String(row.dayOfWeek ?? row.DayOfWeek ?? '')) === selectedDay) ?? null;
  }, [adviserAvailabilities, selectedDay]);

  const selectableSlots = useMemo(() => {
    if (!selectedDayAvailability) {
      return [];
    }
    return normalizeSlots(selectedDayAvailability.slots ?? selectedDayAvailability.Slots);
  }, [selectedDayAvailability]);

  useEffect(() => {
    if (selectableSlots.length === 0) {
      setSelectedSlot('');
      return;
    }

    if (!selectableSlots.includes(selectedSlot)) {
      setSelectedSlot(selectableSlots[0]);
    }
  }, [selectableSlots, selectedSlot]);

  const selectedLocation = String(selectedDayAvailability?.location ?? selectedDayAvailability?.Location ?? '').trim();
  const selectedSessionMinutes = selectedDayAvailability ? parseSessionMinutes(selectedDayAvailability) : 30;
  const yearLevelName = String(dashboard?.yearLevelName ?? dashboard?.YearLevelName ?? '').trim();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="tracking-tight">Book Appointment</h2>
          <p className="text-gray-600">Select adviser, day, and backend-provided slot availability</p>
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

      {isLoading ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-500">Loading assigned advisers...</p>
          </CardContent>
        </Card>
      ) : assignedAdvisers.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-500">No adviser assigned to your year level yet.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="border-green-200 shadow-md">
            <CardContent className="pt-6">
              <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-green-900">
                      {String(selectedAdviser?.fullName ?? selectedAdviser?.FullName ?? selectedAdviser?.username ?? selectedAdviser?.Username ?? 'Adviser')}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">Only advisers assigned to your year level are available for booking.</p>
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-green-200 shadow-md">
              <CardHeader className="bg-gradient-to-r from-green-50 to-yellow-50 border-b border-green-200">
                <CardTitle className="text-green-900">Appointment Details</CardTitle>
                <CardDescription>Step 1 to 3: Adviser, day, and time slot</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Step 1: Select Adviser</label>
                  <Select value={selectedAdviserId} onValueChange={setSelectedAdviserId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select adviser" />
                    </SelectTrigger>
                    <SelectContent>
                      {assignedAdvisers.map((adviser, index) => {
                        const adviserId = String(adviser.adviserId ?? adviser.AdviserId ?? index).trim();
                        const fullName = String(adviser.fullName ?? adviser.FullName ?? '').trim();
                        const username = String(adviser.username ?? adviser.Username ?? '').trim();
                        const displayName = fullName || username || 'Adviser';
                        return (
                          <SelectItem key={adviserId} value={adviserId}>{displayName}</SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Step 2: Select Day</label>
                  <Select value={selectedDay} onValueChange={setSelectedDay} disabled={availableDays.length === 0}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select day" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableDays.map((day) => (
                        <SelectItem key={day} value={day}>{day}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Appointment Type</label>
                  <Input
                    value={appointmentType}
                    onChange={(e) => setAppointmentType(e.target.value)}
                    placeholder="Type your appointment purpose"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Notes (Optional)</label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Briefly describe what you'd like to discuss..."
                    className="min-h-[100px]"
                  />
                </div>

                <Button disabled className="w-full bg-gradient-to-r from-green-400 to-yellow-400 hover:from-green-500 hover:to-yellow-500 text-white">
                  Book Appointment
                </Button>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Card className="border-green-200 shadow-md">
                <CardHeader className="bg-gradient-to-r from-green-50 to-yellow-50 border-b border-green-200">
                  <CardTitle className="text-green-900">Available Time Slots</CardTitle>
                  <CardDescription>Step 3: Select a backend-provided slot from {selectedDay || 'selected day'}</CardDescription>
                </CardHeader>
                <CardContent className="pt-6 space-y-3">
                  <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
                    Session duration: {selectedSessionMinutes} minutes (from SessionMinutes)
                  </div>

                  {selectedLocation && (
                    <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      <span>Location: {selectedLocation}</span>
                    </div>
                  )}

                  {selectedAdviserId && availableDays.length === 0 ? (
                    <p className="text-sm text-gray-500">No available schedule for this adviser.</p>
                  ) : selectableSlots.length === 0 ? (
                    <p className="text-sm text-gray-500">No available schedule for this adviser.</p>
                  ) : (
                    <div className="space-y-2">
                      {selectableSlots.map((slot) => {
                        const isSelected = selectedSlot === slot;
                        return (
                          <button
                            key={slot}
                            type="button"
                            onClick={() => setSelectedSlot(slot)}
                            className={`w-full rounded-md border px-3 py-3 text-left flex items-center justify-between transition-colors ${isSelected ? 'border-green-400 bg-green-50' : 'border-gray-200 bg-white hover:bg-gray-50'}`}
                          >
                            <span className="flex items-center gap-2 font-medium text-gray-800">
                              <Clock className="h-4 w-4" />
                              {slot}
                            </span>
                            <Badge className={isSelected ? 'bg-green-100 text-green-800 border-green-300' : 'bg-gray-100 text-gray-700 border-gray-300'}>
                              {isSelected ? 'Selected' : 'Available'}
                            </Badge>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-blue-200 shadow-sm bg-blue-50/50">
                <CardHeader>
                  <CardTitle className="text-blue-900 text-base">Booking Guidelines</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm text-blue-900 list-disc pl-5 space-y-1">
                    <li>Slots come directly from backend availability response.</li>
                    <li>Only Monday to Saturday schedules are shown.</li>
                    <li>Session duration follows SessionMinutes from API.</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={loadBookingData}>
              <RefreshCcw className="h-4 w-4 mr-2" />
              Refresh Booking Data
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
