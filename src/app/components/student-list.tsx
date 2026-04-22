/// <reference types="vite/client" />
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Search, Eye } from "lucide-react";

interface StudentRecord {
  id: number | string;
  routeStudentId: string;
  studentId: string;
  firstName: string;
  lastName: string;
  yearLevelName: string;
  email: string;
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

interface StudentListProps {
  onSelectStudent: (studentId: number | string) => void;
}

export function StudentList({ onSelectStudent }: StudentListProps) {
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const loadStudents = async () => {
    setIsLoading(true);
    setLoadError('');

    try {
      const token = getAuthToken();
      const headers = {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      const studentsResponse = await fetchWithApiFallback('/Students', { headers });
      const studentsPayload = await studentsResponse.json().catch(() => ([]));

      if (!studentsResponse.ok) {
        throw new Error(getErrorMessage(studentsPayload, 'Unable to fetch students from backend students endpoint.'));
      }

      const studentRows: StudentApiRow[] = Array.isArray(studentsPayload) ? studentsPayload : [];
      const mapped = studentRows.reduce<StudentRecord[]>((acc, item) => {
        const routeStudentId = String(item.studentId ?? item.StudentId ?? '').trim();
        const userId = String(item.userId ?? item.UserId ?? '').trim();
        if (!routeStudentId && !userId) {
          return acc;
        }

        const firstName = String(item.firstName ?? item.FirstName ?? '').trim();
        const lastName = String(item.lastName ?? item.LastName ?? '').trim();

        acc.push({
          id: userId || routeStudentId,
          routeStudentId: routeStudentId || userId,
          studentId: routeStudentId || userId,
          firstName: firstName || 'Not Set',
          lastName: lastName || 'Not Set',
          yearLevelName: String(item.yearLevelName ?? item.YearLevelName ?? 'Not Set') || 'Not Set',
          email: String(item.email ?? item.Email ?? 'Not Set') || 'Not Set',
        });

        return acc;
      }, []);

      setStudents(mapped);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Unable to fetch students.');
      setStudents([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStudents();
  }, []);

  const filteredStudents = students.filter((student) => {
    const query = searchTerm.toLowerCase();
    return (
      student.studentId.toLowerCase().includes(query) ||
      student.firstName.toLowerCase().includes(query) ||
      student.lastName.toLowerCase().includes(query) ||
      student.email.toLowerCase().includes(query) ||
      student.yearLevelName.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="tracking-tight">Student Directory</h2>
        <p className="text-gray-600">Student records from backend GET /api/Students</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Students</CardTitle>
          <CardDescription>Search and filter student records</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by student ID, name, email, or year level..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
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
                    <TableHead>Student ID</TableHead>
                    <TableHead>First Name</TableHead>
                    <TableHead>Last Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Year Level</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                        Loading students...
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredStudents.map((student) => (
                      <TableRow key={student.id}>
                        <TableCell className="font-medium">{student.studentId}</TableCell>
                        <TableCell>{student.firstName}</TableCell>
                        <TableCell>{student.lastName}</TableCell>
                        <TableCell>{student.email}</TableCell>
                        <TableCell className="font-medium text-green-800">{student.yearLevelName}</TableCell>
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
                  ? 'No students available for your assigned year level(s).'
                  : 'No students found matching your search.'}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}