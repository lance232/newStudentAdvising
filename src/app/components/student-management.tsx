import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Plus, Search, Edit, Trash2, User } from "lucide-react";
import { Badge } from "./ui/badge";

interface Student {
  id: string;
  name: string;
  studentId: string;
  yearLevel: string;
  email: string;
  phone: string;
  status: 'Active' | 'Probation' | 'On Leave';
}

export function StudentManagement() {
  const [students, setStudents] = useState<Student[]>([
    {
      id: '1',
      name: 'Juan Dela Cruz',
      studentId: '2021-00123',
      yearLevel: 'BSCPE-3',
      email: '2021-00123@usjr.edu.ph',
      phone: '(032) 123-4567',
      status: 'Active'
    },
    {
      id: '2',
      name: 'Maria Santos',
      studentId: '2021-00124',
      yearLevel: 'BSCPE-3',
      email: '2021-00124@usjr.edu.ph',
      phone: '(032) 234-5678',
      status: 'Probation'
    }
  ]);

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [newStudent, setNewStudent] = useState({
    name: '',
    studentId: '',
    yearLevel: 'BSCPE-1',
    email: '',
    phone: '',
    status: 'Active' as 'Active' | 'Probation' | 'On Leave'
  });

  const handleAddStudent = () => {
    if (newStudent.name && newStudent.studentId) {
      const student: Student = {
        id: Date.now().toString(),
        ...newStudent
      };
      setStudents([...students, student]);
      setNewStudent({
        name: '',
        studentId: '',
        yearLevel: 'BSCPE-1',
        email: '',
        phone: '',
        status: 'Active'
      });
      setIsAddDialogOpen(false);
    }
  };

  const handleDeleteStudent = (id: string) => {
    setStudents(students.filter(s => s.id !== id));
  };

  const filteredStudents = students.filter(student =>
    student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.studentId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Active':
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case 'Probation':
        return <Badge className="bg-red-100 text-red-800">Probation</Badge>;
      case 'On Leave':
        return <Badge className="bg-gray-100 text-gray-800">On Leave</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="tracking-tight">Student Management</h2>
          <p className="text-gray-600">Add and manage students in your advisory</p>
        </div>
        <Button
          onClick={() => setIsAddDialogOpen(true)}
          className="bg-gradient-to-r from-green-600 to-yellow-500 hover:from-green-700 hover:to-yellow-600 text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Student
        </Button>
      </div>

      <Card className="border-green-200 shadow-md">
        <CardHeader className="bg-gradient-to-r from-green-50 to-yellow-50 border-b border-green-200">
          <CardTitle className="text-green-900">All Students</CardTitle>
          <CardDescription>Manage students assigned to your advisory</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <Input
                type="text"
                placeholder="Search by name or student ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 border-gray-300"
              />
            </div>
          </div>

          <div className="space-y-3">
            {filteredStudents.length === 0 ? (
              <div className="text-center py-12">
                <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No students found</p>
              </div>
            ) : (
              filteredStudents.map((student) => (
                <div
                  key={student.id}
                  className="border border-green-200 rounded-lg p-4 hover:bg-green-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="h-12 w-12 rounded-full bg-gradient-to-br from-green-600 to-yellow-500 flex items-center justify-center shadow-lg">
                        <User className="h-6 w-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="font-bold text-lg text-green-900">{student.name}</h3>
                          {getStatusBadge(student.status)}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm text-gray-600">
                          <p><span className="font-medium">ID:</span> {student.studentId}</p>
                          <p><span className="font-medium">Year:</span> {student.yearLevel}</p>
                          <p><span className="font-medium">Email:</span> {student.email}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:bg-red-50"
                        onClick={() => handleDeleteStudent(student.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Add Student Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-green-900 text-2xl">Add New Student</DialogTitle>
            <DialogDescription>
              Enter student information to add them to your advisory
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="student-name">Full Name *</Label>
                <Input
                  id="student-name"
                  value={newStudent.name}
                  onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
                  placeholder="Juan Dela Cruz"
                  className="border-gray-300"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="student-id">Student ID *</Label>
                <Input
                  id="student-id"
                  value={newStudent.studentId}
                  onChange={(e) => setNewStudent({ ...newStudent, studentId: e.target.value })}
                  placeholder="2021-00123"
                  className="border-gray-300"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="year-level">Year Level *</Label>
                <Select
                  value={newStudent.yearLevel}
                  onValueChange={(value) => setNewStudent({ ...newStudent, yearLevel: value })}
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
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={newStudent.status}
                  onValueChange={(value: any) => setNewStudent({ ...newStudent, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Probation">Probation</SelectItem>
                    <SelectItem value="On Leave">On Leave</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={newStudent.email}
                  onChange={(e) => setNewStudent({ ...newStudent, email: e.target.value })}
                  placeholder="2021-00123@usjr.edu.ph"
                  className="border-gray-300"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  value={newStudent.phone}
                  onChange={(e) => setNewStudent({ ...newStudent, phone: e.target.value })}
                  placeholder="(032) 123-4567"
                  className="border-gray-300"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleAddStudent}
                className="bg-gradient-to-r from-green-600 to-yellow-500 hover:from-green-700 hover:to-yellow-600 text-white"
                disabled={!newStudent.name || !newStudent.studentId}
              >
                Add Student
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
