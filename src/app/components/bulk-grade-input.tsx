import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Plus,
  Trash2,
  Save,
  Users,
  Check,
  X,
} from "lucide-react";
import { Badge } from "./ui/badge";
import { Checkbox } from "./ui/checkbox";

interface Student {
  id: string;
  name: string;
  studentId: string;
  yearLevel: string;
}

interface GradeEntry {
  studentId: string;
  subjectCode: string;
  units: number;
  grade: string;
  remarks: string;
}

const availableStudents: Student[] = [
  {
    id: "1",
    name: "Juan Dela Cruz",
    studentId: "2021-00123",
    yearLevel: "BSCPE-3",
  },
  {
    id: "2",
    name: "Maria Santos",
    studentId: "2021-00124",
    yearLevel: "BSCPE-3",
  },
  {
    id: "3",
    name: "Pedro Reyes",
    studentId: "2021-00125",
    yearLevel: "BSCPE-3",
  },
  {
    id: "4",
    name: "Ana Lopez",
    studentId: "2021-00126",
    yearLevel: "BSCPE-2",
  },
  {
    id: "5",
    name: "Carlos Garcia",
    studentId: "2021-00127",
    yearLevel: "BSCPE-2",
  },
];

export function BulkGradeInput() {
  const [selectedStudents, setSelectedStudents] = useState<
    string[]
  >([]);
  const [selectedSemester, setSelectedSemester] = useState(
    "1st Sem 2025-26",
  );
  const [subjectCode, setSubjectCode] = useState("");
  const [units, setUnits] = useState(3);
  const [gradeEntries, setGradeEntries] = useState<
    Record<string, string>
  >({});
  const [showSuccess, setShowSuccess] = useState(false);

  const toggleStudent = (studentId: string) => {
    setSelectedStudents((prev) => {
      if (prev.includes(studentId)) {
        // Remove student and their grade entry
        const newEntries = { ...gradeEntries };
        delete newEntries[studentId];
        setGradeEntries(newEntries);
        return prev.filter((id) => id !== studentId);
      } else {
        return [...prev, studentId];
      }
    });
  };

  const toggleSelectAll = () => {
    if (selectedStudents.length === availableStudents.length) {
      setSelectedStudents([]);
      setGradeEntries({});
    } else {
      setSelectedStudents(availableStudents.map((s) => s.id));
    }
  };

  const handleGradeChange = (
    studentId: string,
    grade: string,
  ) => {
    setGradeEntries((prev) => ({
      ...prev,
      [studentId]: grade,
    }));
  };

  const handleSaveGrades = () => {
    if (!subjectCode || selectedStudents.length === 0) return;

    // Validate all selected students have grades
    const allHaveGrades = selectedStudents.every(
      (id) =>
        gradeEntries[id] && gradeEntries[id].trim() !== "",
    );
    if (!allHaveGrades) return;

    // In a real app, this would save to backend
    console.log("Saving grades:", {
      subjectCode,
      units,
      semester: selectedSemester,
      grades: selectedStudents.map((id) => ({
        studentId: id,
        grade: gradeEntries[id],
      })),
    });

    // Show success message
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);

    // Reset form
    setSelectedStudents([]);
    setGradeEntries({});
    setSubjectCode("");
    setUnits(3);
  };

  const getRemarks = (grade: string) => {
    const gradeValue = parseFloat(grade);
    if (isNaN(gradeValue)) return "";
    return gradeValue >= 1.0 && gradeValue <= 3.0
      ? "Passed"
      : "Failed";
  };

  const getGradeColor = (grade: string) => {
    const gradeValue = parseFloat(grade);
    if (isNaN(gradeValue)) return "text-gray-400";
    if (gradeValue >= 1.0 && gradeValue <= 1.5)
      return "text-green-700";
    if (gradeValue > 1.5 && gradeValue <= 2.5)
      return "text-blue-700";
    if (gradeValue > 2.5 && gradeValue <= 3.0)
      return "text-yellow-700";
    return "text-red-700";
  };

  const canSave =
    subjectCode &&
    selectedStudents.length > 0 &&
    selectedStudents.every(
      (id) =>
        gradeEntries[id] && gradeEntries[id].trim() !== "",
    );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-50 to-yellow-50 rounded-lg p-6 border border-green-200">
        <div className="flex items-center gap-3 mb-2">
          <Users className="h-8 w-8 text-green-700" />
          <div>
            <h2 className="tracking-tight"> Grade Input</h2>
            <p className="text-gray-700">
              Select multiple students and input grades for the
              same subject
            </p>
          </div>
        </div>
      </div>

      {/* Success Message */}
      {showSuccess && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <Check className="h-5 w-5" />
          <span className="font-medium">
            Grades saved successfully for{" "}
            {selectedStudents.length} student
            {selectedStudents.length > 1 ? "s" : ""}!
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Student Selection */}
        <Card className="border-green-200 shadow-md lg:col-span-1">
          <CardHeader className="bg-gradient-to-r from-green-50 to-yellow-50 border-b border-green-200">
            <CardTitle className="text-green-900">
              Select Students
            </CardTitle>
            <CardDescription>
              {selectedStudents.length} of{" "}
              {availableStudents.length} selected
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {/* Select All */}
            <div className="flex items-center gap-3 pb-4 mb-4 border-b">
              <Checkbox
                id="select-all"
                checked={
                  selectedStudents.length ===
                  availableStudents.length
                }
                onCheckedChange={toggleSelectAll}
              />
              <Label
                htmlFor="select-all"
                className="cursor-pointer font-semibold"
              >
                Select All Students
              </Label>
            </div>

            {/* Student List */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {availableStudents.map((student) => (
                <div
                  key={student.id}
                  className={`border rounded-lg p-3 transition-all ${
                    selectedStudents.includes(student.id)
                      ? "border-green-500 bg-green-50"
                      : "border-gray-200 hover:border-green-300"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id={`student-${student.id}`}
                      checked={selectedStudents.includes(
                        student.id,
                      )}
                      onCheckedChange={() =>
                        toggleStudent(student.id)
                      }
                    />
                    <label
                      htmlFor={`student-${student.id}`}
                      className="flex-1 cursor-pointer"
                    >
                      <p className="font-semibold text-green-900">
                        {student.name}
                      </p>
                      <p className="text-sm text-gray-600">
                        {student.studentId}
                      </p>
                      <Badge className="mt-1 bg-green-100 text-green-800 text-xs">
                        {student.yearLevel}
                      </Badge>
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Right: Grade Input */}
        <Card className="border-green-200 shadow-md lg:col-span-2">
          <CardHeader className="bg-gradient-to-r from-green-50 to-yellow-50 border-b border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-green-900">
                  Subject & Grades
                </CardTitle>
                <CardDescription>
                  Enter subject details and grades for selected
                  students
                </CardDescription>
              </div>
              <Select
                value={selectedSemester}
                onValueChange={setSelectedSemester}
              >
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1st Sem 2025-26">
                    1st Sem 2025-26
                  </SelectItem>
                  <SelectItem value="2nd Sem 2025-26">
                    2nd Sem 2025-26
                  </SelectItem>
                  <SelectItem value="Summer 2026">
                    Summer 2026
                  </SelectItem>
                  <SelectItem value="1st Sem 2024-25">
                    1st Sem 2024-25
                  </SelectItem>
                  <SelectItem value="2nd Sem 2024-25">
                    2nd Sem 2024-25
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {/* Subject Details */}
            <div className="grid grid-cols-2 gap-4 mb-6 pb-6 border-b">
              <div className="space-y-2">
                <Label htmlFor="subject-code">
                  Subject Code *
                </Label>
                <Input
                  id="subject-code"
                  value={subjectCode}
                  onChange={(e) =>
                    setSubjectCode(e.target.value.toUpperCase())
                  }
                  placeholder="CS101"
                  className="border-gray-300"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="units">Units *</Label>
                <Input
                  id="units"
                  type="number"
                  value={units}
                  onChange={(e) =>
                    setUnits(parseInt(e.target.value) || 0)
                  }
                  className="border-gray-300"
                  min="1"
                  max="6"
                />
              </div>
            </div>

            {/* Grade Entry Table */}
            {selectedStudents.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">
                  Select students from the left to input grades
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Table Header */}
                <div className="grid grid-cols-12 gap-4 pb-3 border-b font-semibold text-sm text-gray-700">
                  <div className="col-span-4">Student</div>
                  <div className="col-span-3">Student ID</div>
                  <div className="col-span-2">Grade</div>
                  <div className="col-span-3">Remarks</div>
                </div>

                {/* Grade Rows */}
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {selectedStudents.map((studentId) => {
                    const student = availableStudents.find(
                      (s) => s.id === studentId,
                    );
                    if (!student) return null;

                    const grade = gradeEntries[studentId] || "";
                    const remarks = getRemarks(grade);

                    return (
                      <div
                        key={studentId}
                        className="grid grid-cols-12 gap-4 py-3 border-b hover:bg-gray-50 items-center"
                      >
                        <div className="col-span-4">
                          <p className="font-medium text-green-900">
                            {student.name}
                          </p>
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
                            onChange={(e) =>
                              handleGradeChange(
                                studentId,
                                e.target.value,
                              )
                            }
                            placeholder="1.0-5.0"
                            className={`border-gray-300 ${getGradeColor(grade)} font-bold`}
                            min="1.0"
                            max="5.0"
                          />
                        </div>
                        <div className="col-span-3 flex items-center">
                          {remarks === "Passed" && (
                            <Badge className="bg-green-100 text-green-800">
                              Passed
                            </Badge>
                          )}
                          {remarks === "Failed" && (
                            <Badge className="bg-red-100 text-red-800">
                              Failed
                            </Badge>
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
                    onClick={() => {
                      setSelectedStudents([]);
                      setGradeEntries({});
                      setSubjectCode("");
                      setUnits(3);
                    }}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Clear All
                  </Button>
                  <Button
                    onClick={handleSaveGrades}
                    disabled={!canSave}
                    className="bg-gradient-to-r from-green-600 to-yellow-500 hover:from-green-700 hover:to-yellow-600 text-white"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save Grades ({selectedStudents.length}{" "}
                    {selectedStudents.length === 1
                      ? "Student"
                      : "Students"}
                    )
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}