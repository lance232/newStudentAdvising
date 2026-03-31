import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, User, X, Mail, Phone, BookOpen, FileText, UserCheck, UserX } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";

interface Appointment {
  id: number;
  student: string;
  studentId: string;
  yearLevel: string;
  date: string;
  time: string;
  type: string;
  semester: string;
  status: 'upcoming' | 'completed' | 'cancelled';
  attendance?: 'appeared' | 'no-show' | 'pending';
  notes?: string[];
}

const appointments: Appointment[] = [
  { id: 1, student: 'Sarah Williams', studentId: '2023-0001', yearLevel: 'BSCPE-3', date: '2026-02-22', time: '10:00 AM - 10:30 AM', type: 'Academic Planning', semester: '2nd Sem 2025-26', status: 'upcoming' },
  { id: 2, student: 'Michael Brown', studentId: '2022-0145', yearLevel: 'BSCPE-4', date: '2026-02-22', time: '2:00 PM - 2:30 PM', type: 'Course Selection', semester: '2nd Sem 2025-26', status: 'upcoming' },
  { id: 3, student: 'Emily Davis', studentId: '2024-0089', yearLevel: 'BSCPE-2', date: '2026-02-23', time: '11:00 AM - 11:30 AM', type: 'Progress Review', semester: '2nd Sem 2025-26', status: 'cancelled' },
  { id: 4, student: 'Alex Johnson', studentId: '2023-0112', yearLevel: 'BSCPE-3', date: '2026-02-24', time: '9:00 AM - 9:30 AM', type: 'Academic Warning Discussion', semester: '2nd Sem 2025-26', status: 'upcoming' },
  { id: 5, student: 'Maria Garcia', studentId: '2025-0034', yearLevel: 'BSCPE-1', date: '2026-02-25', time: '1:00 PM - 1:30 PM', type: 'First Year Orientation', semester: '2nd Sem 2025-26', status: 'upcoming' },
  { id: 6, student: 'James Chen', studentId: '2024-0156', yearLevel: 'BSCPE-2', date: '2026-02-26', time: '3:00 PM - 3:30 PM', type: 'Academic Probation Review', semester: '2nd Sem 2025-26', status: 'upcoming' },
  { id: 7, student: 'Jessica Taylor', studentId: '2022-0078', yearLevel: 'BSCPE-4', date: '2026-02-27', time: '10:00 AM - 10:30 AM', type: 'Graduation Requirements', semester: '2nd Sem 2025-26', status: 'upcoming' },
  { id: 8, student: 'David Martinez', studentId: '2023-0203', yearLevel: 'BSCPE-3', date: '2026-02-20', time: '2:00 PM - 2:30 PM', type: 'Course Selection', semester: '2nd Sem 2025-26', status: 'completed', notes: ['Student is doing well in BSCPE courses.', 'Recommended advanced electives for next semester.'] },
  { id: 9, student: 'Juan Reyes', studentId: '2023-0055', yearLevel: 'BSCPE-3', date: '2026-02-18', time: '3:00 PM - 3:30 PM', type: 'Progress Review', semester: '2nd Sem 2025-26', status: 'cancelled' },
];

export function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 1, 21)); // February 21, 2026
  const [selectedSemester, setSelectedSemester] = useState('2nd Sem 2025-26');
  const [view, setView] = useState<'month' | 'list'>('list');
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [showNotesDialog, setShowNotesDialog] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [showRescheduleDialog, setShowRescheduleDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [appointmentData, setAppointmentData] = useState<Appointment[]>(appointments);

  const handleMarkAttendance = (appointmentId: number, attendance: 'appeared' | 'no-show') => {
    const updatedAppointments = appointmentData.map(apt =>
      apt.id === appointmentId ? { ...apt, attendance, status: 'completed' as const } : apt
    );
    setAppointmentData(updatedAppointments);
    
    if (selectedAppointment && selectedAppointment.id === appointmentId) {
      setSelectedAppointment({ ...selectedAppointment, attendance, status: 'completed' });
    }
  };

  const filteredAppointments = appointmentData.filter(apt => apt.semester === selectedSemester);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    return { daysInMonth, startingDayOfWeek, year, month };
  };

  const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(currentDate);

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const previousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const getAppointmentsForDate = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return filteredAppointments.filter(apt => apt.date === dateStr);
  };

  const upcomingAppointments = filteredAppointments
    .filter(apt => apt.status === 'upcoming')
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const completedAppointments = filteredAppointments
    .filter(apt => apt.status === 'completed')
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const cancelledAppointments = filteredAppointments
    .filter(apt => apt.status === 'cancelled')
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const getStatusBadge = (status: string) => {
    if (status === 'upcoming') {
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-200">Upcoming</Badge>;
    }
    if (status === 'cancelled') {
      return <Badge className="bg-red-100 text-red-800 hover:bg-red-200">Cancelled</Badge>;
    }
    return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-200">Completed</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="tracking-tight">Appointment Calendar</h2>
          <p className="text-gray-600">Manage advising appointments and schedules</p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedSemester} onValueChange={setSelectedSemester}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select Semester" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1st Sem 2025-26">1st Sem 2025-26</SelectItem>
              <SelectItem value="2nd Sem 2025-26">2nd Sem 2025-26</SelectItem>
              <SelectItem value="Summer 2026">Summer 2026</SelectItem>
              <SelectItem value="1st Sem 2024-25">1st Sem 2024-25</SelectItem>
              <SelectItem value="2nd Sem 2024-25">2nd Sem 2024-25</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex border border-gray-300 rounded-lg overflow-hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setView('list')}
              className={view === 'list' ? 'bg-green-100 text-green-800' : ''}
            >
              List
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setView('month')}
              className={view === 'month' ? 'bg-green-100 text-green-800' : ''}
            >
              Month
            </Button>
          </div>
        </div>
      </div>

      {view === 'list' ? (
        <div className="grid grid-cols-1 gap-4">
          {/* Upcoming Appointments */}
          <Card className="border-green-200 shadow-md">
            <CardHeader className="bg-gradient-to-r from-green-50 to-yellow-50 border-b border-green-200">
              <CardTitle className="text-green-900">Upcoming Appointments</CardTitle>
              <CardDescription>{upcomingAppointments.length} scheduled appointments</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {upcomingAppointments.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <CalendarIcon className="h-12 w-12 mx-auto mb-2 opacity-30" />
                  <p>No upcoming appointments for this semester</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {upcomingAppointments.map((appointment) => (
                    <div key={appointment.id} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-green-600 to-yellow-500 flex items-center justify-center shadow">
                              <User className="h-5 w-5 text-white" />
                            </div>
                            <div>
                              <p className="font-semibold text-green-900">{appointment.student}</p>
                              <p className="text-sm text-gray-600">{appointment.studentId} • {appointment.yearLevel}</p>
                            </div>
                          </div>
                          <div className="ml-13 space-y-1">
                            <div className="flex items-center gap-2 text-sm text-gray-700">
                              <CalendarIcon className="h-4 w-4 text-green-600" />
                              <span>{new Date(appointment.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-700">
                              <Clock className="h-4 w-4 text-green-600" />
                              <span>{appointment.time}</span>
                            </div>
                            <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200 mt-2">{appointment.type}</Badge>
                          </div>
                        </div>
                        <div className="flex sm:flex-col gap-2">
                          {getStatusBadge(appointment.status)}
                          <Button 
                            size="sm" 
                            className="bg-gradient-to-r from-green-600 to-yellow-500 hover:from-green-700 hover:to-yellow-600 text-white"
                            onClick={() => setSelectedAppointment(appointment)}
                          >
                            View Details
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Completed Appointments */}
          {completedAppointments.length > 0 && (
            <Card className="border-gray-200 shadow-md">
              <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                <CardTitle className="text-gray-900">Completed Appointments</CardTitle>
                <CardDescription>{completedAppointments.length} completed sessions</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-gray-100">
                  {completedAppointments.map((appointment) => (
                    <div key={appointment.id} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center shadow">
                              <User className="h-5 w-5 text-white" />
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900">{appointment.student}</p>
                              <p className="text-sm text-gray-600">{appointment.studentId} • {appointment.yearLevel}</p>
                            </div>
                          </div>
                          <div className="ml-13 space-y-1">
                            <div className="flex items-center gap-2 text-sm text-gray-700">
                              <CalendarIcon className="h-4 w-4 text-gray-600" />
                              <span>{new Date(appointment.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-700">
                              <Clock className="h-4 w-4 text-gray-600" />
                              <span>{appointment.time}</span>
                            </div>
                            <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200 mt-2">{appointment.type}</Badge>
                            {appointment.notes && appointment.notes.length > 0 && (
                              <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-200 mt-2 ml-2">
                                <FileText className="h-3 w-3 mr-1" />
                                {appointment.notes.length} {appointment.notes.length === 1 ? 'Note' : 'Notes'}
                              </Badge>
                            )}
                            {appointment.attendance === 'appeared' && (
                              <Badge className="bg-green-100 text-green-800 hover:bg-green-200 mt-2 ml-2">
                                <UserCheck className="h-3 w-3 mr-1" />
                                Appeared
                              </Badge>
                            )}
                            {appointment.attendance === 'no-show' && (
                              <Badge className="bg-red-100 text-red-800 hover:bg-red-200 mt-2 ml-2">
                                <UserX className="h-3 w-3 mr-1" />
                                No-Show
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex sm:flex-col gap-2">
                          {getStatusBadge(appointment.status)}
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => {
                              setSelectedAppointment(appointment);
                              setShowNotesDialog(true);
                            }}
                          >
                            <FileText className="h-4 w-4 mr-1" />
                            View Notes
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Cancelled Appointments */}
          {cancelledAppointments.length > 0 && (
            <Card className="border-red-200 shadow-md">
              <CardHeader className="bg-gradient-to-r from-red-50 to-orange-50 border-b border-red-200">
                <CardTitle className="text-red-900">Cancelled Appointments</CardTitle>
                <CardDescription>{cancelledAppointments.length} cancelled sessions</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-gray-100">
                  {cancelledAppointments.map((appointment) => (
                    <div key={appointment.id} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-red-400 to-orange-500 flex items-center justify-center shadow">
                              <User className="h-5 w-5 text-white" />
                            </div>
                            <div>
                              <p className="font-semibold text-red-900">{appointment.student}</p>
                              <p className="text-sm text-gray-600">{appointment.studentId} • {appointment.yearLevel}</p>
                            </div>
                          </div>
                          <div className="ml-13 space-y-1">
                            <div className="flex items-center gap-2 text-sm text-gray-700">
                              <CalendarIcon className="h-4 w-4 text-red-600" />
                              <span>{new Date(appointment.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-700">
                              <Clock className="h-4 w-4 text-red-600" />
                              <span>{appointment.time}</span>
                            </div>
                            <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200 mt-2">{appointment.type}</Badge>
                          </div>
                        </div>
                        <div className="flex sm:flex-col gap-2">
                          {getStatusBadge(appointment.status)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <Card className="border-green-200 shadow-md">
          <CardHeader className="bg-gradient-to-r from-green-50 to-yellow-50 border-b border-green-200">
            <div className="flex items-center justify-between">
              <CardTitle className="text-green-900">{monthNames[month]} {year}</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={previousMonth}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={nextMonth}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-7 gap-2">
              {dayNames.map(day => (
                <div key={day} className="text-center font-semibold text-sm text-gray-600 py-2">
                  {day}
                </div>
              ))}
              
              {Array.from({ length: startingDayOfWeek }).map((_, index) => (
                <div key={`empty-${index}`} className="aspect-square" />
              ))}
              
              {Array.from({ length: daysInMonth }).map((_, index) => {
                const day = index + 1;
                const dayAppointments = getAppointmentsForDate(day);
                const isToday = day === 21 && month === 1 && year === 2026;
                
                return (
                  <div
                    key={day}
                    className={`aspect-square border rounded-lg p-1 ${
                      isToday ? 'bg-green-100 border-green-600' : 'border-gray-200 hover:border-green-300'
                    } ${dayAppointments.length > 0 ? 'bg-yellow-50' : ''}`}
                  >
                    <div className={`text-sm font-medium ${isToday ? 'text-green-800' : 'text-gray-700'}`}>
                      {day}
                    </div>
                    <div className="space-y-1 mt-1">
                      {dayAppointments.slice(0, 2).map(apt => (
                        <div
                          key={apt.id}
                          className="text-xs bg-green-600 text-white rounded px-1 py-0.5 truncate"
                          title={`${apt.time} - ${apt.student}`}
                        >
                          {apt.time.split(' ')[0]}
                        </div>
                      ))}
                      {dayAppointments.length > 2 && (
                        <div className="text-xs text-gray-600">+{dayAppointments.length - 2}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Appointment Details Dialog */}
      <Dialog open={selectedAppointment !== null} onOpenChange={() => setSelectedAppointment(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-green-900 text-2xl">Appointment Details</DialogTitle>
            <DialogDescription>
              View complete information about this advising session
            </DialogDescription>
          </DialogHeader>
          {selectedAppointment && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-green-50 to-yellow-50 rounded-lg p-4 border border-green-200">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-full bg-gradient-to-br from-green-600 to-yellow-500 flex items-center justify-center shadow-lg">
                    <User className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-xl text-green-900">{selectedAppointment.student}</h3>
                    <p className="text-gray-700">{selectedAppointment.studentId} • {selectedAppointment.yearLevel}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border-green-200">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3 mb-2">
                      <CalendarIcon className="h-5 w-5 text-green-600" />
                      <p className="font-semibold text-gray-700">Date</p>
                    </div>
                    <p className="text-lg ml-8">
                      {new Date(selectedAppointment.date).toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-green-200">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3 mb-2">
                      <Clock className="h-5 w-5 text-green-600" />
                      <p className="font-semibold text-gray-700">Time</p>
                    </div>
                    <p className="text-lg ml-8">{selectedAppointment.time}</p>
                  </CardContent>
                </Card>

                <Card className="border-green-200">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3 mb-2">
                      <BookOpen className="h-5 w-5 text-green-600" />
                      <p className="font-semibold text-gray-700">Type</p>
                    </div>
                    <p className="text-lg ml-8">{selectedAppointment.type}</p>
                  </CardContent>
                </Card>

                <Card className="border-green-200">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3 mb-2">
                      <CalendarIcon className="h-5 w-5 text-green-600" />
                      <p className="font-semibold text-gray-700">Semester</p>
                    </div>
                    <p className="text-lg ml-8">{selectedAppointment.semester}</p>
                  </CardContent>
                </Card>
              </div>

              <Card className="border-green-200">
                <CardHeader className="bg-gradient-to-r from-green-50 to-yellow-50 border-b border-green-200">
                  <CardTitle className="text-green-900 text-lg">Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="text-sm text-gray-600">Email</p>
                      <p className="font-medium">{selectedAppointment.studentId.toLowerCase().replace('-', '')}@usjr.edu.ph</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="text-sm text-gray-600">Phone</p>
                      <p className="font-medium">(032) 123-4567</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Attendance Tracking */}
              {selectedAppointment.status === 'upcoming' && (
                <Card className="border-blue-200">
                  <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 border-b border-blue-200">
                    <CardTitle className="text-blue-900 text-lg flex items-center gap-2">
                      <UserCheck className="h-5 w-5" />
                      Mark Attendance
                    </CardTitle>
                    <CardDescription>Record student attendance for this appointment</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="flex gap-3">
                      <Button
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => {
                          handleMarkAttendance(selectedAppointment.id, 'appeared');
                          setSelectedAppointment(null);
                        }}
                      >
                        <UserCheck className="h-5 w-5 mr-2" />
                        Student Appeared
                      </Button>
                      <Button
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                        onClick={() => {
                          handleMarkAttendance(selectedAppointment.id, 'no-show');
                          setSelectedAppointment(null);
                        }}
                      >
                        <UserX className="h-5 w-5 mr-2" />
                        No-Show
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Attendance Status Display for Completed */}
              {selectedAppointment.status === 'completed' && selectedAppointment.attendance && (
                <Card className={selectedAppointment.attendance === 'appeared' ? 'border-green-200' : 'border-red-200'}>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3">
                      {selectedAppointment.attendance === 'appeared' ? (
                        <>
                          <UserCheck className="h-6 w-6 text-green-600" />
                          <div>
                            <p className="font-semibold text-green-900">Student Appeared</p>
                            <p className="text-sm text-gray-600">Attendance was marked as present</p>
                          </div>
                        </>
                      ) : (
                        <>
                          <UserX className="h-6 w-6 text-red-600" />
                          <div>
                            <p className="font-semibold text-red-900">No-Show</p>
                            <p className="text-sm text-gray-600">Student did not appear for this appointment</p>
                          </div>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={() => setSelectedAppointment(null)}>
                  Close
                </Button>
                <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={() => setShowCancelDialog(true)}>
                  Cancel Appointment
                </Button>
                <Button className="bg-gradient-to-r from-green-600 to-yellow-500 hover:from-green-700 hover:to-yellow-600 text-white" onClick={() => setShowRescheduleDialog(true)}>
                  Reschedule
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Notes Dialog */}
      <Dialog open={showNotesDialog} onOpenChange={setShowNotesDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-green-900 text-2xl">Appointment Notes</DialogTitle>
            <DialogDescription>
              Add or view notes for this advising session
            </DialogDescription>
          </DialogHeader>
          {selectedAppointment && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-green-50 to-yellow-50 rounded-lg p-4 border border-green-200">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-full bg-gradient-to-br from-green-600 to-yellow-500 flex items-center justify-center shadow-lg">
                    <User className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-xl text-green-900">{selectedAppointment.student}</h3>
                    <p className="text-gray-700">{selectedAppointment.studentId} • {selectedAppointment.yearLevel}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border-green-200">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3 mb-2">
                      <CalendarIcon className="h-5 w-5 text-green-600" />
                      <p className="font-semibold text-gray-700">Date</p>
                    </div>
                    <p className="text-lg ml-8">
                      {new Date(selectedAppointment.date).toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-green-200">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3 mb-2">
                      <Clock className="h-5 w-5 text-green-600" />
                      <p className="font-semibold text-gray-700">Time</p>
                    </div>
                    <p className="text-lg ml-8">{selectedAppointment.time}</p>
                  </CardContent>
                </Card>

                <Card className="border-green-200">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3 mb-2">
                      <BookOpen className="h-5 w-5 text-green-600" />
                      <p className="font-semibold text-gray-700">Type</p>
                    </div>
                    <p className="text-lg ml-8">{selectedAppointment.type}</p>
                  </CardContent>
                </Card>

                <Card className="border-green-200">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3 mb-2">
                      <CalendarIcon className="h-5 w-5 text-green-600" />
                      <p className="font-semibold text-gray-700">Semester</p>
                    </div>
                    <p className="text-lg ml-8">{selectedAppointment.semester}</p>
                  </CardContent>
                </Card>
              </div>

              <Card className="border-green-200">
                <CardHeader className="bg-gradient-to-r from-green-50 to-yellow-50 border-b border-green-200">
                  <CardTitle className="text-green-900 text-lg">Notes</CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-3">
                  {selectedAppointment.notes && selectedAppointment.notes.map((note, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-green-600" />
                      <p className="text-sm text-gray-600">{note}</p>
                    </div>
                  ))}
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-green-600" />
                    <Textarea
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      placeholder="Add a new note..."
                      className="w-full"
                    />
                    <Button
                      size="sm"
                      className="bg-gradient-to-r from-green-600 to-yellow-500 hover:from-green-700 hover:to-yellow-600 text-white"
                      onClick={() => {
                        if (newNote.trim()) {
                          const updatedAppointment = {
                            ...selectedAppointment,
                            notes: [...(selectedAppointment.notes || []), newNote.trim()],
                          };
                          const updatedAppointments = appointments.map(apt =>
                            apt.id === selectedAppointment.id ? updatedAppointment : apt
                          );
                          appointments.length = 0;
                          appointments.push(...updatedAppointments);
                          setNewNote('');
                          setShowNotesDialog(false);
                        }
                      }}
                    >
                      Add Note
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={() => setShowNotesDialog(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reschedule Dialog */}
      <Dialog open={showRescheduleDialog} onOpenChange={setShowRescheduleDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-green-900 text-2xl">Reschedule Appointment</DialogTitle>
            <DialogDescription>
              Choose a new date and time for this advising session
            </DialogDescription>
          </DialogHeader>
          {selectedAppointment && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-green-50 to-yellow-50 rounded-lg p-4 border border-green-200">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-full bg-gradient-to-br from-green-600 to-yellow-500 flex items-center justify-center shadow-lg">
                    <User className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-xl text-green-900">{selectedAppointment.student}</h3>
                    <p className="text-gray-700">{selectedAppointment.studentId} • {selectedAppointment.yearLevel}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border-green-200">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3 mb-2">
                      <CalendarIcon className="h-5 w-5 text-green-600" />
                      <p className="font-semibold text-gray-700">Date</p>
                    </div>
                    <input
                      type="date"
                      value={rescheduleDate}
                      onChange={(e) => setRescheduleDate(e.target.value)}
                      className="w-full border border-gray-300 rounded px-3 py-2"
                    />
                  </CardContent>
                </Card>

                <Card className="border-green-200">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3 mb-2">
                      <Clock className="h-5 w-5 text-green-600" />
                      <p className="font-semibold text-gray-700">Time</p>
                    </div>
                    <input
                      type="time"
                      value={rescheduleTime}
                      onChange={(e) => setRescheduleTime(e.target.value)}
                      className="w-full border border-gray-300 rounded px-3 py-2"
                    />
                  </CardContent>
                </Card>

                <Card className="border-green-200">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3 mb-2">
                      <BookOpen className="h-5 w-5 text-green-600" />
                      <p className="font-semibold text-gray-700">Type</p>
                    </div>
                    <p className="text-lg ml-8">{selectedAppointment.type}</p>
                  </CardContent>
                </Card>

                <Card className="border-green-200">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3 mb-2">
                      <CalendarIcon className="h-5 w-5 text-green-600" />
                      <p className="font-semibold text-gray-700">Semester</p>
                    </div>
                    <p className="text-lg ml-8">{selectedAppointment.semester}</p>
                  </CardContent>
                </Card>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={() => setShowRescheduleDialog(false)}>
                  Close
                </Button>
                <Button
                  className="bg-gradient-to-r from-green-600 to-yellow-500 hover:from-green-700 hover:to-yellow-600 text-white"
                  onClick={() => {
                    if (rescheduleDate && rescheduleTime) {
                      const updatedAppointment = {
                        ...selectedAppointment,
                        date: rescheduleDate,
                        time: rescheduleTime,
                        status: 'upcoming',
                      };
                      const updatedAppointments = appointments.map(apt =>
                        apt.id === selectedAppointment.id ? updatedAppointment : apt
                      );
                      appointments.length = 0;
                      appointments.push(...updatedAppointments);
                      setRescheduleDate('');
                      setRescheduleTime('');
                      setShowRescheduleDialog(false);
                    }
                  }}
                >
                  Reschedule
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Cancel Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-red-900 text-2xl">Cancel Appointment</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this advising session?
            </DialogDescription>
          </DialogHeader>
          {selectedAppointment && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-lg p-4 border border-red-200">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-full bg-gradient-to-br from-red-400 to-orange-500 flex items-center justify-center shadow-lg">
                    <User className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-xl text-red-900">{selectedAppointment.student}</h3>
                    <p className="text-gray-700">{selectedAppointment.studentId} • {selectedAppointment.yearLevel}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border-red-200">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3 mb-2">
                      <CalendarIcon className="h-5 w-5 text-red-600" />
                      <p className="font-semibold text-gray-700">Date</p>
                    </div>
                    <p className="text-lg ml-8">
                      {new Date(selectedAppointment.date).toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-red-200">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3 mb-2">
                      <Clock className="h-5 w-5 text-red-600" />
                      <p className="font-semibold text-gray-700">Time</p>
                    </div>
                    <p className="text-lg ml-8">{selectedAppointment.time}</p>
                  </CardContent>
                </Card>

                <Card className="border-red-200">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3 mb-2">
                      <BookOpen className="h-5 w-5 text-red-600" />
                      <p className="font-semibold text-gray-700">Type</p>
                    </div>
                    <p className="text-lg ml-8">{selectedAppointment.type}</p>
                  </CardContent>
                </Card>

                <Card className="border-red-200">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3 mb-2">
                      <CalendarIcon className="h-5 w-5 text-red-600" />
                      <p className="font-semibold text-gray-700">Semester</p>
                    </div>
                    <p className="text-lg ml-8">{selectedAppointment.semester}</p>
                  </CardContent>
                </Card>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={() => setShowCancelDialog(false)}>
                  Close
                </Button>
                <Button
                  className="bg-red-600 hover:bg-red-700 text-white"
                  onClick={() => {
                    const updatedAppointment = {
                      ...selectedAppointment,
                      status: 'cancelled',
                    };
                    const updatedAppointments = appointments.map(apt =>
                      apt.id === selectedAppointment.id ? updatedAppointment : apt
                    );
                    appointments.length = 0;
                    appointments.push(...updatedAppointments);
                    setShowCancelDialog(false);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}