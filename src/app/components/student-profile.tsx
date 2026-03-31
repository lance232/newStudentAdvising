import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Progress } from "./ui/progress";
import { Textarea } from "./ui/textarea";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Mail, Phone, Calendar, BookOpen, AlertCircle, TrendingUp, User, FileText, Award } from "lucide-react";

const studentData = {
  id: 1,
  name: 'Sarah Williams',
  studentId: '2023-0001',
  email: 'sarah.w@usjr.edu.ph',
  phone: '(032) 123-4567',
  year: 'BSCPE-3',
  enrollmentDate: '1st Semester 2023-24',
  gwa: 1.5,
  unitsCompleted: 78,
  unitsRequired: 120,
  status: 'Dean\'s List',
  advisor: 'Engr. Maria Santos'
};

const semesterGWA = [
  { semester: '1st Sem 2023-24', gwa: 1.8 },
  { semester: '2nd Sem 2023-24', gwa: 1.7 },
  { semester: '1st Sem 2024-25', gwa: 1.4 },
  { semester: '2nd Sem 2024-25', gwa: 1.5 },
  { semester: '1st Sem 2025-26', gwa: 1.4 },
  { semester: '2nd Sem 2025-26', gwa: 1.5 },
];

const currentCourses = [
  { code: 'CPE 301', name: 'Data Structures & Algorithms', units: 3, grade: '1.3', instructor: 'Engr. Cruz' },
  { code: 'CPE 305', name: 'Database Management Systems', units: 3, grade: '1.5', instructor: 'Engr. Reyes' },
  { code: 'CPE 308', name: 'Computer Architecture', units: 3, grade: '1.3', instructor: 'Engr. Santos' },
  { code: 'CPE 320', name: 'Software Design & Development', units: 3, grade: '1.8', instructor: 'Engr. Garcia' },
  { code: 'CPE 315', name: 'Operating Systems', units: 3, grade: '1.5', instructor: 'Engr. Tan' },
];

const courseHistory = [
  { semester: '1st Sem 2023-24', courses: 5, gwa: 1.8, units: 15 },
  { semester: '2nd Sem 2023-24', courses: 5, gwa: 1.7, units: 16 },
  { semester: '1st Sem 2024-25', courses: 6, gwa: 1.4, units: 17 },
  { semester: '2nd Sem 2024-25', courses: 5, gwa: 1.5, units: 15 },
  { semester: '1st Sem 2025-26', courses: 5, gwa: 1.4, units: 15 },
];

const advisingNotes = [
  { date: '2026-02-15', advisor: 'Engr. Maria Santos', note: 'Discussed course selection for 2nd Semester 2026-27. Student is on track for graduation. Recommended advanced electives in Mobile Application Development.' },
  { date: '2026-01-10', advisor: 'Engr. Maria Santos', note: 'Mid-year check-in. Student performing excellently with consistent Dean\'s List status. Encouraged to consider capstone project opportunities.' },
  { date: '2025-11-20', advisor: 'Engr. Maria Santos', note: 'Career planning discussion. Student interested in software development roles. Recommended OJT applications and portfolio development.' },
];

interface StudentProfileProps {
  onBack: () => void;
}

export function StudentProfile({ onBack }: StudentProfileProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="tracking-tight">Student Profile</h2>
          <p className="text-gray-600">Detailed academic information and performance</p>
        </div>
        <Button variant="outline" onClick={onBack}>Back to List</Button>
      </div>

      {/* Student Info Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex items-center justify-center md:justify-start">
              <div className="h-24 w-24 rounded-full bg-blue-100 flex items-center justify-center">
                <User className="h-12 w-12 text-blue-600" />
              </div>
            </div>
            <div className="flex-1 space-y-4">
              <div>
                <h3 className="font-bold text-2xl">{studentData.name}</h3>
                <p className="text-gray-600">{studentData.studentId}</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">{studentData.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">{studentData.phone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">BS Computer Engineering</span>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">{studentData.gwa.toFixed(2)}</div>
                <div className="text-sm text-gray-600">Current GWA</div>
              </div>
              <Badge className="bg-green-100 text-green-800 border-green-300 justify-center">
                {studentData.status}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Progress */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Units Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">{studentData.unitsCompleted}</span>
                <span className="text-gray-600">/ {studentData.unitsRequired}</span>
              </div>
              <Progress value={(studentData.unitsCompleted / studentData.unitsRequired) * 100} />
              <p className="text-xs text-gray-600">{((studentData.unitsCompleted / studentData.unitsRequired) * 100).toFixed(1)}% Complete</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Academic Advisor</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                <User className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <p className="font-medium">{studentData.advisor}</p>
                <p className="text-xs text-gray-600">Computer Engineering Dept.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Year Level</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <p className="font-medium text-lg text-green-700">{studentData.year}</p>
              <p className="text-sm text-gray-600">Enrolled: {studentData.enrollmentDate}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for detailed info */}
      <Tabs defaultValue="current" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="current">Current Courses</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="history">Course History</TabsTrigger>
          <TabsTrigger value="advising">Advising Notes</TabsTrigger>
        </TabsList>

        <TabsContent value="current" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>2nd Semester 2025-26 - Current Enrollment</CardTitle>
              <CardDescription>5 courses, 15 units</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Course Code</TableHead>
                    <TableHead>Course Name</TableHead>
                    <TableHead>Units</TableHead>
                    <TableHead>Instructor</TableHead>
                    <TableHead>Current Grade</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentCourses.map((course, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{course.code}</TableCell>
                      <TableCell>{course.name}</TableCell>
                      <TableCell>{course.units}</TableCell>
                      <TableCell>{course.instructor}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{course.grade}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>GWA Trend Analysis</CardTitle>
              <CardDescription>Academic performance over time (CHED Scale: 1.0 = Excellent)</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={semesterGWA}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="semester" />
                  <YAxis domain={[1, 3]} reversed />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="gwa" stroke="#16a34a" strokeWidth={2} name="Semester GWA" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Lowest GWA (Best)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">1.4</div>
                <p className="text-xs text-gray-600">1st Sem 2024-25 & 1st Sem 2025-26</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Award className="h-4 w-4" />
                  Cumulative GWA
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">1.5</div>
                <p className="text-xs text-gray-600">Overall performance</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Total Courses
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">31</div>
                <p className="text-xs text-gray-600">Completed successfully</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Academic History</CardTitle>
              <CardDescription>Semester-by-semester breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Semester</TableHead>
                    <TableHead>Courses</TableHead>
                    <TableHead>Units</TableHead>
                    <TableHead>GWA</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {courseHistory.map((semester, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{semester.semester}</TableCell>
                      <TableCell>{semester.courses}</TableCell>
                      <TableCell>{semester.units}</TableCell>
                      <TableCell>
                        <span className="font-medium text-green-600">{semester.gwa.toFixed(2)}</span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advising" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Advising Session Notes</CardTitle>
              <CardDescription>Meeting records and recommendations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {advisingNotes.map((note, index) => (
                  <div key={index} className="border-l-4 border-blue-500 pl-4 py-2">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium">{note.advisor}</p>
                      <p className="text-sm text-gray-600">{note.date}</p>
                    </div>
                    <p className="text-sm text-gray-700">{note.note}</p>
                  </div>
                ))}
              </div>

              <div className="mt-6">
                <h4 className="font-medium mb-2">Add New Note</h4>
                <Textarea placeholder="Enter advising notes..." className="mb-2" />
                <Button>Save Note</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}