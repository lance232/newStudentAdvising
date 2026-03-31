import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { AlertCircle, BookOpen, Calendar, CheckCircle } from "lucide-react";

interface FailedSubject {
  subjectCode: string;
  grade: number;
  semester: string;
  units: number;
}

interface StudentRecommendationsProps {
  onBookAppointment: () => void;
  onBack: () => void;
}

export function StudentRecommendations({ onBookAppointment, onBack }: StudentRecommendationsProps) {
  // Mock data - in real app, this would come from props or API
  const failedSubjects: FailedSubject[] = [
    { subjectCode: 'ENG101', grade: 4.0, semester: '1st Sem 2025-26', units: 3 },
    { subjectCode: 'PHYS101', grade: 3.5, semester: '1st Sem 2025-26', units: 4 }
  ];

  const recommendations = [
    "Retake ENG101 and PHYS101 in the next available semester",
    "Consider reducing course load to focus on improving grades",
    "Utilize tutoring services available at the Learning Resource Center",
    "Meet with your adviser to discuss study strategies",
    "Attend review sessions before midterm and final exams"
  ];

  const totalUnitsToRetake = failedSubjects.reduce((sum, subject) => sum + subject.units, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="tracking-tight">Academic Recommendations</h2>
          <p className="text-gray-600">Personalized guidance based on your academic performance</p>
        </div>
        <Button variant="outline" onClick={onBack}>
          Back to Dashboard
        </Button>
      </div>

      {/* Failed Subjects Summary */}
      <Card className="border-red-300 bg-red-50 shadow-md">
        <CardHeader className="bg-gradient-to-r from-red-100 to-orange-100 border-b border-red-200">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-6 w-6 text-red-600" />
            <div>
              <CardTitle className="text-red-900">Subjects Requiring Attention</CardTitle>
              <CardDescription className="text-red-700">
                You need to retake {failedSubjects.length} subject(s) totaling {totalUnitsToRetake} units
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-3">
            {failedSubjects.map((subject, index) => (
              <div
                key={index}
                className="bg-white border border-red-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-red-600 flex items-center justify-center">
                      <BookOpen className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-red-900">{subject.subjectCode}</h3>
                      <p className="text-sm text-gray-600">
                        {subject.units} units • Grade: {subject.grade.toFixed(2)} • {subject.semester}
                      </p>
                    </div>
                  </div>
                  <Badge className="bg-red-600 text-white">Failed</Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      <Card className="border-green-200 shadow-md">
        <CardHeader className="bg-gradient-to-r from-green-50 to-yellow-50 border-b border-green-200">
          <CardTitle className="text-green-900">Adviser Recommendations</CardTitle>
          <CardDescription>Follow these steps to improve your academic standing</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-3">
            {recommendations.map((recommendation, index) => (
              <div key={index} className="flex items-start gap-3 p-3 border border-green-200 rounded-lg hover:bg-green-50 transition-colors">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <p className="text-gray-700">{recommendation}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Next Steps */}
      <Card className="border-blue-200 shadow-md">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200">
          <CardTitle className="text-blue-900">Next Steps</CardTitle>
          <CardDescription>Take action to improve your academic performance</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex items-start gap-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <Calendar className="h-6 w-6 text-blue-600 mt-1" />
              <div className="flex-1">
                <h3 className="font-bold text-blue-900 mb-2">Schedule an Advising Appointment</h3>
                <p className="text-gray-700 mb-3">
                  Meet with your adviser to discuss your academic plan and get personalized guidance on retaking courses.
                </p>
                <Button
                  onClick={onBookAppointment}
                  className="bg-gradient-to-r from-green-600 to-yellow-500 hover:from-green-700 hover:to-yellow-600 text-white"
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Book Appointment Now
                </Button>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <BookOpen className="h-6 w-6 text-gray-600 mt-1" />
              <div className="flex-1">
                <h3 className="font-bold text-gray-900 mb-2">Enrollment Planning</h3>
                <p className="text-gray-700">
                  Work with your adviser to plan your enrollment for the next semester, prioritizing failed subjects and ensuring prerequisite requirements are met.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Academic Support Resources */}
      <Card className="border-green-200 shadow-md">
        <CardHeader className="bg-gradient-to-r from-green-50 to-yellow-50 border-b border-green-200">
          <CardTitle className="text-green-900">Academic Support Resources</CardTitle>
          <CardDescription>Additional resources to help you succeed</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border border-green-200 rounded-lg">
              <h4 className="font-bold text-green-900 mb-2">Learning Resource Center</h4>
              <p className="text-sm text-gray-700 mb-2">Free tutoring services available</p>
              <p className="text-xs text-gray-600">Room 301, Main Building • Mon-Fri, 8:00 AM - 5:00 PM</p>
            </div>
            <div className="p-4 border border-green-200 rounded-lg">
              <h4 className="font-bold text-green-900 mb-2">Peer Study Groups</h4>
              <p className="text-sm text-gray-700 mb-2">Join study groups with classmates</p>
              <p className="text-xs text-gray-600">Library 2nd Floor • Schedule varies</p>
            </div>
            <div className="p-4 border border-green-200 rounded-lg">
              <h4 className="font-bold text-green-900 mb-2">Faculty Consultation</h4>
              <p className="text-sm text-gray-700 mb-2">Consult with subject instructors</p>
              <p className="text-xs text-gray-600">Check faculty office hours</p>
            </div>
            <div className="p-4 border border-green-200 rounded-lg">
              <h4 className="font-bold text-green-900 mb-2">Guidance Office</h4>
              <p className="text-sm text-gray-700 mb-2">Academic and personal counseling</p>
              <p className="text-xs text-gray-600">Administration Building • Mon-Fri, 8:00 AM - 5:00 PM</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
