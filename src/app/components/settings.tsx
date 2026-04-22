import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Toaster } from './ui/sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

type DayKey = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday';

type DaySchedule = {
  enabled: boolean;
  startTime: string;
  endTime: string;
  location: string;
  availabilityId: string;
};

type AvailabilityState = Record<DayKey, DaySchedule>;

interface AdviserAvailabilityRow {
  availabilityId?: number | string | null;
  adviserId?: number | string | null;
  dayOfWeek?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  location?: string | null;
}

const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ?? 'https://localhost:53005/api';

const PROFILE_STORAGE_KEY = 'adviser_profile_preferences';

const DAY_LABEL_BY_KEY: Record<DayKey, string> = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
};

const DAY_KEYS: DayKey[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

const DEFAULT_DAY_SCHEDULE: DaySchedule = {
  enabled: false,
  startTime: '09:00',
  endTime: '17:00',
  location: '',
  availabilityId: '',
};

const DEFAULT_AVAILABILITY: AvailabilityState = {
  monday: { ...DEFAULT_DAY_SCHEDULE },
  tuesday: { ...DEFAULT_DAY_SCHEDULE },
  wednesday: { ...DEFAULT_DAY_SCHEDULE },
  thursday: { ...DEFAULT_DAY_SCHEDULE },
  friday: { ...DEFAULT_DAY_SCHEDULE },
  saturday: { ...DEFAULT_DAY_SCHEDULE, endTime: '12:00' },
};

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

  throw new Error('Unable to reach settings endpoint.');
}

function getAuthToken(): string | null {
  const rawToken = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
  if (!rawToken) {
    return null;
  }

  return rawToken.replace(/^Bearer\s+/i, '').trim();
}

function redirectToLogin(): void {
  localStorage.removeItem('auth_token');
  sessionStorage.removeItem('auth_token');
  window.location.assign('/');
}

function getApiErrorMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== 'object') {
    return fallback;
  }

  const data = payload as {
    message?: string;
    error?: string;
    title?: string;
    errors?: Record<string, string[]>;
  };

  const validationError = data.errors
    ? Object.values(data.errors).flat().find((value) => Boolean(value))
    : undefined;

  return validationError || data.message || data.error || data.title || fallback;
}

function getArrayPayload<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) {
    return payload as T[];
  }

  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>;

    if (Array.isArray(record.availabilities)) {
      return record.availabilities as T[];
    }

    if (Array.isArray(record.data)) {
      return record.data as T[];
    }

    if (Array.isArray(record.items)) {
      return record.items as T[];
    }
  }

  return [];
}

function normalizeTime(raw: unknown, fallback: string): string {
  const text = String(raw ?? '').trim();
  if (!text) {
    return fallback;
  }

  const match = text.match(/^(\d{1,2}):(\d{2})/);
  if (!match) {
    return fallback;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return fallback;
  }

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function toDayKey(dayValue: unknown): DayKey | null {
  const day = String(dayValue ?? '').trim().toLowerCase();
  if (day === 'monday' || day === 'mon') return 'monday';
  if (day === 'tuesday' || day === 'tue' || day === 'tues') return 'tuesday';
  if (day === 'wednesday' || day === 'wed') return 'wednesday';
  if (day === 'thursday' || day === 'thu' || day === 'thur' || day === 'thurs') return 'thursday';
  if (day === 'friday' || day === 'fri') return 'friday';
  if (day === 'saturday' || day === 'sat') return 'saturday';
  return null;
}

function toApiDayValue(dayKey: DayKey): string {
  return DAY_LABEL_BY_KEY[dayKey].toUpperCase();
}

function parseTimeToMinutes(time: string): number {
  const parts = time.split(':').map((value) => Number(value));
  if (parts.length < 2 || parts.some((value) => !Number.isFinite(value))) {
    return -1;
  }

  const [hour, minute] = parts;
  return hour * 60 + minute;
}

function validateAvailabilities(
  rows: Array<{
    dayOfWeek?: string;
    startTime?: string;
    endTime?: string;
    location?: string | null;
  } | null | undefined>,
): string | null {
  if (!Array.isArray(rows) || rows.length === 0) {
    return 'Availabilities must contain at least one item.';
  }

  const allowedDays = new Set(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY']);

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    if (!row) {
      return `Availabilities[${index}] must not be null.`;
    }

    const dayOfWeek = String(row.dayOfWeek ?? '').trim().toUpperCase();
    const startTime = String(row.startTime ?? '').trim();
    const endTime = String(row.endTime ?? '').trim();

    if (!dayOfWeek) {
      return `Availabilities[${index}]: DayOfWeek is required.`;
    }

    if (!allowedDays.has(dayOfWeek)) {
      return `Availabilities[${index}]: DayOfWeek must be MONDAY to SATURDAY.`;
    }

    if (!startTime) {
      return `Availabilities[${index}]: StartTime is required.`;
    }

    if (!endTime) {
      return `Availabilities[${index}]: EndTime is required.`;
    }

    const startMinutes = parseTimeToMinutes(startTime);
    const endMinutes = parseTimeToMinutes(endTime);
    if (startMinutes < 0 || endMinutes < 0) {
      return `Availabilities[${index}]: Invalid time format.`;
    }

    if (endMinutes <= startMinutes) {
      return `Availabilities[${index}]: EndTime must be greater than StartTime.`;
    }
  }

  return null;
}

export function Settings() {
  const [advisorName, setAdvisorName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState('Computer Engineering');
  const [availability, setAvailability] = useState<AvailabilityState>(DEFAULT_AVAILABILITY);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [statusError, setStatusError] = useState('');
  const [statusSuccess, setStatusSuccess] = useState('');

  const loadProfileFromStorage = () => {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) {
      return;
    }

    try {
      const payload = JSON.parse(raw) as {
        advisorName?: string;
        email?: string;
        phone?: string;
        department?: string;
      };

      setAdvisorName(String(payload.advisorName ?? '').trim());
      setEmail(String(payload.email ?? '').trim());
      setPhone(String(payload.phone ?? '').trim());
      setDepartment(String(payload.department ?? 'Computer Engineering') || 'Computer Engineering');
    } catch {
      // Ignore corrupted local profile data.
    }
  };

  const loadAvailability = async () => {
    setIsLoading(true);
    setStatusError('');
    setStatusSuccess('');

    try {
      const token = getAuthToken();
      if (!token) {
        redirectToLogin();
        return;
      }

      const headers = {
        Authorization: `Bearer ${token}`,
      };

      const response = await fetchWithApiFallback('/advisers/me/availabilities', { headers });
      if (response.status === 401) {
        redirectToLogin();
        return;
      }

      const payload = await response.json().catch(() => ([]));
      if (!response.ok) {
        throw new Error(getApiErrorMessage(payload, 'Unable to load adviser availability settings.'));
      }

      const rows = getArrayPayload<AdviserAvailabilityRow>(payload);
      if (rows.length === 0) {
        setAvailability(DEFAULT_AVAILABILITY);
        return;
      }

      const nextAvailability: AvailabilityState = {
        monday: { ...DEFAULT_AVAILABILITY.monday },
        tuesday: { ...DEFAULT_AVAILABILITY.tuesday },
        wednesday: { ...DEFAULT_AVAILABILITY.wednesday },
        thursday: { ...DEFAULT_AVAILABILITY.thursday },
        friday: { ...DEFAULT_AVAILABILITY.friday },
        saturday: { ...DEFAULT_AVAILABILITY.saturday },
      };

      rows.forEach((row) => {
        const dayKey = toDayKey(row.dayOfWeek);
        if (!dayKey) {
          return;
        }

        nextAvailability[dayKey] = {
          enabled: true,
          startTime: normalizeTime(row.startTime, nextAvailability[dayKey].startTime),
          endTime: normalizeTime(row.endTime, nextAvailability[dayKey].endTime),
          location: String(row.location ?? '').trim(),
          availabilityId: String(row.availabilityId ?? '').trim(),
        };
      });

      setAvailability(nextAvailability);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to load adviser availability settings.';
      setStatusError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProfileFromStorage();
    loadAvailability();
  }, []);

  const updateDayAvailability = (day: DayKey, field: keyof DaySchedule, value: string | boolean) => {
    setAvailability((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value,
      },
    }));
  };

  const timeOptions = useMemo(() => {
    const times: Array<{ value: string; label: string }> = [];
    for (let hour = 7; hour <= 20; hour += 1) {
      for (let minute = 0; minute < 60; minute += 30) {
        const value = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
        const date = new Date(`2000-01-01T${value}:00`);
        const label = date.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        });
        times.push({ value, label });
      }
    }
    return times;
  }, []);

  const handleCancel = () => {
    setStatusError('');
    setStatusSuccess('');
    loadProfileFromStorage();
    loadAvailability();
  };

  const handleSaveChanges = async () => {
    setIsSaving(true);
    setStatusError('');
    setStatusSuccess('');

    try {
      localStorage.setItem(
        PROFILE_STORAGE_KEY,
        JSON.stringify({
          advisorName,
          email,
          phone,
          department,
        }),
      );

      const availabilities = DAY_KEYS
        .filter((dayKey) => availability[dayKey].enabled)
        .map((dayKey) => ({
          dayOfWeek: toApiDayValue(dayKey),
          startTime: `${availability[dayKey].startTime}:00`,
          endTime: `${availability[dayKey].endTime}:00`,
          location: availability[dayKey].location.trim() || null,
        }));

      const token = getAuthToken();
      if (!token) {
        redirectToLogin();
        return;
      }

      const validationError = validateAvailabilities(availabilities);
      if (validationError) {
        setStatusError(validationError);
        toast.error(validationError);
        return;
      }

      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      };

      const response = await fetchWithApiFallback('/advisers/me/availabilities', {
        method: 'PUT',
        headers,
        body: JSON.stringify({ availabilities }),
      });

      if (response.status === 401) {
        redirectToLogin();
        return;
      }

      const result = await response.json().catch(() => ({}));
      if (response.status === 400) {
        throw new Error(getApiErrorMessage(result, 'Validation failed while saving availability settings.'));
      }

      if (!response.ok) {
        throw new Error(getApiErrorMessage(result, 'Unable to save adviser availability settings.'));
      }

      setStatusSuccess('Settings saved successfully.');
      toast.success('Availability settings saved.');
      await loadAvailability();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to save settings.';
      setStatusError(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Toaster richColors position="top-right" />

      <div>
        <h2 className="tracking-tight">Settings</h2>
        <p className="text-gray-600">Manage your profile preferences and adviser availability</p>
      </div>

      {statusError && (
        <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertCircle className="h-4 w-4" />
          <span>{statusError}</span>
        </div>
      )}

      {statusSuccess && (
        <div className="flex items-center gap-2 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
          <CheckCircle2 className="h-4 w-4" />
          <span>{statusSuccess}</span>
        </div>
      )}

      <Card className="border-green-200 shadow-md">
        <CardHeader className="bg-gradient-to-r from-green-50 to-yellow-50 border-b border-green-200">
          <CardTitle className="text-green-900">Advisor Information</CardTitle>
          <CardDescription>Update your personal details and appointment availability preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="advisor-name">Full Name</Label>
              <Input
                id="advisor-name"
                value={advisorName}
                onChange={(e) => setAdvisorName(e.target.value)}
                className="border-gray-300"
                placeholder="Enter full name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="border-gray-300"
                placeholder="Enter email address"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="border-gray-300"
                placeholder="Enter phone number"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Select value={department} onValueChange={setDepartment}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Computer Engineering">Computer Engineering</SelectItem>
                  <SelectItem value="Electrical Engineering">Electrical Engineering</SelectItem>
                  <SelectItem value="Electronics Engineering">Electronics Engineering</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-3 border border-gray-200 rounded-lg p-4 bg-gray-50">
            <Label>Weekly Availability Schedule</Label>
            <p className="text-xs text-gray-500">Availability is loaded from and saved to /api/advisers/me/availabilities.</p>

            {isLoading ? (
              <p className="text-sm text-gray-500">Loading adviser availability...</p>
            ) : (
              <div className="space-y-3 mt-4">
                {DAY_KEYS.map((day) => {
                  const schedule = availability[day];
                  return (
                    <div key={day} className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2 w-36">
                            <input
                              type="checkbox"
                              id={`${day}-enabled`}
                              checked={schedule.enabled}
                              onChange={(e) => updateDayAvailability(day, 'enabled', e.target.checked)}
                              className="h-4 w-4 text-green-600 rounded border-gray-300 focus:ring-green-500"
                            />
                            <Label htmlFor={`${day}-enabled`} className="capitalize cursor-pointer">
                              {DAY_LABEL_BY_KEY[day]}
                            </Label>
                          </div>

                          {schedule.enabled && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 flex-1">
                              <div>
                                <Label htmlFor={`${day}-start`} className="text-xs text-gray-600">Start Time</Label>
                                <Select
                                  value={schedule.startTime}
                                  onValueChange={(value) => updateDayAvailability(day, 'startTime', value)}
                                >
                                  <SelectTrigger id={`${day}-start`} className="mt-1">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {timeOptions.map((time) => (
                                      <SelectItem key={`${day}-start-${time.value}`} value={time.value}>
                                        {time.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              <div>
                                <Label htmlFor={`${day}-end`} className="text-xs text-gray-600">End Time</Label>
                                <Select
                                  value={schedule.endTime}
                                  onValueChange={(value) => updateDayAvailability(day, 'endTime', value)}
                                >
                                  <SelectTrigger id={`${day}-end`} className="mt-1">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {timeOptions.map((time) => (
                                      <SelectItem key={`${day}-end-${time.value}`} value={time.value}>
                                        {time.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              <div>
                                <Label htmlFor={`${day}-location`} className="text-xs text-gray-600">Location (Optional)</Label>
                                <Input
                                  id={`${day}-location`}
                                  value={schedule.location}
                                  onChange={(e) => updateDayAvailability(day, 'location', e.target.value)}
                                  className="mt-1 border-gray-300"
                                  placeholder="Office / Room"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={handleCancel} disabled={isSaving || isLoading}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveChanges}
              disabled={isLoading || isSaving}
              className="bg-gradient-to-r from-green-600 to-yellow-500 hover:from-green-700 hover:to-yellow-600 text-white"
            >
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
