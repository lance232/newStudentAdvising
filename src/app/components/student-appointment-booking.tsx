import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Calendar, Clock, CheckCircle, User } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Textarea } from "./ui/textarea";

interface TimeSlot {
  id: string;
  date: string;
  time: string;
  available: boolean;
}

interface StudentAppointmentBookingProps {
  adviserName: string;
  onBack: () => void;
}

export function StudentAppointmentBooking({ adviserName, onBack }: StudentAppointmentBookingProps) {
  const [selectedDate, setSelectedDate] = useState('2026-02-24');
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [appointmentType, setAppointmentType] = useState('Academic Advising');
  const [notes, setNotes] = useState('');
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [isSuccessDialogOpen, setIsSuccessDialogOpen] = useState(false);

  // Mock available time slots
  const timeSlots: TimeSlot[] = [
    { id: '1', date: '2026-02-24', time: '9:00 AM - 9:30 AM', available: true },
    { id: '2', date: '2026-02-24', time: '10:00 AM - 10:30 AM', available: false },
    { id: '3', date: '2026-02-24', time: '1:00 PM - 1:30 PM', available: true },
    { id: '4', date: '2026-02-24', time: '2:00 PM - 2:30 PM', available: true },
    { id: '5', date: '2026-02-24', time: '3:00 PM - 3:30 PM', available: false },
    { id: '6', date: '2026-02-25', time: '9:00 AM - 9:30 AM', available: true },
    { id: '7', date: '2026-02-25', time: '1:00 PM - 1:30 PM', available: true },
    { id: '8', date: '2026-02-25', time: '2:00 PM - 2:30 PM', available: true },
  ];

  const availableDates = Array.from(new Set(timeSlots.map(slot => slot.date)));
  const filteredSlots = timeSlots.filter(slot => slot.date === selectedDate);

  const handleBookAppointment = () => {
    setIsConfirmDialogOpen(false);
    setIsSuccessDialogOpen(true);
    // In real app, this would make an API call to book the appointment
  };

  const handleSlotClick = (slot: TimeSlot) => {
    if (slot.available) {
      setSelectedSlot(slot);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="tracking-tight">Book Appointment</h2>
          <p className="text-gray-600">Schedule an advising session with {adviserName}</p>
        </div>
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
      </div>

      {/* Adviser Info */}
      <Card className="border-green-200 shadow-md">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-green-600 to-yellow-500 flex items-center justify-center shadow-lg">
              <User className="h-8 w-8 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-xl text-green-900">{adviserName}</h3>
              <p className="text-gray-600">Academic Adviser • Computer Engineering Department</p>
              <p className="text-sm text-gray-500">Office Hours: Mon-Fri, 1:00 PM - 5:00 PM</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Appointment Details Form */}
        <Card className="border-green-200 shadow-md">
          <CardHeader className="bg-gradient-to-r from-green-50 to-yellow-50 border-b border-green-200">
            <CardTitle className="text-green-900">Appointment Details</CardTitle>
            <CardDescription>Select date, time, and appointment type</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Select Date</label>
              <Select value={selectedDate} onValueChange={setSelectedDate}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableDates.map(date => (
                    <SelectItem key={date} value={date}>
                      {new Date(date).toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Appointment Type</label>
              <Select value={appointmentType} onValueChange={setAppointmentType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Academic Advising">Academic Advising</SelectItem>
                  <SelectItem value="Failed Subject Discussion">Failed Subject Discussion</SelectItem>
                  <SelectItem value="Enrollment Planning">Enrollment Planning</SelectItem>
                  <SelectItem value="Career Guidance">Career Guidance</SelectItem>
                  <SelectItem value="General Consultation">General Consultation</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Notes (Optional)</label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Briefly describe what you'd like to discuss..."
                className="min-h-[100px] border-gray-300"
              />
            </div>

            {selectedSlot && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-medium text-green-900 mb-2">Selected Time Slot</h4>
                <div className="flex items-center gap-2 text-sm text-gray-700 mb-1">
                  <Calendar className="h-4 w-4 text-green-600" />
                  <span>
                    {new Date(selectedSlot.date).toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <Clock className="h-4 w-4 text-green-600" />
                  <span>{selectedSlot.time}</span>
                </div>
              </div>
            )}

            <Button
              onClick={() => setIsConfirmDialogOpen(true)}
              className="w-full bg-gradient-to-r from-green-600 to-yellow-500 hover:from-green-700 hover:to-yellow-600 text-white"
              disabled={!selectedSlot}
            >
              Book Appointment
            </Button>
          </CardContent>
        </Card>

        {/* Available Time Slots */}
        <Card className="border-green-200 shadow-md">
          <CardHeader className="bg-gradient-to-r from-green-50 to-yellow-50 border-b border-green-200">
            <CardTitle className="text-green-900">Available Time Slots</CardTitle>
            <CardDescription>
              Select an available time slot for {new Date(selectedDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-3">
              {filteredSlots.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No time slots available for this date</p>
                </div>
              ) : (
                filteredSlots.map((slot) => (
                  <button
                    key={slot.id}
                    onClick={() => handleSlotClick(slot)}
                    disabled={!slot.available}
                    className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                      selectedSlot?.id === slot.id
                        ? 'border-green-600 bg-green-50'
                        : slot.available
                        ? 'border-gray-200 hover:border-green-300 hover:bg-green-50'
                        : 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Clock className={`h-5 w-5 ${selectedSlot?.id === slot.id ? 'text-green-600' : 'text-gray-600'}`} />
                        <span className={`font-medium ${selectedSlot?.id === slot.id ? 'text-green-900' : 'text-gray-900'}`}>
                          {slot.time}
                        </span>
                      </div>
                      {slot.available ? (
                        selectedSlot?.id === slot.id ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <Badge className="bg-green-100 text-green-800">Available</Badge>
                        )
                      ) : (
                        <Badge className="bg-gray-300 text-gray-700">Booked</Badge>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>

            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Booking Guidelines</h4>
              <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                <li>Appointments are 30 minutes each</li>
                <li>Please arrive 5 minutes early</li>
                <li>Cancel at least 24 hours in advance if needed</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-green-900">Confirm Appointment</DialogTitle>
            <DialogDescription>Please review your appointment details</DialogDescription>
          </DialogHeader>
          {selectedSlot && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div>
                  <p className="text-sm text-gray-600">Adviser</p>
                  <p className="font-medium text-gray-900">{adviserName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Date & Time</p>
                  <p className="font-medium text-gray-900">
                    {new Date(selectedSlot.date).toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      month: 'long', 
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </p>
                  <p className="font-medium text-gray-900">{selectedSlot.time}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Type</p>
                  <p className="font-medium text-gray-900">{appointmentType}</p>
                </div>
                {notes && (
                  <div>
                    <p className="text-sm text-gray-600">Notes</p>
                    <p className="text-gray-900">{notes}</p>
                  </div>
                )}
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setIsConfirmDialogOpen(false)} className="flex-1">
                  Cancel
                </Button>
                <Button
                  onClick={handleBookAppointment}
                  className="flex-1 bg-gradient-to-r from-green-600 to-yellow-500 hover:from-green-700 hover:to-yellow-600 text-white"
                >
                  Confirm Booking
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Success Dialog */}
      <Dialog open={isSuccessDialogOpen} onOpenChange={setIsSuccessDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <div className="flex flex-col items-center text-center">
              <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                <CheckCircle className="h-10 w-10 text-green-600" />
              </div>
              <DialogTitle className="text-green-900 text-2xl">Appointment Booked!</DialogTitle>
              <DialogDescription className="mt-2">
                Your appointment has been successfully scheduled
              </DialogDescription>
            </div>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-800 mb-2">
                A confirmation email has been sent to your university email address with the appointment details.
              </p>
              <p className="text-sm text-green-800">
                You can view and manage your appointments in the Calendar section.
              </p>
            </div>
            <Button
              onClick={() => {
                setIsSuccessDialogOpen(false);
                onBack();
              }}
              className="w-full bg-gradient-to-r from-green-600 to-yellow-500 hover:from-green-700 hover:to-yellow-600 text-white"
            >
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}