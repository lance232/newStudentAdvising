import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Search, Eye, Mail, Phone } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

const students = [
  { id: 1, name: 'Sarah Williams', studentId: '2023-0001', year: 'BSCPE-3', gwa: 1.5, gradeRange: '1.0-3.0', email: 'sarah.w@usjr.edu.ph', phone: '(032) 123-4567' },
  { id: 2, name: 'Michael Brown', studentId: '2022-0145', year: 'BSCPE-4', gwa: 1.8, gradeRange: '1.0-3.0', email: 'michael.b@usjr.edu.ph', phone: '(032) 234-5678' },
  { id: 3, name: 'Emily Davis', studentId: '2024-0089', year: 'BSCPE-2', gwa: 1.3, gradeRange: '1.0-3.0', email: 'emily.d@usjr.edu.ph', phone: '(032) 345-6789' },
  { id: 4, name: 'Alex Johnson', studentId: '2023-0112', year: 'BSCPE-3', gwa: 2.9, gradeRange: '1.0-3.0', email: 'alex.j@usjr.edu.ph', phone: '(032) 456-7890' },
  { id: 5, name: 'Maria Garcia', studentId: '2025-0034', year: 'BSCPE-1', gwa: 2.8, gradeRange: '1.0-3.0', email: 'maria.g@usjr.edu.ph', phone: '(032) 567-8901' },
  { id: 6, name: 'James Chen', studentId: '2024-0156', year: 'BSCPE-2', gwa: 3.2, gradeRange: '3.1-5.0', email: 'james.c@usjr.edu.ph', phone: '(032) 678-9012' },
  { id: 7, name: 'Jessica Taylor', studentId: '2022-0078', year: 'BSCPE-4', gwa: 1.6, gradeRange: '1.0-3.0', email: 'jessica.t@usjr.edu.ph', phone: '(032) 789-0123' },
  { id: 8, name: 'David Martinez', studentId: '2023-0203', year: 'BSCPE-3', gwa: 1.9, gradeRange: '1.0-3.0', email: 'david.m@usjr.edu.ph', phone: '(032) 890-1234' },
];

interface StudentListProps {
  onSelectStudent: (studentId: number) => void;
}

export function StudentList({ onSelectStudent }: StudentListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGradeRange, setFilterGradeRange] = useState('all');
  const [filterYear, setFilterYear] = useState('all');

  const filteredStudents = students.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         student.studentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         student.year.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGradeRange = filterGradeRange === 'all' || student.gradeRange === filterGradeRange;
    const matchesYear = filterYear === 'all' || student.year === filterYear;
    return matchesSearch && matchesGradeRange && matchesYear;
  });

  const getGradeRangeBadge = (gradeRange: string) => {
    switch (gradeRange) {
      case '1.0-3.0':
        return <Badge className="bg-green-100 text-green-800 border-green-300">1.0-3.0 (Pass)</Badge>;
      case '3.1-5.0':
        return <Badge variant="destructive">3.1-5.0 (Failed)</Badge>;
      default:
        return <Badge variant="secondary">{gradeRange}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="tracking-tight">Student Directory</h2>
        <p className="text-gray-600">View and manage student records</p>
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
                  placeholder="Search by name, ID, or year level..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filterGradeRange} onValueChange={setFilterGradeRange}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder="Filter by grade range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Grade Ranges</SelectItem>
                  <SelectItem value="1.0-3.0">1.0-3.0</SelectItem>
                  <SelectItem value="3.1-5.0">3.1-5.0</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterYear} onValueChange={setFilterYear}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder="Filter by year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  <SelectItem value="BSCPE-1">BSCPE-1</SelectItem>
                  <SelectItem value="BSCPE-2">BSCPE-2</SelectItem>
                  <SelectItem value="BSCPE-3">BSCPE-3</SelectItem>
                  <SelectItem value="BSCPE-4">BSCPE-4</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Student Table */}
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Year</TableHead>
                    <TableHead>GWA</TableHead>
                    <TableHead>Grade Range</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell className="font-medium">{student.studentId}</TableCell>
                      <TableCell>{student.name}</TableCell>
                      <TableCell className="font-medium text-green-800">{student.year}</TableCell>
                      <TableCell>
                        <span className={student.gwa <= 3.0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                          {student.gwa.toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell>{getGradeRangeBadge(student.gradeRange)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => onSelectStudent(student.id)}>
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {filteredStudents.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No students found matching your criteria.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}