import { useState } from "react";
import { Bell, X, Check, AlertCircle, BookOpen, Calendar as CalendarIcon } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";

interface Notification {
  id: number;
  type: 'warning' | 'info' | 'success';
  title: string;
  message: string;
  time: string;
  read: boolean;
}

const initialNotifications: Notification[] = [
  {
    id: 1,
    type: 'warning',
    title: 'At-Risk Student Alert',
    message: 'Alex Johnson (BSCPE-3) has GWA of 2.9. Schedule advising session immediately.',
    time: '10 minutes ago',
    read: false
  },
  {
    id: 2,
    type: 'info',
    title: 'Upcoming Appointment',
    message: 'Meeting with Sarah Williams tomorrow at 10:00 AM - Academic Planning.',
    time: '1 hour ago',
    read: false
  },
  {
    id: '4',
    type: 'info',
    title: 'Assigned Advisory',
    message: '15 new BSCPE-1 students have been assigned to your advisory for 2nd Semester 2025-26.',
    time: '3 hours ago',
    read: false
  },
  {
    id: 4,
    type: 'info',
    title: 'Upcoming Appointment',
    message: 'Meeting with Michael Brown on Feb 22 at 2:00 PM - Course Selection.',
    time: '5 hours ago',
    read: true
  },
  {
    id: 5,
    type: 'warning',
    title: 'At-Risk Student Alert',
    message: 'Maria Garcia (BSCPE-1) has GWA of 2.8. Early intervention recommended.',
    time: '1 day ago',
    read: true
  },
  {
    id: 6,
    type: 'info',
    title: 'Assigned Advisory',
    message: '8 new transfer students (BSCPE-2 & BSCPE-3) added to your advisory list.',
    time: '2 days ago',
    read: true
  },
];

export function Notifications() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState(initialNotifications);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = (id: number) => {
    setNotifications(notifications.map(n => 
      n.id === id ? { ...n, read: true } : n
    ));
  };

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const deleteNotification = (id: number) => {
    setNotifications(notifications.filter(n => n.id !== id));
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-orange-600" />;
      case 'success':
        return <Check className="h-5 w-5 text-green-600" />;
      case 'info':
      default:
        return <BookOpen className="h-5 w-5 text-blue-600" />;
    }
  };

  return (
    <div className="relative">
      <Button 
        variant="ghost" 
        size="sm" 
        className="relative"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Bell className="h-5 w-5 text-gray-600" />
        {unreadCount > 0 && (
          <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-gradient-to-r from-green-600 to-yellow-500">
            {unreadCount}
          </Badge>
        )}
      </Button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-12 z-50 w-96 max-h-[600px] overflow-hidden">
            <Card className="shadow-xl border-green-200">
              <CardHeader className="bg-gradient-to-r from-green-50 to-yellow-50 border-b border-green-200">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-green-900">Notifications</CardTitle>
                    <CardDescription>{unreadCount} unread notifications</CardDescription>
                  </div>
                  {unreadCount > 0 && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={markAllAsRead}
                      className="text-green-700 hover:text-green-900 hover:bg-green-100"
                    >
                      Mark all read
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-0 max-h-[500px] overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Bell className="h-12 w-12 mx-auto mb-2 opacity-30" />
                    <p>No notifications</p>
                  </div>
                ) : (
                  <div>
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`border-b border-gray-100 p-4 hover:bg-gray-50 transition-colors ${
                          !notification.read ? 'bg-green-50/30' : ''
                        }`}
                      >
                        <div className="flex gap-3">
                          <div className="flex-shrink-0 mt-1">
                            {getIcon(notification.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <h4 className={`text-sm font-semibold ${!notification.read ? 'text-green-900' : 'text-gray-900'}`}>
                                {notification.title}
                              </h4>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteNotification(notification.id)}
                                className="h-6 w-6 p-0 hover:bg-red-100"
                              >
                                <X className="h-3 w-3 text-gray-500" />
                              </Button>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-xs text-gray-500">{notification.time}</span>
                              {!notification.read && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => markAsRead(notification.id)}
                                  className="h-6 px-2 text-xs text-green-700 hover:text-green-900 hover:bg-green-100"
                                >
                                  Mark as read
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}