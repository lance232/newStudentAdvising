import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { User, Lock, Clock } from "lucide-react";
import { Textarea } from "./ui/textarea";
import { Badge } from "./ui/badge";

export function Settings() {
  const [advisorName, setAdvisorName] = useState("Dr. Maria Santos");
  const [email, setEmail] = useState("m.santos@usjr.edu.ph");
  const [phone, setPhone] = useState("(032) 234-5678");
  const [department, setDepartment] = useState("Computer Engineering");
  
  // Time slot availability state for each day
  const [availability, setAvailability] = useState({
    monday: { enabled: true, startTime: "09:00", endTime: "17:00" },
    tuesday: { enabled: true, startTime: "09:00", endTime: "17:00" },
    wednesday: { enabled: true, startTime: "09:00", endTime: "17:00" },
    thursday: { enabled: true, startTime: "09:00", endTime: "17:00" },
    friday: { enabled: true, startTime: "09:00", endTime: "17:00" },
    saturday: { enabled: false, startTime: "09:00", endTime: "12:00" },
    sunday: { enabled: false, startTime: "09:00", endTime: "12:00" },
  });

  const updateDayAvailability = (day: string, field: string, value: any) => {
    setAvailability(prev => ({
      ...prev,
      [day]: {
        ...prev[day as keyof typeof prev],
        [field]: value
      }
    }));
  };

  // Generate time options in 30-minute intervals
  const generateTimeOptions = () => {
    const times = [];
    for (let hour = 7; hour <= 20; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeString = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
        const displayTime = new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit',
          hour12: true 
        });
        times.push({ value: timeString, label: displayTime });
      }
    }
    return times;
  };

  const timeOptions = generateTimeOptions();

  const [emailNotifications, setEmailNotifications] = useState(true);
  const [atRiskAlerts, setAtRiskAlerts] = useState(true);
  const [appointmentReminders, setAppointmentReminders] = useState(true);
  const [assignmentAlerts, setAssignmentAlerts] = useState(true);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="tracking-tight">Settings</h2>
        <p className="text-gray-600">Manage your account preferences and system settings</p>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-2 lg:w-auto">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Profile</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Lock className="h-4 w-4" />
            <span className="hidden sm:inline">Security</span>
          </TabsTrigger>
        </TabsList>

        {/* Profile Settings */}
        <TabsContent value="profile" className="space-y-6">
          <Card className="border-green-200 shadow-md">
            <CardHeader className="bg-gradient-to-r from-green-50 to-yellow-50 border-b border-green-200">
              <CardTitle className="text-green-900">Advisor Information</CardTitle>
              <CardDescription>Update your personal and contact information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="advisor-name">Full Name</Label>
                  <Input
                    id="advisor-name"
                    value={advisorName}
                    onChange={(e) => setAdvisorName(e.target.value)}
                    className="border-gray-300"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="border-gray-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="border-gray-300"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Select value={department} onValueChange={setDepartment}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Computer Engineering">Computer Engineering</SelectItem>
                      <SelectItem value="Electrical Engineering">Electrical Engineering</SelectItem>
                      <SelectItem value="Electronics Engineering">Electronics Engineering</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Appointment Session Duration</Label>
                    <p className="text-xs text-gray-500 mt-1">Set the duration for each advising session</p>
                  </div>
                  <Badge className="bg-green-100 text-green-800 border-green-300">
                    <Clock className="h-3 w-3 mr-1" />
                    30 Minutes per Session
                  </Badge>
                </div>

                <div className="space-y-3 border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <Label>Weekly Availability Schedule</Label>
                  <p className="text-xs text-gray-500">Select your available days and time slots for student appointments (30-minute sessions)</p>
                  
                  <div className="space-y-3 mt-4">
                    {Object.entries(availability).map(([day, schedule]) => (
                      <div key={day} className="bg-white border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2 w-32">
                            <input
                              type="checkbox"
                              id={`${day}-enabled`}
                              checked={schedule.enabled}
                              onChange={(e) => updateDayAvailability(day, 'enabled', e.target.checked)}
                              className="h-4 w-4 text-green-600 rounded border-gray-300 focus:ring-green-500"
                            />
                            <Label htmlFor={`${day}-enabled`} className="capitalize cursor-pointer">
                              {day}
                            </Label>
                          </div>
                          
                          {schedule.enabled && (
                            <div className="flex items-center gap-3 flex-1">
                              <div className="flex-1">
                                <Label htmlFor={`${day}-start`} className="text-xs text-gray-600">Start Time</Label>
                                <Select 
                                  value={schedule.startTime} 
                                  onValueChange={(value) => updateDayAvailability(day, 'startTime', value)}
                                >
                                  <SelectTrigger id={`${day}-start`} className="mt-1">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {timeOptions.map(time => (
                                      <SelectItem key={`${day}-start-${time.value}`} value={time.value}>
                                        {time.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              
                              <div className="flex-1">
                                <Label htmlFor={`${day}-end`} className="text-xs text-gray-600">End Time</Label>
                                <Select 
                                  value={schedule.endTime} 
                                  onValueChange={(value) => updateDayAvailability(day, 'endTime', value)}
                                >
                                  <SelectTrigger id={`${day}-end`} className="mt-1">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {timeOptions.map(time => (
                                      <SelectItem key={`${day}-end-${time.value}`} value={time.value}>
                                        {time.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline">Cancel</Button>
                <Button className="bg-gradient-to-r from-green-600 to-yellow-500 hover:from-green-700 hover:to-yellow-600 text-white">
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security" className="space-y-6">
          <Card className="border-green-200 shadow-md">
            <CardHeader className="bg-gradient-to-r from-green-50 to-yellow-50 border-b border-green-200">
              <CardTitle className="text-green-900">Security & Password</CardTitle>
              <CardDescription>Manage your account security settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="space-y-2">
                <Label htmlFor="current-password">Current Password</Label>
                <Input
                  id="current-password"
                  type="password"
                  placeholder="Enter current password"
                  className="border-gray-300"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="Enter new password"
                  className="border-gray-300"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="Confirm new password"
                  className="border-gray-300"
                />
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
                <h4 className="font-medium text-yellow-900 mb-2">Password Requirements:</h4>
                <ul className="text-sm text-yellow-800 space-y-1 list-disc list-inside">
                  <li>At least 8 characters long</li>
                  <li>Contains uppercase and lowercase letters</li>
                  <li>Contains at least one number</li>
                  <li>Contains at least one special character</li>
                </ul>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline">Cancel</Button>
                <Button className="bg-gradient-to-r from-green-600 to-yellow-500 hover:from-green-700 hover:to-yellow-600 text-white">
                  Update Password
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-red-200 shadow-md">
            <CardHeader className="bg-gradient-to-r from-red-50 to-orange-50 border-b border-red-200">
              <CardTitle className="text-red-900">Session Management</CardTitle>
              <CardDescription>Manage your active sessions</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Current Session</p>
                    <p className="text-sm text-gray-600">Chrome on Windows • Active now</p>
                  </div>
                  <Button variant="outline" size="sm" disabled>Current</Button>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Previous Session</p>
                    <p className="text-sm text-gray-600">Safari on MacBook • 2 hours ago</p>
                  </div>
                  <Button variant="outline" size="sm">Revoke</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}