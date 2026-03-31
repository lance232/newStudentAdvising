import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { BookOpen, Users, ArrowLeft, Save, Check, Search, GraduationCap, Plus, UserPlus, X } from "lucide-react";
import { Badge } from "./ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Checkbox } from "./ui/checkbox";

interface Course {
  id: string;
  code: string;
  name: string;
  units: number;
  semester: string;
  enrolledCount: number;
  yearLevel: string;
}

interface Student {
  id: string;
  name: string;
  studentId: string;
  yearLevel: string;
  grade?: string;
}

const courses: Course[] = [
  { id: '1', code: 'CS101', name: 'Introduction to Computing', units: 3, semester: '1st Sem 2025-26', enrolledCount: 25, yearLevel: 'BSCPE-1' },
  { id: '2', code: 'MATH101', name: 'Calculus I', units: 3, semester: '1st Sem 2025-26', enrolledCount: 30, yearLevel: 'BSCPE-1' },
  { id: '3', code: 'ENG101', name: 'English Communication', units: 3, semester: '1st Sem 2025-26', enrolledCount: 28, yearLevel: 'BSCPE-1' },
  { id: '4', code: 'CS201', name: 'Data Structures', units: 3, semester: '1st Sem 2025-26', enrolledCount: 22, yearLevel: 'BSCPE-2' },
  { id: '5', code: 'CS301', name: 'Computer Architecture', units: 3, semester: '1st Sem 2025-26', enrolledCount: 20, yearLevel: 'BSCPE-3' },
  { id: '6', code: 'CPE301', name: 'Digital Logic Design', units: 3, semester: '1st Sem 2025-26', enrolledCount: 18, yearLevel: 'BSCPE-3' },
];

const enrolledStudentsData: Record<string, Student[]> = {
  '1': [
    { id: '1', name: 'Juan Dela Cruz', studentId: '2024-00123', yearLevel: 'BSCPE-1' },
    { id: '2', name: 'Maria Santos', studentId: '2024-00124', yearLevel: 'BSCPE-1' },
    { id: '3', name: 'Pedro Reyes', studentId: '2024-00125', yearLevel: 'BSCPE-1' },
  ],
  '2': [
    { id: '1', name: 'Juan Dela Cruz', studentId: '2024-00123', yearLevel: 'BSCPE-1' },
    { id: '2', name: 'Maria Santos', studentId: '2024-00124', yearLevel: 'BSCPE-1' },
    { id: '4', name: 'Ana Lopez', studentId: '2024-00126', yearLevel: 'BSCPE-1' },
  ],
  '3': [
    { id: '2', name: 'Maria Santos', studentId: '2024-00124', yearLevel: 'BSCPE-1' },
    { id: '3', name: 'Pedro Reyes', studentId: '2024-00125', yearLevel: 'BSCPE-1' },
  ],
  '4': [
    { id: '5', name: 'Carlos Garcia', studentId: '2023-00127', yearLevel: 'BSCPE-2' },
    { id: '6', name: 'Rosa Martinez', studentId: '2023-00128', yearLevel: 'BSCPE-2' },
  ],
  '5': [
    { id: '7', name: 'Jose Ramirez', studentId: '2022-00129', yearLevel: 'BSCPE-3' },
    { id: '8', name: 'Sofia Torres', studentId: '2022-00130', yearLevel: 'BSCPE-3' },
    { id: '9', name: 'Miguel Fernandez', studentId: '2022-00131', yearLevel: 'BSCPE-3' },
  ],
  '6': [
    { id: '7', name: 'Jose Ramirez', studentId: '2022-00129', yearLevel: 'BSCPE-3' },
    { id: '8', name: 'Sofia Torres', studentId: '2022-00130', yearLevel: 'BSCPE-3' },
  ],
};

// All available students in the system
const allStudents: Student[] = [
  { id: '1', name: 'Juan Dela Cruz', studentId: '2024-00123', yearLevel: 'BSCPE-1' },
  { id: '2', name: 'Maria Santos', studentId: '2024-00124', yearLevel: 'BSCPE-1' },
  { id: '3', name: 'Pedro Reyes', studentId: '2024-00125', yearLevel: 'BSCPE-1' },
  { id: '4', name: 'Ana Lopez', studentId: '2024-00126', yearLevel: 'BSCPE-1' },
  { id: '5', name: 'Carlos Garcia', studentId: '2023-00127', yearLevel: 'BSCPE-2' },
  { id: '6', name: 'Rosa Martinez', studentId: '2023-00128', yearLevel: 'BSCPE-2' },
  { id: '7', name: 'Jose Ramirez', studentId: '2022-00129', yearLevel: 'BSCPE-3' },
  { id: '8', name: 'Sofia Torres', studentId: '2022-00130', yearLevel: 'BSCPE-3' },
  { id: '9', name: 'Miguel Fernandez', studentId: '2022-00131', yearLevel: 'BSCPE-3' },
  { id: '10', name: 'Elena Gonzalez', studentId: '2024-00132', yearLevel: 'BSCPE-1' },
  { id: '11', name: 'Ricardo Cruz', studentId: '2023-00133', yearLevel: 'BSCPE-2' },
  { id: '12', name: 'Patricia Villar', studentId: '2022-00134', yearLevel: 'BSCPE-3' },
];

export function CourseGradeInput() {
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedSemester, setSelectedSemester] = useState('1st Sem 2025-26');
  const [searchQuery, setSearchQuery] = useState('');
  const [gradeEntries, setGradeEntries] = useState<Record<string, string>>({});
  const [showSuccess, setShowSuccess] = useState(false);
  const [isAddCourseOpen, setIsAddCourseOpen] = useState(false);
  const [isAddStudentsOpen, setIsAddStudentsOpen] = useState(false);
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [selectedStudentsToAdd, setSelectedStudentsToAdd] = useState<string[]>([]);
  const [enrolledStudentsMap, setEnrolledStudentsMap] = useState<Record<string, Student[]>>(enrolledStudentsData);
  const [newCourse, setNewCourse] = useState({
    code: '',
    name: '',
    units: 3,
    yearLevel: 'BSCPE-1'
  });

  const filteredCourses = courses.filter(course => 
    course.semester === selectedSemester &&
    (course.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
     course.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleCourseClick = (course: Course) => {
    setSelectedCourse(course);
    setGradeEntries({});
  };

  const handleBackToCourses = () => {
    setSelectedCourse(null);
    setGradeEntries({});
  };

  const handleGradeChange = (studentId: string, grade: string) => {
    setGradeEntries(prev => ({
      ...prev,
      [studentId]: grade
    }));
  };

  const handleSaveGrades = () => {
    if (!selectedCourse) return;

    // In a real app, this would save to backend
    console.log('Saving grades:', {
      courseId: selectedCourse.id,
      courseCode: selectedCourse.code,
      semester: selectedSemester,
      grades: Object.entries(gradeEntries).map(([studentId, grade]) => ({
        studentId,
        grade
      }))
    });

    // Show success message
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
      handleBackToCourses();
    }, 2000);
  };

  const getRemarks = (grade: string) => {
    const gradeValue = parseFloat(grade);
    if (isNaN(gradeValue)) return '';
    return gradeValue >= 1.0 && gradeValue <= 3.0 ? 'Passed' : 'Failed';
  };

  const getGradeColor = (grade: string) => {
    const gradeValue = parseFloat(grade);
    if (isNaN(gradeValue)) return 'text-gray-400';
    if (gradeValue >= 1.0 && gradeValue <= 1.5) return 'text-green-700';
    if (gradeValue > 1.5 && gradeValue <= 2.5) return 'text-blue-700';
    if (gradeValue > 2.5 && gradeValue <= 3.0) return 'text-yellow-700';
    return 'text-red-700';
  };

  const enrolledStudents = selectedCourse ? enrolledStudentsMap[selectedCourse.id] || [] : [];
  const enteredGradesCount = Object.keys(gradeEntries).filter(key => gradeEntries[key]).length;

  // Course List View
  if (!selectedCourse) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-50 to-yellow-50 rounded-lg p-6 border border-green-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BookOpen className="h-8 w-8 text-green-700" />
              <div>
                <h2 className="tracking-tight">Course Grade Input</h2>
                <p className="text-gray-700">Select a course to input grades for enrolled students</p>
              </div>
            </div>
            <Button
              onClick={() => setIsAddCourseOpen(true)}
              className="bg-gradient-to-r from-green-600 to-yellow-500 hover:from-green-700 hover:to-yellow-600 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Course
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="border-green-200 shadow-md">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search by course code or name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 border-gray-300"
                />
              </div>
              <Select value={selectedSemester} onValueChange={setSelectedSemester}>
                <SelectTrigger className="w-full md:w-48">
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
          </CardContent>
        </Card>

        {/* Course Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCourses.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No courses found for this semester</p>
            </div>
          ) : (
            filteredCourses.map((course) => (
              <Card
                key={course.id}
                className="border-green-200 hover:border-green-400 transition-all cursor-pointer hover:shadow-lg"
                onClick={() => handleCourseClick(course)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-green-600 to-yellow-500 flex items-center justify-center shadow">
                        <BookOpen className="h-5 w-5 text-white" />
                      </div>
                      <Badge className="bg-green-100 text-green-800">{course.yearLevel}</Badge>
                    </div>
                  </div>
                  <CardTitle className="text-lg text-green-900">{course.code}</CardTitle>
                  <CardDescription className="text-sm">{course.name}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Users className="h-4 w-4" />
                      <span>{course.enrolledCount} students</span>
                    </div>
                    <div className="text-gray-600">
                      {course.units} units
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Add Course Dialog */}
        <Dialog open={isAddCourseOpen} onOpenChange={setIsAddCourseOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-green-900 text-xl">Add New Course</DialogTitle>
              <DialogDescription>
                Create a new course for the semester
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="course-code">Course Code *</Label>
                <Input
                  id="course-code"
                  value={newCourse.code}
                  onChange={(e) => setNewCourse({ ...newCourse, code: e.target.value.toUpperCase() })}
                  placeholder="CS101"
                  className="border-gray-300"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="course-name">Course Name *</Label>
                <Input
                  id="course-name"
                  value={newCourse.name}
                  onChange={(e) => setNewCourse({ ...newCourse, name: e.target.value })}
                  placeholder="Introduction to Computing"
                  className="border-gray-300"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="units">Units *</Label>
                  <Input
                    id="units"
                    type="number"
                    value={newCourse.units}
                    onChange={(e) => setNewCourse({ ...newCourse, units: parseInt(e.target.value) || 0 })}
                    className="border-gray-300"
                    min="1"
                    max="6"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="year-level">Year Level *</Label>
                  <Select
                    value={newCourse.yearLevel}
                    onValueChange={(value) => setNewCourse({ ...newCourse, yearLevel: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BSCPE-1">BSCPE-1</SelectItem>
                      <SelectItem value="BSCPE-2">BSCPE-2</SelectItem>
                      <SelectItem value="BSCPE-3">BSCPE-3</SelectItem>
                      <SelectItem value="BSCPE-4">BSCPE-4</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={() => setIsAddCourseOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    // In real app, save course
                    setIsAddCourseOpen(false);
                    setNewCourse({ code: '', name: '', units: 3, yearLevel: 'BSCPE-1' });
                  }}
                  className="bg-gradient-to-r from-green-600 to-yellow-500 hover:from-green-700 hover:to-yellow-600 text-white"
                  disabled={!newCourse.code || !newCourse.name}
                >
                  Add Course
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Add Students Dialog */}
        <Dialog open={isAddStudentsOpen} onOpenChange={setIsAddStudentsOpen}>
          <DialogContent className="max-w-2xl max-h-[600px]">
            <DialogHeader>
              <DialogTitle className="text-green-900 text-xl">Add Students to Course</DialogTitle>
              <DialogDescription>
                Select students to enroll in {selectedCourse?.code}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {/* Search */}
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    value={studentSearchQuery}
                    onChange={(e) => setStudentSearchQuery(e.target.value)}
                    placeholder="Search student name or ID..."
                    className="pl-10 border-gray-300"
                  />
                </div>
              </div>

              {/* Student List */}
              <div className="border rounded-lg p-4 max-h-80 overflow-y-auto space-y-2">
                {allStudents
                  .filter(student => {
                    // Filter out already enrolled students
                    const isEnrolled = enrolledStudents.some(e => e.id === student.id);
                    // Filter by search query
                    const matchesSearch = student.name.toLowerCase().includes(studentSearchQuery.toLowerCase()) ||
                                        student.studentId.toLowerCase().includes(studentSearchQuery.toLowerCase());
                    return !isEnrolled && matchesSearch;
                  })
                  .map(student => (
                    <div
                      key={student.id}
                      className={`border rounded-lg p-3 transition-all ${
                        selectedStudentsToAdd.includes(student.id)
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-200 hover:border-green-300'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          id={`add-student-${student.id}`}
                          checked={selectedStudentsToAdd.includes(student.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedStudentsToAdd(prev => [...prev, student.id]);
                            } else {
                              setSelectedStudentsToAdd(prev => prev.filter(id => id !== student.id));
                            }
                          }}
                        />
                        <label
                          htmlFor={`add-student-${student.id}`}
                          className="flex-1 cursor-pointer"
                        >
                          <p className="font-semibold text-green-900">{student.name}</p>
                          <p className="text-sm text-gray-600">{student.studentId}</p>
                          <Badge className="mt-1 bg-green-100 text-green-800 text-xs">
                            {student.yearLevel}
                          </Badge>
                        </label>
                      </div>
                    </div>
                  ))}
                {allStudents.filter(student => {
                  const isEnrolled = enrolledStudents.some(e => e.id === student.id);
                  const matchesSearch = student.name.toLowerCase().includes(studentSearchQuery.toLowerCase()) ||
                                      student.studentId.toLowerCase().includes(studentSearchQuery.toLowerCase());
                  return !isEnrolled && matchesSearch;
                }).length === 0 && (
                  <div className="text-center py-8">
                    <Users className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-600 text-sm">No available students found</p>
                  </div>
                )}
              </div>

              {/* Selected Count */}
              {selectedStudentsToAdd.length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-sm text-green-700 font-medium">
                    {selectedStudentsToAdd.length} student{selectedStudentsToAdd.length > 1 ? 's' : ''} selected
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setIsAddStudentsOpen(false);
                    setSelectedStudentsToAdd([]);
                    setStudentSearchQuery('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    // Add selected students to the course
                    if (selectedCourse) {
                      const studentsToAdd = allStudents.filter(student => 
                        selectedStudentsToAdd.includes(student.id)
                      );
                      const updatedStudents = [...enrolledStudents, ...studentsToAdd];
                      setEnrolledStudentsMap(prev => ({
                        ...prev,
                        [selectedCourse.id]: updatedStudents
                      }));
                    }
                    setIsAddStudentsOpen(false);
                    setSelectedStudentsToAdd([]);
                    setStudentSearchQuery('');
                  }}
                  className="bg-gradient-to-r from-green-600 to-yellow-500 hover:from-green-700 hover:to-yellow-600 text-white"
                  disabled={selectedStudentsToAdd.length === 0}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add {selectedStudentsToAdd.length} Student{selectedStudentsToAdd.length > 1 ? 's' : ''}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Grade Input View
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-50 to-yellow-50 rounded-lg p-6 border border-green-200">
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="outline"
            onClick={handleBackToCourses}
            className="border-green-300 hover:bg-green-100"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Courses
          </Button>
          <Badge className="bg-green-600 text-white px-3 py-1">
            {selectedSemester}
          </Badge>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-green-600 to-yellow-500 flex items-center justify-center shadow-lg">
            <BookOpen className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="tracking-tight">{selectedCourse.code} - {selectedCourse.name}</h2>
            <p className="text-gray-700">
              {selectedCourse.units} units • {selectedCourse.yearLevel} • {enrolledStudents.length} enrolled students
            </p>
          </div>
        </div>
      </div>

      {/* Success Message */}
      {showSuccess && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <Check className="h-5 w-5" />
          <span className="font-medium">Grades saved successfully!</span>
        </div>
      )}

      {/* Grade Input Card */}
      <Card className="border-green-200 shadow-md">
        <CardHeader className="bg-gradient-to-r from-green-50 to-yellow-50 border-b border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-green-900">Student Grades</CardTitle>
              <CardDescription>
                {enteredGradesCount} of {enrolledStudents.length} grades entered
              </CardDescription>
            </div>
            <Button
              onClick={() => setIsAddStudentsOpen(true)}
              className="bg-gradient-to-r from-green-600 to-yellow-500 hover:from-green-700 hover:to-yellow-600 text-white"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Add Students
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {enrolledStudents.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No students enrolled in this course</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Table Header */}
              <div className="grid grid-cols-12 gap-4 pb-3 border-b font-semibold text-sm text-gray-700">
                <div className="col-span-4">Student Name</div>
                <div className="col-span-3">Student ID</div>
                <div className="col-span-2">Grade</div>
                <div className="col-span-3">Remarks</div>
              </div>

              {/* Student Rows */}
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {enrolledStudents.map((student) => {
                  const grade = gradeEntries[student.id] || '';
                  const remarks = getRemarks(grade);

                  return (
                    <div
                      key={student.id}
                      className="grid grid-cols-12 gap-4 py-3 border-b hover:bg-gray-50 items-center"
                    >
                      <div className="col-span-4">
                        <p className="font-medium text-green-900">{student.name}</p>
                        <Badge className="mt-1 bg-green-100 text-green-800 text-xs">
                          {student.yearLevel}
                        </Badge>
                      </div>
                      <div className="col-span-3 text-gray-700">
                        {student.studentId}
                      </div>
                      <div className="col-span-2">
                        <Input
                          type="number"
                          step="0.25"
                          value={grade}
                          onChange={(e) => handleGradeChange(student.id, e.target.value)}
                          placeholder="1.0-5.0"
                          className={`border-gray-300 ${getGradeColor(grade)} font-bold`}
                          min="1.0"
                          max="5.0"
                        />
                      </div>
                      <div className="col-span-3 flex items-center">
                        {remarks === 'Passed' && (
                          <Badge className="bg-green-100 text-green-800">Passed</Badge>
                        )}
                        {remarks === 'Failed' && (
                          <Badge className="bg-red-100 text-red-800">Failed</Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t mt-6">
                <Button
                  variant="outline"
                  onClick={() => setGradeEntries({})}
                >
                  Clear All Grades
                </Button>
                <Button
                  onClick={handleSaveGrades}
                  disabled={enteredGradesCount === 0}
                  className="bg-gradient-to-r from-green-600 to-yellow-500 hover:from-green-700 hover:to-yellow-600 text-white"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Grades ({enteredGradesCount} entered)
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Students Dialog - MOVED HERE */}
      <Dialog open={isAddStudentsOpen} onOpenChange={setIsAddStudentsOpen}>
        <DialogContent className="max-w-2xl max-h-[600px]">
          <DialogHeader>
            <DialogTitle className="text-green-900 text-xl">Add Students to Course</DialogTitle>
            <DialogDescription>
              Select students to enroll in {selectedCourse?.code}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Search */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  value={studentSearchQuery}
                  onChange={(e) => setStudentSearchQuery(e.target.value)}
                  placeholder="Search student name or ID..."
                  className="pl-10 border-gray-300"
                />
              </div>
            </div>

            {/* Student List */}
            <div className="border rounded-lg p-4 max-h-80 overflow-y-auto space-y-2">
              {allStudents
                .filter(student => {
                  // Filter out already enrolled students
                  const isEnrolled = enrolledStudents.some(e => e.id === student.id);
                  // Filter by search query
                  const matchesSearch = student.name.toLowerCase().includes(studentSearchQuery.toLowerCase()) ||
                                      student.studentId.toLowerCase().includes(studentSearchQuery.toLowerCase());
                  return !isEnrolled && matchesSearch;
                })
                .map(student => (
                  <div
                    key={student.id}
                    className={`border rounded-lg p-3 transition-all ${
                      selectedStudentsToAdd.includes(student.id)
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 hover:border-green-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id={`add-student-${student.id}`}
                        checked={selectedStudentsToAdd.includes(student.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedStudentsToAdd(prev => [...prev, student.id]);
                          } else {
                            setSelectedStudentsToAdd(prev => prev.filter(id => id !== student.id));
                          }
                        }}
                      />
                      <label
                        htmlFor={`add-student-${student.id}`}
                        className="flex-1 cursor-pointer"
                      >
                        <p className="font-semibold text-green-900">{student.name}</p>
                        <p className="text-sm text-gray-600">{student.studentId}</p>
                        <Badge className="mt-1 bg-green-100 text-green-800 text-xs">
                          {student.yearLevel}
                        </Badge>
                      </label>
                    </div>
                  </div>
                ))}
              {allStudents.filter(student => {
                const isEnrolled = enrolledStudents.some(e => e.id === student.id);
                const matchesSearch = student.name.toLowerCase().includes(studentSearchQuery.toLowerCase()) ||
                                    student.studentId.toLowerCase().includes(studentSearchQuery.toLowerCase());
                return !isEnrolled && matchesSearch;
              }).length === 0 && (
                <div className="text-center py-8">
                  <Users className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600 text-sm">No available students found</p>
                </div>
              )}
            </div>

            {/* Selected Count */}
            {selectedStudentsToAdd.length > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-sm text-green-700 font-medium">
                  {selectedStudentsToAdd.length} student{selectedStudentsToAdd.length > 1 ? 's' : ''} selected
                </p>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsAddStudentsOpen(false);
                  setSelectedStudentsToAdd([]);
                  setStudentSearchQuery('');
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  // Add selected students to the course
                  if (selectedCourse) {
                    const studentsToAdd = allStudents.filter(student => 
                      selectedStudentsToAdd.includes(student.id)
                    );
                    const updatedStudents = [...enrolledStudents, ...studentsToAdd];
                    setEnrolledStudentsMap(prev => ({
                      ...prev,
                      [selectedCourse.id]: updatedStudents
                    }));
                  }
                  setIsAddStudentsOpen(false);
                  setSelectedStudentsToAdd([]);
                  setStudentSearchQuery('');
                }}
                className="bg-gradient-to-r from-green-600 to-yellow-500 hover:from-green-700 hover:to-yellow-600 text-white"
                disabled={selectedStudentsToAdd.length === 0}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Add {selectedStudentsToAdd.length} Student{selectedStudentsToAdd.length > 1 ? 's' : ''}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}