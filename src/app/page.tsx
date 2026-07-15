'use client';

import { useAppStore } from '@/lib/store';
import type { PageView } from '@/lib/types';
import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

import AuthPage from '@/components/gradeup/auth-page';
import AppLayout from '@/components/gradeup/app-layout';

// Squelette affiché pendant le chargement différé (code-splitting) d'une page.
function PageSkeleton() {
  return (
    <div className="p-4 md:p-6 space-y-4 animate-pulse">
      <div className="h-8 w-48 rounded-lg bg-muted" />
      <div className="h-4 w-72 rounded bg-muted/70" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-28 rounded-xl bg-muted/60" />
        ))}
      </div>
    </div>
  );
}

// Chargement différé (lazy-loading) de chaque page : le bundle initial ne contient
// que l'authentification et le layout. Chaque page n'est téléchargée qu'à la navigation.
const AdminDashboard = dynamic(() => import('@/components/gradeup/admin-dashboard'), { ssr: false, loading: () => <PageSkeleton /> });
const AdminUsers = dynamic(() => import('@/components/gradeup/admin-users'), { ssr: false, loading: () => <PageSkeleton /> });
const AdminClasses = dynamic(() => import('@/components/gradeup/admin-classes'), { ssr: false, loading: () => <PageSkeleton /> });
const AdminPayments = dynamic(() => import('@/components/gradeup/admin-payments'), { ssr: false, loading: () => <PageSkeleton /> });
const AdminConfig = dynamic(() => import('@/components/gradeup/admin-config'), { ssr: false, loading: () => <PageSkeleton /> });
const AdminReports = dynamic(() => import('@/components/gradeup/admin-reports'), { ssr: false, loading: () => <PageSkeleton /> });
const AdminNotifications = dynamic(() => import('@/components/gradeup/admin-notifications'), { ssr: false, loading: () => <PageSkeleton /> });
const AdminConferences = dynamic(() => import('@/components/gradeup/admin-conferences'), { ssr: false, loading: () => <PageSkeleton /> });
const MeetingsHub = dynamic(() => import('@/components/gradeup/meetings/meetings-hub'), { ssr: false, loading: () => <PageSkeleton /> });
const MeetingRoom = dynamic(() => import('@/components/gradeup/meetings/meeting-room'), { ssr: false, loading: () => <PageSkeleton /> });
const LibraryHub = dynamic(() => import('@/components/gradeup/library/library-hub'), { ssr: false, loading: () => <PageSkeleton /> });
const AdminCards = dynamic(() => import('@/components/gradeup/admin-cards'), { ssr: false, loading: () => <PageSkeleton /> });
const AdminAi = dynamic(() => import('@/components/gradeup/admin-ai'), { ssr: false, loading: () => <PageSkeleton /> });
const TuitionTracking = dynamic(() => import('@/components/gradeup/tuition-tracking'), { ssr: false, loading: () => <PageSkeleton /> });
const EndOfYear = dynamic(() => import('@/components/gradeup/end-of-year'), { ssr: false, loading: () => <PageSkeleton /> });
const TeacherReports = dynamic(() => import('@/components/gradeup/teacher-reports'), { ssr: false, loading: () => <PageSkeleton /> });
const AdminCourses = dynamic(() => import('@/components/gradeup/admin-courses'), { ssr: false, loading: () => <PageSkeleton /> });
const AdminPresence = dynamic(() => import('@/components/gradeup/admin-presence'), { ssr: false, loading: () => <PageSkeleton /> });
const AdminSchedules = dynamic(() => import('@/components/gradeup/admin-schedules'), { ssr: false, loading: () => <PageSkeleton /> });
const AutoReportSyncPanel = dynamic(() => import('@/components/gradeup/auto-report-sync-panel'), { ssr: false, loading: () => <PageSkeleton /> });
const CahierCotation = dynamic(() => import('@/components/gradeup/cahier-cotation'), { ssr: false, loading: () => <PageSkeleton /> });
const TeacherDashboard = dynamic(() => import('@/components/gradeup/teacher-dashboard'), { ssr: false, loading: () => <PageSkeleton /> });
const TeacherCourses = dynamic(() => import('@/components/gradeup/teacher-courses'), { ssr: false, loading: () => <PageSkeleton /> });
const TeacherLessons = dynamic(() => import('@/components/gradeup/teacher-lessons'), { ssr: false, loading: () => <PageSkeleton /> });
const TeacherGrades = dynamic(() => import('@/components/gradeup/teacher-grades'), { ssr: false, loading: () => <PageSkeleton /> });
const TeacherHomework = dynamic(() => import('@/components/gradeup/teacher-homework'), { ssr: false, loading: () => <PageSkeleton /> });
const TeacherAttendance = dynamic(() => import('@/components/gradeup/teacher-attendance'), { ssr: false, loading: () => <PageSkeleton /> });
const TeacherAI = dynamic(() => import('@/components/gradeup/teacher-ai'), { ssr: false, loading: () => <PageSkeleton /> });
const StudentDashboard = dynamic(() => import('@/components/gradeup/student-dashboard'), { ssr: false, loading: () => <PageSkeleton /> });
const StudentCourses = dynamic(() => import('@/components/gradeup/student-courses'), { ssr: false, loading: () => <PageSkeleton /> });
const StudentLessons = dynamic(() => import('@/components/gradeup/student-lessons'), { ssr: false, loading: () => <PageSkeleton /> });
const StudentGrades = dynamic(() => import('@/components/gradeup/student-grades'), { ssr: false, loading: () => <PageSkeleton /> });
const StudentAttendance = dynamic(() => import('@/components/gradeup/student-attendance'), { ssr: false, loading: () => <PageSkeleton /> });
const StudentPayments = dynamic(() => import('@/components/gradeup/student-payments'), { ssr: false, loading: () => <PageSkeleton /> });
const StudentAI = dynamic(() => import('@/components/gradeup/student-ai'), { ssr: false, loading: () => <PageSkeleton /> });
const StudentHomework = dynamic(() => import('@/components/gradeup/student-homework'), { ssr: false, loading: () => <PageSkeleton /> });
const StudentNotifications = dynamic(() => import('@/components/gradeup/student-notifications'), { ssr: false, loading: () => <PageSkeleton /> });
const ParentDashboard = dynamic(() => import('@/components/gradeup/parent-dashboard'), { ssr: false, loading: () => <PageSkeleton /> });
const ParentGrades = dynamic(() => import('@/components/gradeup/parent-grades'), { ssr: false, loading: () => <PageSkeleton /> });
const ParentPayments = dynamic(() => import('@/components/gradeup/parent-payments'), { ssr: false, loading: () => <PageSkeleton /> });
const ParentNotifications = dynamic(() => import('@/components/gradeup/parent-notifications'), { ssr: false, loading: () => <PageSkeleton /> });
const ParentAI = dynamic(() => import('@/components/gradeup/parent-ai'), { ssr: false, loading: () => <PageSkeleton /> });
const ProfilePage = dynamic(() => import('@/components/gradeup/profile-page'), { ssr: false, loading: () => <PageSkeleton /> });
const MessageCenter = dynamic(() => import('@/components/gradeup/message-center'), { ssr: false, loading: () => <PageSkeleton /> });
const ChatPage = dynamic(() => import('@/components/gradeup/chat-page'), { ssr: false, loading: () => <PageSkeleton /> });
const SchoolCalendar = dynamic(() => import('@/components/gradeup/school-calendar'), { ssr: false, loading: () => <PageSkeleton /> });
const HelpPage = dynamic(() => import('@/components/gradeup/help-page'), { ssr: false, loading: () => <PageSkeleton /> });

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
  if (page === 'meetings') return <MeetingsHub />;
  if (page === 'meeting-room') return <MeetingRoom />;
  if (page === 'library') return <LibraryHub />;
  if (page === 'admin-cards') return <AdminCards />;
  if (page === 'admin-courses') return <AdminCourses />;
  if (page === 'admin-presence') return <AdminPresence />;
  if (page === 'admin-schedules') return <AdminSchedules />;
  if (page === 'auto-report-sync') return <AutoReportSyncPanel />;
  if (page === 'cahier-cotation') return <CahierCotation />;
  if (page === 'admin-tuition') return <TuitionTracking />;
  if (page === 'admin-end-of-year') return <EndOfYear />;
  if (page === 'admin-ai') return <AdminAi />;
  if (page === 'teacher-dashboard') return <TeacherDashboard />;
  if (page === 'teacher-reports') return <TeacherReports />;
  if (page === 'teacher-courses') return <TeacherCourses />;
  if (page === 'teacher-lessons') return <TeacherLessons />;
  if (page === 'teacher-grades') return <TeacherGrades />;
  if (page === 'teacher-homework') return <TeacherHomework />;
  if (page === 'teacher-attendance') return <TeacherAttendance />;
  if (page === 'teacher-ai') return <TeacherAI />;
  if (page === 'teacher-end-of-year') return <EndOfYear />;
  if (page === 'student-dashboard') return <StudentDashboard />;
  if (page === 'student-courses') return <StudentCourses />;
  if (page === 'student-lessons') return <StudentLessons />;
  if (page === 'student-grades') return <StudentGrades />;
  if (page === 'student-attendance') return <StudentAttendance />;
  if (page === 'student-payments') return <StudentPayments />;
  if (page === 'student-ai') return <StudentAI />;
  if (page === 'student-homework') return <StudentHomework />;
  if (page === 'student-notifications') return <StudentNotifications />;
  if (page === 'parent-dashboard') return <ParentDashboard />;
  if (page === 'parent-grades') return <ParentGrades />;
  if (page === 'parent-payments') return <ParentPayments />;
  if (page === 'parent-notifications') return <ParentNotifications />;
  if (page === 'parent-ai') return <ParentAI />;
  if (page === 'profile') return <ProfilePage />;
  if (page === 'messages') return <ChatPage />;
  if (page === 'calendar') return <SchoolCalendar />;
  if (page === 'help') return <HelpPage />;
  return <AuthPage />;
}

// Splash screen shown during Zustand rehydration to avoid flash of auth page
function SplashScreen() {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-600 z-50">
      <div className="flex flex-col items-center gap-6 animate-fade-in">
        <div className="relative">
          <img
            src="/logo-gradeup.png"
            alt="GradeUp"
            className="w-24 h-24 rounded-2xl object-contain drop-shadow-2xl"
          />
          <div className="absolute inset-0 rounded-2xl bg-white/10 animate-pulse" />
        </div>
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white tracking-tight">GradeUp</h1>
          <p className="text-blue-200 text-sm mt-1">Chargement en cours...</p>
        </div>
        <div className="flex gap-2">
          <div className="h-2 w-2 rounded-full bg-white/60 animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="h-2 w-2 rounded-full bg-white/60 animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="h-2 w-2 rounded-full bg-white/60 animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const { currentPage, user, hydrateSession } = useAppStore();
  const [hydrated, setHydrated] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);

  // Wait for Zustand to rehydrate from localStorage before rendering anything
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHydrated(true);
  }, []);

  // Restore the session from the HTTP-only JWT cookie on reload
  useEffect(() => {
    hydrateSession().finally(() => setSessionChecked(true));
  }, [hydrateSession]);

  // Show splash screen while rehydrating — avoids the flash to auth page
  if (!hydrated || !sessionChecked) {
    return <SplashScreen />;
  }

  if (!user) {
    return <AuthPage />;
  }

  return (
    <AppLayout>
      <PageRouter page={currentPage} />
    </AppLayout>
  );
}

