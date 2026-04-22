import { useState } from 'react';
import { Dashboard } from './components/dashboard';
import { StudentList } from './components/student-list';
import { StudentProfile } from './components/student-profile';
import { CalendarView } from './components/calendar-view';
import { Settings as SettingsView } from './components/settings';
import { StudentManagement } from './components/student-management';
import { CourseGradeInput } from './components/course-grade-input';
import { StudentDashboard } from './components/student-dashboard';
import { StudentAppointmentBooking } from './components/student-appointment-booking';
import { ChairmanDashboard } from './components/chairman-dashboard';
import { AdminUserManagement } from './components/admin-user-management';
import { Login } from './components/login';
import { Notifications } from './components/notifications';
import { LayoutDashboard, Users, Calendar, Settings, LogOut, Menu, X, Shield } from 'lucide-react';
import { Button } from './components/ui/button';

// USJ-R Logo SVG Component
const USJRLogo = () => (
  <svg viewBox="0 0 100 100" className="h-full w-full">
    <circle cx="50" cy="50" r="48" fill="#16a34a" stroke="#ca8a04" strokeWidth="3"/>
    <text x="50" y="45" fontSize="32" fontWeight="bold" fill="white" textAnchor="middle">USJ</text>
    <text x="50" y="70" fontSize="20" fontWeight="bold" fill="#fbbf24" textAnchor="middle">-R</text>
  </svg>
);

type UserRole = 'adviser' | 'student' | 'chairman' | 'admin';
type AdviserViewType = 'dashboard' | 'students' | 'profile' | 'student-management' | 'grade-input' | 'calendar' | 'chairman' | 'settings';
type StudentViewType = 'dashboard' | 'booking';
type ChairmanViewType = 'dashboard' | 'settings';
type AdminViewType = 'users' | 'settings';
type AuthenticatedUser = { name: string; id: string };

const fallbackNameByRole: Record<UserRole, string> = {
  adviser: 'Adviser User',
  student: 'Student User',
  chairman: 'Chairman User',
  admin: 'System Admin',
};

const roleTitleByRole: Record<UserRole, string> = {
  adviser: 'Academic Adviser',
  student: 'Student',
  chairman: 'Department Chairman',
  admin: 'System Administrator',
};

function getInitials(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length === 0) {
    return 'US';
  }

  return parts.map((part) => part[0]?.toUpperCase() ?? '').join('');
}

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<UserRole>('adviser');
  const [currentUser, setCurrentUser] = useState<AuthenticatedUser>({ name: fallbackNameByRole.adviser, id: '' });
  const [adviserView, setAdviserView] = useState<AdviserViewType>('dashboard');
  const [studentView, setStudentView] = useState<StudentViewType>('dashboard');
  const [chairmanView, setChairmanView] = useState<ChairmanViewType>('dashboard');
  const [adminView, setAdminView] = useState<AdminViewType>('users');
  const [selectedStudent, setSelectedStudent] = useState<number | string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSelectStudent = (studentId: number | string) => {
    setSelectedStudent(studentId);
    setAdviserView('profile');
    setSidebarOpen(false);
  };

  const handleBackToList = () => {
    setAdviserView('students');
    setSelectedStudent(null);
  };

  const handleAdviserNavigation = (view: AdviserViewType) => {
    setAdviserView(view);
    setSidebarOpen(false);
  };

  const handleStudentNavigation = (view: StudentViewType) => {
    setStudentView(view);
    setSidebarOpen(false);
  };

  const handleChairmanNavigation = (view: ChairmanViewType) => {
    setChairmanView(view);
    setSidebarOpen(false);
  };

  const handleAdminNavigation = (view: AdminViewType) => {
    setAdminView(view);
    setSidebarOpen(false);
  };

  const handleLogin = (role: UserRole = 'adviser', userData?: { name: string; id: string }) => {
    setIsLoggedIn(true);
    setUserRole(role);
    setCurrentUser({
      name: userData?.name || fallbackNameByRole[role],
      id: userData?.id || '',
    });
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setAdviserView('dashboard');
    setStudentView('dashboard');
    setChairmanView('dashboard');
    setAdminView('users');
    setUserRole('adviser');
    setCurrentUser({ name: fallbackNameByRole.adviser, id: '' });
  };

  // Show login page if not logged in
  if (!isLoggedIn) {
    return <Login onLogin={handleLogin} />;
  }

  const renderAdviserContent = () => {
    switch (adviserView) {
      case 'dashboard':
        return <Dashboard isChairman={userRole === 'chairman'} />;
      case 'students':
        return <StudentList onSelectStudent={handleSelectStudent} />;
      case 'profile':
        return <StudentProfile onBack={handleBackToList} studentId={selectedStudent} />;
      case 'student-management':
        return <StudentManagement />;
      case 'grade-input':
        return <CourseGradeInput />;
      case 'calendar':
        return <CalendarView />;
      case 'chairman':
        return <ChairmanDashboard />;
      case 'settings':
        return <SettingsView />;
      default:
        return <Dashboard isChairman={userRole === 'chairman'} />;
    }
  };

  const renderStudentContent = () => {
    switch (studentView) {
      case 'dashboard':
        return (
          <StudentDashboard
            onBookAppointment={() => handleStudentNavigation('booking')}
          />
        );
      case 'booking':
        return (
          <StudentAppointmentBooking
            onBack={() => handleStudentNavigation('dashboard')}
          />
        );
      default:
        return (
          <StudentDashboard
            onBookAppointment={() => handleStudentNavigation('booking')}
          />
        );
    }
  };

  const renderChairmanContent = () => {
    switch (chairmanView) {
      case 'dashboard':
        return <ChairmanDashboard />;
      case 'settings':
        return <SettingsView />;
      default:
        return <ChairmanDashboard />;
    }
  };

  const renderAdminContent = () => {
    switch (adminView) {
      case 'users':
        return <AdminUserManagement />;
      case 'settings':
        return <SettingsView />;
      default:
        return <AdminUserManagement />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-yellow-50">
      {/* Header */}
      <header className="bg-white border-b border-green-200 sticky top-0 z-40 shadow-sm">
        <div className="px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden"
                onClick={() => setSidebarOpen(!sidebarOpen)}
              >
                {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 bg-white rounded-full flex items-center justify-center shadow p-0.5">
                  <USJRLogo />
                </div>
                <div>
                  <h1 className="font-bold text-lg text-green-800">USJ-R Academic Advising</h1>
                  <p className="text-xs text-yellow-600 hidden sm:block font-medium">Student Performance Management</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Notifications />
              <div className="hidden sm:flex items-center gap-2">
                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-green-600 to-yellow-500 flex items-center justify-center shadow">
                  <span className="text-sm font-bold text-white">{getInitials(currentUser.name)}</span>
                </div>
                <div className="text-sm">
                  <p className="font-semibold text-green-800">{currentUser.name}</p>
                  <p className="text-xs text-gray-600">{roleTitleByRole[userRole]}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`
            fixed lg:sticky top-[73px] left-0 h-[calc(100vh-73px)] bg-white border-r border-green-200 w-64 z-30 transition-transform duration-300
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          `}
        >
          <nav className="p-4 space-y-2">
            {userRole === 'admin' ? (
              <>
                <button
                  onClick={() => handleAdminNavigation('users')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    adminView === 'users' ? 'bg-gradient-to-r from-green-100 to-yellow-100 text-green-900 font-semibold shadow-sm' : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Users className="h-5 w-5" />
                  <span className="font-medium">User Management</span>
                </button>
                <button
                  onClick={() => handleAdminNavigation('settings')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    adminView === 'settings' ? 'bg-gradient-to-r from-green-100 to-yellow-100 text-green-900 font-semibold shadow-sm' : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Settings className="h-5 w-5" />
                  <span className="font-medium">Settings</span>
                </button>
              </>
            ) : userRole === 'adviser' || userRole === 'chairman' ? (
              <>
                <button
                  onClick={() => handleAdviserNavigation('dashboard')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    adviserView === 'dashboard' ? 'bg-gradient-to-r from-green-100 to-yellow-100 text-green-900 font-semibold shadow-sm' : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <LayoutDashboard className="h-5 w-5" />
                  <span className="font-medium">Dashboard</span>
                </button>
                <button
                  onClick={() => handleAdviserNavigation('students')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    adviserView === 'students' || adviserView === 'profile' ? 'bg-gradient-to-r from-green-100 to-yellow-100 text-green-900 font-semibold shadow-sm' : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Users className="h-5 w-5" />
                  <span className="font-medium">Students</span>
                </button>
                <button
                  onClick={() => handleAdviserNavigation('calendar')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    adviserView === 'calendar' ? 'bg-gradient-to-r from-green-100 to-yellow-100 text-green-900 font-semibold shadow-sm' : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Calendar className="h-5 w-5" />
                  <span className="font-medium">Calendar</span>
                </button>
                {userRole === 'chairman' && (
                  <button
                    onClick={() => handleAdviserNavigation('chairman')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      adviserView === 'chairman' ? 'bg-gradient-to-r from-green-100 to-yellow-100 text-green-900 font-semibold shadow-sm' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Shield className="h-5 w-5" />
                    <span className="font-medium">Chairman</span>
                  </button>
                )}
                <button
                  onClick={() => handleAdviserNavigation('settings')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    adviserView === 'settings' ? 'bg-gradient-to-r from-green-100 to-yellow-100 text-green-900 font-semibold shadow-sm' : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Settings className="h-5 w-5" />
                  <span className="font-medium">Settings</span>
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => handleStudentNavigation('dashboard')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    studentView === 'dashboard' ? 'bg-gradient-to-r from-green-100 to-yellow-100 text-green-900 font-semibold shadow-sm' : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <LayoutDashboard className="h-5 w-5" />
                  <span className="font-medium">My Dashboard</span>
                </button>
                <button
                  onClick={() => handleStudentNavigation('booking')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    studentView === 'booking' ? 'bg-gradient-to-r from-green-100 to-yellow-100 text-green-900 font-semibold shadow-sm' : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Calendar className="h-5 w-5" />
                  <span className="font-medium">Book Appointment</span>
                </button>
              </>
            )}

            <div className="pt-4 mt-4 border-t">
              <button 
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <LogOut className="h-5 w-5" />
                <span className="font-medium">Log Out</span>
              </button>
            </div>
          </nav>

          {/* Sidebar Footer */}
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-green-200 bg-gradient-to-r from-green-50 to-yellow-50">
            <div className="text-xs text-center">
              <p className="font-bold text-green-900">2nd Sem 2025-26</p>
              {userRole === 'student' ? (
                <p className="text-gray-600">BSCPE Student</p>
              ) : userRole === 'admin' ? (
                <p className="text-gray-600">System Administration</p>
              ) : userRole === 'chairman' ? (
                <p className="text-gray-600">Department Chairman</p>
              ) : (
                <p className="text-gray-600">Computer Engineering Dept.</p>
              )}
              <div className="mt-2 pt-2 border-t border-green-200">
                <p className="text-yellow-600 font-semibold">USJ-R</p>
              </div>
            </div>
          </div>
        </aside>

        {/* Overlay for mobile */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          {userRole === 'student' ? renderStudentContent() : userRole === 'admin' ? renderAdminContent() : renderAdviserContent()}
        </main>
      </div>
    </div>
  );
}