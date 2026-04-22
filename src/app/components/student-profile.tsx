import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Mail, User, BookOpen, AlertCircle } from 'lucide-react';

interface StudentProfileProps {
  onBack: () => void;
  studentId: number | string | null;
}

interface StudentApiRow {
  studentId?: number | string | null;
  StudentId?: number | string | null;
  userId?: number | string | null;
  UserId?: number | string | null;
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
  fullName: string;
  email: string;
  yearLevelName: string;
}

interface CurrentEnrollmentRow {
  key: string;
  courseId: string;
  courseCode: string;
  courseName: string;
  units: string;
  semester: string;
  currentGrade: string;
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
  const firstName = String(item.firstName ?? item.FirstName ?? '').trim();
  const lastName = String(item.lastName ?? item.LastName ?? '').trim();
  const fullName = `${firstName} ${lastName}`.trim();

  return {
    studentId: studentId || 'Not Set',
    userId: userId || 'Not Set',
    fullName: fullName || studentId || userId || 'Unknown Student',
    email: String(item.email ?? item.Email ?? 'Not Set') || 'Not Set',
    yearLevelName: String(item.yearLevelName ?? item.YearLevelName ?? 'Not Set') || 'Not Set',
  };
}

function getText(value: unknown): string {
  const raw = String(value ?? '').trim();
  return raw || 'Not Set';
}

function buildSemesterLabel(semesterName: unknown, schoolYear: unknown): string {
  const name = String(semesterName ?? '').trim();
  const year = String(schoolYear ?? '').trim();
  if (name && year) {
    return `${name} ${year}`;
  }
  if (name) {
    return name;
  }
  if (year) {
    return year;
  }
  return 'Not Set';
}

export function StudentProfile({ onBack, studentId }: StudentProfileProps) {
  const [student, setStudent] = useState<StudentDetails | null>(null);
  const [studentLoading, setStudentLoading] = useState(false);
  const [studentError, setStudentError] = useState('');

  const [enrollments, setEnrollments] = useState<EnrollmentApiRow[]>([]);
  const [enrollmentsLoading, setEnrollmentsLoading] = useState(false);
  const [enrollmentsError, setEnrollmentsError] = useState('');

  const [grades, setGrades] = useState<GradeApiRow[]>([]);
  const [gradesLoading, setGradesLoading] = useState(false);
  const [gradesError, setGradesError] = useState('');

  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    const loadStudentProfile = async () => {
      const selectedStudentId = String(studentId ?? '').trim();
      if (!selectedStudentId) {
        setStudent(null);
        setStudentError('No student selected. Please return to Student Directory and choose a student.');
        setEnrollments([]);
        setGrades([]);
        setEnrollmentsError('');
        setGradesError('');
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

      if (!resolvedStudent && !studentError) {
        setStudentError('Unable to load student details.');
      }
    };

    loadStudentProfile();
  }, [studentId, reloadToken]);

  const gradeFallbackByCourse = useMemo(() => {
    const byCourseId = new Map<string, GradeApiRow>();
    const byCourseCode = new Map<string, GradeApiRow>();

    grades.forEach((row) => {
      const courseId = String(row.courseId ?? row.CourseId ?? '').trim();
      const courseCode = String(row.courseCode ?? row.CourseCode ?? '').trim().toUpperCase();
      if (courseId) {
        byCourseId.set(courseId, row);
      }
      if (courseCode) {
        byCourseCode.set(courseCode, row);
      }
    });

    return { byCourseId, byCourseCode };
  }, [grades]);

  const currentEnrollmentRows = useMemo((): CurrentEnrollmentRow[] => {
    return enrollments.map((row) => {
      const enrollmentId = String(row.enrollmentId ?? row.EnrollmentId ?? '').trim();
      const courseId = String(row.courseId ?? row.CourseId ?? '').trim();
      const courseCode = getText(row.courseCode ?? row.CourseCode);
      const courseCodeKey = String(row.courseCode ?? row.CourseCode ?? '').trim().toUpperCase();
      const gradeFallback =
        (courseId ? gradeFallbackByCourse.byCourseId.get(courseId) : undefined)
        ?? (courseCodeKey ? gradeFallbackByCourse.byCourseCode.get(courseCodeKey) : undefined);

      const enrollmentCurrentGrade = String(row.currentGrade ?? row.CurrentGrade ?? '').trim();
      const gradeCurrentGrade = String(gradeFallback?.currentGrade ?? gradeFallback?.CurrentGrade ?? '').trim();
      const gradeValue = String(gradeFallback?.gradeValue ?? gradeFallback?.GradeValue ?? '').trim();

      return {
        key: enrollmentId || `${courseId}-${courseCode}`,
        courseId: courseId || 'Not Set',
        courseCode,
        courseName: getText(row.courseName ?? row.CourseName),
        units: getText(row.units ?? row.Units),
        semester: buildSemesterLabel(row.semesterName ?? row.SemesterName, row.schoolYear ?? row.SchoolYear),
        currentGrade: enrollmentCurrentGrade || gradeCurrentGrade || gradeValue || 'Not Set',
      };
    });
  }, [enrollments, gradeFallbackByCourse]);

  const retryAll = () => {
    setReloadToken((prev) => prev + 1);
  };

  const totalUnits = useMemo(() => {
    return currentEnrollmentRows.reduce((acc, item) => {
      const value = Number(item.units);
      if (Number.isFinite(value)) {
        return acc + value;
      }
      return acc;
    }, 0);
  }, [currentEnrollmentRows]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="tracking-tight">Student Profile</h2>
          <p className="text-gray-600">Database-backed student details and current enrollment</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={retryAll}>Retry</Button>
          <Button variant="outline" onClick={onBack}>Back to List</Button>
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
                  <p className="text-gray-600">Student ID: {student.studentId}</p>
                  <p className="text-gray-600">User ID: {student.userId}</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">{student.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">Year Level: {student.yearLevelName}</span>
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
              <CardDescription>Source: GET /api/Students/{'{studentId}'}/enrollments and /grades</CardDescription>
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
              ) : currentEnrollmentRows.length === 0 ? (
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
                    {currentEnrollmentRows.map((item) => (
                      <TableRow key={item.key}>
                        <TableCell className="font-medium">{item.courseCode}</TableCell>
                        <TableCell>{item.courseName}</TableCell>
                        <TableCell>{item.units}</TableCell>
                        <TableCell>{item.semester}</TableCell>
                        <TableCell>{item.currentGrade}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advising" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Advising Notes</CardTitle>
              <CardDescription>No records integration requested for this panel yet.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500">Advising notes are not part of the current enrollment integration scope.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
