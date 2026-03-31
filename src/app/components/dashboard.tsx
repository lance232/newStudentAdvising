import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, TrendingDown, Users, AlertCircle, BookOpen, Award, Shield, UserCog, Edit2, Save, Check, X } from "lucide-react";
import { Badge } from "./ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

interface Advisor {
  id: number;
  name: string;
  email: string;
  advisorId: string;
  assignedYearLevel: string | null;
  status: 'active' | 'inactive';
}

const initialAdvisors: Advisor[] = [
  { id: 1, name: 'Dr. Maria Santos', email: 'm.santos@usjr.edu.ph', advisorId: '1000000001', assignedYearLevel: 'BSCPE-3', status: 'active' },
  { id: 2, name: 'Prof. Juan Reyes', email: 'j.reyes@usjr.edu.ph', advisorId: '1000000002', assignedYearLevel: 'BSCPE-1', status: 'active' },
  { id: 3, name: 'Dr. Ana Garcia', email: 'a.garcia@usjr.edu.ph', advisorId: '1000000003', assignedYearLevel: 'BSCPE-4', status: 'active' },
  { id: 4, name: 'Prof. Miguel Cruz', email: 'm.cruz@usjr.edu.ph', advisorId: '1000000004', assignedYearLevel: 'BSCPE-2', status: 'active' },
  { id: 5, name: 'Dr. Carlos Lopez', email: 'c.lopez@usjr.edu.ph', advisorId: '1000000005', assignedYearLevel: null, status: 'inactive' },
];

const studentPerformanceData = [
  { semester: '1st Sem 2024-25', avgGWA: 2.1 },
  { semester: 'Summer 2025', avgGWA: 2.0 },
  { semester: '2nd Sem 2024-25', avgGWA: 1.9 },
  { semester: '1st Sem 2025-26', avgGWA: 1.8 },
];

const courseDistribution = [
  { name: '1.0-3.0 (Pass)', value: 95, color: '#16a34a' },
  { name: '3.1-5.0 (Failed)', value: 5, color: '#ef4444' },
];

const failedStudents = [
  { id: 1, name: 'Alex Johnson', gwa: 3.5, courses: 'Calculus 1, Physics for Engineers', lastContact: '2026-02-15' },
  { id: 2, name: 'Maria Garcia', gwa: 4.0, courses: 'Digital Logic Design', lastContact: '2026-02-10' },
  { id: 3, name: 'James Chen', gwa: 3.2, courses: 'Calculus 1, Programming 1', lastContact: '2026-02-18' },
];

const upcomingAppointments = [
  { id: 1, student: 'Sarah Williams', date: '2026-02-22', time: '10:00 AM', type: 'Academic Planning' },
  { id: 2, student: 'Michael Brown', date: '2026-02-22', time: '2:00 PM', type: 'Course Selection' },
  { id: 3, student: 'Emily Davis', date: '2026-02-23', time: '11:00 AM', type: 'Progress Review' },
];

interface DashboardProps {
  isChairman?: boolean;
}

export function Dashboard({ isChairman = false }: DashboardProps) {
  const [selectedSemester, setSelectedSemester] = useState('1st Sem 2025-26');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="tracking-tight">Dashboard Overview</h2>
          <p className="text-gray-600">Monitor academic performance and student progress</p>
        </div>
        <Select value={selectedSemester} onValueChange={setSelectedSemester}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select Semester" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1st Sem 2025-26">1st Sem 2025-26</SelectItem>
            <SelectItem value="2nd Sem 2025-26">2nd Sem 2025-26</SelectItem>
            <SelectItem value="Summer 2026">Summer 2026</SelectItem>
            <SelectItem value="2nd Sem 2024-25">2nd Sem 2024-25</SelectItem>
            <SelectItem value="1st Sem 2024-25">1st Sem 2024-25</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-green-600 to-green-700 text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium opacity-90">Total Students</CardTitle>
            <Users className="h-8 w-8 opacity-80" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-3xl">248</div>
            <p className="text-xs mt-1 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              +12% from last semester
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-red-500 to-orange-600 text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium opacity-90">Failed Students</CardTitle>
            <AlertCircle className="h-8 w-8 opacity-80" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-3xl">3</div>
            <p className="text-xs mt-1 flex items-center gap-1">
              <TrendingDown className="h-3 w-3" />
              GWA 3.1-5.0 (Failed)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Card className="border-yellow-200 shadow-md">
        <CardHeader className="bg-gradient-to-r from-yellow-50 to-green-50 border-b border-yellow-200">
          <CardTitle className="text-green-900">Grade Distribution</CardTitle>
          <CardDescription>Current semester grade breakdown ({selectedSemester})</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={courseDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {courseDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Tables Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-red-200 shadow-md">
          <CardHeader className="bg-gradient-to-r from-red-50 to-orange-50 border-b border-red-200">
            <CardTitle className="text-red-900 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Failed Students
            </CardTitle>
            <CardDescription>Students with failing GWA 3.1-5.0 ({selectedSemester})</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {failedStudents.map((student) => (
                <div key={student.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                  <div className="flex-1">
                    <p className="font-medium">{student.name}</p>
                    <p className="text-sm text-gray-600">GWA: {student.gwa}</p>
                    <p className="text-xs text-gray-500">{student.courses}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant="destructive">Failed</Badge>
                    <p className="text-xs text-gray-500 mt-1">Last: {student.lastContact}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200 shadow-md">
          <CardHeader className="bg-gradient-to-r from-green-50 to-yellow-50 border-b border-green-200">
            <CardTitle className="text-green-900">Upcoming Appointments</CardTitle>
            <CardDescription>Scheduled advising sessions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {upcomingAppointments.map((appointment) => (
                <div key={appointment.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                  <div className="flex-1">
                    <p className="font-medium">{appointment.student}</p>
                    <p className="text-sm text-gray-600">{appointment.type}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-green-700">{appointment.date}</p>
                    <p className="text-xs text-gray-500">{appointment.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}