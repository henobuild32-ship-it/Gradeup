export type UserRole = 'ADMIN' | 'TEACHER' | 'STUDENT' | 'PARENT';
export type PaymentStatus = 'paid' | 'pending' | 'overdue';
export type AttendanceStatus = 'present' | 'absent' | 'late';
export type ClassLevel = 'Maternelle' | 'Primaire' | 'Secondaire';

export interface SchoolInfo {
  id: string;
  name: string;
  email: string;
  currency: string;
  inviteCode?: string;
}

export interface UserInfo {
  id: string;
  schoolId: string;
  fullName: string;
  email: string;
  role: UserRole;
  photoUrl: string;
  parentId?: string;
  parentCode?: string;
  active?: boolean;
  school?: SchoolInfo;
  classEnrollments?: EnrolledClassInfo[];
  children?: UserInfo[];
}

export interface EnrolledClassInfo {
  id: string;
  userId: string;
  classId: string;
  class: ClassInfo;
}

export interface ClassInfo {
  id: string;
  schoolId: string;
  name: string;
  level: string;
  fees: number;
  _count?: {
    enrollments: number;
    courses: number;
  };
}

export interface CourseInfo {
  id: string;
  schoolId: string;
  classId: string;
  teacherId: string;
  name: string;
  description: string;
  class?: ClassInfo;
  teacher?: UserInfo;
  _count?: {
    lessons: number;
    grades: number;
    homework: number;
  };
}

export interface LessonInfo {
  id: string;
  schoolId: string;
  courseId: string;
  teacherId: string;
  title: string;
  content: string;
  fileUrl: string;
  fileName: string;
  createdAt: string;
  course?: CourseInfo;
  teacher?: UserInfo;
}

export interface GradeInfo {
  id: string;
  schoolId: string;
  courseId: string;
  studentId: string;
  teacherId: string;
  score: number;
  maxScore: number;
  trimester: string;
  comment: string;
  createdAt: string;
  course?: CourseInfo;
  student?: UserInfo;
  teacher?: UserInfo;
}

export interface HomeworkInfo {
  id: string;
  schoolId: string;
  courseId: string;
  teacherId: string;
  title: string;
  description: string;
  dueDate: string;
  createdAt: string;
  course?: CourseInfo;
  teacher?: UserInfo;
}

export interface AttendanceInfo {
  id: string;
  schoolId: string;
  studentId: string;
  teacherId: string;
  date: string;
  status: AttendanceStatus;
  reason: string;
  student?: UserInfo;
}

export interface PaymentInfo {
  id: string;
  schoolId: string;
  studentId: string;
  amount: number;
  status: PaymentStatus;
  month: string;
  method: string;
  createdAt: string;
  student?: UserInfo;
}

export interface NotificationInfo {
  id: string;
  schoolId: string;
  senderId: string;
  targetRole: string;
  targetClassId: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export type PageView = 
  | 'auth'
  | 'register'
  | 'admin-dashboard'
  | 'admin-users'
  | 'admin-classes'
  | 'admin-payments'
  | 'admin-config'
  | 'admin-reports'
  | 'admin-notifications'
  | 'teacher-dashboard'
  | 'teacher-courses'
  | 'teacher-lessons'
  | 'teacher-grades'
  | 'teacher-homework'
  | 'teacher-attendance'
  | 'teacher-ai'
  | 'student-dashboard'
  | 'student-courses'
  | 'student-lessons'
  | 'student-grades'
  | 'student-attendance'
  | 'student-payments'
  | 'student-ai'
  | 'student-notifications'
  | 'parent-dashboard'
  | 'parent-grades'
  | 'parent-payments'
  | 'parent-notifications'
  | 'profile'
  | 'messages'
  | 'calendar';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface MessageInfo {
  id: string;
  schoolId: string;
  senderId: string;
  recipientId: string;
  content: string;
  read: boolean;
  createdAt: string;
  sender?: { id: string; fullName: string; role: string };
  recipient?: { id: string; fullName: string; role: string };
}

export interface ConversationInfo {
  partnerId: string;
  partnerName: string;
  partnerRole: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}
