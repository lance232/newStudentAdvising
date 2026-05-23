/// <reference types="vite/client" />
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Search, Eye } from "lucide-react";
import { ALL_SEMESTERS_VALUE, buildSemesterLabel, matchesSemesterSelection, sortSemesterLabels } from "./semester-utils";

interface StudentRecord {
  id: number | string;
  routeStudentId: string;
  userId: string;
  yearLevelId: string;
  username: string;
  firstName: string;
  lastName: string;
  yearLevelName: string;
  email: string;
  hasFailedGrade: boolean;
  assignedAdviserName: string;
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
  role?: string | null;
  Role?: string | null;
  firstName?: string | null;
  FirstName?: string | null;
  lastName?: string | null;
  LastName?: string | null;
  email?: string | null;
  Email?: string | null;
  yearLevelId?: number | string | null;
  YearLevelId?: number | string | null;
  yearLevelName?: string | null;
  YearLevelName?: string | null;
  yearLevel?: string | null;
}

interface AdviserApiRow {
  id?: number | string | null;
  adviserId?: number | string | null;
  advisorId?: number | string | null;
  userId?: number | string | null;
  username?: string | null;
  userName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  user?: {
    userId?: number | string | null;
    username?: string | null;
    firstName?: string | null;
    lastName?: string | null;
  } | null;
}

interface AdviserAssignmentRow {
  adviserAssignmentId?: number | string | null;
  adviserId?: number | string | null;
  advisorId?: number | string | null;
  yearLevelId?: number | string | null;
  yearlevelId?: number | string | null;
  levelId?: number | string | null;
  yearLevelName?: string | null;
  YearLevelName?: string | null;
  yearLevel?: string | null;
}

const SEMESTER_ENDPOINTS = ['/Semesters', '/Semesters/active', '/Semesters/current'];

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

  throw new Error('Unable to reach user directory endpoints.');
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
    if (record.data && typeof record.data === 'object') {
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

  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>;

    if (record.SemesterId != null || record.semesterId != null) {
      return [record as SemesterRow];
    }

    if (Array.isArray(record.data)) {
      return record.data as SemesterRow[];
    }
    if (record.data && typeof record.data === 'object') {
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
    if (record.items && typeof record.items === 'object') {
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

function isFailedGrade(grade: any): boolean {
  const statusRaw = String(
    grade?.status
    ?? grade?.Status
    ?? grade?.remarks
    ?? grade?.Remarks
    ?? grade?.result
    ?? grade?.remark
    ?? '',
  ).toLowerCase().replace(/\s+/g, ' ').trim();

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

function normalizeText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function canonicalYearLevelLabel(rawLabel: string, rawId?: string): string {
  const label = normalizeText(rawLabel);
  const id = normalizeText(rawId ?? '');

  if (label.includes('1st year') || label.includes('first year') || label.includes('bscpe-1') || id === '1') {
    return '1st Year';
  }
  if (label.includes('2nd year') || label.includes('second year') || label.includes('bscpe-2') || id === '2') {
    return '2nd Year';
  }
  if (label.includes('3rd year') || label.includes('third year') || label.includes('bscpe-3') || id === '3') {
    return '3rd Year';
  }
  if (label.includes('4th year') || label.includes('fourth year') || label.includes('bscpe-4') || id === '4') {
    return '4th Year';
  }

  return rawLabel.trim();
}

function getYearLevelRank(level: string): number {
  const normalized = normalizeText(level);

  if (normalized.includes('bscpe-1') || normalized.includes('1st year') || normalized.includes('first year')) {
    return 1;
  }
  if (normalized.includes('bscpe-2') || normalized.includes('2nd year') || normalized.includes('second year')) {
    return 2;
  }
  if (normalized.includes('bscpe-3') || normalized.includes('3rd year') || normalized.includes('third year')) {
    return 3;
  }
  if (normalized.includes('bscpe-4') || normalized.includes('4th year') || normalized.includes('fourth year')) {
    return 4;
  }

  return 999;
}

function sortYearLevels(levels: string[]): string[] {
  return [...levels].sort((a, b) => {
    const rankDiff = getYearLevelRank(a) - getYearLevelRank(b);
    if (rankDiff !== 0) {
      return rankDiff;
    }

    return a.localeCompare(b);
  });
}

type GradeFilter = 'all' | 'no-failed' | 'has-failed';

interface StudentListProps {
  onSelectStudent: (studentId: number | string) => void;
  gradeFilter: GradeFilter;
  onGradeFilterChange: (filter: GradeFilter) => void;
  semesterFilter: string;
  onSemesterFilterChange: (filter: string) => void;
  isChairman: boolean;
  currentUserId: string;
}

export function StudentList({ onSelectStudent, gradeFilter, onGradeFilterChange, semesterFilter, onSemesterFilterChange, isChairman, currentUserId }: StudentListProps) {
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [gradeRows, setGradeRows] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [usernameSearchTerm, setUsernameSearchTerm] = useState('');
  const [yearLevelFilter, setYearLevelFilter] = useState('all');
  const [availableYearLevels, setAvailableYearLevels] = useState<string[]>(['BSCPE-1', 'BSCPE-2', 'BSCPE-3', 'BSCPE-4']);
  const [availableSemesters, setAvailableSemesters] = useState<string[]>([]);

  const loadStudents = async () => {
    setIsLoading(true);
    setLoadError('');

    try {
      const token = getAuthToken();
      const headers = {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };
      const usersResponse = await fetchWithApiFallback('/users', { headers });
      const usersPayload = await usersResponse.json().catch(() => ([]));
      const yearLevelsResponse = await fetchWithApiFallback('/Students/year-levels', { headers });
      const yearLevelsPayload = await yearLevelsResponse.json().catch(() => ([]));

      const yearLevelIdByLabel = new Map<string, string>();
      let userRows: UserApiRow[] = Array.isArray(usersPayload) ? usersPayload : [];
      const usernameByUserId = new Map<string, string>();
      const yearLevelLabelById = new Map<string, string>();
      const yearLevelIds: string[] = [];
      const fallbackYearLevels = ['1st Year', '2nd Year', '3rd Year', '4th Year'];

      if (yearLevelsResponse.ok && Array.isArray(yearLevelsPayload)) {
        const yearLevelLabels: string[] = [];
        yearLevelsPayload.forEach((item: any) => {
          const id = String(item.yearLevelId ?? item.id ?? item.value ?? '').trim();
          const rawLabel = String(item.yearLevelName ?? item.name ?? item.yearLevel ?? item.label ?? '').trim();
          const label = canonicalYearLevelLabel(rawLabel, id);
          if (id && label) {
            yearLevelLabelById.set(id, label);
            yearLevelIdByLabel.set(normalizeText(label), id);
          }
          if (id) {
            yearLevelIds.push(id);
          }
          if (label) {
            yearLevelLabels.push(label);
          }
        });

        const uniqueYearLevelLabels = sortYearLevels(Array.from(new Set(yearLevelLabels)));
        setAvailableYearLevels(uniqueYearLevelLabels.length > 0 ? uniqueYearLevelLabels : fallbackYearLevels);
      } else {
        setAvailableYearLevels(fallbackYearLevels);
      }

      const selectedYearLevelId =
        yearLevelFilter === 'all'
          ? ''
          : (yearLevelIdByLabel.get(normalizeText(yearLevelFilter)) ?? '');

      const studentsPath = selectedYearLevelId
        ? `/Students?yearLevelId=${encodeURIComponent(selectedYearLevelId)}`
        : '/Students';

      const studentsResponse = await fetchWithApiFallback(studentsPath, { headers });
      const studentsPayload = await studentsResponse.json().catch(() => ([]));

      if (!studentsResponse.ok) {
        throw new Error(getErrorMessage(studentsPayload, 'Unable to fetch students from backend students endpoint.'));
      }

      let studentRowsPayload: any[] = Array.isArray(studentsPayload) ? studentsPayload : [];

      if (isChairman) {
        const studentRowsByYearLevel: any[] = [];
        const candidateYearLevelIds = selectedYearLevelId
          ? [selectedYearLevelId]
          : (yearLevelIds.length > 0 ? yearLevelIds : ['1', '2', '3', '4']);
        for (const yearLevelId of candidateYearLevelIds) {
          const byYearLevelResponse = await fetchWithApiFallback(`/Students?yearLevelId=${encodeURIComponent(yearLevelId)}`, { headers });
          const byYearLevelPayload = await byYearLevelResponse.json().catch(() => ([]));
          if (byYearLevelResponse.ok && Array.isArray(byYearLevelPayload)) {
            studentRowsByYearLevel.push(...byYearLevelPayload);
          }
        }

        if (studentRowsByYearLevel.length > 0) {
          const mergedStudentRows = [...studentRowsPayload, ...studentRowsByYearLevel];
          const seen = new Set<string>();
          studentRowsPayload = mergedStudentRows.filter((item) => {
            const key = String(item?.studentId ?? item?.StudentId ?? item?.userId ?? item?.UserId ?? '').trim();
            if (!key || seen.has(key)) {
              return false;
            }
            seen.add(key);
            return true;
          });
        }
      }

      userRows.forEach((item) => {
        const userId = String(item.userId ?? item.UserId ?? '').trim();
        const username = String(item.username ?? item.Username ?? item.userName ?? item.UserName ?? '').trim();
        if (userId && username) {
          usernameByUserId.set(userId, username);
        }
      });

      const studentRows: StudentApiRow[] = studentRowsPayload as StudentApiRow[];
      const mappedFromStudents = studentRows.reduce<StudentRecord[]>((acc, item) => {
        const routeStudentId = String(item.studentId ?? item.StudentId ?? '').trim();
        const userId = String(item.userId ?? item.UserId ?? '').trim();
        const yearLevelId = String(item.yearLevelId ?? item.YearLevelId ?? '').trim();
        const directUsername = String(item.username ?? item.Username ?? item.userName ?? item.UserName ?? '').trim();
        const mappedUsername = userId ? (usernameByUserId.get(userId) ?? '') : '';
        const resolvedUsername = directUsername || mappedUsername || routeStudentId || userId;
        if (!routeStudentId && !userId) {
          return acc;
        }

        const firstName = String(item.firstName ?? item.FirstName ?? '').trim();
        const lastName = String(item.lastName ?? item.LastName ?? '').trim();
        const rawYearLevelName = String(item.yearLevelName ?? item.YearLevelName ?? '').trim();
        const resolvedYearLevelName = canonicalYearLevelLabel(
          rawYearLevelName || (yearLevelId ? (yearLevelLabelById.get(yearLevelId) ?? '') : ''),
          yearLevelId,
        );

        acc.push({
          id: resolvedUsername || routeStudentId || userId,
          routeStudentId: routeStudentId || userId,
          userId,
          yearLevelId,
          username: resolvedUsername,
          firstName: firstName || 'Not Set',
          lastName: lastName || 'Not Set',
          yearLevelName: resolvedYearLevelName || 'Not Set',
          email: String(item.email ?? item.Email ?? 'Not Set') || 'Not Set',
          hasFailedGrade: false,
          assignedAdviserName: 'Not Set',
        });

        return acc;
      }, []);

      const mergedByUserId = new Map<string, StudentRecord>();
      const mergedByUsername = new Map<string, StudentRecord>();
      mappedFromStudents.forEach((student) => {
        if (student.userId) {
          mergedByUserId.set(student.userId, student);
        }
        if (student.username) {
          mergedByUsername.set(normalizeText(student.username), student);
        }
      });

      let mapped: StudentRecord[];
      if (isChairman) {
        mapped = mappedFromStudents;
      } else {
        mapped = mappedFromStudents;
      }

      const advisersResponse = await fetchWithApiFallback('/Advisers', { headers });
      const advisersPayload = await advisersResponse.json().catch(() => ([]));
      const adviserRows: AdviserApiRow[] = advisersResponse.ok && Array.isArray(advisersPayload) ? advisersPayload : [];

      const assignmentsResponse = await fetchWithApiFallback('/AdviserAssignments', { headers });
      const assignmentsPayload = await assignmentsResponse.json().catch(() => ([]));
      const assignmentRows: AdviserAssignmentRow[] = assignmentsResponse.ok && Array.isArray(assignmentsPayload) ? assignmentsPayload : [];

      const adviserNameByKey = new Map<string, string>();
      const adviserKeysForCurrentUser = new Set<string>();
      const currentUserIdKey = String(currentUserId ?? '').trim();

      adviserRows.forEach((adviser) => {
        const id = String(adviser.id ?? '').trim();
        const adviserId = String(adviser.adviserId ?? adviser.advisorId ?? '').trim();
        const userId = String(adviser.userId ?? adviser.user?.userId ?? '').trim();
        const username = String(adviser.username ?? adviser.userName ?? adviser.user?.username ?? '').trim();
        const firstName = String(adviser.firstName ?? adviser.user?.firstName ?? '').trim();
        const lastName = String(adviser.lastName ?? adviser.user?.lastName ?? '').trim();
        const fullName = `${firstName} ${lastName}`.trim() || username || 'Adviser';

        [id, adviserId, userId].filter(Boolean).forEach((key) => {
          adviserNameByKey.set(key, fullName);
        });

        if (currentUserIdKey && (currentUserIdKey === id || currentUserIdKey === adviserId || currentUserIdKey === userId)) {
          [id, adviserId, userId].filter(Boolean).forEach((key) => adviserKeysForCurrentUser.add(key));
        }
      });

      const adviserNamesByYearLevel = new Map<string, Set<string>>();
      const adviserNamesByYearLevelName = new Map<string, Set<string>>();
      const adviserYearLevelsForCurrentUser = new Set<string>();
      const adviserYearLevelNamesForCurrentUser = new Set<string>();

      assignmentRows.forEach((assignment) => {
        const assignmentAdviserKey = String(assignment.adviserId ?? assignment.advisorId ?? '').trim();
        const yearLevelId = String(assignment.yearLevelId ?? assignment.yearlevelId ?? assignment.levelId ?? '').trim();
        const yearLevelName = String(assignment.yearLevelName ?? assignment.YearLevelName ?? assignment.yearLevel ?? '').trim();
        const yearLevelNameKey = normalizeText(yearLevelName);

        if (!yearLevelId && !yearLevelName) {
          return;
        }

        const adviserName = adviserNameByKey.get(assignmentAdviserKey) ?? 'Adviser';

        if (yearLevelId) {
          if (!adviserNamesByYearLevel.has(yearLevelId)) {
            adviserNamesByYearLevel.set(yearLevelId, new Set<string>());
          }
          adviserNamesByYearLevel.get(yearLevelId)?.add(adviserName);
        }

        if (yearLevelName) {
          if (!adviserNamesByYearLevelName.has(yearLevelNameKey)) {
            adviserNamesByYearLevelName.set(yearLevelNameKey, new Set<string>());
          }
          adviserNamesByYearLevelName.get(yearLevelNameKey)?.add(adviserName);
        }

        if (assignmentAdviserKey && adviserKeysForCurrentUser.has(assignmentAdviserKey)) {
          if (yearLevelId) {
            adviserYearLevelsForCurrentUser.add(yearLevelId);
          }
          if (yearLevelName) {
            adviserYearLevelNamesForCurrentUser.add(yearLevelNameKey);
          }
        }
      });

      let scopeFiltered = mapped;
      if (!isChairman) {
        if (adviserYearLevelsForCurrentUser.size > 0 || adviserYearLevelNamesForCurrentUser.size > 0) {
          scopeFiltered = mapped.filter((student) => {
            const byId = student.yearLevelId && adviserYearLevelsForCurrentUser.has(student.yearLevelId);
            const byName = student.yearLevelName && adviserYearLevelNamesForCurrentUser.has(normalizeText(student.yearLevelName));
            return Boolean(byId || byName);
          });
        } else {
          // If assignment mapping fails, keep backend-scoped rows so advisers still see their students.
          scopeFiltered = mapped;
        }
      }

      const withAdviserNames = scopeFiltered.map((student) => {
        const namesById = adviserNamesByYearLevel.get(student.yearLevelId);
        const namesByName = adviserNamesByYearLevelName.get(normalizeText(student.yearLevelName));
        const names = new Set<string>([...(namesById ?? []), ...(namesByName ?? [])]);
        const assignedAdviserName = names && names.size > 0
          ? Array.from(names).sort((a, b) => a.localeCompare(b)).join(', ')
          : 'Not Set';

        return {
          ...student,
          assignedAdviserName,
        };
      });

      let gradeRows: any[] = [];
      const [gradesResponse, semesters] = await Promise.all([
        fetchWithApiFallback('/Grades', { headers }),
        fetchSemesters(headers),
      ]);
      const gradesPayload = await gradesResponse.json().catch(() => ([]));

      if (gradesResponse.ok) {
        gradeRows = getArrayPayload(gradesPayload);
      } else {
        for (const student of withAdviserNames) {
          const studentGradesResponse = await fetchWithApiFallback(`/Students/${student.routeStudentId}/grades`, { headers });
          const studentGradesPayload = await studentGradesResponse.json().catch(() => ([]));

          if (studentGradesResponse.ok) {
            gradeRows.push(...getArrayPayload(studentGradesPayload));
          }
        }
      }

      const semesterLabelById = new Map<string, string>();
      semesters.forEach((row) => {
        const id = String(row.SemesterId ?? row.semesterId ?? '').trim();
        if (!id) {
          return;
        }
        const name = String(row.SemesterName ?? row.semesterName ?? row.Name ?? row.name ?? '').trim();
        const schoolYear = String(row.SchoolYear ?? row.schoolYear ?? '').trim();
        const label = buildSemesterLabel(name, schoolYear);
        if (label && label !== 'Not Set') {
          semesterLabelById.set(id, label);
        }
      });

      const normalizedGrades = gradeRows.map((grade) => {
        const rawLabel = buildSemesterLabel(
          grade?.semesterName ?? grade?.SemesterName ?? grade?.semester,
          grade?.schoolYear ?? grade?.SchoolYear,
        );
        const semesterId = String(grade?.semesterId ?? grade?.SemesterId ?? '').trim();
        const fallbackLabel = semesterId ? (semesterLabelById.get(semesterId) ?? '') : '';
        const semesterLabel = rawLabel !== 'Not Set' ? rawLabel : (fallbackLabel || 'Not Set');

        return {
          ...grade,
          semesterLabel,
        };
      });
      setGradeRows(normalizedGrades);
      setAvailableSemesters(sortSemesterLabels(normalizedGrades.map((grade) => grade.semesterLabel)));

      setStudents(withAdviserNames.map((student) => ({
        ...student,
        hasFailedGrade: false,
      })));
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Unable to fetch students.');
      setStudents([]);
      setGradeRows([]);
      setAvailableSemesters([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStudents();
  }, [isChairman, currentUserId, yearLevelFilter]);

  const yearLevelOptions = useMemo(() => {
    const fromStudents = Array.from(
      new Set(
        students
          .map((student) => student.yearLevelName.trim())
          .filter((value) => value.length > 0 && value !== 'Not Set'),
      ),
    );

    const merged = Array.from(new Set([...availableYearLevels, ...fromStudents]));
    return sortYearLevels(merged);
  }, [students, availableYearLevels]);

  const studentsWithStatus = useMemo(() => {
    if (students.length === 0) {
      return [];
    }

    const hasFailedByKey = new Map<string, boolean>();
    const studentGradeKey = (value: string) => `student:${value}`;
    const userGradeKey = (value: string) => `user:${value}`;

    gradeRows
      .filter((grade) => matchesSemesterSelection(grade.semesterLabel, semesterFilter))
      .forEach((grade) => {
        const gradeStudentId = String(grade?.studentId ?? grade?.StudentId ?? '').trim();
        const gradeUserId = String(grade?.userId ?? grade?.UserId ?? '').trim();
        const failed = isFailedGrade(grade);

        if (gradeStudentId) {
          const key = studentGradeKey(gradeStudentId);
          hasFailedByKey.set(key, (hasFailedByKey.get(key) ?? false) || failed);
        } else if (gradeUserId) {
          // Only use userId when studentId is unavailable to avoid mismatching adviser-encoded grade rows.
          const key = userGradeKey(gradeUserId);
          hasFailedByKey.set(key, (hasFailedByKey.get(key) ?? false) || failed);
        }
      });

    return students.map((student) => ({
      ...student,
      hasFailedGrade:
        (student.routeStudentId ? hasFailedByKey.get(studentGradeKey(student.routeStudentId)) : undefined)
        ?? (student.userId ? hasFailedByKey.get(userGradeKey(student.userId)) : undefined)
        ?? false,
    }));
  }, [students, gradeRows, semesterFilter]);

  const filteredStudents = studentsWithStatus.filter((student) => {
    const query = usernameSearchTerm.toLowerCase();
    const matchesUsername = student.username.toLowerCase().includes(query);
    const matchesYearLevel = yearLevelFilter === 'all' || student.yearLevelName === yearLevelFilter;
    const matchesGradeStatus =
      gradeFilter === 'all'
      || (gradeFilter === 'no-failed' && !student.hasFailedGrade)
      || (gradeFilter === 'has-failed' && student.hasFailedGrade);

    return (
      matchesUsername && matchesYearLevel && matchesGradeStatus
    );
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="tracking-tight">Student Directory</h2>
        <p className="text-gray-600">
          {isChairman
            ? 'Browse all students across year levels.'
            : 'Browse and review students in your assigned advisorship only.'}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Students</CardTitle>
          <CardDescription>
            {isChairman
              ? 'Find students using username (school ID), year level, and grade status filters.'
              : 'Find students using username (school ID), year level, and grade status filters.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Filters */}
            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by ID (username)..."
                  value={usernameSearchTerm}
                  onChange={(e) => setUsernameSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={yearLevelFilter} onValueChange={setYearLevelFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by year level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Year Levels</SelectItem>
                  {yearLevelOptions.map((level) => (
                    <SelectItem key={level} value={level}>{level}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={semesterFilter} onValueChange={onSemesterFilterChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by semester" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_SEMESTERS_VALUE}>All Semesters</SelectItem>
                  {availableSemesters.length === 0 ? (
                    <SelectItem value="__none" disabled>No semesters available</SelectItem>
                  ) : (
                    availableSemesters.map((semester) => (
                      <SelectItem key={semester} value={semester}>{semester}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <Select value={gradeFilter} onValueChange={(value) => onGradeFilterChange(value as GradeFilter)}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by grade status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Students</SelectItem>
                  <SelectItem value="no-failed">Students who pass all subjects</SelectItem>
                  <SelectItem value="has-failed">Students with at least one failed grade</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {loadError && (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <span>{loadError}</span>
                  <Button size="sm" variant="outline" onClick={loadStudents}>
                    Retry
                  </Button>
                </div>
              </div>
            )}

            {/* Student Table */}
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Username (ID)</TableHead>
                    <TableHead>First Name</TableHead>
                    <TableHead>Last Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Year Level</TableHead>
                    {isChairman && <TableHead>Adviser</TableHead>}
                    <TableHead>Grade</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={isChairman ? 8 : 7} className="text-center text-gray-500 py-8">
                        Loading students...
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredStudents.map((student) => (
                      <TableRow key={student.id}>
                        <TableCell className="font-medium">{student.username || 'Not Set'}</TableCell>
                        <TableCell>{student.firstName}</TableCell>
                        <TableCell>{student.lastName}</TableCell>
                        <TableCell>{student.email}</TableCell>
                        <TableCell className="font-medium text-green-800">{student.yearLevelName}</TableCell>
                        {isChairman && <TableCell>{student.assignedAdviserName}</TableCell>}
                        <TableCell>
                          {student.hasFailedGrade ? (
                            <Badge className="bg-red-100 text-red-800 border-red-300">Failed</Badge>
                          ) : (
                            <Badge className="bg-green-100 text-green-800 border-green-300">Pass</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={() => onSelectStudent(student.routeStudentId)}>
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {filteredStudents.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                {students.length === 0
                  ? (isChairman
                    ? 'No students are available right now.'
                    : 'No students available for your assigned advisorship.')
                  : 'No students found matching the selected filters.'}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}