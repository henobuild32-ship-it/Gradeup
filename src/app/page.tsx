'use client';

import { useAppStore } from '@/lib/store';
import type { PageView } from '@/lib/types';

import AuthPage from '@/components/gradeup/auth-page';
import AppLayout from '@/components/gradeup/app-layout';
import AdminDashboard from '@/components/gradeup/admin-dashboard';
import AdminUsers from '@/components/gradeup/admin-users';
import AdminClasses from '@/components/gradeup/admin-classes';
import AdminPayments from '@/components/gradeup/admin-payments';
import AdminConfig from '@/components/gradeup/admin-config';
import AdminReports from '@/components/gradeup/admin-reports';
import AdminNotifications from '@/components/gradeup/admin-notifications';
import AdminConferences from '@/components/gradeup/admin-conferences';
import AdminCards from '@/components/gradeup/admin-cards';
import TeacherDashboard from '@/components/gradeup/teacher-dashboard';
import TeacherCourses from '@/components/gradeup/teacher-courses';
import TeacherLessons from '@/components/gradeup/teacher-lessons';
import TeacherGrades from '@/components/gradeup/teacher-grades';
import TeacherHomework from '@/components/gradeup/teacher-homework';
import TeacherAttendance from '@/components/gradeup/teacher-attendance';
import TeacherAI from '@/components/gradeup/teacher-ai';
import StudentDashboard from '@/components/gradeup/student-dashboard';
import StudentCourses from '@/components/gradeup/student-courses';
import StudentLessons from '@/components/gradeup/student-lessons';
import StudentGrades from '@/components/gradeup/student-grades';
import StudentAttendance from '@/components/gradeup/student-attendance';
import StudentPayments from '@/components/gradeup/student-payments';
import StudentAI from '@/components/gradeup/student-ai';
import StudentNotifications from '@/components/gradeup/student-notifications';
import ParentDashboard from '@/components/gradeup/parent-dashboard';
import ParentGrades from '@/components/gradeup/parent-grades';
import ParentPayments from '@/components/gradeup/parent-payments';
import ParentNotifications from '@/components/gradeup/parent-notifications';
import ProfilePage from '@/components/gradeup/profile-page';
import MessageCenter from '@/components/gradeup/message-center';
import ChatPage from '@/components/gradeup/chat-page';
import SchoolCalendar from '@/components/gradeup/school-calendar';
import HelpPage from '@/components/gradeup/help-page';

function PageRouter({ page }: { page: PageView }) {
  if (page === 'auth' || page === 'register') return <AuthPage />;
  if (page === 'admin-dashboard') return <AdminDashboard />;
  if (page === 'admin-users') return <AdminUsers />;
  if (page === 'admin-classes') return <AdminClasses />;
  if (page === 'admin-payments') return <AdminPayments />;
  if (page === 'admin-config') return <AdminConfig />;
  if (page === 'admin-reports') return <AdminReports />;
  if (page === 'admin-notifications') return <AdminNotifications />;
  if (page === 'admin-conferences') return <AdminConferences />;
  if (page === 'admin-cards') return <AdminCards />;
  if (page === 'teacher-dashboard') return <TeacherDashboard />;
  if (page === 'teacher-courses') return <TeacherCourses />;
  if (page === 'teacher-lessons') return <TeacherLessons />;
  if (page === 'teacher-grades') return <TeacherGrades />;
  if (page === 'teacher-homework') return <TeacherHomework />;
  if (page === 'teacher-attendance') return <TeacherAttendance />;
  if (page === 'teacher-ai') return <TeacherAI />;
  if (page === 'student-dashboard') return <StudentDashboard />;
  if (page === 'student-courses') return <StudentCourses />;
  if (page === 'student-lessons') return <StudentLessons />;
  if (page === 'student-grades') return <StudentGrades />;
  if (page === 'student-attendance') return <StudentAttendance />;
  if (page === 'student-payments') return <StudentPayments />;
  if (page === 'student-ai') return <StudentAI />;
  if (page === 'student-notifications') return <StudentNotifications />;
  if (page === 'parent-dashboard') return <ParentDashboard />;
  if (page === 'parent-grades') return <ParentGrades />;
  if (page === 'parent-payments') return <ParentPayments />;
  if (page === 'parent-notifications') return <ParentNotifications />;
  if (page === 'profile') return <ProfilePage />;
  if (page === 'messages') return <ChatPage />;
  if (page === 'calendar') return <SchoolCalendar />;
  if (page === 'help') return <HelpPage />;
  return <AuthPage />;
}

export default function HomePage() {
  const { currentPage, user } = useAppStore();

  if (!user) {
    return <AuthPage />;
  }

  return (
    <AppLayout>
      <PageRouter page={currentPage} />
    </AppLayout>
  );
}
