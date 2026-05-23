import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Copy, Plus, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Toaster } from './ui/sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

type DayKey = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday';

type DayAvailabilitySlot = {
  startTime: string;
  endTime: string;
  availabilityId: string;
};

type DaySchedule = {
  enabled: boolean;
  slots: DayAvailabilitySlot[];
};

type AvailabilityState = Record<DayKey, DaySchedule>;

type AvailabilitySlotOption = {
  value: string;
  label: string;
};

interface AdviserAvailabilityRow {
  availabilityId?: number | string | null;
  adviserId?: number | string | null;
  dayOfWeek?: string | null;
  startTime?: string | null;
  endTime?: string | null;
}

interface UserDirectoryRow {
  userId?: number | string | null;
  UserId?: number | string | null;
  id?: number | string | null;
  username?: string | null;
  Username?: string | null;
  userName?: string | null;
  UserName?: string | null;
  firstName?: string | null;
  FirstName?: string | null;
  lastName?: string | null;
  LastName?: string | null;
  email?: string | null;
  Email?: string | null;
}

const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ?? 'https://localhost:53005/api';

const PROFILE_STORAGE_KEY = 'adviser_profile_preferences';
const SESSION_STORAGE_KEY = 'app_session';

const DAY_LABEL_BY_KEY: Record<DayKey, string> = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
};

const DAY_KEYS: DayKey[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const AVAILABILITY_START_MINUTES = 7 * 60;
const AVAILABILITY_END_MINUTES = 21 * 60;
const AVAILABILITY_INTERVAL_MINUTES = 30;

function createDefaultSlot(overrides?: Partial<DayAvailabilitySlot>): DayAvailabilitySlot {
  return {
    startTime: '07:00',
    endTime: '07:30',
    availabilityId: '',
    ...overrides,
  };
}

function createDefaultDaySchedule(defaultSlot?: Partial<DayAvailabilitySlot>): DaySchedule {
  return {
    enabled: false,
    slots: [createDefaultSlot(defaultSlot)],
  };
}

function createDefaultAvailabilityState(): AvailabilityState {
  return {
    monday: createDefaultDaySchedule(),
    tuesday: createDefaultDaySchedule(),
    wednesday: createDefaultDaySchedule(),
    thursday: createDefaultDaySchedule(),
    friday: createDefaultDaySchedule(),
    saturday: createDefaultDaySchedule(),
  };
}

const DEFAULT_AVAILABILITY: AvailabilityState = createDefaultAvailabilityState();

const EMPTY_AVAILABILITY: AvailabilityState = {
  monday: { enabled: false, slots: [] },
  tuesday: { enabled: false, slots: [] },
  wednesday: { enabled: false, slots: [] },
  thursday: { enabled: false, slots: [] },
  friday: { enabled: false, slots: [] },
  saturday: { enabled: false, slots: [] },
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

function getCurrentUserId(): string {
  const rawSession = sessionStorage.getItem(SESSION_STORAGE_KEY) || localStorage.getItem(SESSION_STORAGE_KEY);
  if (!rawSession) {
    return '';
  }

  try {
    const payload = JSON.parse(rawSession) as { currentUser?: { id?: string | number } };
    return String(payload.currentUser?.id ?? '').trim();
  } catch {
    return '';
  }
}

function getCurrentUserName(): string {
  const rawSession = sessionStorage.getItem(SESSION_STORAGE_KEY) || localStorage.getItem(SESSION_STORAGE_KEY);
  if (!rawSession) {
    return '';
  }

  try {
    const payload = JSON.parse(rawSession) as { currentUser?: { name?: string } };
    return String(payload.currentUser?.name ?? '').trim();
  } catch {
    return '';
  }
}

function getProfileStorageKey(): string {
  const userId = getCurrentUserId();
  return userId ? `${PROFILE_STORAGE_KEY}:${userId}` : PROFILE_STORAGE_KEY;
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

function minutesToTime(totalMinutes: number): string {
  const clamped = Math.max(0, Math.min(23 * 60 + 30, totalMinutes));
  const hours = Math.floor(clamped / 60);
  const minutes = clamped % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function formatTimeLabel(totalMinutes: number): string {
  const date = new Date(`2000-01-01T${minutesToTime(totalMinutes)}:00`);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function getSlotKey(startTime: string, endTime: string): string {
  return `${normalizeTime(startTime, '07:00')}|${normalizeTime(endTime, '07:30')}`;
}

function getSlotLabel(startTime: string, endTime: string): string {
  const startLabel = formatTimeLabel(parseTimeToMinutes(normalizeTime(startTime, '07:00')));
  const endLabel = formatTimeLabel(parseTimeToMinutes(normalizeTime(endTime, '07:30')));
  return `${startLabel} - ${endLabel}`;
}

function parseSlotKey(value: string): { startTime: string; endTime: string } {
  const [startTime = '', endTime = ''] = String(value ?? '').split('|');
  return {
    startTime: normalizeTime(startTime, '07:00'),
    endTime: normalizeTime(endTime, '07:30'),
  };
}

function createAvailabilitySlotOptions(): AvailabilitySlotOption[] {
  const options: AvailabilitySlotOption[] = [];
  for (let startMinutes = AVAILABILITY_START_MINUTES; startMinutes + AVAILABILITY_INTERVAL_MINUTES <= AVAILABILITY_END_MINUTES; startMinutes += AVAILABILITY_INTERVAL_MINUTES) {
    const endMinutes = startMinutes + AVAILABILITY_INTERVAL_MINUTES;
    const startTime = minutesToTime(startMinutes);
    const endTime = minutesToTime(endMinutes);
    options.push({
      value: getSlotKey(startTime, endTime),
      label: `${formatTimeLabel(startMinutes)} - ${formatTimeLabel(endMinutes)}`,
    });
  }
  return options;
}

function createSlotFromOption(option: AvailabilitySlotOption, overrides?: Partial<DayAvailabilitySlot>): DayAvailabilitySlot {
  const { startTime, endTime } = parseSlotKey(option.value);
  return createDefaultSlot({
    startTime,
    endTime,
    ...overrides,
  });
}

function getSlotValue(slot: DayAvailabilitySlot): string {
  return getSlotKey(slot.startTime, slot.endTime);
}

function getNextAvailableSlot(existingSlots: DayAvailabilitySlot[]): DayAvailabilitySlot {
  const used = new Set(existingSlots.map((slot) => getSlotValue(slot)));
  const nextOption = createAvailabilitySlotOptions().find((option) => !used.has(option.value));
  if (!nextOption) {
    return createDefaultSlot();
  }

  return createSlotFromOption(nextOption);
}

function normalizeEditedSlot(slot: DayAvailabilitySlot, field: keyof DayAvailabilitySlot): DayAvailabilitySlot {
  const startMinutes = parseTimeToMinutes(slot.startTime);
  const endMinutes = parseTimeToMinutes(slot.endTime);

  if (startMinutes < 0 || endMinutes < 0) {
    return slot;
  }

  if (endMinutes > startMinutes) {
    return slot;
  }

  if (field === 'startTime') {
    return {
      ...slot,
      endTime: minutesToTime(startMinutes + 30),
    };
  }

  if (field === 'endTime') {
    return {
      ...slot,
      startTime: minutesToTime(endMinutes - 30),
    };
  }

  return slot;
}

function validateAvailabilities(
  rows: Array<{
    dayOfWeek?: string;
    startTime?: string;
    endTime?: string;
  } | null | undefined>,
): string | null {
  if (!Array.isArray(rows) || rows.length === 0) {
    return 'Availabilities must contain at least one item.';
  }

  const allowedDays = new Set(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY']);
  const rangesByDay = new Map<string, Array<{ start: number; end: number }>>();

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

    if (startMinutes < AVAILABILITY_START_MINUTES || endMinutes > AVAILABILITY_END_MINUTES) {
      return `Availabilities[${index}]: Time must stay between 7:00 AM and 9:00 PM.`;
    }

    if (startMinutes % AVAILABILITY_INTERVAL_MINUTES !== 0 || endMinutes % AVAILABILITY_INTERVAL_MINUTES !== 0) {
      return `Availabilities[${index}]: Time must use 30-minute intervals.`;
    }

    if (endMinutes - startMinutes !== AVAILABILITY_INTERVAL_MINUTES) {
      return `Availabilities[${index}]: Each availability slot must be exactly 30 minutes.`;
    }

    if (endMinutes <= startMinutes) {
      return `Availabilities[${index}]: EndTime must be greater than StartTime.`;
    }

    const ranges = rangesByDay.get(dayOfWeek) ?? [];
    const overlaps = ranges.some((range) => startMinutes < range.end && endMinutes > range.start);
    if (overlaps) {
      return `Availabilities[${index}]: Overlapping time ranges are not allowed in the same day.`;
    }

    ranges.push({ start: startMinutes, end: endMinutes });
    rangesByDay.set(dayOfWeek, ranges);
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
    const raw = localStorage.getItem(getProfileStorageKey());
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
      setPhone(String(payload.phone ?? '').trim());
      setDepartment(String(payload.department ?? 'Computer Engineering') || 'Computer Engineering');
    } catch {
      // Ignore corrupted local profile data.
    }
  };

  const loadUserEmail = async () => {
    const token = getAuthToken();
    if (!token) {
      redirectToLogin();
      return;
    }

    try {
      const headers = {
        Authorization: `Bearer ${token}`,
      };

      const response = await fetchWithApiFallback('/users', { headers });
      if (response.status === 401) {
        redirectToLogin();
        return;
      }

      const payload = await response.json().catch(() => ([]));
      if (!response.ok) {
        return;
      }

      const rows = Array.isArray(payload) ? (payload as UserDirectoryRow[]) : [];
      const currentUserId = getCurrentUserId();
      const currentUserName = getCurrentUserName();
      if (!currentUserId && !currentUserName) {
        return;
      }

      const normalizedCurrentName = currentUserName.trim().toLowerCase();

      const match = rows.find((row) => {
        const rowId = String(row.userId ?? row.UserId ?? row.id ?? '').trim();
        if (rowId && currentUserId && rowId === currentUserId) {
          return true;
        }

        const rowUsername = String(row.username ?? row.Username ?? row.userName ?? row.UserName ?? '').trim();
        if (rowUsername && normalizedCurrentName && rowUsername === normalizedCurrentName) {
          return true;
        }

        const firstName = String(row.firstName ?? row.FirstName ?? '').trim();
        const lastName = String(row.lastName ?? row.LastName ?? '').trim();
        const rowFullName = `${firstName} ${lastName}`.trim().toLowerCase();
        return rowFullName && normalizedCurrentName && rowFullName === normalizedCurrentName;
      });

      const normalizedEmail = String(match?.email ?? match?.Email ?? '').trim();
      if (normalizedEmail) {
        setEmail(normalizedEmail);
      }
    } catch {
      // Ignore email load failures to avoid blocking settings.
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
        setAvailability(createDefaultAvailabilityState());
        return;
      }

      const nextAvailability: AvailabilityState = {
        monday: { ...EMPTY_AVAILABILITY.monday, slots: [] },
        tuesday: { ...EMPTY_AVAILABILITY.tuesday, slots: [] },
        wednesday: { ...EMPTY_AVAILABILITY.wednesday, slots: [] },
        thursday: { ...EMPTY_AVAILABILITY.thursday, slots: [] },
        friday: { ...EMPTY_AVAILABILITY.friday, slots: [] },
        saturday: { ...EMPTY_AVAILABILITY.saturday, slots: [] },
      };

      rows.forEach((row) => {
        const dayKey = toDayKey(row.dayOfWeek);
        if (!dayKey) {
          return;
        }

        nextAvailability[dayKey].enabled = true;
        nextAvailability[dayKey].slots.push({
          startTime: normalizeTime(row.startTime, '07:00'),
          endTime: normalizeTime(row.endTime, '07:30'),
          availabilityId: String(row.availabilityId ?? '').trim(),
        });
      });

      DAY_KEYS.forEach((dayKey) => {
        if (nextAvailability[dayKey].slots.length === 0) {
          nextAvailability[dayKey].slots = [createDefaultSlot()];
        }
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
    loadUserEmail();
    loadAvailability();
  }, []);

  const updateDayEnabled = (day: DayKey, enabled: boolean) => {
    setAvailability((prev) => {
      const next = { ...prev };
      const current = next[day];
      next[day] = {
        ...current,
        enabled,
        slots: current.slots.length > 0
          ? current.slots
          : [createDefaultSlot()],
      };
      return next;
    });
  };

  const updateDaySlotRange = (day: DayKey, index: number, value: string) => {
    const { startTime, endTime } = parseSlotKey(value);
    setAvailability((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        slots: prev[day].slots.map((slot, slotIndex) => (
          slotIndex === index
            ? {
                ...slot,
                startTime,
                endTime,
              }
            : slot
        )),
      },
    }));
  };

  const updateDaySlot = (day: DayKey, index: number, field: keyof DayAvailabilitySlot, value: string) => {
    setAvailability((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        slots: prev[day].slots.map((slot, slotIndex) => (
          slotIndex === index
            ? normalizeEditedSlot({
                ...slot,
                [field]: value,
              }, field)
            : slot
        )),
      },
    }));
  };

  const addDaySlot = (day: DayKey) => {
    setAvailability((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        enabled: true,
        slots: [...prev[day].slots, getNextAvailableSlot(prev[day].slots)],
      },
    }));
  };

  const removeDaySlot = (day: DayKey, index: number) => {
    setAvailability((prev) => {
      const remaining = prev[day].slots.filter((_, slotIndex) => slotIndex !== index);
      return {
        ...prev,
        [day]: {
          ...prev[day],
          slots: remaining.length > 0
            ? remaining
            : [createDefaultSlot()],
        },
      };
    });
  };

  const copyDayToWholeWeek = (sourceDay: DayKey) => {
    setAvailability((prev) => {
      const sourceSlots = prev[sourceDay].slots.map((slot) => ({
        ...slot,
        availabilityId: '',
      }));

      const next: AvailabilityState = {
        monday: { ...prev.monday, enabled: prev[sourceDay].enabled, slots: sourceSlots.map((slot) => ({ ...slot })) },
        tuesday: { ...prev.tuesday, enabled: prev[sourceDay].enabled, slots: sourceSlots.map((slot) => ({ ...slot })) },
        wednesday: { ...prev.wednesday, enabled: prev[sourceDay].enabled, slots: sourceSlots.map((slot) => ({ ...slot })) },
        thursday: { ...prev.thursday, enabled: prev[sourceDay].enabled, slots: sourceSlots.map((slot) => ({ ...slot })) },
        friday: { ...prev.friday, enabled: prev[sourceDay].enabled, slots: sourceSlots.map((slot) => ({ ...slot })) },
        saturday: { ...prev.saturday, enabled: prev[sourceDay].enabled, slots: sourceSlots.map((slot) => ({ ...slot })) },
      };

      return next;
    });

    toast.success(`Copied ${DAY_LABEL_BY_KEY[sourceDay]} schedule to the whole week.`);
  };

  const timeOptions = useMemo(() => createAvailabilitySlotOptions(), []);

  const handleCancel = () => {
    setStatusError('');
    setStatusSuccess('');
    loadProfileFromStorage();
    loadUserEmail();
    loadAvailability();
  };

  const handleSaveChanges = async () => {
    setIsSaving(true);
    setStatusError('');
    setStatusSuccess('');

    try {
      localStorage.setItem(
        getProfileStorageKey(),
        JSON.stringify({
          advisorName,
          phone,
          department,
        }),
      );

      const availabilities = DAY_KEYS
        .filter((dayKey) => availability[dayKey].enabled)
        .flatMap((dayKey) => availability[dayKey].slots.map((slot) => ({
          dayOfWeek: toApiDayValue(dayKey),
          startTime: `${slot.startTime}:00`,
          endTime: `${slot.endTime}:00`,
        })));

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
                className="border-gray-300"
                placeholder="Enter email address"
                readOnly
                disabled
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
            <p className="text-xs text-gray-500">Set multiple time ranges per day, and copy a day schedule to the whole week.</p>

            {isLoading ? (
              <p className="text-sm text-gray-500">Loading adviser availability...</p>
            ) : (
              <div className="space-y-3 mt-4">
                {DAY_KEYS.map((day) => {
                  const schedule = availability[day];
                  return (
                    <div key={day} className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex flex-col gap-3">
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id={`${day}-enabled`}
                              checked={schedule.enabled}
                              onChange={(e) => updateDayEnabled(day, e.target.checked)}
                              className="h-4 w-4 text-green-600 rounded border-gray-300 focus:ring-green-500"
                            />
                            <Label htmlFor={`${day}-enabled`} className="capitalize cursor-pointer">
                              {DAY_LABEL_BY_KEY[day]}
                            </Label>
                          </div>

                          {schedule.enabled && (
                            <div className="flex flex-wrap gap-2">
                              <Button type="button" size="sm" variant="outline" onClick={() => addDaySlot(day)}>
                                <Plus className="h-4 w-4 mr-1" />
                                Add Time Slot
                              </Button>
                              <Button type="button" size="sm" variant="outline" onClick={() => copyDayToWholeWeek(day)}>
                                <Copy className="h-4 w-4 mr-1" />
                                Populate Whole Week
                              </Button>
                            </div>
                          )}
                        </div>

                        {schedule.enabled && (
                          <div className="space-y-3">
                            {schedule.slots.map((slot, slotIndex) => (
                              <div key={`${day}-slot-${slotIndex}`} className="grid grid-cols-1 md:grid-cols-7 gap-3 items-end rounded-md border border-gray-100 p-3">
                                <div className="md:col-span-4">
                                  <Label className="text-xs text-gray-600">Time Slot</Label>
                                  <Select
                                    value={getSlotValue(slot)}
                                    onValueChange={(value) => updateDaySlotRange(day, slotIndex, value)}
                                  >
                                    <SelectTrigger className="mt-1">
                                      <SelectValue placeholder="Select a time slot" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {timeOptions
                                        .filter((time) => {
                                          const currentValue = getSlotValue(slot);
                                          const usedByOtherSlot = schedule.slots.some((existingSlot, existingIndex) => existingIndex !== slotIndex && getSlotValue(existingSlot) === time.value);
                                          return time.value === currentValue || !usedByOtherSlot;
                                        })
                                        .map((time) => (
                                          <SelectItem key={`${day}-slot-${slotIndex}-${time.value}`} value={time.value}>
                                            {time.label}
                                          </SelectItem>
                                        ))}
                                    </SelectContent>
                                  </Select>
                                  <p className="mt-1 text-xs text-gray-500">30-minute fixed slot.</p>
                                </div>

                                <div className="md:col-span-3 flex justify-end md:justify-end">
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => removeDaySlot(day, slotIndex)}
                                    disabled={schedule.slots.length <= 1}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
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
