# USJ-R Student Advising System Documentation

## Overview

The **University of San Jose-Recoletos (USJ-R) Student Advising System** is a comprehensive web-based platform designed for academic performance tracking and management. The system serves Computer Engineering students and follows Philippine CHED grading standards and academic calendar terms.

### System Features
- **Three-sided system**: Chairman, Adviser, and Student portals
- **Role-based authentication** with automatic role detection
- **Grade management** following CHED 1.0-5.0 grading scale
- **Appointment scheduling** with reschedule and cancellation capabilities
- **Academic performance tracking** with GWA monitoring
- **Year-level based advising** (BSCPE-1 through BSCPE-4)

---

## Branding & Design

### Colors
- **Primary**: USJ-R Green (`#16a34a`, `#15803d`)
- **Secondary**: USJ-R Gold (`#eab308`, `#ca8a04`)
- **Gradient**: Green to Gold (`from-green-600 to-yellow-500`)

### Design Elements
- Authentic USJ-R logo integration
- Green and gold color scheme throughout
- Responsive layout for desktop and mobile
- Modern card-based UI with clean typography

---

## User Roles & Access

### Role Detection by ID Format

The system automatically detects user roles based on institutional ID prefixes:

| ID Prefix | Role | Example ID | Access Level |
|-----------|------|------------|--------------|
| `30` | Chairman | 30-1234-5678 | Full system access, adviser assignment |
| `10` | Adviser | 10-1234-5678 | Student management, grade input, appointments |
| `20` | Student | 20-1234-5678 | View grades, book appointments, track progress |

### Login Credentials

#### Chairman
- **ID**: `30-1234-5678`
- **Password**: `chairman123`

#### Adviser
- **ID**: `10-1234-5678`
- **Password**: `adviser123`

#### Student
- **ID**: `20-1234-5678`
- **Password**: `student123`

---

## Grading System

### CHED Grading Scale (1.0 - 5.0)

The system follows the Philippine Commission on Higher Education (CHED) grading standards:

| Grade | Description | Status |
|-------|-------------|--------|
| 1.0 | Excellent | **PASS** (Green) |
| 1.25 | Excellent | **PASS** (Green) |
| 1.5 | Very Good | **PASS** (Green) |
| 1.75 | Very Good | **PASS** (Green) |
| 2.0 | Good | **PASS** (Green) |
| 2.25 | Good | **PASS** (Green) |
| 2.5 | Satisfactory | **PASS** (Green) |
| 2.75 | Satisfactory | **PASS** (Green) |
| 3.0 | Passing | **PASS** (Green) |
| 3.1 - 5.0 | Failed | **FAILED** (Red) |
| INC | Incomplete | Needs completion |
| DRP | Dropped | Withdrawn |

### Color Coding

- 🟢 **Green** (Pass): Grades 1.0 - 3.0
- 🔴 **Red** (Failed): Grades 3.1 - 5.0

---

## Academic Calendar

### Semester Terminology

The system uses Philippine academic calendar terms:

| Term | Short Form | Period |
|------|------------|--------|
| First Semester | 1st Sem | August - December |
| Second Semester | 2nd Sem | January - May |
| Summer Term | Summer | June - July |

### Format Examples
- `1st Sem 2025-26`
- `2nd Sem 2025-26`
- `Summer 2026`

---

## Year Levels

Computer Engineering students are displayed by year level:

| Code | Year Level | Typical Students |
|------|------------|------------------|
| BSCPE-1 | First Year | Freshmen |
| BSCPE-2 | Second Year | Sophomores |
| BSCPE-3 | Third Year | Juniors |
| BSCPE-4 | Fourth Year | Seniors |

**Note**: Advising is done per year level, and chairmen assign advisers to specific year levels.

---

## Chairman Portal

### Integration with Adviser Interface

**Important**: The chairman role is integrated into the adviser interface. When a chairman logs in:
- They access the same interface as advisers (Dashboard, Students, Calendar, Settings)
- They see all standard adviser features (student management, grade input, appointments)
- Below the regular adviser dashboard, they have exclusive access to **Chairman Controls**
- Regular advisers do not see the Chairman Controls section

### Chairman Controls Section

Located below the standard adviser dashboard, chairman-only features include:

#### 1. Adviser Assignment Statistics
- Visual cards showing advisors assigned to each year level:
  - **BSCPE-1**: Count of assigned advisors
  - **BSCPE-2**: Count of assigned advisors
  - **BSCPE-3**: Count of assigned advisors
  - **BSCPE-4**: Count of assigned advisors
  - **Unassigned**: Count of advisors awaiting assignment

#### 2. Faculty Advisors Management
- **Search Functionality**: Find advisors by name, email, or ID
- **Assign/Reassign**: Allocate advisors to specific year levels
- **Active Status Badge**: Shows count of active advisors
- **Advisor Cards**: Display advisor information with:
  - Name and profile icon
  - Email address
  - Institutional ID
  - Current year level assignment
  - Edit buttons for reassignment

#### 3. Year Level Overview
- Distribution grid showing advisors per year level
- Lists all advisors assigned to each BSCPE level
- Quick visual reference for advisor allocation
- Identifies gaps (year levels without assigned advisors)

### Dashboard Access
Chairman sees:
1. **Adviser Dashboard** (top section)
   - Total students and at-risk students
   - Grade distribution charts
   - At-risk student list
   - Upcoming appointments
   
2. **Chairman Controls** (bottom section, separated by green divider)
   - Adviser assignment statistics
   - Faculty management interface
   - Year level distribution overview

---

## Adviser Portal

### Features

#### 1. Dashboard
- Assigned students overview
- Appointment calendar
- Student performance summaries
- Quick actions (add grades, schedule appointments)

#### 2. Student Management
- View all assigned students by year level
- Search and filter students
- Access student profiles with complete academic history
- Track student progress

#### 3. Grade Input
- **Course Grade Input**: Add grades for specific courses
  - Select student
  - Enter course code and name
  - Input grade (1.0 - 5.0 scale)
  - Select semester
  - Add units (typically 1-5 per course)
  
#### 4. Appointment Calendar
- **View Modes**: Month view or List view
- **Filter by Semester**: 1st Sem, 2nd Sem, Summer
- **Appointment Categories**:
  - 🟢 **Upcoming**: Scheduled future appointments
  - ⚪ **Completed**: Past appointments with notes
  - 🔴 **Cancelled**: Cancelled appointments

#### 5. Appointment Management
- **View Details**: Full appointment information
- **Reschedule**: Change date and time
- **Cancel**: Cancel with confirmation
- **Add Notes**: Add session notes to completed appointments

#### 6. Student Profile View
- Personal information
- Units completed/required with progress bar
- Current semester enrollment
- GWA trends (line chart)
- Course history by semester
- Academic status (Dean's List, Good Standing, etc.)

---

## Student Portal

### Features

#### 1. Dashboard
- Personal academic overview
- Current GWA and academic standing
- Upcoming appointments
- Quick access to grades and appointment booking

#### 2. My Grades
- **Simplified Color Coding**:
  - 🟢 Green background: Pass (1.0 - 3.0)
  - 🔴 Red background: Failed (3.1 - 5.0)
- Filter by semester
- View course details (code, name, units, grade)
- GWA calculation per semester

#### 3. Appointment Booking
- View assigned adviser information
- Book new appointments by selecting:
  - Appointment type (Academic Planning, Course Selection, Progress Review, etc.)
  - Preferred date
  - Preferred time slot
- View appointment history

#### 4. My Appointments
- **Upcoming Appointments**:
  - View details (date, time, type)
  - Reschedule appointment
  - Cancel appointment
- **Past Appointments**:
  - View completed sessions
  - Access adviser notes (if any)

#### 5. Academic Profile
- Personal information
- Enrollment status
- Units completed vs. required
- Current semester courses
- GWA trend chart
- Course history by semester

---

## Appointment System

### Appointment Types
1. **Academic Planning** - Course planning and academic roadmap
2. **Course Selection** - Semester course enrollment guidance
3. **Progress Review** - Academic performance discussion
4. **Academic Warning Discussion** - For students below 2.0 GWA
5. **First Year Orientation** - New student advising
6. **Academic Probation Review** - For students on probation
7. **Graduation Requirements** - Final year planning

### Appointment Workflow

#### For Students:
1. Navigate to "Book Appointment"
2. Select appointment type
3. Choose preferred date and time
4. Submit request
5. Wait for adviser confirmation

#### For Advisers:
1. View appointment in calendar
2. Confirm or reschedule if needed
3. Conduct advising session
4. Mark as completed
5. Add session notes

### Appointment Actions

#### View Details
- Student information
- Date, time, and type
- Contact information
- Semester context

#### Reschedule
- Select new date
- Choose new time slot
- Updates appointment status to "upcoming"
- Notifies student of change

#### Cancel
- Confirmation required
- Updates status to "cancelled"
- Moves to cancelled appointments section
- Can include cancellation reason

#### Add Notes (Completed Appointments)
- Add session summary
- Record discussion points
- Track student progress
- Viewable by student and adviser

---

## Units System

### Terminology
- The system uses **"Units"** instead of "Credits"
- Typical course load: 15-18 units per semester
- Standard course: 3 units
- Lab courses: 1-2 units

### Display
- "Units Completed" progress card
- "Units" column in course tables
- Total units per semester in course history

---

## Data & Statistics

### GWA (General Weighted Average)
- Calculated across all completed courses
- Weighted by units per course
- Displayed with 2 decimal places (e.g., 1.75, 2.50)
- Color-coded: Green (≤ 3.0), Red (> 3.0)

### Academic Standing
- **Dean's List**: GWA 1.0 - 1.75
- **Good Standing**: GWA 1.76 - 2.50
- **Satisfactory**: GWA 2.51 - 3.0
- **At Risk**: GWA > 3.0

### Progress Tracking
- Units completed vs. total required (typically 120+ units)
- Percentage completion
- Progress bar visualization
- Semester-by-semester GWA trends

---

## Technical Information

### Technology Stack
- **Frontend**: React with TypeScript
- **Styling**: Tailwind CSS v4
- **UI Components**: Radix UI primitives
- **Charts**: Recharts library
- **Icons**: Lucide React
- **Routing**: React Router (Data mode)

### File Structure
```
/src/app/
├── App.tsx                          # Main application component
├── components/
│   ├── login.tsx                    # Authentication
│   ├── chairman-dashboard.tsx      # Chairman portal
│   ├── dashboard.tsx                # Adviser dashboard
│   ├── student-dashboard.tsx        # Student portal
│   ├── student-management.tsx       # Student list for advisers
│   ├── student-profile.tsx          # Detailed student view
│   ├── course-grade-input.tsx       # Grade entry form
│   ├── calendar-view.tsx            # Appointment calendar
│   ├── student-appointment-booking.tsx # Appointment booking
│   ├── notifications.tsx            # System notifications
│   └── ui/                          # Reusable UI components
└── styles/
    ├── theme.css                    # USJ-R branding
    └── fonts.css                    # Typography
```

### Key Components

#### Calendar View (`calendar-view.tsx`)
- Month and List view modes
- Semester filtering
- Appointment status management
- Reschedule and cancel dialogs
- Notes management for completed appointments

#### Student Profile (`student-profile.tsx`)
- Comprehensive academic history
- GWA trend visualization
- Units progress tracking
- Course history by semester
- Personal information display

#### Grade Input (`course-grade-input.tsx`)
- Course selection
- CHED grade scale (1.0-5.0)
- Semester assignment
- Units allocation
- Student assignment

---

## Future Enhancements

### Planned Features
- [ ] Email notifications for appointments
- [ ] SMS reminders
- [ ] Export grades to PDF
- [ ] Advanced analytics dashboard
- [ ] Mobile app version
- [ ] Integration with university registration system
- [ ] Automated GWA calculations
- [ ] Batch grade import
- [ ] Academic plan generator
- [ ] Document upload for advisers
- [ ] Student feedback system

---

## Support & Contact

### For Technical Issues
- Contact IT Support: itsupport@usjr.edu.ph
- Phone: (032) 253-7900

### For Academic Advising
- Contact your assigned adviser
- Visit the Computer Engineering Department
- Office Hours: Monday-Friday, 8:00 AM - 5:00 PM

### For System Feedback
- Submit feedback through the portal
- Email: advising@usjr.edu.ph

---

## Version History

### Version 3.1 (Current)
- ✅ Integrated chairman role into adviser interface
- ✅ Chairman Controls section appears below adviser dashboard for chairmen only
- ✅ Removed separate chairman page
- ✅ Chairman can access all adviser features plus exclusive adviser assignment controls

### Version 3.0
- ✅ Added appointment reschedule feature
- ✅ Added appointment cancellation with confirmation
- ✅ Changed "Credits" to "Units" system-wide
- ✅ Updated semester terminology to Philippine format
- ✅ Removed expected graduation from student profiles
- ✅ Fixed Dialog component ref warnings

### Version 2.0
- ✅ Implemented chairman dashboard
- ✅ Added adviser assignment by year level
- ✅ Created student portal with simplified color coding
- ✅ Added appointment booking for students
- ✅ Implemented green/red grading visualization

### Version 1.0
- ✅ Initial release
- ✅ Three-role system (Chairman, Adviser, Student)
- ✅ Grade input and management
- ✅ Basic appointment calendar
- ✅ Student profile views
- ✅ CHED grading scale implementation

---

## License & Usage

This system is proprietary to the **University of San Jose-Recoletos (USJ-R)** and is intended for internal academic use only. Unauthorized distribution or modification is prohibited.

**© 2026 University of San Jose-Recoletos. All rights reserved.**

---

## Appendix

### Common Course Codes (BSCPE)
- **CPE 101-199**: First Year Courses
- **CPE 201-299**: Second Year Courses
- **CPE 301-399**: Third Year Courses
- **CPE 401-499**: Fourth Year Courses

### Grading Guidelines for Advisers
1. Enter grades promptly after semester completion
2. Double-check grade accuracy before submission
3. Include course units correctly (typically 3 units per course)
4. Use appropriate semester designation
5. Add notes for exceptional cases (INC, DRP)

### Student Success Tips
1. Maintain GWA above 2.0 to avoid academic warning
2. Book appointments early in the semester for course planning
3. Check grades regularly after semester completion
4. Communicate with adviser for any concerns
5. Track unit completion toward graduation requirements

---

**End of Documentation**

*Last Updated: March 1, 2026*