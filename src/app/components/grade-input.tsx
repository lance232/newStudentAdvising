import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Plus, Trash2, Save, Edit2, Check, X } from "lucide-react";
import { Badge } from "./ui/badge";

interface Grade {
  id: string;
  subjectCode: string;
  units: number;
  grade: string;
  semester: string;
  remarks: string;
}

interface GradeInputProps {
  studentName: string;
  studentId: string;
  yearLevel: string;
}

export function GradeInput({ studentName, studentId, yearLevel }: GradeInputProps) {
  const [grades, setGrades] = useState<Grade[]>([
    {
      id: '1',
      subjectCode: 'CS101',
      units: 3,
      grade: '1.5',
      semester: '1st Sem 2025-26',
      remarks: 'Passed'
    },
    {
      id: '2',
      subjectCode: 'MATH101',
      units: 3,
      grade: '2.0',
      semester: '1st Sem 2025-26',
      remarks: 'Passed'
    },
    {
      id: '3',
      subjectCode: 'ENG101',
      units: 3,
      grade: '4.0',
      semester: '1st Sem 2025-26',
      remarks: 'Failed'
    }
  ]);

  const [selectedSemester, setSelectedSemester] = useState('1st Sem 2025-26');
  const [isAddingGrade, setIsAddingGrade] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [newGrade, setNewGrade] = useState({
    subjectCode: '',
    units: 3,
    grade: '',
    semester: selectedSemester
  });

  const handleAddGrade = () => {
    if (newGrade.subjectCode && newGrade.grade) {
      const gradeValue = parseFloat(newGrade.grade);
      const remarks = gradeValue >= 1.0 && gradeValue <= 3.0 ? 'Passed' : 'Failed';
      
      const grade: Grade = {
        id: Date.now().toString(),
        ...newGrade,
        semester: selectedSemester,
        remarks
      };
      
      setGrades([...grades, grade]);
      setNewGrade({
        subjectCode: '',
        units: 3,
        grade: '',
        semester: selectedSemester
      });
      setIsAddingGrade(false);
    }
  };

  const handleUpdateGrade = (id: string, updatedGrade: Partial<Grade>) => {
    setGrades(grades.map(g => {
      if (g.id === id) {
        const newGradeValue = updatedGrade.grade ? parseFloat(updatedGrade.grade) : parseFloat(g.grade);
        const remarks = newGradeValue >= 1.0 && newGradeValue <= 3.0 ? 'Passed' : 'Failed';
        return { ...g, ...updatedGrade, remarks };
      }
      return g;
    }));
    setEditingId(null);
  };

  const handleDeleteGrade = (id: string) => {
    setGrades(grades.filter(g => g.id !== id));
  };

  const filteredGrades = grades.filter(g => g.semester === selectedSemester);

  const calculateGWA = () => {
    if (filteredGrades.length === 0) return 0;
    const totalWeightedGrades = filteredGrades.reduce((sum, g) => sum + (parseFloat(g.grade) * g.units), 0);
    const totalUnits = filteredGrades.reduce((sum, g) => sum + g.units, 0);
    return totalUnits > 0 ? (totalWeightedGrades / totalUnits).toFixed(2) : 0;
  };

  const getGradeColor = (grade: string) => {
    const gradeValue = parseFloat(grade);
    if (gradeValue >= 1.0 && gradeValue <= 1.5) return 'text-green-700';
    if (gradeValue > 1.5 && gradeValue <= 2.5) return 'text-blue-700';
    if (gradeValue > 2.5 && gradeValue <= 3.0) return 'text-yellow-700';
    return 'text-red-700';
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-green-50 to-yellow-50 rounded-lg p-6 border border-green-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="tracking-tight mb-1">Grade Management</h2>
            <p className="text-gray-700"><span className="font-medium">{studentName}</span> • {studentId} • {yearLevel}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600 mb-1">Current GWA</p>
            <p className="text-3xl font-bold text-green-900">{calculateGWA()}</p>
          </div>
        </div>
      </div>

      <Card className="border-green-200 shadow-md">
        <CardHeader className="bg-gradient-to-r from-green-50 to-yellow-50 border-b border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-green-900">Grades</CardTitle>
              <CardDescription>Input and manage student grades</CardDescription>
            </div>
            <div className="flex items-center gap-3">
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
              <Button
                onClick={() => setIsAddingGrade(true)}
                className="bg-gradient-to-r from-green-600 to-yellow-500 hover:from-green-700 hover:to-yellow-600 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Grade
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-4 pb-3 border-b font-semibold text-sm text-gray-700">
            <div className="col-span-3">Subject Code</div>
            <div className="col-span-2">Units</div>
            <div className="col-span-2">Grade</div>
            <div className="col-span-2">Remarks</div>
            <div className="col-span-3 text-right">Actions</div>
          </div>

          {/* Add New Grade Row */}
          {isAddingGrade && (
            <div className="grid grid-cols-12 gap-4 py-3 border-b bg-green-50">
              <div className="col-span-3">
                <Input
                  value={newGrade.subjectCode}
                  onChange={(e) => setNewGrade({ ...newGrade, subjectCode: e.target.value.toUpperCase() })}
                  placeholder="CS101"
                  className="border-gray-300"
                />
              </div>
              <div className="col-span-2">
                <Input
                  type="number"
                  value={newGrade.units}
                  onChange={(e) => setNewGrade({ ...newGrade, units: parseInt(e.target.value) || 0 })}
                  className="border-gray-300"
                  min="1"
                  max="6"
                />
              </div>
              <div className="col-span-2">
                <Input
                  type="number"
                  step="0.25"
                  value={newGrade.grade}
                  onChange={(e) => setNewGrade({ ...newGrade, grade: e.target.value })}
                  placeholder="1.0-5.0"
                  className="border-gray-300"
                  min="1.0"
                  max="5.0"
                />
              </div>
              <div className="col-span-2 flex items-center">
                <Badge className="bg-gray-100 text-gray-800">Pending</Badge>
              </div>
              <div className="col-span-3 flex items-center justify-end gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setIsAddingGrade(false);
                    setNewGrade({ subjectCode: '', units: 3, grade: '', semester: selectedSemester });
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  onClick={handleAddGrade}
                  className="bg-green-600 hover:bg-green-700 text-white"
                  disabled={!newGrade.subjectCode || !newGrade.grade}
                >
                  <Check className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Grades List */}
          <div className="space-y-2">
            {filteredGrades.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-600">No grades recorded for this semester</p>
                <Button
                  onClick={() => setIsAddingGrade(true)}
                  variant="outline"
                  className="mt-4"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Grade
                </Button>
              </div>
            ) : (
              filteredGrades.map((grade) => (
                <div key={grade.id}>
                  {editingId === grade.id ? (
                    <div className="grid grid-cols-12 gap-4 py-3 border-b bg-yellow-50">
                      <div className="col-span-3">
                        <Input
                          defaultValue={grade.subjectCode}
                          onChange={(e) => handleUpdateGrade(grade.id, { subjectCode: e.target.value.toUpperCase() })}
                          className="border-gray-300"
                        />
                      </div>
                      <div className="col-span-2">
                        <Input
                          type="number"
                          defaultValue={grade.units}
                          onChange={(e) => handleUpdateGrade(grade.id, { units: parseInt(e.target.value) || 0 })}
                          className="border-gray-300"
                          min="1"
                          max="6"
                        />
                      </div>
                      <div className="col-span-2">
                        <Input
                          type="number"
                          step="0.25"
                          defaultValue={grade.grade}
                          onChange={(e) => handleUpdateGrade(grade.id, { grade: e.target.value })}
                          className="border-gray-300"
                          min="1.0"
                          max="5.0"
                        />
                      </div>
                      <div className="col-span-2 flex items-center">
                        {grade.remarks === 'Passed' ? (
                          <Badge className="bg-green-100 text-green-800">Passed</Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-800">Failed</Badge>
                        )}
                      </div>
                      <div className="col-span-3 flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingId(null)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => setEditingId(null)}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-12 gap-4 py-3 border-b hover:bg-gray-50">
                      <div className="col-span-3 flex items-center font-medium text-green-900">
                        {grade.subjectCode}
                      </div>
                      <div className="col-span-2 flex items-center text-gray-700">
                        {grade.units} units
                      </div>
                      <div className={`col-span-2 flex items-center font-bold text-lg ${getGradeColor(grade.grade)}`}>
                        {grade.grade}
                      </div>
                      <div className="col-span-2 flex items-center">
                        {grade.remarks === 'Passed' ? (
                          <Badge className="bg-green-100 text-green-800">Passed</Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-800">Failed</Badge>
                        )}
                      </div>
                      <div className="col-span-3 flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingId(grade.id)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:bg-red-50"
                          onClick={() => handleDeleteGrade(grade.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {filteredGrades.length > 0 && (
            <div className="mt-6 pt-4 border-t bg-gradient-to-r from-green-50 to-yellow-50 p-4 rounded-lg">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Units</p>
                  <p className="text-2xl font-bold text-green-900">
                    {filteredGrades.reduce((sum, g) => sum + g.units, 0)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Subjects Passed</p>
                  <p className="text-2xl font-bold text-green-700">
                    {filteredGrades.filter(g => g.remarks === 'Passed').length}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Subjects Failed</p>
                  <p className="text-2xl font-bold text-red-700">
                    {filteredGrades.filter(g => g.remarks === 'Failed').length}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
