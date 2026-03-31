import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { TrendingUp, BookOpen, CheckCircle, XCircle, Calendar, Clock, User, AlertCircle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";

interface Grade {
  id: string;
  subjectCode: string;
  units: number;
  grade: number;
  semester: string;
}

interface Appointment {
  id: string;
  adviserName: string;
  date: string;
  time: string;
  type: string;
  status: 'upcoming' | 'completed' | 'cancelled';
}

interface StudentDashboardProps {
  studentName: string;
  studentId: string;
  yearLevel: string;
  onBookAppointment: () => void;
}

export function StudentDashboard({ 
  studentName, 
  studentId, 
  yearLevel,
  onBookAppointment 
}: StudentDashboardProps) {
  const [selectedSemester, setSelectedSemester] = useState('1st Sem 2025-26');
  const [appointments, setAppointments] = useState<Appointment[]>([
    {
      id: '1',
      adviserName: 'Dr. Maria Santos',
      date: '2026-03-05',
      time: '2:00 PM - 2:30 PM',
      type: 'Academic Advising',
      status: 'upcoming'
    },
    {
      id: '2',
      adviserName: 'Dr. Maria Santos',
      date: '2026-03-12',
      time: '10:00 AM - 10:30 AM',
      type: 'Enrollment Planning',
      status: 'upcoming'
    }
  ]);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [cancelSuccessOpen, setCancelSuccessOpen] = useState(false);

  // Mock data - in real app, this would come from props or API
  const allGrades = [
    { id: '1', subjectCode: 'CS101', units: 3, grade: 1.5, semester: '1st Sem 2025-26' },
    { id: '2', subjectCode: 'MATH101', units: 3, grade: 2.0, semester: '1st Sem 2025-26' },
    { id: '3', subjectCode: 'ENG101', units: 3, grade: 4.0, semester: '1st Sem 2025-26' },
    { id: '4', subjectCode: 'CS102', units: 3, grade: 1.8, semester: '1st Sem 2025-26' },
    { id: '5', subjectCode: 'PHYS101', units: 4, grade: 3.5, semester: '1st Sem 2025-26' },
    { id: '6', subjectCode: 'CS201', units: 3, grade: 1.3, semester: '2nd Sem 2025-26' },
    { id: '7', subjectCode: 'MATH201', units: 3, grade: 2.3, semester: '2nd Sem 2025-26' },
  ];

  const filteredGrades = allGrades.filter(g => g.semester === selectedSemester);

  const calculateGWA = (grades: Grade[]) => {
    if (grades.length === 0) return 0;
    const totalWeightedGrades = grades.reduce((sum, g) => sum + (g.grade * g.units), 0);
    const totalUnits = grades.reduce((sum, g) => sum + g.units, 0);
    return totalUnits > 0 ? (totalWeightedGrades / totalUnits).toFixed(1) : '0.0';
  };

  const currentGWA = calculateGWA(filteredGrades);
  const overallGWA = calculateGWA(allGrades);

  const getGradeColor = (grade: number) => {
    // Green for passed (1.0-3.0), Red for failed (3.1-5.0)
    return grade >= 1.0 && grade <= 3.0 ? 'text-green-700' : 'text-red-700';
  };

  const getGWAStatus = (gwa: string) => {
    const gwaValue = parseFloat(gwa);
    if (gwaValue >= 1.0 && gwaValue <= 2.0) return { label: 'Excellent', color: 'bg-green-100 text-green-800' };
    if (gwaValue > 2.0 && gwaValue <= 3.0) return { label: 'Good Standing', color: 'bg-blue-100 text-blue-800' };
    return { label: 'At Risk', color: 'bg-red-100 text-red-800' };
  };

  const status = getGWAStatus(currentGWA);

  const handleCancelAppointment = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setCancelDialogOpen(true);
  };

  const confirmCancelAppointment = () => {
    if (selectedAppointment) {
      const updatedAppointments = appointments.map(app => 
        app.id === selectedAppointment.id ? { ...app, status: 'cancelled' } : app
      );
      setAppointments(updatedAppointments);
      setCancelDialogOpen(false);
      setCancelSuccessOpen(true);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-50 to-yellow-50 rounded-lg p-6 border border-green-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="tracking-tight mb-1">Student Dashboard</h2>
            <p className="text-gray-700">
              <span className="font-medium">{studentName}</span> • {studentId} • {yearLevel}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600 mb-1">Overall GWA</p>
            <p className="text-4xl font-bold text-green-900">{overallGWA}</p>
            <Badge className={`${status.color} mt-2`}>{status.label}</Badge>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-green-200 shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Current GWA</p>
                <p className="text-2xl font-bold text-green-900">{currentGWA}</p>
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
                <p className="text-2xl font-bold text-green-700">
                  {filteredGrades.filter(g => g.grade <= 3.0).length}
                </p>
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
                <p className="text-2xl font-bold text-red-700">
                  {filteredGrades.filter(g => g.grade > 3.0).length}
                </p>
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
                <p className="text-2xl font-bold text-yellow-700">
                  {filteredGrades.reduce((sum, g) => sum + g.units, 0)}
                </p>
              </div>
              <BookOpen className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Grades Table */}
      <Card className="border-green-200 shadow-md">
        <CardHeader className="bg-gradient-to-r from-green-50 to-yellow-50 border-b border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-green-900">My Grades</CardTitle>
              <CardDescription>View your academic performance</CardDescription>
            </div>
            <Select value={selectedSemester} onValueChange={setSelectedSemester}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1st Sem 2025-26">1st Sem 2025-26</SelectItem>
                <SelectItem value="2nd Sem 2025-26">2nd Sem 2025-26</SelectItem>
                <SelectItem value="Summer 2026">Summer 2026</SelectItem>
                <SelectItem value="1st Sem 2024-25">1st Sem 2024-25</SelectItem>
                <SelectItem value="2nd Sem 2024-25">2nd Sem 2024-25</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {filteredGrades.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No grades available for this semester</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-9 gap-4 pb-3 border-b font-semibold text-sm text-gray-700">
                <div className="col-span-4">Subject Code</div>
                <div className="col-span-2">Units</div>
                <div className="col-span-3">Grade</div>
              </div>
              <div className="space-y-2">
                {filteredGrades.map((grade) => (
                  <div key={grade.id} className="grid grid-cols-9 gap-4 py-3 border-b hover:bg-gray-50">
                    <div className="col-span-4 flex items-center font-medium text-green-900">
                      {grade.subjectCode}
                    </div>
                    <div className="col-span-2 flex items-center text-gray-700">
                      {grade.units} units
                    </div>
                    <div className={`col-span-3 flex items-center font-bold text-2xl ${getGradeColor(grade.grade)}`}>
                      {grade.grade.toFixed(1)}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-4 border-t bg-gradient-to-r from-green-50 to-yellow-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="text-lg font-medium text-gray-700">Semester GWA:</div>
                  <div className="text-3xl font-bold text-green-900">{currentGWA}</div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Appointments Section */}
      <Card className="border-green-200 shadow-md">
        <CardHeader className="bg-gradient-to-r from-green-50 to-yellow-50 border-b border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-green-900">My Appointments</CardTitle>
              <CardDescription>Manage your academic advising appointments</CardDescription>
            </div>
            <Button onClick={onBookAppointment} className="bg-green-500 text-white">
              Book New Appointment
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {appointments.filter(a => a.status !== 'cancelled').length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No appointments scheduled</p>
              <Button onClick={onBookAppointment} className="mt-4 bg-gradient-to-r from-green-600 to-yellow-500 hover:from-green-700 hover:to-yellow-600 text-white">
                Book Your First Appointment
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {appointments.filter(a => a.status !== 'cancelled').map((appointment) => (
                <div key={appointment.id} className="border border-green-200 rounded-lg p-4 hover:bg-green-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <User className="h-5 w-5 text-green-600" />
                        <span className="font-semibold text-green-900">{appointment.adviserName}</span>
                        {appointment.status === 'upcoming' && (
                          <Badge className="bg-green-100 text-green-800">Upcoming</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-700">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4 text-green-600" />
                          <span>{new Date(appointment.date).toLocaleDateString('en-US', { 
                            weekday: 'short',
                            month: 'short', 
                            day: 'numeric',
                            year: 'numeric'
                          })}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4 text-green-600" />
                          <span>{appointment.time}</span>
                        </div>
                      </div>
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">Type:</span> {appointment.type}
                      </div>
                    </div>
                    <div>
                      {appointment.status === 'upcoming' && (
                        <Button 
                          onClick={() => handleCancelAppointment(appointment)} 
                          variant="outline"
                          className="border-red-300 text-red-700 hover:bg-red-50"
                        >
                          Cancel
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cancel Appointment Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Cancel Appointment</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this appointment? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-2">
            <Button onClick={() => setCancelDialogOpen(false)} className="bg-gray-500 text-white">
              Cancel
            </Button>
            <Button onClick={confirmCancelAppointment} className="bg-red-500 text-white">
              Confirm
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancel Success Dialog */}
      <Dialog open={cancelSuccessOpen} onOpenChange={setCancelSuccessOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Appointment Cancelled</DialogTitle>
            <DialogDescription>
              Your appointment has been successfully cancelled.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-2">
            <Button onClick={() => setCancelSuccessOpen(false)} className="bg-green-500 text-white">
              OK
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}