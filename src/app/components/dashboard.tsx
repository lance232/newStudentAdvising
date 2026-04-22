import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Users, UserCog, Shield, CalendarDays, RefreshCcw, AlertCircle } from "lucide-react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";

interface DashboardProps {
  isChairman?: boolean;
}

interface UserDirectoryRow {
  userId: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface StudentDirectoryRow {
  userId: string;
  studentId: string;
  fullName: string;
  yearLevelName: string;
}

interface AppointmentRow {
  appointmentId: number | string;
  studentName: string;
  dateLabel: string;
  status: string;
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

function summarizePassFail(grades: any[]): PassFailState {
  let passed = 0;
  let failed = 0;

  grades.forEach((grade) => {
    const statusRaw = String(
      grade?.status
      ?? grade?.Status
      ?? grade?.remarks
      ?? grade?.Remarks
      ?? grade?.result
      ?? grade?.remark
      ?? grade?.currentGrade
      ?? grade?.CurrentGrade
      ?? "",
    ).toLowerCase();
    if (statusRaw.includes("pass")) {
      passed += 1;
      return;
    }
    if (statusRaw.includes("fail")) {
      failed += 1;
      return;
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
      ?? parseNumeric(grade?.equivalent)
      ?? parseNumeric(grade?.gwa);

    if (numericValue === null) {
      return;
    }

    if (numericValue <= 3.0) {
      passed += 1;
      return;
    }

    failed += 1;
  });

  return { passed, failed };
}

export function Dashboard({ isChairman = false }: DashboardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [summary, setSummary] = useState<SummaryState>({
    students: 0,
    advisers: 0,
    chairmen: 0,
    appointments: 0,
  });
  const [recentStudents, setRecentStudents] = useState<StudentDirectoryRow[]>([]);
  const [recentAppointments, setRecentAppointments] = useState<AppointmentRow[]>([]);
  const [passFail, setPassFail] = useState<PassFailState>({ passed: 0, failed: 0 });
  const [gradeChartError, setGradeChartError] = useState("");

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

      const users = Array.isArray(usersPayload) ? usersPayload : [];
      const normalizedUsers: UserDirectoryRow[] = users.map((item: any) => ({
        userId: String(item.userId ?? item.UserId ?? item.id ?? "").trim(),
        firstName: String(item.firstName ?? item.FirstName ?? "").trim(),
        lastName: String(item.lastName ?? item.LastName ?? "").trim(),
        role: String(item.role ?? item.Role ?? "").toUpperCase().trim(),
      }));

      setSummary((prev) => ({
        ...prev,
        students: normalizedUsers.filter((row) => row.role === "STUDENT").length,
        advisers: normalizedUsers.filter((row) => row.role === "ADVISER").length,
        chairmen: normalizedUsers.filter((row) => row.role === "CHAIRMAN").length,
      }));

      const userById = new Map(normalizedUsers.map((row) => [row.userId, row]));

      const studentsResponse = await fetchWithApiFallback("/Students", { headers });
      const studentsPayload = await studentsResponse.json().catch(() => ([]));
      if (!studentsResponse.ok) {
        throw new Error(getErrorMessage(studentsPayload, "Unable to fetch students for dashboard."));
      }

      const students = Array.isArray(studentsPayload) ? studentsPayload : [];
      const normalizedStudents: StudentDirectoryRow[] = students.map((item: any) => {
        const userId = String(item.userId ?? item.UserId ?? "").trim();
        const studentId = String(item.studentId ?? item.StudentId ?? userId).trim();
        const linkedUser = userId ? userById.get(userId) : undefined;
        const firstName = String(item.firstName ?? item.FirstName ?? linkedUser?.firstName ?? "").trim();
        const lastName = String(item.lastName ?? item.LastName ?? linkedUser?.lastName ?? "").trim();
        const fullName = `${firstName} ${lastName}`.trim() || studentId || userId || "Unknown Student";

        return {
          userId: userId || "Not Set",
          studentId: studentId || "Not Set",
          fullName,
          yearLevelName: String(item.yearLevelName ?? item.YearLevelName ?? "Not Set") || "Not Set",
        };
      });

      setRecentStudents(normalizedStudents.slice(0, 8));

      const appointmentsResponse = await fetchWithApiFallback("/Appointments", { headers });
      const appointmentsPayload = await appointmentsResponse.json().catch(() => ([]));

      if (!appointmentsResponse.ok) {
        setSummary((prev) => ({ ...prev, appointments: 0 }));
        setRecentAppointments([]);
        return;
      }

      const appointments = Array.isArray(appointmentsPayload) ? appointmentsPayload : [];
      const normalizedAppointments: AppointmentRow[] = appointments.map((item: any) => ({
        appointmentId: item.appointmentId ?? item.id ?? item.AppointmentId ?? "",
        studentName: String(item.studentName ?? item.student?.fullName ?? item.student?.name ?? item.userName ?? "Student").trim() || "Student",
        dateLabel: formatDateLabel(item.appointmentDate ?? item.date ?? item.createdAt ?? item.AppointmentDate),
        status: String(item.status ?? item.Status ?? "Scheduled"),
      }));

      setSummary((prev) => ({ ...prev, appointments: normalizedAppointments.length }));
      setRecentAppointments(normalizedAppointments.slice(0, 6));

      // Grade distribution pie chart.
      setGradeChartError("");
      try {
        const gradesResponse = await fetchWithApiFallback("/Grades", { headers });
        const gradesPayload = await gradesResponse.json().catch(() => ([]));

        if (!gradesResponse.ok) {
          // Fallback to per-student grades endpoint when /Grades is unavailable.
          const studentGradeRows: any[] = [];
          for (const student of normalizedStudents) {
            const response = await fetchWithApiFallback(`/Students/${student.studentId}/grades`, { headers });
            const payload = await response.json().catch(() => ([]));
            if (response.ok && Array.isArray(payload)) {
              studentGradeRows.push(...payload);
            }
          }

          if (studentGradeRows.length > 0) {
            setPassFail(summarizePassFail(studentGradeRows));
          } else {
            setPassFail({ passed: 0, failed: 0 });
            setGradeChartError(getErrorMessage(gradesPayload, "Unable to load grade distribution data."));
          }
        } else {
          const gradeRows = Array.isArray(gradesPayload) ? gradesPayload : [];
          setPassFail(summarizePassFail(gradeRows));
        }
      } catch {
        setPassFail({ passed: 0, failed: 0 });
        setGradeChartError("Unable to load grade distribution data.");
      }
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Unable to load dashboard.");
      setSummary({ students: 0, advisers: 0, chairmen: 0, appointments: 0 });
      setRecentStudents([]);
      setRecentAppointments([]);
      setPassFail({ passed: 0, failed: 0 });
      setGradeChartError("");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

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
      { name: "1.0-3.0 (Pass)", value: passFail.passed, fill: "#16a34a" },
      { name: "3.1-5.0 (Failed)", value: passFail.failed, fill: "#ef4444" },
    ];
  }, [passFail]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="tracking-tight">Dashboard Overview</h2>
          <p className="text-gray-600">Live backend data for {roleLabel} view</p>
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

      <Card className="border-yellow-200 shadow-md">
        <CardHeader className="bg-gradient-to-r from-yellow-50 to-green-50 border-b border-yellow-200">
          <CardTitle className="text-green-900">Grade Distribution</CardTitle>
          <CardDescription>Current semester grade breakdown (pass vs failed)</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
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
                label={({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`}
                outerRadius={95}
                dataKey="value"
              >
                {passFailChartData.map((entry) => (
                  <Cell key={entry.name} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-green-200 shadow-md">
          <CardHeader className="bg-gradient-to-r from-green-50 to-yellow-50 border-b border-green-200">
            <CardTitle className="text-green-900">Active Students</CardTitle>
            <CardDescription>Source: GET /api/Students</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {recentStudents.length === 0 ? (
              <p className="text-sm text-gray-500">No active students returned by backend.</p>
            ) : (
              <div className="space-y-3">
                {recentStudents.map((row) => (
                  <div key={`${row.studentId}-${row.userId}`} className="flex items-center justify-between border-b pb-2 last:border-0">
                    <div>
                      <p className="font-medium text-gray-900">{row.fullName}</p>
                      <p className="text-xs text-gray-500">Student ID: {row.studentId}</p>
                    </div>
                    <Badge className="bg-green-100 text-green-800 border-green-300">{row.yearLevelName}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-green-200 shadow-md">
          <CardHeader className="bg-gradient-to-r from-green-50 to-yellow-50 border-b border-green-200">
            <CardTitle className="text-green-900">Recent Appointments</CardTitle>
            <CardDescription>Source: GET /api/Appointments</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {recentAppointments.length === 0 ? (
              <p className="text-sm text-gray-500">No appointment records returned by backend.</p>
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
