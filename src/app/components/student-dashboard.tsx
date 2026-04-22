import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { AlertCircle, BookOpen, CheckCircle, TrendingUp, User, XCircle } from 'lucide-react';

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
}

interface DashboardPayload {
  studentId?: number | string | null;
  StudentId?: number | string | null;
  userId?: number | string | null;
  UserId?: number | string | null;
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

export function StudentDashboard({ onBookAppointment }: StudentDashboardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [dashboard, setDashboard] = useState<DashboardPayload | null>(null);

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

  const fullName = useMemo(() => {
    const firstName = String(dashboard?.firstName ?? dashboard?.FirstName ?? '').trim();
    const lastName = String(dashboard?.lastName ?? dashboard?.LastName ?? '').trim();
    const combined = `${firstName} ${lastName}`.trim();
    if (combined) {
      return combined;
    }
    return 'Student';
  }, [dashboard]);

  const studentIdText = String(dashboard?.studentId ?? dashboard?.StudentId ?? 'Not Set') || 'Not Set';
  const yearLevelName = String(dashboard?.yearLevelName ?? dashboard?.YearLevelName ?? 'Not Set') || 'Not Set';

  const enrollments = (dashboard?.enrollments ?? dashboard?.Enrollments ?? []) as DashboardEnrollment[];
  const grades = (dashboard?.grades ?? dashboard?.Grades ?? []) as DashboardGrade[];
  const assignedAdvisers = (dashboard?.assignedAdvisers ?? dashboard?.AssignedAdvisers ?? []) as DashboardAdviser[];

  const gwa = useMemo(() => {
    if (grades.length === 0) {
      return 'Not Set';
    }

    let totalWeighted = 0;
    let totalUnits = 0;

    grades.forEach((grade) => {
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
  }, [grades]);

  const passCount = useMemo(() => grades.filter((g) => {
    const value = getGradeNumeric(g);
    return value !== null && value >= 1.0 && value <= 3.0;
  }).length, [grades]);

  const failCount = useMemo(() => grades.filter((g) => {
    const value = getGradeNumeric(g);
    return value !== null && value > 3.0;
  }).length, [grades]);

  const totalUnits = useMemo(() => grades.reduce((sum, g) => {
    const units = parseNumber(g.units ?? g.Units);
    return units !== null ? sum + units : sum;
  }, 0), [grades]);

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-green-50 to-yellow-50 rounded-lg p-6 border border-green-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="tracking-tight mb-1">Student Dashboard</h2>
            <p className="text-gray-700">
              <span className="font-medium">{fullName}</span> • {studentIdText} • {yearLevelName}
            </p>
          </div>
          <Button onClick={onBookAppointment} className="bg-gradient-to-r from-green-600 to-yellow-500 hover:from-green-700 hover:to-yellow-600 text-white">
            Book Appointment
          </Button>
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
                    <p className="text-sm text-gray-600 mb-1">Current GWA</p>
                    <p className="text-2xl font-bold text-green-900">{gwa}</p>
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

          <Card className="border-green-200 shadow-md">
            <CardHeader className="bg-gradient-to-r from-green-50 to-yellow-50 border-b border-green-200">
              <CardTitle className="text-green-900">Assigned Advisers</CardTitle>
              <CardDescription>Source: GET /api/Students/me/dashboard</CardDescription>
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

          <Card className="border-green-200 shadow-md">
            <CardHeader className="bg-gradient-to-r from-green-50 to-yellow-50 border-b border-green-200">
              <CardTitle className="text-green-900">Current Courses / Enrollments</CardTitle>
              <CardDescription>Source: Enrollments from student dashboard endpoint</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {enrollments.length === 0 ? (
                <p className="text-sm text-gray-500">No current enrollments found.</p>
              ) : (
                <div className="space-y-2">
                  {enrollments.map((item, index) => {
                    const courseCode = String(item.courseCode ?? item.CourseCode ?? 'Not Set') || 'Not Set';
                    const courseName = String(item.courseName ?? item.CourseName ?? 'Not Set') || 'Not Set';
                    const units = String(item.units ?? item.Units ?? 'Not Set') || 'Not Set';
                    const semesterName = String(item.semesterName ?? item.SemesterName ?? '').trim();
                    const schoolYear = String(item.schoolYear ?? item.SchoolYear ?? '').trim();
                    const semester = `${semesterName} ${schoolYear}`.trim() || 'Not Set';
                    const currentGrade = String(item.currentGrade ?? item.CurrentGrade ?? 'Not Set') || 'Not Set';
                    return (
                      <div key={String(item.enrollmentId ?? item.EnrollmentId ?? index)} className="grid grid-cols-12 gap-3 rounded-md border border-gray-200 p-3 text-sm">
                        <div className="col-span-2 font-semibold text-green-900">{courseCode}</div>
                        <div className="col-span-4">{courseName}</div>
                        <div className="col-span-1">{units}</div>
                        <div className="col-span-3 text-gray-600">{semester}</div>
                        <div className="col-span-2 font-medium">{currentGrade}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-green-200 shadow-md">
            <CardHeader className="bg-gradient-to-r from-green-50 to-yellow-50 border-b border-green-200">
              <CardTitle className="text-green-900">Grades</CardTitle>
              <CardDescription>Source: Grades from student dashboard endpoint</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {grades.length === 0 ? (
                <p className="text-sm text-gray-500">No grades found.</p>
              ) : (
                <div className="space-y-2">
                  {grades.map((item, index) => {
                    const courseCode = String(item.courseCode ?? item.CourseCode ?? 'Not Set') || 'Not Set';
                    const courseName = String(item.courseName ?? item.CourseName ?? 'Not Set') || 'Not Set';
                    const gradeValue = String(item.currentGrade ?? item.CurrentGrade ?? item.gradeValue ?? item.GradeValue ?? 'Not Set') || 'Not Set';
                    const units = String(item.units ?? item.Units ?? 'Not Set') || 'Not Set';
                    return (
                      <div key={String(item.gradeId ?? item.GradeId ?? index)} className="grid grid-cols-12 gap-3 rounded-md border border-gray-200 p-3 text-sm">
                        <div className="col-span-2 font-semibold text-green-900">{courseCode}</div>
                        <div className="col-span-6">{courseName}</div>
                        <div className="col-span-2">{units}</div>
                        <div className="col-span-2 font-medium">{gradeValue}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
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
