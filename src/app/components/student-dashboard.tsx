import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { AlertCircle, BookOpen, CheckCircle, TrendingUp, User, XCircle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ALL_SEMESTERS_VALUE, buildSemesterLabel, matchesSemesterSelection, normalizeSemesterLabel, sortSemesterLabels } from './semester-utils';

interface StudentDashboardProps {
  onBookAppointment: () => void;
}

interface DashboardAdviser {
  adviserId?: number | string | null;
  AdviserId?: number | string | null;
  fullName?: string | null;
  FullName?: string | null;
  username?: string | null;
  Username?: string | null;
  email?: string | null;
  Email?: string | null;
}

interface DashboardEnrollment {
  enrollmentId?: number | string | null;
  EnrollmentId?: number | string | null;
  courseCode?: string | null;
  CourseCode?: string | null;
  courseName?: string | null;
  CourseName?: string | null;
  units?: number | string | null;
  Units?: number | string | null;
  semesterName?: string | null;
  SemesterName?: string | null;
  schoolYear?: string | null;
  SchoolYear?: string | null;
  currentGrade?: string | number | null;
  CurrentGrade?: string | number | null;
}

interface DashboardGrade {
  gradeId?: number | string | null;
  GradeId?: number | string | null;
  courseCode?: string | null;
  CourseCode?: string | null;
  courseName?: string | null;
  CourseName?: string | null;
  gradeValue?: string | number | null;
  GradeValue?: string | number | null;
  currentGrade?: string | number | null;
  CurrentGrade?: string | number | null;
  units?: number | string | null;
  Units?: number | string | null;
  semesterName?: string | null;
  SemesterName?: string | null;
  schoolYear?: string | null;
  SchoolYear?: string | null;
}

interface DashboardPayload {
  studentId?: number | string | null;
  StudentId?: number | string | null;
  userId?: number | string | null;
  UserId?: number | string | null;
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
  yearLevelName?: string | null;
  YearLevelName?: string | null;
  enrollments?: DashboardEnrollment[];
  Enrollments?: DashboardEnrollment[];
  grades?: DashboardGrade[];
  Grades?: DashboardGrade[];
  assignedAdvisers?: DashboardAdviser[];
  AssignedAdvisers?: DashboardAdviser[];
}

const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ?? 'https://localhost:53005/api';

const DASHBOARD_TAB_STORAGE_KEY = 'student_dashboard_tab';

function getTabStorage(): Storage {
  if (localStorage.getItem('auth_token')) {
    return localStorage;
  }
  if (sessionStorage.getItem('auth_token')) {
    return sessionStorage;
  }
  return localStorage;
}

function readStoredDashboardTab(): 'current' | 'history' {
  const value = getTabStorage().getItem(DASHBOARD_TAB_STORAGE_KEY);
  if (value === 'history') {
    return 'history';
  }
  return 'current';
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

  throw new Error('Unable to reach student dashboard endpoint.');
}

function getAuthToken(): string | null {
  const rawToken = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
  if (!rawToken) {
    return null;
  }

  return rawToken.replace(/^Bearer\s+/i, '').trim();
}

function getSessionUsername(): string {
  const rawSession = sessionStorage.getItem('app_session');
  if (!rawSession) {
    return '';
  }

  try {
    const session = JSON.parse(rawSession) as { currentUser?: { username?: string } };
    return String(session.currentUser?.username ?? '').trim();
  } catch {
    return '';
  }
}

function getErrorMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== 'object') {
    return fallback;
  }

  const data = payload as { message?: string; error?: string; title?: string };
  return data.message || data.error || data.title || fallback;
}

function parseNumber(value: unknown): number | null {
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

function getGradeNumeric(grade: DashboardGrade): number | null {
  return (
    parseNumber(grade.currentGrade)
    ?? parseNumber(grade.CurrentGrade)
    ?? parseNumber(grade.gradeValue)
    ?? parseNumber(grade.GradeValue)
  );
}

function formatGradeDisplay(value: unknown): string {
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

export function StudentDashboard({ onBookAppointment }: StudentDashboardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [dashboard, setDashboard] = useState<DashboardPayload | null>(null);
  const [historySemester, setHistorySemester] = useState(ALL_SEMESTERS_VALUE);
  const [activeTab, setActiveTab] = useState<'current' | 'history'>(() => readStoredDashboardTab());

  const loadDashboard = async () => {
    setIsLoading(true);
    setLoadError('');

    try {
      const token = getAuthToken();
      const headers = {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      const response = await fetchWithApiFallback('/Students/me/dashboard', { headers });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(getErrorMessage(payload, 'Unable to load student dashboard.'));
      }

      setDashboard(payload as DashboardPayload);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Unable to load student dashboard.');
      setDashboard(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  useEffect(() => {
    getTabStorage().setItem(DASHBOARD_TAB_STORAGE_KEY, activeTab);
  }, [activeTab]);

  const fullName = useMemo(() => {
    const firstName = String(dashboard?.firstName ?? dashboard?.FirstName ?? '').trim();
    const lastName = String(dashboard?.lastName ?? dashboard?.LastName ?? '').trim();
    const combined = `${firstName} ${lastName}`.trim();
    if (combined) {
      return combined;
    }
    return 'Student';
  }, [dashboard]);

  const sessionUsername = getSessionUsername();
  const studentIdText = String(
    dashboard?.username
    ?? dashboard?.Username
    ?? dashboard?.userName
    ?? dashboard?.UserName
    ?? sessionUsername
    ?? 'Not Set',
  ) || 'Not Set';
  const yearLevelName = String(dashboard?.yearLevelName ?? dashboard?.YearLevelName ?? 'Not Set') || 'Not Set';

  const enrollments = (dashboard?.enrollments ?? dashboard?.Enrollments ?? []) as DashboardEnrollment[];
  const grades = (dashboard?.grades ?? dashboard?.Grades ?? []) as DashboardGrade[];
  const assignedAdvisers = (dashboard?.assignedAdvisers ?? dashboard?.AssignedAdvisers ?? []) as DashboardAdviser[];

  const enrollmentRows = useMemo(() => {
    return enrollments.map((item) => ({
      ...item,
      semesterLabel: buildSemesterLabel(item.semesterName ?? item.SemesterName, item.schoolYear ?? item.SchoolYear),
    }));
  }, [enrollments]);

  const gradeRows = useMemo(() => {
    return grades.map((item) => ({
      ...item,
      semesterLabel: buildSemesterLabel(item.semesterName ?? item.SemesterName, item.schoolYear ?? item.SchoolYear),
    }));
  }, [grades]);

  const semesterOptions = useMemo(() => {
    return sortSemesterLabels([
      ...enrollmentRows.map((item) => item.semesterLabel),
      ...gradeRows.map((item) => item.semesterLabel),
    ]);
  }, [enrollmentRows, gradeRows]);

  const currentSemesterLabel = useMemo(() => {
    if (semesterOptions.length === 0) {
      return '';
    }

    const parsed = semesterOptions.map((label) => {
      const normalized = normalizeSemesterLabel(label);
      const yearMatch = normalized.match(/\b(\d{4})\b/);
      const year = yearMatch ? Number(yearMatch[1]) : 0;
      const lower = normalized.toLowerCase();
      let rank = 0;
      if (lower.startsWith('1st semester')) {
        rank = 1;
      } else if (lower.startsWith('2nd semester')) {
        rank = 2;
      } else if (lower.startsWith('summer')) {
        rank = 3;
      }
      return { label: normalized, year, rank };
    });

    parsed.sort((left, right) => {
      if (left.year !== right.year) {
        return left.year - right.year;
      }
      return left.rank - right.rank;
    });

    return parsed[parsed.length - 1]?.label ?? '';
  }, [semesterOptions]);

  useEffect(() => {
    if (currentSemesterLabel && historySemester === currentSemesterLabel) {
      setHistorySemester(ALL_SEMESTERS_VALUE);
    }
  }, [currentSemesterLabel, historySemester]);

  const historySemesterOptions = useMemo(() => {
    if (!currentSemesterLabel) {
      return semesterOptions;
    }

    const currentIndex = semesterOptions.findIndex(
      (label) => normalizeSemesterLabel(label) === currentSemesterLabel,
    );

    if (currentIndex <= 0) {
      return [];
    }

    return semesterOptions.slice(0, currentIndex);
  }, [semesterOptions, currentSemesterLabel]);

  const historyGradeRows = useMemo(() => {
    if (historySemesterOptions.length === 0) {
      return [];
    }

    const allowed = new Set(historySemesterOptions.map((label) => normalizeSemesterLabel(label)));
    return gradeRows.filter((item) => allowed.has(normalizeSemesterLabel(item.semesterLabel)));
  }, [gradeRows, historySemesterOptions]);

  const historyGrades = useMemo(() => {
    if (historySemester === ALL_SEMESTERS_VALUE) {
      return gradeRows;
    }

    return historyGradeRows.filter((item) => matchesSemesterSelection(item.semesterLabel, historySemester));
  }, [gradeRows, historyGradeRows, historySemester]);

  const currentSemesterGrades = useMemo(() => {
    if (!currentSemesterLabel) {
      return gradeRows;
    }
    return gradeRows.filter((item) => normalizeSemesterLabel(item.semesterLabel) === currentSemesterLabel);
  }, [gradeRows, currentSemesterLabel]);

  const selectedEnrollments = useMemo(() => {
    if (!currentSemesterLabel) {
      return enrollmentRows;
    }
    return enrollmentRows.filter((item) => normalizeSemesterLabel(item.semesterLabel) === currentSemesterLabel);
  }, [enrollmentRows, currentSemesterLabel]);

  const currentGwa = useMemo(() => {
    if (currentSemesterGrades.length === 0) {
      return 'Not Set';
    }

    let totalWeighted = 0;
    let totalUnits = 0;

    currentSemesterGrades.forEach((grade) => {
      const value = getGradeNumeric(grade);
      const units = parseNumber(grade.units ?? grade.Units) ?? 0;
      if (value !== null && units > 0) {
        totalWeighted += value * units;
        totalUnits += units;
      }
    });

    if (totalUnits === 0) {
      return 'Not Set';
    }

    return (totalWeighted / totalUnits).toFixed(2);
  }, [currentSemesterGrades]);

  const historyGwa = useMemo(() => {
    if (historyGrades.length === 0) {
      return 'Not Set';
    }

    let totalWeighted = 0;
    let totalUnits = 0;

    historyGrades.forEach((grade) => {
      const value = getGradeNumeric(grade);
      const units = parseNumber(grade.units ?? grade.Units) ?? 0;
      if (value !== null && units > 0) {
        totalWeighted += value * units;
        totalUnits += units;
      }
    });

    if (totalUnits === 0) {
      return 'Not Set';
    }

    return (totalWeighted / totalUnits).toFixed(2);
  }, [historyGrades]);

  const passCount = useMemo(() => currentSemesterGrades.filter((g) => {
    const value = getGradeNumeric(g);
    return value !== null && value >= 1.0 && value <= 3.0;
  }).length, [currentSemesterGrades]);

  const failCount = useMemo(() => currentSemesterGrades.filter((g) => {
    const value = getGradeNumeric(g);
    return value !== null && value > 3.0;
  }).length, [currentSemesterGrades]);

  const totalUnits = useMemo(() => currentSemesterGrades.reduce((sum, g) => {
    const units = parseNumber(g.units ?? g.Units);
    return units !== null ? sum + units : sum;
  }, 0), [currentSemesterGrades]);

  const historyTotalUnits = useMemo(() => historyGrades.reduce((sum, g) => {
    const units = parseNumber(g.units ?? g.Units);
    return units !== null ? sum + units : sum;
  }, 0), [historyGrades]);


  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-green-50 to-yellow-50 rounded-lg p-6 border border-green-200">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="tracking-tight mb-1">Student Dashboard</h2>
            <p className="text-gray-700">
              <span className="font-medium">{fullName}</span> • Username: {studentIdText} • {yearLevelName}
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button onClick={onBookAppointment} className="bg-gradient-to-r from-green-600 to-yellow-500 hover:from-green-700 hover:to-yellow-600 text-white">
              Book Appointment
            </Button>
          </div>
        </div>
      </div>

      {loadError && (
        <div className="flex items-center justify-between gap-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            <span>{loadError}</span>
          </div>
          <Button size="sm" variant="outline" onClick={loadDashboard}>Retry</Button>
        </div>
      )}

      {isLoading ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-500">Loading student dashboard...</p>
          </CardContent>
        </Card>
      ) : dashboard ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="border-green-200 shadow-md">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">GWA</p>
                    <p className="text-2xl font-bold text-green-900">{currentGwa}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-green-200 shadow-md">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Subjects Passed</p>
                    <p className="text-2xl font-bold text-green-700">{passCount}</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-red-200 shadow-md">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Subjects Failed</p>
                    <p className="text-2xl font-bold text-red-700">{failCount}</p>
                  </div>
                  <XCircle className="h-8 w-8 text-red-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-yellow-200 shadow-md">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Total Units</p>
                    <p className="text-2xl font-bold text-yellow-700">{totalUnits}</p>
                  </div>
                  <BookOpen className="h-8 w-8 text-yellow-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>Summary semester:</span>
            <Badge className="bg-green-100 text-green-800 border-green-200">
              {currentSemesterLabel || 'Current Semester'}
            </Badge>
          </div>

          <Card className="border-green-200 shadow-md">
            <CardHeader className="bg-gradient-to-r from-green-50 to-yellow-50 border-b border-green-200">
              <CardTitle className="text-green-900">Assigned Advisers</CardTitle>
              <CardDescription>Your currently assigned academic advisers.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {assignedAdvisers.length === 0 ? (
                <p className="text-sm text-gray-500">No assigned advisers found.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {assignedAdvisers.map((adviser, index) => {
                    const fullNameText = String(adviser.fullName ?? adviser.FullName ?? '').trim();
                    const usernameText = String(adviser.username ?? adviser.Username ?? '').trim();
                    const displayName = fullNameText || usernameText || 'Adviser';
                    const emailText = String(adviser.email ?? adviser.Email ?? 'Not Set') || 'Not Set';
                    return (
                      <div key={String(adviser.adviserId ?? adviser.AdviserId ?? index)} className="rounded-lg border border-green-200 p-3">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-green-900">{displayName}</p>
                          <Badge className="bg-green-100 text-green-800 border-green-300">Assigned</Badge>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{emailText}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList>
              <TabsTrigger value="current">Current</TabsTrigger>
              <TabsTrigger value="history">Grade History</TabsTrigger>
            </TabsList>

            <TabsContent value="current">
              <Card className="border-green-200 shadow-md">
                <CardHeader className="bg-gradient-to-r from-green-50 to-yellow-50 border-b border-green-200">
                  <CardTitle className="text-green-900">Courses / Enrollments</CardTitle>
                  <CardDescription>Selected semester courses and recorded grades.</CardDescription>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div className="rounded-lg border border-green-200 bg-green-50/60 p-4">
                      <p className="text-sm text-gray-600">GWA (Selected Semester)</p>
                      <p className="text-2xl font-semibold text-green-900">{currentGwa}</p>
                    </div>
                    <div className="rounded-lg border border-yellow-200 bg-yellow-50/60 p-4">
                      <p className="text-sm text-gray-600">Total Units (Selected Semester)</p>
                      <p className="text-2xl font-semibold text-yellow-700">{totalUnits}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 pb-4">
                    <span className="text-xs text-gray-500">
                      Showing current semester courses.
                    </span>
                  </div>
                  {selectedEnrollments.length === 0 ? (
                    <p className="text-sm text-gray-500">No enrollments found for this selection.</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedEnrollments.map((item, index) => {
                        const courseCode = String(item.courseCode ?? item.CourseCode ?? 'Not Set') || 'Not Set';
                        const courseName = String(item.courseName ?? item.CourseName ?? 'Not Set') || 'Not Set';
                        const units = String(item.units ?? item.Units ?? 'Not Set') || 'Not Set';
                        const semester = item.semesterLabel;
                        const currentGrade = formatGradeDisplay(item.currentGrade ?? item.CurrentGrade);
                        return (
                          <div key={String(item.enrollmentId ?? item.EnrollmentId ?? index)} className="grid grid-cols-12 gap-3 rounded-md border border-gray-200 p-3 text-sm">
                            <div className="col-span-2 font-semibold text-green-900">{courseCode}</div>
                            <div className="col-span-4">{courseName}</div>
                            <div className="col-span-1">{units}</div>
                            <div className="col-span-3 text-gray-600">{semester}</div>
                            <div className="col-span-2 font-medium">
                              {(() => {
                                const numeric = parseNumber(item.currentGrade ?? item.CurrentGrade);
                                const isPassed = numeric !== null && numeric >= 1.0 && numeric <= 3.0;
                                const isFailed = numeric !== null && numeric > 3.0;
                                const gradeTone = isPassed
                                  ? 'text-green-700 bg-green-50 border-green-200'
                                  : isFailed
                                    ? 'text-red-700 bg-red-50 border-red-200'
                                    : 'text-gray-700 bg-gray-50 border-gray-200';

                                return (
                                  <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${gradeTone}`}>
                                    {currentGrade}
                                  </span>
                                );
                              })()}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history" className="space-y-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-gray-600">Filter grade history by semester.</p>
                <Select value={historySemester} onValueChange={setHistorySemester}>
                  <SelectTrigger className="w-full sm:w-72">
                    <SelectValue placeholder="Filter by semester" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_SEMESTERS_VALUE}>All Semesters</SelectItem>
                    {historySemesterOptions.map((semester) => (
                      <SelectItem key={semester} value={semester}>
                        {semester}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Card className="border-green-200 shadow-md">
                <CardHeader className="bg-gradient-to-r from-green-50 to-yellow-50 border-b border-green-200">
                  <CardTitle className="text-green-900">Grades</CardTitle>
                  <CardDescription>Grade history for completed and ongoing subjects.</CardDescription>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div className="rounded-lg border border-green-200 bg-green-50/60 p-4">
                      <p className="text-sm text-gray-600">GWA (Selected Semester)</p>
                      <p className="text-2xl font-semibold text-green-900">{historyGwa}</p>
                    </div>
                    <div className="rounded-lg border border-yellow-200 bg-yellow-50/60 p-4">
                      <p className="text-sm text-gray-600">Total Units (Selected Semester)</p>
                      <p className="text-2xl font-semibold text-yellow-700">{historyTotalUnits}</p>
                    </div>
                  </div>
                  {historyGrades.length === 0 ? (
                    <p className="text-sm text-gray-500">No grades found.</p>
                  ) : (
                    <div className="space-y-2">
                      {historyGrades.map((item, index) => {
                        const courseCode = String(item.courseCode ?? item.CourseCode ?? 'Not Set') || 'Not Set';
                        const courseName = String(item.courseName ?? item.CourseName ?? 'Not Set') || 'Not Set';
                        const gradeValue = formatGradeDisplay(item.currentGrade ?? item.CurrentGrade ?? item.gradeValue ?? item.GradeValue);
                        const units = String(item.units ?? item.Units ?? 'Not Set') || 'Not Set';
                        const semester = item.semesterLabel;
                        return (
                          <div key={String(item.gradeId ?? item.GradeId ?? index)} className="grid grid-cols-12 gap-3 rounded-md border border-gray-200 p-3 text-sm">
                            <div className="col-span-2 font-semibold text-green-900">{courseCode}</div>
                            <div className="col-span-4">{courseName}</div>
                            <div className="col-span-3 text-gray-600">{semester}</div>
                            <div className="col-span-1">{units}</div>
                            <div className="col-span-2 font-medium">
                              {(() => {
                                const numeric = getGradeNumeric(item);
                                const isPassed = numeric !== null && numeric >= 1.0 && numeric <= 3.0;
                                const isFailed = numeric !== null && numeric > 3.0;
                                const gradeTone = isPassed
                                  ? 'text-green-700 bg-green-50 border-green-200'
                                  : isFailed
                                    ? 'text-red-700 bg-red-50 border-red-200'
                                    : 'text-gray-700 bg-gray-50 border-gray-200';

                                return (
                                  <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${gradeTone}`}>
                                    {gradeValue}
                                  </span>
                                );
                              })()}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-500">No student dashboard data available.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
