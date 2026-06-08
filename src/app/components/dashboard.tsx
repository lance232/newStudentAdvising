import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Users, UserCog, Shield, CalendarDays, RefreshCcw, AlertCircle } from "lucide-react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { ALL_SEMESTERS_VALUE, buildSemesterLabel, matchesSemesterSelection, sortSemesterLabels } from "./semester-utils";

interface DashboardProps {
  isChairman?: boolean;
  onOpenStudentsByGradeFilter?: (filter: "no-failed" | "has-failed", semester?: string) => void;
  gradeSemester: string;
  onGradeSemesterChange: (semester: string) => void;
}

interface UserDirectoryRow {
  userId: string;
  username: string;
  firstName: string;
  lastName: string;
  role: string;
  email?: string;
  yearLevelId?: string;
  yearLevelName?: string;
}

interface StudentDirectoryRow {
  userId: string;
  studentId: string;
  username: string;
  fullName: string;
  yearLevelId: string;
  yearLevelName: string;
}

interface AppointmentRow {
  appointmentId: number | string;
  studentName: string;
  dateLabel: string;
  status: string;
  studentId?: string;
  userId?: string;
  sortTimestamp: number;
}

interface SummaryState {
  students: number;
  advisers: number;
  chairmen: number;
  appointments: number;
}

interface PassFailState {
  passed: number;
  failed: number;
}

type GradeStatusFilter = "no-failed" | "has-failed";

const SEMESTER_ENDPOINTS = ["/Semesters", "/Semesters/active", "/Semesters/current"];

const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "") ?? "https://localhost:53005/api";

function getApiBaseCandidates(): string[] {
  const candidates: string[] = [];

  if (API_BASE_URL) {
    candidates.push(API_BASE_URL);
  }

  if (API_BASE_URL.endsWith("/api")) {
    candidates.push(API_BASE_URL.slice(0, -4));
  } else {
    candidates.push(`${API_BASE_URL}/api`);
  }

  return Array.from(new Set(candidates.map((value) => value.replace(/\/$/, ""))));
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

  throw new Error("Unable to reach dashboard endpoints.");
}

function getAuthToken(): string | null {
  const rawToken = localStorage.getItem("auth_token") || sessionStorage.getItem("auth_token");
  if (!rawToken) {
    return null;
  }

  return rawToken.replace(/^Bearer\s+/i, "").trim();
}

function getErrorMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== "object") {
    return fallback;
  }

  const data = payload as { message?: string; error?: string; title?: string };
  return data.message || data.error || data.title || fallback;
}

function normalizeLookup(value: unknown): string {
  return String(value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

function getSessionUser(): { id: string; username: string; name: string } {
  const rawSession = sessionStorage.getItem("app_session")
    ?? localStorage.getItem("app_session")
    ?? "";

  if (!rawSession) {
    return { id: "", username: "", name: "" };
  }

  try {
    const session = JSON.parse(rawSession) as {
      currentUser?: { id?: string; username?: string; name?: string };
    };

    return {
      id: String(session.currentUser?.id ?? "").trim(),
      username: String(session.currentUser?.username ?? "").trim(),
      name: String(session.currentUser?.name ?? "").trim(),
    };
  } catch {
    return { id: "", username: "", name: "" };
  }
}

function matchesSessionAdviser(adviser: any, sessionUser: { id: string; username: string; name: string }): boolean {
  const identifiers = [
    adviser?.id,
    adviser?.adviserId,
    adviser?.advisorId,
    adviser?.userId,
    adviser?.user?.userId,
    adviser?.username,
    adviser?.userName,
    adviser?.user?.username,
    adviser?.email,
    adviser?.user?.email,
  ]
    .map((value) => String(value ?? "").trim())
    .filter(Boolean);

  const sessionIdentifiers = [sessionUser.id, sessionUser.username, sessionUser.name]
    .map((value) => String(value ?? "").trim())
    .filter(Boolean);

  return identifiers.some((identifier) => sessionIdentifiers.some((sessionValue) => normalizeLookup(sessionValue) === normalizeLookup(identifier)));
}

function formatDateLabel(value: unknown): string {
  const raw = String(value ?? "").trim();
  if (!raw) {
    return "Not Set";
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return raw;
  }

  return parsed.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getArrayPayload<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) {
    return payload as T[];
  }

  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    if (Array.isArray(record.data)) {
      return record.data as T[];
    }
    if (record.data && typeof record.data === "object") {
      const nested = record.data as Record<string, unknown>;
      if (Array.isArray(nested.items)) {
        return nested.items as T[];
      }
      if (Array.isArray(nested.grades)) {
        return nested.grades as T[];
      }
    }
    if (Array.isArray(record.items)) {
      return record.items as T[];
    }
    if (Array.isArray(record.grades)) {
      return record.grades as T[];
    }
  }

  return [];
}

type SemesterRow = {
  SemesterId?: number | string | null;
  semesterId?: number | string | null;
  Name?: string | null;
  name?: string | null;
  SemesterName?: string | null;
  semesterName?: string | null;
  SchoolYear?: string | null;
  schoolYear?: string | null;
};

function getSemesterRowsPayload(payload: unknown): SemesterRow[] {
  if (Array.isArray(payload)) {
    return payload as SemesterRow[];
  }

  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;

    if (record.SemesterId != null || record.semesterId != null) {
      return [record as SemesterRow];
    }

    if (Array.isArray(record.data)) {
      return record.data as SemesterRow[];
    }
    if (record.data && typeof record.data === "object") {
      const nested = record.data as Record<string, unknown>;
      if (nested.SemesterId != null || nested.semesterId != null) {
        return [nested as SemesterRow];
      }
      if (Array.isArray(nested.items)) {
        return nested.items as SemesterRow[];
      }
    }

    if (Array.isArray(record.items)) {
      return record.items as SemesterRow[];
    }
    if (record.items && typeof record.items === "object") {
      const nested = record.items as Record<string, unknown>;
      if (nested.SemesterId != null || nested.semesterId != null) {
        return [nested as SemesterRow];
      }
    }
  }

  return [];
}

async function fetchSemesters(headers: Record<string, string>): Promise<SemesterRow[]> {
  for (const path of SEMESTER_ENDPOINTS) {
    const response = await fetchWithApiFallback(path, { headers });
    const payload = await response.json().catch(() => ([]));
    if (!response.ok) {
      continue;
    }

    const rows = getSemesterRowsPayload(payload);
    if (rows.length > 0) {
      return rows;
    }
  }

  return [];
}

function parseNumeric(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value.trim());
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function isFailedGrade(grade: any): boolean {
  const statusRaw = String(
    grade?.status
    ?? grade?.Status
    ?? grade?.remarks
    ?? grade?.Remarks
    ?? grade?.result
    ?? grade?.remark
    ?? "",
  ).toLowerCase().replace(/\s+/g, " ").trim();
  if (/\b(no|not|without)\s+fail(?:ed|ing)?\b/.test(statusRaw) || /\bpass(?:ed)?\s+all\b/.test(statusRaw)) {
    return false;
  }
  if (/\bfail(?:ed|ing)?\b/.test(statusRaw)) {
    return true;
  }
  if (/\bpass(?:ed|ing)?\b/.test(statusRaw)) {
    return false;
  }

  const numericValue =
    parseNumeric(grade?.grade)
    ?? parseNumeric(grade?.Grade)
    ?? parseNumeric(grade?.finalGrade)
    ?? parseNumeric(grade?.FinalGrade)
    ?? parseNumeric(grade?.gradeValue)
    ?? parseNumeric(grade?.GradeValue)
    ?? parseNumeric(grade?.currentGrade)
    ?? parseNumeric(grade?.CurrentGrade)
    ?? parseNumeric(grade?.status)
    ?? parseNumeric(grade?.Status)
    ?? parseNumeric(grade?.result)
    ?? parseNumeric(grade?.equivalent)
    ?? parseNumeric(grade?.gwa);

  return numericValue !== null && numericValue > 3.0;
}

function summarizePassFailByStudent(students: StudentDirectoryRow[], grades: any[]): PassFailState {
  if (students.length > 0) {
    const keyToIndex = new Map<string, number>();
    const studentGradeKey = (value: string) => `student:${value}`;
    const userGradeKey = (value: string) => `user:${value}`;

    students.forEach((student, index) => {
      const studentIdKey = student.studentId.trim();
      const userIdKey = student.userId.trim();

      if (studentIdKey) {
        keyToIndex.set(studentGradeKey(studentIdKey), index);
      }
      if (userIdKey && userIdKey !== 'Not Set') {
        keyToIndex.set(userGradeKey(userIdKey), index);
      }
    });

    const hasFailedByStudent = new Array(students.length).fill(false);

    grades.forEach((grade) => {
      const gradeStudentId = String(grade?.studentId ?? grade?.StudentId ?? '').trim();
      const gradeUserId = String(grade?.userId ?? grade?.UserId ?? '').trim();
      const matchedIndex =
        (gradeStudentId ? keyToIndex.get(studentGradeKey(gradeStudentId)) : undefined)
        ?? (!gradeStudentId && gradeUserId ? keyToIndex.get(userGradeKey(gradeUserId)) : undefined);

      if (matchedIndex === undefined) {
        return;
      }

      if (isFailedGrade(grade)) {
        hasFailedByStudent[matchedIndex] = true;
      }
    });

    const failed = hasFailedByStudent.filter(Boolean).length;
    const passed = students.length - failed;
    return { passed, failed };
  }

  const failedStudents = new Set<string>();
  const allStudents = new Set<string>();

  grades.forEach((grade) => {
    const key = String(grade?.studentId ?? grade?.StudentId ?? grade?.userId ?? grade?.UserId ?? '').trim();
    if (!key) {
      return;
    }

    allStudents.add(key);
    if (isFailedGrade(grade)) {
      failedStudents.add(key);
    }
  });

  const failed = failedStudents.size;
  const passed = Math.max(0, allStudents.size - failed);
  return { passed, failed };
}

export function Dashboard({ isChairman = false, onOpenStudentsByGradeFilter, gradeSemester, onGradeSemesterChange }: DashboardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [summary, setSummary] = useState<SummaryState>({
    students: 0,
    advisers: 0,
    chairmen: 0,
    appointments: 0,
  });
  const [recentAppointments, setRecentAppointments] = useState<AppointmentRow[]>([]);
  const [passFail, setPassFail] = useState<PassFailState>({ passed: 0, failed: 0 });
  const [gradeChartError, setGradeChartError] = useState("");
  const [gradeRows, setGradeRows] = useState<any[]>([]);
  const [semesterOptions, setSemesterOptions] = useState<string[]>([]);
  const [studentsForChart, setStudentsForChart] = useState<StudentDirectoryRow[]>([]);

  const loadDashboard = async () => {
    setIsLoading(true);
    setLoadError("");

    try {
      const token = getAuthToken();
      const headers = {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      const usersResponse = await fetchWithApiFallback("/users", { headers });
      const usersPayload = await usersResponse.json().catch(() => ([]));
      if (!usersResponse.ok) {
        throw new Error(getErrorMessage(usersPayload, "Unable to fetch users for dashboard."));
      }

      let users = Array.isArray(usersPayload) ? usersPayload : [];
      if (isChairman) {
        const adminUsersResponse = await fetchWithApiFallback("/admin/users", { headers });
        const adminUsersPayload = await adminUsersResponse.json().catch(() => ([]));
        if (adminUsersResponse.ok && Array.isArray(adminUsersPayload)) {
          users = adminUsersPayload;
        }
      }

      const yearLevelsResponse = await fetchWithApiFallback("/Students/year-levels", { headers });
      const yearLevelsPayload = await yearLevelsResponse.json().catch(() => ([]));
      const yearLevelLabelById = new Map<string, string>();
      const yearLevelIds: string[] = [];
      if (yearLevelsResponse.ok && Array.isArray(yearLevelsPayload)) {
        yearLevelsPayload.forEach((item: any) => {
          const id = String(item.yearLevelId ?? item.id ?? item.value ?? "").trim();
          const label = String(item.yearLevelName ?? item.name ?? item.yearLevel ?? item.label ?? "").trim();
          if (id && label) {
            yearLevelLabelById.set(id, label);
          }
          if (id) {
            yearLevelIds.push(id);
          }
        });
      }

      const normalizedUsers: UserDirectoryRow[] = users.map((item: any) => ({
        userId: String(item.userId ?? item.UserId ?? item.id ?? "").trim(),
        username: String(item.username ?? item.Username ?? item.userName ?? item.UserName ?? '').trim(),
        firstName: String(item.firstName ?? item.FirstName ?? "").trim(),
        lastName: String(item.lastName ?? item.LastName ?? "").trim(),
        role: String(item.role ?? item.Role ?? "").toUpperCase().trim(),
        email: String(item.email ?? item.Email ?? "").trim(),
        yearLevelId: String(item.yearLevelId ?? item.YearLevelId ?? "").trim(),
        yearLevelName: String(item.yearLevelName ?? item.YearLevelName ?? item.yearLevel ?? "").trim(),
      }));

      const sessionUser = getSessionUser();
      const adviserRowsResponse = await fetchWithApiFallback('/Advisers', { headers });
      const adviserRowsPayload = await adviserRowsResponse.json().catch(() => ([]));
      const adviserRows = adviserRowsResponse.ok && Array.isArray(adviserRowsPayload) ? adviserRowsPayload : [];

      const assignmentRowsResponse = await fetchWithApiFallback('/AdviserAssignments', { headers });
      const assignmentRowsPayload = await assignmentRowsResponse.json().catch(() => ([]));
      const assignmentRows = assignmentRowsResponse.ok && Array.isArray(assignmentRowsPayload) ? assignmentRowsPayload : [];

      const currentAdviserKeys = new Set<string>();
      adviserRows.forEach((adviser: any) => {
        if (!matchesSessionAdviser(adviser, sessionUser)) {
          return;
        }

        const id = String(adviser.id ?? '').trim();
        const adviserId = String(adviser.adviserId ?? adviser.advisorId ?? '').trim();
        const userId = String(adviser.userId ?? adviser.user?.userId ?? '').trim();
        const username = String(adviser.username ?? adviser.userName ?? adviser.user?.username ?? '').trim();
        [id, adviserId, userId, username].filter(Boolean).forEach((key) => currentAdviserKeys.add(key));
      });

      const assignedYearLevelIds = new Set<string>();
      const assignedYearLevelNames = new Set<string>();
      assignmentRows.forEach((assignment: any) => {
        const assignmentAdviserKey = String(
          assignment.adviserId
          ?? assignment.advisorId
          ?? assignment.adviserUserId
          ?? assignment.userId
          ?? '',
        ).trim();

        if (!assignmentAdviserKey || !currentAdviserKeys.has(assignmentAdviserKey)) {
          return;
        }

        const yearLevelId = String(assignment.yearLevelId ?? assignment.yearlevelId ?? assignment.levelId ?? '').trim();
        const yearLevelName = String(assignment.yearLevelName ?? assignment.YearLevelName ?? assignment.yearLevel ?? assignment.assignedYearLevel ?? '').trim();

        if (yearLevelId) {
          assignedYearLevelIds.add(yearLevelId);
        }
        if (yearLevelName) {
          assignedYearLevelNames.add(normalizeLookup(yearLevelName));
        }
      });

      setSummary((prev) => ({
        ...prev,
        advisers: normalizedUsers.filter((row) => row.role === "ADVISER").length,
        chairmen: normalizedUsers.filter((row) => row.role === "CHAIRMAN").length,
      }));

      const userById = new Map(normalizedUsers.map((row) => [row.userId, row]));

      const studentsResponse = await fetchWithApiFallback("/Students", { headers });
      const studentsPayload = await studentsResponse.json().catch(() => ([]));
      if (!studentsResponse.ok) {
        throw new Error(getErrorMessage(studentsPayload, "Unable to fetch students for dashboard."));
      }

      let studentsRowsPayload: any[] = Array.isArray(studentsPayload) ? studentsPayload : [];
      if (isChairman) {
        const studentsByYearLevel: any[] = [];
        const candidateYearLevelIds = yearLevelIds.length > 0 ? yearLevelIds : ["1", "2", "3", "4"];
        for (const yearLevelId of candidateYearLevelIds) {
          const byYearLevelResponse = await fetchWithApiFallback(`/Students?yearLevelId=${encodeURIComponent(yearLevelId)}`, { headers });
          const byYearLevelPayload = await byYearLevelResponse.json().catch(() => ([]));
          if (byYearLevelResponse.ok && Array.isArray(byYearLevelPayload)) {
            studentsByYearLevel.push(...byYearLevelPayload);
          }
        }

        if (studentsByYearLevel.length > 0) {
          const mergedStudentRows = [...studentsRowsPayload, ...studentsByYearLevel];
          const seen = new Set<string>();
          studentsRowsPayload = mergedStudentRows.filter((item) => {
            const key = String(item?.studentId ?? item?.StudentId ?? item?.userId ?? item?.UserId ?? "").trim();
            if (!key || seen.has(key)) {
              return false;
            }
            seen.add(key);
            return true;
          });
        }
      }

      const students = studentsRowsPayload;
      const normalizedStudentsFromEndpoint: StudentDirectoryRow[] = students.map((item: any) => {
        const userId = String(item.userId ?? item.UserId ?? "").trim();
        const studentId = String(item.studentId ?? item.StudentId ?? userId).trim();
        const linkedUser = userId ? userById.get(userId) : undefined;
        const username = String(item.username ?? item.Username ?? item.userName ?? item.UserName ?? linkedUser?.username ?? '').trim();
        const firstName = String(item.firstName ?? item.FirstName ?? linkedUser?.firstName ?? "").trim();
        const lastName = String(item.lastName ?? item.LastName ?? linkedUser?.lastName ?? "").trim();
        const fullName = `${firstName} ${lastName}`.trim() || studentId || userId || "Unknown Student";

        return {
          userId: userId || "Not Set",
          studentId: studentId || "Not Set",
          username: username || studentId || userId || 'Not Set',
          fullName,
          yearLevelId: String(item.yearLevelId ?? item.YearLevelId ?? '').trim(),
          yearLevelName: String(item.yearLevelName ?? item.YearLevelName ?? "Not Set") || "Not Set",
        };
      });

      const normalizedStudents: StudentDirectoryRow[] = isChairman
        ? normalizedStudentsFromEndpoint
        : normalizedStudentsFromEndpoint.filter((student) => {
          const matchesYearLevelId = student.yearLevelId ? assignedYearLevelIds.has(student.yearLevelId) : false;
          const matchesYearLevelName = student.yearLevelName ? assignedYearLevelNames.has(normalizeLookup(student.yearLevelName)) : false;
          return assignedYearLevelIds.size === 0 && assignedYearLevelNames.size === 0 ? true : (matchesYearLevelId || matchesYearLevelName);
        });

      setStudentsForChart(normalizedStudents);

      setSummary((prev) => ({
        ...prev,
        students: normalizedStudents.length,
      }));

      const getAppointmentTimestamp = (item: any): number => {
        const dateText = String(item.appointmentDate ?? item.AppointmentDate ?? '').trim();
        const timeText = String(item.appointmentTime ?? item.AppointmentTime ?? '').trim();
        const combined = dateText && timeText ? `${dateText.split('T')[0]}T${timeText}` : dateText;
        const parsed = new Date(combined).getTime();
        return Number.isNaN(parsed) ? 0 : parsed;
      };

      let normalizedAppointments: AppointmentRow[] = [];
      try {
        const calendarResponse = await fetchWithApiFallback('/Appointments/calendar', { headers });
        const calendarPayload = await calendarResponse.json().catch(() => ({}));

        if (calendarResponse.ok) {
          const calendar = calendarPayload as {
            upcomingAppointments?: any[];
            completedAppointments?: any[];
            cancelledAppointments?: any[];
            UpcomingAppointments?: any[];
            CompletedAppointments?: any[];
            CancelledAppointments?: any[];
          };

          normalizedAppointments = [
            ...(calendar.upcomingAppointments ?? calendar.UpcomingAppointments ?? []),
            ...(calendar.completedAppointments ?? calendar.CompletedAppointments ?? []),
            ...(calendar.cancelledAppointments ?? calendar.CancelledAppointments ?? []),
          ].map((item: any) => ({
            appointmentId: item.appointmentId ?? item.id ?? item.AppointmentId ?? '',
            studentId: String(item.studentId ?? item.StudentId ?? '').trim(),
            adviserId: String(item.adviserId ?? item.AdviserId ?? '').trim(),
            studentName: String(item.studentName ?? item.StudentName ?? item.student?.fullName ?? item.student?.name ?? item.userName ?? 'Student').trim() || 'Student',
            dateLabel: formatDateLabel(item.appointmentDate ?? item.AppointmentDate ?? item.date ?? item.createdAt),
            status: String(item.status ?? item.Status ?? 'Scheduled'),
            appointmentDate: String(item.appointmentDate ?? item.AppointmentDate ?? '').trim(),
            appointmentTime: String(item.appointmentTime ?? item.AppointmentTime ?? '').trim(),
            sortTimestamp: getAppointmentTimestamp(item),
          }));
        }
      } catch {
        normalizedAppointments = [];
      }

      if (normalizedAppointments.length === 0) {
        const appointmentsResponse = await fetchWithApiFallback("/Appointments", { headers });
        const appointmentsPayload = await appointmentsResponse.json().catch(() => ([]));

        if (!appointmentsResponse.ok) {
          setSummary((prev) => ({ ...prev, appointments: 0 }));
          setRecentAppointments([]);
          return;
        }

        const appointments = Array.isArray(appointmentsPayload) ? appointmentsPayload : [];
        normalizedAppointments = appointments.map((item: any) => ({
          appointmentId: item.appointmentId ?? item.id ?? item.AppointmentId ?? "",
          studentId: String(item.studentId ?? item.StudentId ?? '').trim(),
          adviserId: String(item.adviserId ?? item.AdviserId ?? '').trim(),
          studentName: String(item.studentName ?? item.student?.fullName ?? item.student?.name ?? item.userName ?? "Student").trim() || "Student",
          dateLabel: formatDateLabel(item.appointmentDate ?? item.date ?? item.createdAt ?? item.AppointmentDate),
          status: String(item.status ?? item.Status ?? "Scheduled"),
          appointmentDate: String(item.appointmentDate ?? item.AppointmentDate ?? '').trim(),
          appointmentTime: String(item.appointmentTime ?? item.AppointmentTime ?? '').trim(),
          sortTimestamp: getAppointmentTimestamp(item),
        }));
      }

      const scopedAppointments = isChairman || currentAdviserKeys.size === 0
        ? normalizedAppointments
        : normalizedAppointments.filter((row) => currentAdviserKeys.has(String(row.adviserId ?? '').trim()));

      const recentScopedAppointments = [...scopedAppointments].sort((left, right) => (right.sortTimestamp ?? 0) - (left.sortTimestamp ?? 0));

      setSummary((prev) => ({ ...prev, appointments: scopedAppointments.length }));
      setRecentAppointments(recentScopedAppointments.slice(0, 6));

      // Grade distribution pie chart.
      setGradeChartError("");
      try {
        const [gradesResponse, semesters] = await Promise.all([
          fetchWithApiFallback("/Grades", { headers }),
          fetchSemesters(headers),
        ]);
        const gradesPayload = await gradesResponse.json().catch(() => ([]));
        let collectedGrades: any[] = [];

        if (!gradesResponse.ok) {
          // Fallback to per-student grades endpoint when /Grades is unavailable.
          for (const student of normalizedStudents) {
            const response = await fetchWithApiFallback(`/Students/${student.studentId}/grades`, { headers });
            const payload = await response.json().catch(() => ([]));
            if (response.ok) {
              collectedGrades.push(...getArrayPayload(payload));
            }
          }

          if (collectedGrades.length === 0) {
            setGradeChartError(getErrorMessage(gradesPayload, "Unable to load grade distribution data."));
          }
        } else {
          collectedGrades = getArrayPayload(gradesPayload);
        }

        const semesterLabelById = new Map<string, string>();
        semesters.forEach((row) => {
          const id = String(row.SemesterId ?? row.semesterId ?? "").trim();
          if (!id) {
            return;
          }
          const name = String(row.SemesterName ?? row.semesterName ?? row.Name ?? row.name ?? "").trim();
          const schoolYear = String(row.SchoolYear ?? row.schoolYear ?? "").trim();
          const label = buildSemesterLabel(name, schoolYear);
          if (label && label !== "Not Set") {
            semesterLabelById.set(id, label);
          }
        });

        const normalizedGrades = collectedGrades.map((grade) => {
          const rawLabel = buildSemesterLabel(
            grade?.semesterName ?? grade?.SemesterName ?? grade?.semester,
            grade?.schoolYear ?? grade?.SchoolYear,
          );
          const semesterId = String(grade?.semesterId ?? grade?.SemesterId ?? "").trim();
          const fallbackLabel = semesterId ? (semesterLabelById.get(semesterId) ?? "") : "";
          const semesterLabel = rawLabel !== "Not Set" ? rawLabel : (fallbackLabel || "Not Set");

          return {
            ...grade,
            semesterLabel,
          };
        });

        setGradeRows(normalizedGrades);
        setSemesterOptions(sortSemesterLabels(normalizedGrades.map((grade) => grade.semesterLabel)));
      } catch {
        setGradeRows([]);
        setSemesterOptions([]);
        setGradeChartError("Unable to load grade distribution data.");
      }
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Unable to load dashboard.");
      setSummary({ students: 0, advisers: 0, chairmen: 0, appointments: 0 });
      setRecentAppointments([]);
      setPassFail({ passed: 0, failed: 0 });
      setGradeChartError("");
      setGradeRows([]);
      setSemesterOptions([]);
      setStudentsForChart([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  useEffect(() => {
    if (gradeRows.length === 0) {
      setPassFail({ passed: 0, failed: 0 });
      return;
    }

    const filteredGrades = gradeRows.filter((grade) => matchesSemesterSelection(grade.semesterLabel, gradeSemester));
    setPassFail(summarizePassFailByStudent(studentsForChart, filteredGrades));
  }, [gradeRows, studentsForChart, gradeSemester]);

  const roleLabel = isChairman ? "Chairman" : "Adviser";

  const appointmentStatusTone = useMemo(() => {
    return (status: string) => {
      const normalized = status.toLowerCase();
      if (normalized.includes("cancel")) {
        return "bg-red-100 text-red-800 border-red-300";
      }
      if (normalized.includes("complete") || normalized.includes("done")) {
        return "bg-green-100 text-green-800 border-green-300";
      }
      return "bg-yellow-100 text-yellow-800 border-yellow-300";
    };
  }, []);

  const passFailChartData = useMemo(() => {
    return [
      { name: "Students with no failed grade", value: passFail.passed, fill: "#16a34a", filter: "no-failed" as GradeStatusFilter },
      { name: "Students with at least one failed grade", value: passFail.failed, fill: "#ef4444", filter: "has-failed" as GradeStatusFilter },
    ];
  }, [passFail]);

  const handlePieSliceClick = (entry?: { filter?: GradeStatusFilter; value?: number }) => {
    if (!entry?.filter || !onOpenStudentsByGradeFilter) {
      return;
    }

    if ((entry.value ?? 0) <= 0) {
      return;
    }

    onOpenStudentsByGradeFilter(entry.filter, gradeSemester);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="tracking-tight">Dashboard Overview</h2>
          <p className="text-gray-600">Summary insights for the {roleLabel} workspace.</p>
        </div>
        <Button
          variant="outline"
          className="border-green-300 text-green-800 hover:bg-green-50"
          onClick={loadDashboard}
          disabled={isLoading}
        >
          <RefreshCcw className="h-4 w-4 mr-2" />
          {isLoading ? "Refreshing..." : "Refresh"}
        </Button>
      </div>

      {loadError && (
        <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertCircle className="h-4 w-4" />
          <span>{loadError}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-green-200 shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Students</p>
                <p className="text-2xl font-bold text-green-900">{summary.students}</p>
              </div>
              <Users className="h-7 w-7 text-green-700" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200 shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Advisers</p>
                <p className="text-2xl font-bold text-green-900">{summary.advisers}</p>
              </div>
              <UserCog className="h-7 w-7 text-green-700" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200 shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Chairmen</p>
                <p className="text-2xl font-bold text-green-900">{summary.chairmen}</p>
              </div>
              <Shield className="h-7 w-7 text-green-700" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200 shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Appointments</p>
                <p className="text-2xl font-bold text-green-900">{summary.appointments}</p>
              </div>
              <CalendarDays className="h-7 w-7 text-green-700" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-yellow-200 shadow-md">
          <CardHeader className="bg-gradient-to-r from-yellow-50 to-green-50 border-b border-yellow-200">
            <CardTitle className="text-green-900">Grade Distribution</CardTitle>
            <CardDescription>Click a slice to open the Students tab with the matching grade status filter.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-gray-600">Filter grade distribution by semester.</p>
              <Select value={gradeSemester} onValueChange={onGradeSemesterChange}>
                <SelectTrigger className="w-full sm:w-64">
                  <SelectValue placeholder="Filter by semester" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_SEMESTERS_VALUE}>All Semesters</SelectItem>
                  {semesterOptions.length === 0 ? (
                    <SelectItem value="__none" disabled>No semesters available</SelectItem>
                  ) : (
                    semesterOptions.map((semester) => (
                      <SelectItem key={semester} value={semester}>
                        {semester}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            {gradeChartError && (
              <div className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                {gradeChartError}
              </div>
            )}
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={passFailChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={false}
                  outerRadius={95}
                  dataKey="value"
                  onClick={(entry) => handlePieSliceClick(entry as { filter?: GradeStatusFilter; value?: number })}
                >
                  {passFailChartData.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} className="cursor-pointer" />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {passFailChartData.map((entry) => (
                <button
                  key={entry.name}
                  type="button"
                  className="flex items-center justify-between rounded-md border border-gray-200 bg-white px-3 py-2 text-left hover:bg-gray-50"
                  onClick={() => handlePieSliceClick(entry)}
                  disabled={entry.value <= 0}
                >
                  <span className="flex items-center gap-2 text-sm text-gray-700">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.fill }} />
                    {entry.name}
                  </span>
                  <span className="text-sm font-semibold text-green-900">{entry.value}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200 shadow-md">
          <CardHeader className="bg-gradient-to-r from-green-50 to-yellow-50 border-b border-green-200">
            <CardTitle className="text-green-900">Recent Appointments</CardTitle>
            <CardDescription>Latest advising appointment activity.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {recentAppointments.length === 0 ? (
              <p className="text-sm text-gray-500">No recent appointments yet.</p>
            ) : (
              <div className="space-y-3">
                {recentAppointments.map((row) => (
                  <div key={String(row.appointmentId)} className="flex items-center justify-between border-b pb-2 last:border-0">
                    <div>
                      <p className="font-medium text-gray-900">{row.studentName}</p>
                      <p className="text-xs text-gray-500">{row.dateLabel}</p>
                    </div>
                    <Badge className={appointmentStatusTone(row.status)}>{row.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
