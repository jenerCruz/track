export type AttendanceType = 'clock-in' | 'lunch-out' | 'lunch-in' | 'clock-out';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: 'admin' | 'employee' | 'pending-admin';
  deviceId?: string;
  homeLocation?: {
    lat: number;
    lng: number;
  };
  createdAt: string;
  status?: 'active' | 'inactive';
  workStart?: string;
  workEnd?: string;
  tolerance?: number;
}

export interface AttendanceLog {
  id?: string;
  uid: string;
  userEmail?: string;
  userName?: string;
  type: AttendanceType;
  timestamp: string;
  location: {
    lat: number;
    lng: number;
  };
  deviceId: string;
  isAnomaly: boolean;
  anomalyReason?: string;
}

export interface Task {
  id?: string;
  title: string;
  description: string;
  assignedTo: string; // User UID
  assignedToName: string;
  createdBy: string; // Admin UID
  status: 'todo' | 'in-progress' | 'done';
  priority: 'low' | 'medium' | 'high';
  dueDate: string;
  createdAt: string;
}

export interface CompanySettings {
  id: string;
  workStart: string; // HH:mm
  workEnd: string; // HH:mm
  lunchDuration: number; // minutes
  tolerance: number; // minutes
  qrSecret: string; // Secret key for QR validation
}
