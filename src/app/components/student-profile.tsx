import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Mail, User, AlertCircle, Pencil, Printer } from 'lucide-react';
import usjrLogo from '../../../usjr logo.jpg';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { ALL_SEMESTERS_VALUE, buildSemesterLabel, matchesSemesterSelection, sortSemesterLabels } from './semester-utils';

interface StudentProfileProps {
  onBack: () => void;
  studentId: number | string | null;
  onOpenAppointmentDetails?: (appointmentId: string) => void;
}

interface StudentApiRow {
  studentId?: number | string | null;
  StudentId?: number | string | null;
  userId?: number | string | null;
  UserId?: number | string | null;
  username?: string | null;
  Username?: string | null;
  userName?: string | null;
  UserName?: string | null;
  yearLevelId?: number | string | null;
  YearLevelId?: number | string | null;
  yearLevelName?: string | null;
  YearLevelName?: string | null;
  firstName?: string | null;
  FirstName?: string | null;
  lastName?: string | null;
  LastName?: string | null;
  email?: string | null;
  Email?: string | null;
}

interface UserApiRow {
  userId?: number | string | null;
  UserId?: number | string | null;
  username?: string | null;
  Username?: string | null;
  userName?: string | null;
  UserName?: string | null;
}

interface EnrollmentApiRow {
  enrollmentId?: number | string | null;
  EnrollmentId?: number | string | null;
  studentId?: number | string | null;
  StudentId?: number | string | null;
  courseId?: number | string | null;
  CourseId?: number | string | null;
  courseCode?: string | null;
  CourseCode?: string | null;
  courseName?: string | null;
  CourseName?: string | null;
  units?: number | string | null;
  Units?: number | string | null;
  semesterId?: number | string | null;
  SemesterId?: number | string | null;
  semesterName?: string | null;
  SemesterName?: string | null;
  schoolYear?: string | null;
  SchoolYear?: string | null;
  status?: string | null;
  Status?: string | null;
  currentGrade?: string | number | null;
  CurrentGrade?: string | number | null;
}

interface GradeApiRow {
  gradeId?: number | string | null;
  GradeId?: number | string | null;
  studentId?: number | string | null;
  StudentId?: number | string | null;
  courseId?: number | string | null;
  CourseId?: number | string | null;
  courseCode?: string | null;
  CourseCode?: string | null;
  courseName?: string | null;
  CourseName?: string | null;
  semesterId?: number | string | null;
  SemesterId?: number | string | null;
  semesterName?: string | null;
  SemesterName?: string | null;
  schoolYear?: string | null;
  SchoolYear?: string | null;
  gradeValue?: string | number | null;
  GradeValue?: string | number | null;
  currentGrade?: string | number | null;
  CurrentGrade?: string | number | null;
  units?: number | string | null;
  Units?: number | string | null;
  numberOfTakes?: number | string | null;
  NumberOfTakes?: number | string | null;
}

interface StudentDetails {
  studentId: string;
  userId: string;
  username: string;
  fullName: string;
  email: string;
  yearLevelName: string;
}

interface AppointmentApiRow {
  appointmentId?: number | string | null;
  AppointmentId?: number | string | null;
  studentId?: number | string | null;
  StudentId?: number | string | null;
  adviserId?: number | string | null;
  AdviserId?: number | string | null;
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
  attendanceStatus?: string | null;
  AttendanceStatus?: string | null;
}

interface AppointmentNoteApiRow {
  appointmentNoteId?: number | string | null;
  AppointmentNoteId?: number | string | null;
  appointmentId?: number | string | null;
  AppointmentId?: number | string | null;
  adviserId?: number | string | null;
  AdviserId?: number | string | null;
  adviserNotes?: string | null;
  AdviserNotes?: string | null;
}

interface AdvisingNoteRow {
  key: string;
  appointmentId: string;
  noteId: string;
  adviserId: string;
  adviserName: string;
  dateTime: string;
  appointmentType: string;
  status: string;
  attendance: string;
  notes: string;
}

type SessionUserRole = 'adviser' | 'student' | 'chairman' | 'admin';

const SESSION_STORAGE_KEY = 'app_session';

interface CurrentEnrollmentRow {
  key: string;
  courseId: string;
  courseCode: string;
  courseName: string;
  units: string;
  semester: string;
  currentGrade: string;
  failedGrade: string;
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

  throw new Error('Unable to reach student profile endpoints.');
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

function normalizeStudent(item: StudentApiRow): StudentDetails {
  const studentId = String(item.studentId ?? item.StudentId ?? '').trim();
  const userId = String(item.userId ?? item.UserId ?? '').trim();
  const username = String(item.username ?? item.Username ?? item.userName ?? item.UserName ?? '').trim();
  const firstName = String(item.firstName ?? item.FirstName ?? '').trim();
  const lastName = String(item.lastName ?? item.LastName ?? '').trim();
  const fullName = `${firstName} ${lastName}`.trim();

  return {
    studentId: studentId || 'Not Set',
    userId: userId || 'Not Set',
    username: username || studentId || userId || 'Not Set',
    fullName: fullName || username || studentId || userId || 'Unknown Student',
    email: String(item.email ?? item.Email ?? 'Not Set') || 'Not Set',
    yearLevelName: String(item.yearLevelName ?? item.YearLevelName ?? 'Not Set') || 'Not Set',
  };
}

async function fetchUsernameByUserId(userId: string, headers: Record<string, string>): Promise<string> {
  if (!userId || userId === 'Not Set') {
    return '';
  }

  const response = await fetchWithApiFallback('/users', { headers });
  const payload = await response.json().catch(() => ([]));
  if (!response.ok || !Array.isArray(payload)) {
    return '';
  }

  const rows = payload as UserApiRow[];
  const match = rows.find((row) => String(row.userId ?? row.UserId ?? '').trim() === userId);
  return String(match?.username ?? match?.Username ?? match?.userName ?? match?.UserName ?? '').trim();
}

function parseGradeValue(value: string): number | null {
  const parsed = Number(value);
  if (Number.isFinite(parsed)) {
    return parsed;
  }
  return null;
}

function formatGradeValue(value: unknown): string {
  const raw = String(value ?? '').trim();
  if (!raw) {
    return 'Not Set';
  }

  const parsed = Number(raw);
  if (Number.isFinite(parsed)) {
    return parsed.toFixed(1);
  }

  return raw;
}

function getText(value: unknown): string {
  const raw = String(value ?? '').trim();
  return raw || 'Not Set';
}

function getAttendanceLabel(appointment: AppointmentApiRow | undefined): string {
  if (!appointment) {
    return 'Not Set';
  }

  const direct = String(appointment.attendanceStatus ?? appointment.AttendanceStatus ?? '').trim();
  if (direct) {
    return direct;
  }

  const status = String(appointment.status ?? appointment.Status ?? '').trim().toLowerCase();
  if (status.includes('no-show')) {
    return 'No-Show';
  }
  if (status.includes('completed')) {
    return 'Appeared';
  }

  return 'Not Set';
}

function getSessionRole(): SessionUserRole | '' {
  const rawSession = sessionStorage.getItem(SESSION_STORAGE_KEY)
    ?? localStorage.getItem(SESSION_STORAGE_KEY)
    ?? '';
  if (!rawSession) {
    return '';
  }

  try {
    const session = JSON.parse(rawSession) as { userRole?: SessionUserRole };
    return session.userRole ?? '';
  } catch {
    return '';
  }
}

function getSessionUserId(): string {
  const rawSession = sessionStorage.getItem(SESSION_STORAGE_KEY)
    ?? localStorage.getItem(SESSION_STORAGE_KEY)
    ?? '';
  if (!rawSession) {
    return '';
  }

  try {
    const session = JSON.parse(rawSession) as { currentUser?: { id?: string } };
    return String(session.currentUser?.id ?? '').trim();
  } catch {
    return '';
  }
}

function getSessionUserName(): string {
  const rawSession = sessionStorage.getItem(SESSION_STORAGE_KEY)
    ?? localStorage.getItem(SESSION_STORAGE_KEY)
    ?? '';
  if (!rawSession) {
    return '';
  }

  try {
    const session = JSON.parse(rawSession) as { currentUser?: { name?: string } };
    return String(session.currentUser?.name ?? '').trim();
  } catch {
    return '';
  }
}

function getSessionRoleLabel(role: SessionUserRole | ''): string {
  switch (role) {
    case 'chairman':
      return 'Chairman';
    case 'adviser':
      return 'Adviser';
    default:
      return 'User';
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildAdvisingPrintAllHtml(params: {
  studentName: string;
  printedBy: string;
  logoUrl: string;
  notes: Array<{
    adviserName: string;
    dateTime: string;
    appointmentReason: string;
    notes: string;
  }>;
}): string {
  const studentName = escapeHtml(params.studentName || 'Not Set');
  const printedBy = escapeHtml(params.printedBy || 'Not Set');
  const logoUrl = escapeHtml(params.logoUrl || '');
  const noteBlocks = params.notes
    .map((note) => {
      const adviserName = escapeHtml(note.adviserName || 'Not Set');
      const dateTime = escapeHtml(note.dateTime || 'Not Set');
      const appointmentReason = escapeHtml(note.appointmentReason || 'Not Set');
      const noteText = escapeHtml(note.notes || 'Not Set');

      return `
      <section class="note-section">
        <div class="info-grid">
          <div class="info-row">
            <div class="label">Adviser</div>
            <div class="value">${adviserName}</div>
          </div>
          <div class="info-row">
            <div class="label">Date on Advising</div>
            <div class="value">${dateTime}</div>
          </div>
          <div class="info-row">
            <div class="label">Appointment Reason</div>
            <div class="value">${appointmentReason}</div>
          </div>
        </div>
        <div class="section-label">Notes on Advising/Visit</div>
        <div class="notes">${noteText}</div>
      </section>`;
    })
    .join('<div class="page-break"></div>');

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Advising Notes</title>
    <style>
      :root { color-scheme: light; }
      body { font-family: "Times New Roman", Times, serif; color: #111827; margin: 36px; position: relative; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .watermark {
        position: fixed;
        inset: 0;
        background-image: ${logoUrl ? `url("${logoUrl}")` : 'none'};
        background-repeat: no-repeat;
        background-position: center;
        background-size: 45%;
        opacity: 0.08;
        pointer-events: none;
        z-index: 0;
      }
      .page { position: relative; z-index: 1; }
      .letterhead { text-align: center; margin-bottom: 12px; color: #166534; }
      .letterhead .org { font-size: 16px; font-weight: bold; letter-spacing: 0.4px; }
      .letterhead .records { font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 1.2px; margin-top: 4px; }
      .title { font-size: 18px; font-weight: bold; margin: 18px 0 6px; text-align: center; }
      .subtitle { text-align: center; font-size: 12px; margin-bottom: 18px; color: #374151; }
      .info-row { display: grid; grid-template-columns: 170px 1fr; padding: 6px 0; border-bottom: 1px solid #d1d5db; }
      .label { font-weight: bold; }
      .value { padding-left: 8px; }
      .note-section { border: 1px solid #111827; padding: 14px; margin-top: 12px; }
      .section-label { margin-top: 12px; font-weight: bold; text-transform: uppercase; font-size: 12px; letter-spacing: 0.8px; }
      .notes { white-space: pre-wrap; min-height: 140px; border: 1px solid #d1d5db; padding: 10px; margin-top: 6px; }
      .signature { margin-top: 22px; display: grid; gap: 6px; }
      .signature-line { border-bottom: 1px solid #111827; width: 240px; height: 18px; }
      .footer { margin-top: 20px; font-weight: bold; }
      .page-break { page-break-after: always; }
      @media print {
        .page-break { page-break-after: always; }
        .watermark { opacity: 0.12; }
      }
    </style>
  </head>
  <body>
    <div class="watermark"></div>
    <div class="page">
      <div class="letterhead">
        <div class="org">University of San Jose - Recoletos</div>
        <div class="records">Academic Advising Records</div>
      </div>
      <div class="title">Advising Notes</div>
      <div class="subtitle">Official Student Advising Documentation</div>
      <div class="info-grid">
        <div class="info-row">
          <div class="label">Name of Student</div>
          <div class="value">${studentName}</div>
        </div>
      </div>
      ${noteBlocks}
      <div class="signature">
        <div class="label">Printed by</div>
        <div class="signature-line"></div>
        <div>${printedBy}</div>
      </div>
    </div>
    <script>
      window.addEventListener('load', () => {
        window.focus();
        window.print();
      });
    </script>
  </body>
</html>`;
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

  throw new Error('Unable to reach student notes endpoint.');
}

export function StudentProfile({ onBack, studentId, onOpenAppointmentDetails }: StudentProfileProps) {
  const [student, setStudent] = useState<StudentDetails | null>(null);
  const [studentLoading, setStudentLoading] = useState(false);
  const [studentError, setStudentError] = useState('');

  const [enrollments, setEnrollments] = useState<EnrollmentApiRow[]>([]);
  const [enrollmentsLoading, setEnrollmentsLoading] = useState(false);
  const [enrollmentsError, setEnrollmentsError] = useState('');

  const [grades, setGrades] = useState<GradeApiRow[]>([]);
  const [gradesLoading, setGradesLoading] = useState(false);
  const [gradesError, setGradesError] = useState('');

  const [appointments, setAppointments] = useState<AppointmentApiRow[]>([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(false);
  const [appointmentsError, setAppointmentsError] = useState('');
  const [appointmentNotes, setAppointmentNotes] = useState<AppointmentNoteApiRow[]>([]);
  const [editingNoteId, setEditingNoteId] = useState('');
  const [editedNoteText, setEditedNoteText] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [noteSaveError, setNoteSaveError] = useState('');

  const [reloadToken, setReloadToken] = useState(0);
  const [selectedSemester, setSelectedSemester] = useState(ALL_SEMESTERS_VALUE);

  useEffect(() => {
    const handleAppointmentsRefresh = () => {
      setReloadToken((prev) => prev + 1);
    };

    window.addEventListener('appointments:refresh', handleAppointmentsRefresh);
    return () => {
      window.removeEventListener('appointments:refresh', handleAppointmentsRefresh);
    };
  }, []);

  useEffect(() => {
    const loadStudentProfile = async () => {
      const selectedStudentId = String(studentId ?? '').trim();
      if (!selectedStudentId) {
        setStudent(null);
        setStudentError('No student selected. Please return to Student Directory and choose a student.');
        setEnrollments([]);
        setGrades([]);
        setAppointments([]);
        setAppointmentNotes([]);
        setEnrollmentsError('');
        setGradesError('');
        setAppointmentsError('');
        return;
      }

      const token = getAuthToken();
      const headers = {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      setStudentLoading(true);
      setStudentError('');
      setEnrollmentsLoading(true);
      setEnrollmentsError('');
      setGradesLoading(true);
      setGradesError('');
      setAppointmentsLoading(true);
      setAppointmentsError('');

      // 1) Student details
      let resolvedStudent: StudentDetails | null = null;
      try {
        const studentResponse = await fetchWithApiFallback(`/Students/${selectedStudentId}`, { headers });
        const studentPayload = await studentResponse.json().catch(() => ({}));
        if (!studentResponse.ok) {
          if (studentResponse.status === 404) {
            throw new Error('Student is outside your assigned year level scope.');
          }
          throw new Error(getErrorMessage(studentPayload, 'Unable to load student details.'));
        }

        resolvedStudent = normalizeStudent(studentPayload as StudentApiRow);

        const directoryUsername = await fetchUsernameByUserId(resolvedStudent.userId, headers).catch(() => '');
        if (directoryUsername) {
          resolvedStudent = {
            ...resolvedStudent,
            username: directoryUsername,
          };
        }

        setStudent(resolvedStudent);
      } catch (err) {
        setStudent(null);
        setStudentError(err instanceof Error ? err.message : 'Unable to load student details.');
      } finally {
        setStudentLoading(false);
      }

      // 2) Enrollments
      try {
        const enrollmentResponse = await fetchWithApiFallback(`/Students/${selectedStudentId}/enrollments`, { headers });
        const enrollmentPayload = await enrollmentResponse.json().catch(() => ([]));
        if (!enrollmentResponse.ok) {
          throw new Error(getErrorMessage(enrollmentPayload, 'Unable to load enrollments.'));
        }

        const rows = Array.isArray(enrollmentPayload) ? enrollmentPayload : [];
        setEnrollments(rows as EnrollmentApiRow[]);
      } catch (err) {
        setEnrollments([]);
        setEnrollmentsError(err instanceof Error ? err.message : 'Unable to load enrollments.');
      } finally {
        setEnrollmentsLoading(false);
      }

      // 3) Grades
      try {
        const gradesResponse = await fetchWithApiFallback(`/Students/${selectedStudentId}/grades`, { headers });
        const gradesPayload = await gradesResponse.json().catch(() => ([]));
        if (!gradesResponse.ok) {
          throw new Error(getErrorMessage(gradesPayload, 'Unable to load grades.'));
        }

        const rows = Array.isArray(gradesPayload) ? gradesPayload : [];
        setGrades(rows as GradeApiRow[]);
      } catch (err) {
        setGrades([]);
        setGradesError(err instanceof Error ? err.message : 'Unable to load grades.');
      } finally {
        setGradesLoading(false);
      }

      // 4) Appointments / notes
      try {
        const appointmentsResponse = await fetchWithApiFallback('/Appointments', { headers });
        const appointmentsPayload = await appointmentsResponse.json().catch(() => ([]));
        if (!appointmentsResponse.ok) {
          throw new Error(getErrorMessage(appointmentsPayload, 'Unable to load appointments.'));
        }

        const rows: AppointmentApiRow[] = Array.isArray(appointmentsPayload) ? appointmentsPayload : [];
        const filtered = rows.filter((row) => {
          const rowStudentId = String(row.studentId ?? row.StudentId ?? '').trim();
          return rowStudentId === selectedStudentId;
        });
        setAppointments(filtered);

        const appointmentIdSet = new Set(filtered.map((row) => String(row.appointmentId ?? row.AppointmentId ?? '').trim()).filter((id) => id.length > 0));

        const notesResponse = await fetchWithPathCandidates(['/AppointmentNotes', '/appointmentnotes'], { headers });
        const notesPayload = await notesResponse.json().catch(() => ([]));
        if (!notesResponse.ok) {
          throw new Error(getErrorMessage(notesPayload, 'Unable to load advising notes.'));
        }

        const noteRows = getArrayPayload<AppointmentNoteApiRow>(notesPayload);
        const filteredNotes = noteRows.filter((row) => {
          const appointmentId = String(row.appointmentId ?? row.AppointmentId ?? '').trim();
          return appointmentIdSet.has(appointmentId);
        });
        setAppointmentNotes(filteredNotes);
      } catch (err) {
        setAppointments([]);
        setAppointmentNotes([]);
        setAppointmentsError(err instanceof Error ? err.message : 'Unable to load appointments.');
      } finally {
        setAppointmentsLoading(false);
      }

      if (!resolvedStudent && !studentError) {
        setStudentError('Unable to load student details.');
      }
    };

    loadStudentProfile();
  }, [studentId, reloadToken]);

  const gradeFallbackByCourse = useMemo(() => {
    const byCourseId = new Map<string, GradeApiRow>();
    const byCourseCode = new Map<string, GradeApiRow>();
    const byCourseSemesterId = new Map<string, GradeApiRow>();
    const byCourseSemesterCode = new Map<string, GradeApiRow>();

    grades.forEach((row) => {
      const courseId = String(row.courseId ?? row.CourseId ?? '').trim();
      const courseCode = String(row.courseCode ?? row.CourseCode ?? '').trim().toUpperCase();
      const semesterLabel = buildSemesterLabel(row.semesterName ?? row.SemesterName, row.schoolYear ?? row.SchoolYear);
      const semesterKey = semesterLabel !== 'Not Set' ? semesterLabel : '';
      if (courseId) {
        byCourseId.set(courseId, row);
        if (semesterKey) {
          byCourseSemesterId.set(`${courseId}|${semesterKey}`, row);
        }
      }
      if (courseCode) {
        byCourseCode.set(courseCode, row);
        if (semesterKey) {
          byCourseSemesterCode.set(`${courseCode}|${semesterKey}`, row);
        }
      }
    });

    return { byCourseId, byCourseCode, byCourseSemesterId, byCourseSemesterCode };
  }, [grades]);

  const currentEnrollmentRows = useMemo((): CurrentEnrollmentRow[] => {
    const failedByCourseId = new Map<string, string>();
    const failedByCourseCode = new Map<string, string>();
    const failedByCourseSemesterId = new Map<string, string>();
    const failedByCourseSemesterCode = new Map<string, string>();

    grades.forEach((row) => {
      const courseId = String(row.courseId ?? row.CourseId ?? '').trim();
      const courseCode = String(row.courseCode ?? row.CourseCode ?? '').trim().toUpperCase();
      const semesterLabel = buildSemesterLabel(row.semesterName ?? row.SemesterName, row.schoolYear ?? row.SchoolYear);
      const semesterKey = semesterLabel !== 'Not Set' ? semesterLabel : '';
      const rawGrade = row.currentGrade ?? row.CurrentGrade ?? row.gradeValue ?? row.GradeValue;
      const formattedGrade = formatGradeValue(rawGrade);
      const numericGrade = parseGradeValue(formattedGrade);

      if (numericGrade === null || numericGrade <= 3.0) {
        return;
      }

      if (courseId) {
        const existing = failedByCourseId.get(courseId);
        const existingNumeric = existing ? parseGradeValue(existing) : null;
        if (existingNumeric === null || numericGrade > existingNumeric) {
          failedByCourseId.set(courseId, formattedGrade);
        }
        if (semesterKey) {
          const semesterCourseKey = `${courseId}|${semesterKey}`;
          const existingSemester = failedByCourseSemesterId.get(semesterCourseKey);
          const existingSemesterNumeric = existingSemester ? parseGradeValue(existingSemester) : null;
          if (existingSemesterNumeric === null || numericGrade > existingSemesterNumeric) {
            failedByCourseSemesterId.set(semesterCourseKey, formattedGrade);
          }
        }
      }

      if (courseCode) {
        const existing = failedByCourseCode.get(courseCode);
        const existingNumeric = existing ? parseGradeValue(existing) : null;
        if (existingNumeric === null || numericGrade > existingNumeric) {
          failedByCourseCode.set(courseCode, formattedGrade);
        }
        if (semesterKey) {
          const semesterCourseKey = `${courseCode}|${semesterKey}`;
          const existingSemester = failedByCourseSemesterCode.get(semesterCourseKey);
          const existingSemesterNumeric = existingSemester ? parseGradeValue(existingSemester) : null;
          if (existingSemesterNumeric === null || numericGrade > existingSemesterNumeric) {
            failedByCourseSemesterCode.set(semesterCourseKey, formattedGrade);
          }
        }
      }
    });

    return enrollments.map((row) => {
      const enrollmentId = String(row.enrollmentId ?? row.EnrollmentId ?? '').trim();
      const courseId = String(row.courseId ?? row.CourseId ?? '').trim();
      const courseCode = getText(row.courseCode ?? row.CourseCode);
      const courseCodeKey = String(row.courseCode ?? row.CourseCode ?? '').trim().toUpperCase();
      const semester = buildSemesterLabel(row.semesterName ?? row.SemesterName, row.schoolYear ?? row.SchoolYear);
      const semesterKey = semester !== 'Not Set' ? semester : '';
      const gradeFallback =
        (courseId && semesterKey ? gradeFallbackByCourse.byCourseSemesterId.get(`${courseId}|${semesterKey}`) : undefined)
        ?? (courseCodeKey && semesterKey ? gradeFallbackByCourse.byCourseSemesterCode.get(`${courseCodeKey}|${semesterKey}`) : undefined)
        ?? (courseId ? gradeFallbackByCourse.byCourseId.get(courseId) : undefined)
        ?? (courseCodeKey ? gradeFallbackByCourse.byCourseCode.get(courseCodeKey) : undefined);

      const enrollmentCurrentGrade = String(row.currentGrade ?? row.CurrentGrade ?? '').trim();
      const gradeCurrentGrade = String(gradeFallback?.currentGrade ?? gradeFallback?.CurrentGrade ?? '').trim();
      const gradeValue = String(gradeFallback?.gradeValue ?? gradeFallback?.GradeValue ?? '').trim();
      const failedGrade =
        (courseId && semesterKey ? failedByCourseSemesterId.get(`${courseId}|${semesterKey}`) : undefined)
        ?? (courseCodeKey && semesterKey ? failedByCourseSemesterCode.get(`${courseCodeKey}|${semesterKey}`) : undefined)
        ?? (courseId ? failedByCourseId.get(courseId) : undefined)
        ?? (courseCodeKey ? failedByCourseCode.get(courseCodeKey) : undefined)
        ?? 'Not Set';

      return {
        key: enrollmentId || `${courseId}-${courseCode}`,
        courseId: courseId || 'Not Set',
        courseCode,
        courseName: getText(row.courseName ?? row.CourseName),
        units: getText(row.units ?? row.Units),
        semester,
        currentGrade: formatGradeValue(enrollmentCurrentGrade || gradeCurrentGrade || gradeValue),
        failedGrade,
      };
    });
  }, [enrollments, gradeFallbackByCourse, grades]);

  const semesterOptions = useMemo(() => {
    return sortSemesterLabels(currentEnrollmentRows.map((row) => row.semester));
  }, [currentEnrollmentRows]);

  const filteredEnrollmentRows = useMemo(() => {
    return currentEnrollmentRows.filter((row) => matchesSemesterSelection(row.semester, selectedSemester));
  }, [currentEnrollmentRows, selectedSemester]);

  const retryAll = () => {
    setReloadToken((prev) => prev + 1);
  };

  const totalUnits = useMemo(() => {
    return filteredEnrollmentRows.reduce((acc, item) => {
      const value = Number(item.units);
      if (Number.isFinite(value)) {
        return acc + value;
      }
      return acc;
    }, 0);
  }, [filteredEnrollmentRows]);

  const advisingNotes = useMemo((): AdvisingNoteRow[] => {
    const appointmentById = new Map<string, AppointmentApiRow>();
    appointments.forEach((row) => {
      const appointmentId = String(row.appointmentId ?? row.AppointmentId ?? '').trim();
      if (appointmentId && !appointmentById.has(appointmentId)) {
        appointmentById.set(appointmentId, row);
      }
    });

    return appointmentNotes
      .map((noteRow, index) => {
        const appointmentId = String(noteRow.appointmentId ?? noteRow.AppointmentId ?? '').trim();
        const notes = String(noteRow.adviserNotes ?? noteRow.AdviserNotes ?? '').trim();
        if (!appointmentId || !notes) {
          return null;
        }

        const appointment = appointmentById.get(appointmentId);
        const noteId = String(noteRow.appointmentNoteId ?? noteRow.AppointmentNoteId ?? '').trim();
        const appointmentAdviserId = String(appointment?.adviserId ?? appointment?.AdviserId ?? '').trim();
        const adviserId = String(noteRow.adviserId ?? noteRow.AdviserId ?? appointmentAdviserId ?? '').trim();
        const adviserName = String(appointment?.adviserName ?? appointment?.AdviserName ?? '').trim();

        return {
          key: noteId || `${appointmentId}-${index}`,
          appointmentId,
          noteId: noteId || '',
          adviserId,
          adviserName,
          dateTime: formatDateTime(appointment?.appointmentDate ?? appointment?.AppointmentDate, appointment?.appointmentTime ?? appointment?.AppointmentTime),
          appointmentType: getText(appointment?.appointmentType ?? appointment?.AppointmentType),
          status: getText(appointment?.status ?? appointment?.Status),
          attendance: getAttendanceLabel(appointment),
          notes,
        };
      })
      .filter((row): row is AdvisingNoteRow => row !== null)
      .sort((a, b) => {
        const timeA = new Date(a.dateTime).getTime();
        const timeB = new Date(b.dateTime).getTime();
        if (Number.isNaN(timeA) && Number.isNaN(timeB)) {
          return b.key.localeCompare(a.key);
        }
        if (Number.isNaN(timeA)) {
          return 1;
        }
        if (Number.isNaN(timeB)) {
          return -1;
        }
        return timeB - timeA;
      });
  }, [appointments, appointmentNotes]);

  const canEditNotes = ['adviser', 'chairman'].includes(getSessionRole());

  const handleEditNote = (note: AdvisingNoteRow) => {
    const appointmentId = String(note.appointmentId ?? '').trim();
    if (appointmentId && onOpenAppointmentDetails) {
      onOpenAppointmentDetails(appointmentId);
      return;
    }

    setEditingNoteId(note.key);
    setEditedNoteText(note.notes);
    setNoteSaveError('');
  };

  const handleSaveNote = async (note: AdvisingNoteRow) => {
    const token = getAuthToken();
    if (!token) {
      setNoteSaveError('You are not authenticated. Please log in again.');
      return;
    }

    const appointmentId = note.appointmentId;
    if (!appointmentId) {
      setNoteSaveError('Missing appointment id for note update.');
      return;
    }

    const adviserId = note.adviserId || getSessionUserId();
    if (!adviserId) {
      setNoteSaveError('Missing adviser id for note update.');
      return;
    }

    setIsSavingNote(true);
    setNoteSaveError('');

    try {
      const noteId = String(note.noteId ?? '').trim();
      const body = {
        AppointmentId: appointmentId,
        AdviserId: adviserId,
        AdviserNotes: editedNoteText.trim(),
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

      setEditingNoteId('');
      setEditedNoteText('');
      setReloadToken((prev) => prev + 1);
      window.dispatchEvent(new Event('appointments:refresh'));
    } catch (err) {
      setNoteSaveError(err instanceof Error ? err.message : 'Unable to save advising notes.');
    } finally {
      setIsSavingNote(false);
    }
  };

  const handlePrintAllNotes = async () => {
    if (advisingNotes.length === 0) {
      return;
    }

    const token = getAuthToken();
    const headers = {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    const sessionName = getSessionUserName();
    const sessionRole = getSessionRole();

    const adviserNameEntries = await Promise.all(advisingNotes.map(async (note) => {
      let adviserName = note.adviserName;

      if (!adviserName && note.adviserId) {
        adviserName = await fetchUsernameByUserId(note.adviserId, headers).catch(() => '');
      }

      if (!adviserName && note.adviserId && note.adviserId === getSessionUserId()) {
        adviserName = sessionName;
      }

      if (!adviserName && (sessionRole === 'adviser' || sessionRole === 'chairman')) {
        adviserName = sessionName;
      }

      return {
        ...note,
        adviserName: adviserName || 'Not Set',
      };
    }));

    const printedBy = `${getSessionRoleLabel(sessionRole)}${sessionName ? ` - ${sessionName}` : ''}`;
    const html = buildAdvisingPrintAllHtml({
      studentName: student?.fullName ?? 'Not Set',
      printedBy,
      logoUrl: usjrLogo,
      notes: adviserNameEntries.map((note) => ({
        adviserName: note.adviserName,
        dateTime: note.dateTime,
        appointmentReason: note.appointmentType,
        notes: note.notes,
      })),
    });

    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) {
      return;
    }

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="tracking-tight">Student Profile</h2>
          <p className="text-gray-600">View student details, current courses, and advising notes.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Select value={selectedSemester} onValueChange={setSelectedSemester}>
            <SelectTrigger className="w-full sm:w-72">
              <SelectValue placeholder="Filter by semester" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_SEMESTERS_VALUE}>All Semesters</SelectItem>
              {semesterOptions.map((semester) => (
                <SelectItem key={semester} value={semester}>
                  {semester}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={retryAll}>Retry</Button>
            <Button variant="outline" onClick={onBack}>Back to List</Button>
          </div>
        </div>
      </div>

      {studentError && (
        <div className="flex items-center justify-between gap-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            <span>{studentError}</span>
          </div>
          <Button size="sm" variant="outline" onClick={retryAll}>Retry</Button>
        </div>
      )}

      <Card>
        <CardContent className="pt-6">
          {studentLoading ? (
            <p className="text-sm text-gray-500">Loading student details...</p>
          ) : !student ? (
            <p className="text-sm text-gray-500">No student profile data available.</p>
          ) : (
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex items-center justify-center md:justify-start">
                <div className="h-24 w-24 rounded-full bg-green-100 flex items-center justify-center">
                  <User className="h-12 w-12 text-green-700" />
                </div>
              </div>
              <div className="flex-1 space-y-4">
                <div>
                  <h3 className="font-bold text-2xl">{student.fullName}</h3>
                  <p className="text-gray-600">Username (ID): {student.username}</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">{student.email}</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <Badge className="bg-green-100 text-green-800 border-green-300 justify-center">
                  {student.yearLevelName}
                </Badge>
                <div className="text-sm text-gray-600 text-center">Current Units: {totalUnits}</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="current" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="current">Current Courses</TabsTrigger>
          <TabsTrigger value="advising">Advising Notes</TabsTrigger>
        </TabsList>

        <TabsContent value="current" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Current Enrollment</CardTitle>
              <CardDescription>Current subjects with grade status for this student.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {enrollmentsError && (
                <div className="flex items-center justify-between gap-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  <span>{enrollmentsError}</span>
                  <Button size="sm" variant="outline" onClick={retryAll}>Retry</Button>
                </div>
              )}

              {gradesError && (
                <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  Grades fallback is unavailable: {gradesError}
                </div>
              )}

              {enrollmentsLoading ? (
                <p className="text-sm text-gray-500">Loading current enrollment...</p>
              ) : filteredEnrollmentRows.length === 0 ? (
                <p className="text-sm text-gray-500">No current enrollment records returned by backend.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Course Code</TableHead>
                      <TableHead>Course Name</TableHead>
                      <TableHead>Units</TableHead>
                      <TableHead>Semester</TableHead>
                      <TableHead>Current Grade</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEnrollmentRows.map((item) => {
                      const numericGrade = parseGradeValue(item.currentGrade);
                      const isPassed = numericGrade !== null && numericGrade <= 3.0;
                      const isFailed = numericGrade !== null && numericGrade > 3.0;
                      const gradeTone = isPassed
                        ? 'text-green-700 bg-green-50 border-green-200'
                        : isFailed
                          ? 'text-red-700 bg-red-50 border-red-200'
                          : 'text-gray-700 bg-gray-50 border-gray-200';

                      return (
                        <TableRow key={item.key}>
                          <TableCell className="font-medium">{item.courseCode}</TableCell>
                          <TableCell>{item.courseName}</TableCell>
                          <TableCell>{item.units}</TableCell>
                          <TableCell>{item.semester}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${gradeTone}`}>
                                {item.currentGrade}
                              </span>
                              {item.failedGrade !== 'Not Set' && item.failedGrade !== item.currentGrade && (
                                <span className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
                                  Failed: {item.failedGrade}
                                </span>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advising" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle>Advising Notes</CardTitle>
                  <CardDescription>Review adviser notes and appointment outcomes.</CardDescription>
                </div>
                {canEditNotes && advisingNotes.length > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handlePrintAllNotes}
                  >
                    <Printer className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {appointmentsError && (
                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {appointmentsError}
                </div>
              )}

              {appointmentsLoading ? (
                <p className="text-sm text-gray-500">Loading appointment notes...</p>
              ) : advisingNotes.length === 0 ? (
                <p className="text-sm text-gray-500">No appointment notes found for this student yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date / Time</TableHead>
                      <TableHead>Appointment Reason</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Attendance</TableHead>
                      <TableHead>Notes</TableHead>
                      {canEditNotes && <TableHead>Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {advisingNotes.map((item) => (
                      <TableRow key={item.key}>
                        <TableCell>{item.dateTime}</TableCell>
                        <TableCell>{item.appointmentType}</TableCell>
                        <TableCell>{item.status}</TableCell>
                        <TableCell>{item.attendance}</TableCell>
                        <TableCell className="max-w-md whitespace-pre-wrap">
                          {editingNoteId === item.key ? (
                            <div className="space-y-3 rounded-md border border-indigo-200 bg-indigo-50 p-3">
                              <p className="text-sm font-semibold text-indigo-900">Edit Appointment Notes</p>
                              <Textarea
                                value={editedNoteText}
                                onChange={(event) => setEditedNoteText(event.target.value)}
                                className="min-h-[110px]"
                                disabled={isSavingNote}
                              />
                              {noteSaveError && (
                                <div className="text-xs text-red-600">{noteSaveError}</div>
                              )}
                              <div className="flex flex-wrap gap-2">
                                <Button type="button" size="sm" onClick={() => handleSaveNote(item)} disabled={isSavingNote}>
                                  {isSavingNote ? 'Saving...' : 'Save Notes'}
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setEditingNoteId('');
                                    setEditedNoteText('');
                                    setNoteSaveError('');
                                  }}
                                  disabled={isSavingNote}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            item.notes
                          )}
                        </TableCell>
                        {canEditNotes && (
                          <TableCell>
                            {editingNoteId === item.key ? null : (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => handleEditNote(item)}
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
