'use client';

import React, { useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { useToast } from '@/hooks/use-toast';
import { usePWAInstall } from '@/hooks/use-pwa-install';
import type { UserRole, PageView } from '@/lib/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Loader2,
  Eye,
  EyeOff,
  Shield,
  Sparkles,
  Users,
  BookOpen,
  ArrowLeft,
  School,
  GraduationCap,
  UserCheck,
  Key,
  Copy,
  Check,
  X,
  Smartphone,
  Apple,
} from 'lucide-react';

const roleDashboardMap: Record<UserRole, PageView> = {
  ADMIN: 'admin-dashboard',
  TEACHER: 'teacher-dashboard',
  STUDENT: 'student-dashboard',
  PARENT: 'parent-dashboard',
};

const roleLabels: Record<string, string> = {
  STUDENT: 'Élève',
  TEACHER: 'Professeur',
  PARENT: 'Parent',
};

const roleIcons: Record<string, React.ElementType> = {
  STUDENT: GraduationCap,
  TEACHER: UserCheck,
  PARENT: Users,
};

function PasswordStrengthIndicator({ password }: { password: string }) {
  if (!password) return null;

  const strength = password.length < 4 ? 1 : password.length < 8 ? 2 : 3;
  const labels = ['Faible', 'Moyen', 'Fort'];
  const colors = ['bg-red-500', 'bg-amber-500', 'bg-emerald-500'];
  const textColors = ['text-red-500', 'text-amber-500', 'text-emerald-500'];
  const emptyColors = ['bg-red-100 dark:bg-red-950/50', 'bg-amber-100 dark:bg-amber-950/50', 'bg-emerald-100 dark:bg-emerald-950/50'];

  return (
    <div className="space-y-1.5 animate-fade-in">
      <div className="flex gap-1.5">
        {[1, 2, 3].map((level) => (
          <div
            key={level}
            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
              level <= strength ? colors[strength - 1] : emptyColors[strength - 1]
            }`}
          />
        ))}
      </div>
      <p className={`text-xs font-medium ${textColors[strength - 1]}`}>
        {labels[strength - 1]}
      </p>
    </div>
  );
}

export default function AuthPage() {
  const { setUser, setCurrentPage, user } = useAppStore();
  const { toast } = useToast();
  const { isInstallable, isAppInstalled, isIOS, installPWA } = usePWAInstall();

  // If already logged in, show nothing (AppLayout handles it)
  useEffect(() => {
    if (user) {
      const dashboardPage = roleDashboardMap[user.role as UserRole] || 'admin-dashboard';
      setCurrentPage(dashboardPage);
    }
  }, [user, setCurrentPage]);

  // Login state
  const [loginInviteCode, setLoginInviteCode] = useState('');
  const [loginFullName, setLoginFullName] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginIsAdmin, setLoginIsAdmin] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');

  // Register state
  const [regMode, setRegMode] = useState<'create' | 'join'>('create');
  const [regSchoolName, setRegSchoolName] = useState('');
  const [regAdminName, setRegAdminName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regLoading, setRegLoading] = useState(false);
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);

  // Join school state
  const [joinInviteCode, setJoinInviteCode] = useState('');
  const [joinFullName, setJoinFullName] = useState('');
  const [joinPassword, setJoinPassword] = useState('');
  const [joinConfirmPassword, setJoinConfirmPassword] = useState('');
  const [joinRole, setJoinRole] = useState<UserRole>('STUDENT');
  const [joinClassIds, setJoinClassIds] = useState<string[]>([]);
  const [joinParentCode, setJoinParentCode] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);
  const [showJoinPassword, setShowJoinPassword] = useState(false);
  const [showJoinConfirmPassword, setShowJoinConfirmPassword] = useState(false);

  // Available classes (fetched when invite code is verified)
  const [availableClasses, setAvailableClasses] = useState<{ id: string; name: string; level: string }[]>([]);
  const [codeVerified, setCodeVerified] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);

  // Created invite code display
  const [createdInviteCode, setCreatedInviteCode] = useState('');
  const [codeCopied, setCodeCopied] = useState(false);

  // Verify invite code and fetch classes
  const verifyInviteCode = async (code: string) => {
    const cleanCode = (code || '').trim().toUpperCase();
    if (!cleanCode || cleanCode.length < 8) {
      setAvailableClasses([]);
      setCodeVerified(false);
      return;
    }
    setVerifyingCode(true);
    try {
      const checkRes = await fetch(`/api/config?inviteCode=${cleanCode}`);
      if (checkRes.ok) {
        const data = await checkRes.json();
        if (data.school) {
          setCodeVerified(true);
          const classRes = await fetch(`/api/classes?schoolId=${data.school.id}`);
          if (classRes.ok) {
            const classData = await classRes.json();
            setAvailableClasses(Array.isArray(classData.classes) ? classData.classes : []);
          }
        } else {
          setCodeVerified(false);
          setAvailableClasses([]);
        }
      } else {
        setCodeVerified(false);
        setAvailableClasses([]);
      }
    } catch {
      setCodeVerified(false);
      setAvailableClasses([]);
    } finally {
      setVerifyingCode(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loginIsAdmin) {
      if (!loginEmail || !loginPassword) {
        toast({ title: 'Erreur', description: 'Veuillez remplir votre email et mot de passe.', variant: 'destructive' });
        return;
      }
    } else {
      if (!loginInviteCode || !loginFullName || !loginPassword) {
        toast({ title: 'Erreur', description: 'Veuillez remplir tous les champs.', variant: 'destructive' });
        return;
      }
    }
    setLoginLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inviteCode: loginIsAdmin ? undefined : loginInviteCode.toUpperCase().trim(),
          email: loginIsAdmin ? loginEmail.trim() : undefined,
          isAdminLogin: loginIsAdmin,
          fullName: loginFullName.trim(),
          password: loginPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: 'Erreur de connexion', description: data.error || 'Identifiants incorrects.', variant: 'destructive' });
        return;
      }
      // Set user first, then set page
      setUser(data.user);
      const dashboardPage = roleDashboardMap[data.user.role as UserRole];
      setCurrentPage(dashboardPage);
      toast({ title: 'Connexion réussie', description: `Bienvenue, ${data.user.fullName} !` });
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de se connecter au serveur.', variant: 'destructive' });
    } finally {
      setLoginLoading(false);
    }
  };

  const handleCreateSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regAdminName || !regSchoolName || !regEmail || !regPassword || !regConfirmPassword) {
      toast({ title: 'Erreur', description: 'Veuillez remplir tous les champs.', variant: 'destructive' });
      return;
    }
    if (regPassword !== regConfirmPassword) {
      toast({ title: 'Erreur', description: 'Les mots de passe ne correspondent pas.', variant: 'destructive' });
      return;
    }
    if (regPassword.length < 4) {
      toast({ title: 'Erreur', description: 'Le mot de passe doit contenir au moins 4 caractères.', variant: 'destructive' });
      return;
    }
    setRegLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'create-school',
          fullName: regAdminName,
          schoolName: regSchoolName,
          email: regEmail,
          password: regPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Erreur d'inscription", description: data.error || "Une erreur s'est produite.", variant: 'destructive' });
        return;
      }
      setCreatedInviteCode(data.inviteCode);
      setUser(data.user);
      setCurrentPage('admin-dashboard');
      toast({ title: 'École créée !', description: `Votre code école: ${data.inviteCode}`, duration: 8000 });
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de se connecter au serveur.', variant: 'destructive' });
    } finally {
      setRegLoading(false);
    }
  };

  const handleJoinSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinInviteCode || !joinFullName || !joinPassword || !joinConfirmPassword || !joinRole) {
      toast({ title: 'Erreur', description: 'Veuillez remplir tous les champs obligatoires.', variant: 'destructive' });
      return;
    }
    if (joinPassword !== joinConfirmPassword) {
      toast({ title: 'Erreur', description: 'Les mots de passe ne correspondent pas.', variant: 'destructive' });
      return;
    }
    if (joinPassword.length < 4) {
      toast({ title: 'Erreur', description: 'Le mot de passe doit contenir au moins 4 caractères.', variant: 'destructive' });
      return;
    }
    if (joinRole === 'STUDENT' && joinClassIds.length === 0) {
      toast({ title: 'Erreur', description: 'Veuillez sélectionner au moins une classe.', variant: 'destructive' });
      return;
    }
    if (joinRole === 'PARENT' && !joinParentCode) {
      toast({ title: 'Erreur', description: 'Le code parent est obligatoire.', variant: 'destructive' });
      return;
    }
    setJoinLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'join-school',
          fullName: joinFullName.trim(),
          password: joinPassword,
          inviteCode: joinInviteCode.trim().toUpperCase(),
          role: joinRole,
          classIds: joinRole === 'STUDENT' ? joinClassIds : joinRole === 'TEACHER' ? joinClassIds : undefined,
          parentCode: joinRole === 'PARENT' ? joinParentCode.trim().toUpperCase() : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Erreur d'inscription", description: data.error || "Une erreur s'est produite.", variant: 'destructive' });
        return;
      }
      setUser(data.user);
      setCurrentPage(roleDashboardMap[joinRole]);
      toast({ title: 'Bienvenue !', description: `Compte créé avec succès.` });
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de se connecter au serveur.', variant: 'destructive' });
    } finally {
      setJoinLoading(false);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[10%] left-[60%] w-64 h-64 rounded-full bg-blue-100/40 animate-[pulse_4s_ease-in-out_infinite]" />
        <div className="absolute top-[60%] left-[30%] w-48 h-48 rounded-full bg-indigo-100/40 animate-[pulse_5s_ease-in-out_infinite_1s]" />
        <div className="absolute top-[80%] left-[70%] w-32 h-32 rounded-full bg-blue-200/30 animate-[pulse_3s_ease-in-out_infinite_0.5s]" />
      </div>

      {/* Left Branding Panel */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-[55%] bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white flex-col justify-between p-8 xl:p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-tl from-indigo-900/40 via-transparent to-blue-400/20 animate-gradient-bg" />
        <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-white/5 animate-[spin_30s_linear_infinite]" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-white/5 animate-[spin_25s_linear_infinite_reverse]" />
        <div className="absolute top-16 right-24 w-16 h-16 rounded-full bg-white/10 animate-float" />
        <div className="absolute bottom-32 right-16 w-10 h-10 rounded-full bg-white/8 animate-float-delayed" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <img src="/logo-gradeup.png" alt="GradeUp" className="w-14 h-14 rounded-xl object-contain drop-shadow-lg" />
            <div className="flex flex-col">
              <span className="text-2xl font-bold tracking-tight">GradeUp</span>
              <span className="text-xs text-white/50 font-medium tracking-wide">ELEVATE YOUR FUTURE</span>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex flex-col gap-8 max-w-lg">
          <div>
            <h1 className="text-4xl xl:text-5xl font-bold leading-tight mb-4">
              Gérez votre école<br />
              <span className="text-white/80">avec simplicité</span>
            </h1>
            <p className="text-lg text-white/70 leading-relaxed">
              La plateforme tout-en-un pour gérer les élèves, les notes, les paiements et bien plus encore.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10 hover:bg-white/15 transition-colors">
              <Shield className="w-6 h-6 mb-2 text-white/90" />
              <p className="text-sm font-medium text-white/90">Codes sécurisés</p>
              <p className="text-xs text-white/60">Parrainage unique</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10 hover:bg-white/15 transition-colors">
              <Users className="w-6 h-6 mb-2 text-white/90" />
              <p className="text-sm font-medium text-white/90">Multi-rôles</p>
              <p className="text-xs text-white/60">Admin, prof, élève, parent</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10 hover:bg-white/15 transition-colors">
              <Key className="w-6 h-6 mb-2 text-white/90" />
              <p className="text-sm font-medium text-white/90">Code parent</p>
              <p className="text-xs text-white/60">Liaison parent-élève</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10 hover:bg-white/15 transition-colors">
              <Sparkles className="w-6 h-6 mb-2 text-white/90" />
              <p className="text-sm font-medium text-white/90">IA Gradie</p>
              <p className="text-xs text-white/60">Assistant intelligent</p>
            </div>
          </div>
        </div>

        <div className="relative z-10 text-sm text-white/50">
          <div className="relative z-10">
            <p className="text-sm text-white/50">© GradeUp – Créé par Axion Labs Technologies</p>
            <div className="flex items-center gap-4 mt-3 flex-wrap">
              <a
                href="https://wa.me/243845072349"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-white/60 hover:text-white transition-colors text-sm"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                +243 845 072 349
              </a>
              <a
                href="https://instagram.com/axion_labs_technologies"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-white/60 hover:text-white transition-colors text-sm"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                </svg>
                @axion_labs_technologies
              </a>
              <a
                href="https://axionlabstechnologies.netlify.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-white/60 hover:text-white transition-colors text-sm"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                </svg>
                Site web
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Right Form Panel */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-8 lg:p-12 bg-background relative z-10">
        {/* Mobile branding */}
        <div className="lg:hidden flex items-center gap-3 mb-8">
          <img src="/logo-gradeup.png" alt="GradeUp" className="w-10 h-10 rounded-lg object-contain drop-shadow-lg" />
          <span className="text-xl font-bold text-foreground">GradeUp</span>
        </div>

        {/* Show created invite code banner */}
        {createdInviteCode && (
          <div className="w-full max-w-md mb-4 animate-scale-in">
            <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 text-center">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">Votre école a été créée !</p>
                <button onClick={() => setCreatedInviteCode('')} className="text-emerald-600 hover:text-emerald-800 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center justify-center gap-2 bg-white dark:bg-gray-900 rounded-lg p-3 border border-emerald-200 dark:border-emerald-700">
                <Key className="w-4 h-4 text-emerald-600" />
                <span className="text-lg font-bold tracking-wider text-emerald-700 dark:text-emerald-400">{createdInviteCode}</span>
                <button
                  onClick={() => copyCode(createdInviteCode)}
                  className="text-emerald-600 hover:text-emerald-800 dark:hover:text-emerald-300 transition-colors ml-2"
                >
                  {codeCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2">Partagez ce code pour que les membres rejoignent votre école</p>
            </div>
          </div>
        )}

        <div className="w-full max-w-md">
          <Card className="border-0 shadow-2xl shadow-blue-500/10 relative overflow-hidden animate-fade-in rounded-2xl">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-600" />

            <CardHeader className="text-center pb-2 pt-8">
              <img src="/logo-gradeup.png" alt="GradeUp" className="mx-auto w-20 h-20 object-contain mb-4 drop-shadow-lg" />
              <CardTitle className="text-2xl font-bold">Bienvenue</CardTitle>
              <CardDescription>
                Connectez-vous ou rejoignez une école
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-8">
              <Tabs defaultValue="login" className="w-full">
                <TabsList className="w-full grid grid-cols-2 mb-6">
                  <TabsTrigger value="login" className="transition-all duration-300">Connexion</TabsTrigger>
                  <TabsTrigger value="register" className="transition-all duration-300">Inscription</TabsTrigger>
                </TabsList>

                {/* ===== LOGIN TAB ===== */}
                <TabsContent value="login">
                  <div className="flex gap-2 mb-6">
                    <button
                      type="button"
                      onClick={() => setLoginIsAdmin(false)}
                      className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-all duration-200 border-2 ${
                        !loginIsAdmin
                          ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300'
                          : 'border-transparent bg-muted/50 text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      Utilisateur
                    </button>
                    <button
                      type="button"
                      onClick={() => setLoginIsAdmin(true)}
                      className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-all duration-200 border-2 ${
                        loginIsAdmin
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-300'
                          : 'border-transparent bg-muted/50 text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      Administrateur
                    </button>
                  </div>
                  <form onSubmit={handleLogin} className="space-y-4">
                    {!loginIsAdmin ? (
                      <div className="space-y-2 animate-in fade-in zoom-in-95 duration-200">
                        <Label htmlFor="login-code" className="flex items-center gap-2">
                          <Key className="w-3.5 h-3.5 text-blue-600" />
                          Code école
                        </Label>
                        <Input
                          id="login-code"
                          placeholder="ECOLE-XXXXXX"
                          value={loginInviteCode}
                          onChange={(e) => setLoginInviteCode(e.target.value.toUpperCase())}
                          className="h-11 rounded-xl font-mono tracking-wider"
                        />
                        <p className="text-xs text-muted-foreground">Le code fourni par votre administrateur</p>
                      </div>
                    ) : (
                      <div className="space-y-2 animate-in fade-in zoom-in-95 duration-200">
                        <Label htmlFor="login-email">Email de l&apos;école</Label>
                        <Input
                          id="login-email"
                          type="email"
                          placeholder="admin@ecole.com"
                          value={loginEmail}
                          onChange={(e) => setLoginEmail(e.target.value)}
                          className="h-11 rounded-xl"
                        />
                      </div>
                    )}
                    {!loginIsAdmin && (
                      <div className="space-y-2">
                        <Label htmlFor="login-name">Nom complet</Label>
                        <Input
                          id="login-name"
                          placeholder="Jean Dupont"
                          value={loginFullName}
                          onChange={(e) => setLoginFullName(e.target.value)}
                          className="h-11 rounded-xl"
                        />
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label htmlFor="login-password">Mot de passe</Label>
                      <div className="relative">
                        <Input
                          id="login-password"
                          type={showLoginPassword ? 'text' : 'password'}
                          placeholder="••••••••"
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          className="h-11 rounded-xl pr-10"
                        />
                        <button
                          type="button"
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          onClick={() => setShowLoginPassword(!showLoginPassword)}
                        >
                          {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <Button
                      type="submit"
                      className="w-full h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 hover:scale-[1.02] active:scale-[0.97] transition-all duration-200 shadow-lg shadow-blue-500/25"
                      size="lg"
                      disabled={loginLoading}
                    >
                      {loginLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          Connexion...
                        </>
                      ) : (
                        'Se connecter'
                      )}
                    </Button>
                  </form>
                </TabsContent>

                {/* ===== REGISTER TAB ===== */}
                <TabsContent value="register">
                  {/* Mode selector */}
                  <div className="flex gap-2 mb-6">
                    <button
                      type="button"
                      onClick={() => setRegMode('create')}
                      className={`flex-1 py-3 px-3 rounded-xl text-sm font-medium transition-all duration-200 border-2 ${
                        regMode === 'create'
                          ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300'
                          : 'border-transparent bg-muted/50 text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      <School className="w-5 h-5 mx-auto mb-1" />
                      Créer une école
                    </button>
                    <button
                      type="button"
                      onClick={() => setRegMode('join')}
                      className={`flex-1 py-3 px-3 rounded-xl text-sm font-medium transition-all duration-200 border-2 ${
                        regMode === 'join'
                          ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300'
                          : 'border-transparent bg-muted/50 text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      <BookOpen className="w-5 h-5 mx-auto mb-1" />
                      Rejoindre une école
                    </button>
                  </div>

                  {/* === CREATE SCHOOL FORM === */}
                  {regMode === 'create' && (
                    <form onSubmit={handleCreateSchool} className="space-y-4 animate-fade-in">
                      <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-xl p-3 mb-2">
                        <p className="text-xs text-blue-700 dark:text-blue-300">
                          Vous êtes administrateur ? Créez votre école et recevez un code de parrainage unique.
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="create-school-name">Nom de l&apos;école</Label>
                        <Input
                          id="create-school-name"
                          placeholder="Institut Sainte-Marie"
                          value={regSchoolName}
                          onChange={(e) => setRegSchoolName(e.target.value)}
                          className="h-11 rounded-xl"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="create-admin-name">Votre nom complet</Label>
                        <Input
                          id="create-admin-name"
                          placeholder="Directeur Mbeki"
                          value={regAdminName}
                          onChange={(e) => setRegAdminName(e.target.value)}
                          className="h-11 rounded-xl"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="create-email">Email</Label>
                        <Input
                          id="create-email"
                          type="email"
                          placeholder="admin@ecole.com"
                          value={regEmail}
                          onChange={(e) => setRegEmail(e.target.value)}
                          className="h-11 rounded-xl"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="create-password">Mot de passe</Label>
                        <div className="relative">
                          <Input
                            id="create-password"
                            type={showRegPassword ? 'text' : 'password'}
                            placeholder="••••••••"
                            value={regPassword}
                            onChange={(e) => setRegPassword(e.target.value)}
                            className="h-11 rounded-xl pr-10"
                          />
                          <button
                            type="button"
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                            onClick={() => setShowRegPassword(!showRegPassword)}
                          >
                            {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        <PasswordStrengthIndicator password={regPassword} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="create-confirm">Confirmer le mot de passe</Label>
                        <div className="relative">
                          <Input
                            id="create-confirm"
                            type={showRegConfirmPassword ? 'text' : 'password'}
                            placeholder="••••••••"
                            value={regConfirmPassword}
                            onChange={(e) => setRegConfirmPassword(e.target.value)}
                            className="h-11 rounded-xl pr-10"
                          />
                          <button
                            type="button"
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                            onClick={() => setShowRegConfirmPassword(!showRegConfirmPassword)}
                          >
                            {showRegConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                      <Button
                        type="submit"
                        className="w-full h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 hover:scale-[1.02] active:scale-[0.97] transition-all duration-200 shadow-lg shadow-blue-500/25"
                        size="lg"
                        disabled={regLoading}
                      >
                        {regLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            Création...
                          </>
                        ) : (
                          'Créer mon école'
                        )}
                      </Button>
                    </form>
                  )}

                  {/* === JOIN SCHOOL FORM === */}
                  {regMode === 'join' && (
                    <form onSubmit={handleJoinSchool} className="space-y-4 animate-fade-in">
                      <div className="space-y-2">
                        <Label htmlFor="join-code" className="flex items-center gap-2">
                          <Key className="w-3.5 h-3.5 text-blue-600" />
                          Code école
                        </Label>
                        <div className="relative">
                          <Input
                            id="join-code"
                            placeholder="ECOLE-XXXXXX"
                            value={joinInviteCode}
                            onChange={(e) => {
                              const val = e.target.value.toUpperCase();
                              setJoinInviteCode(val);
                              const code = val.trim();
                              if (code.length >= 8) {
                                verifyInviteCode(code);
                              } else {
                                setCodeVerified(false);
                                setAvailableClasses([]);
                              }
                            }}
                            className="h-11 rounded-xl font-mono tracking-wider pr-10"
                          />
                          {verifyingCode && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                            </div>
                          )}
                          {!verifyingCode && codeVerified && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                              <Check className="w-4 h-4 text-emerald-500" />
                            </div>
                          )}
                        </div>
                        {joinInviteCode && !codeVerified && joinInviteCode.trim().length >= 8 && (
                          <p className="text-xs text-red-500">Code invalide. Vérifiez avec votre administrateur.</p>
                        )}
                        <p className="text-xs text-muted-foreground">Le code fourni par votre administrateur</p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="join-name">Nom complet</Label>
                        <Input
                          id="join-name"
                          placeholder="Jean Dupont"
                          value={joinFullName}
                          onChange={(e) => setJoinFullName(e.target.value)}
                          className="h-11 rounded-xl"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Rôle</Label>
                        <div className="grid grid-cols-3 gap-2">
                          {(['STUDENT', 'TEACHER', 'PARENT'] as UserRole[]).map((r) => {
                            const Icon = roleIcons[r];
                            const isSelected = joinRole === r;
                            return (
                              <button
                                key={r}
                                type="button"
                                onClick={() => {
                                  setJoinRole(r);
                                  setJoinClassIds([]);
                                  setJoinParentCode('');
                                }}
                                className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl text-xs font-medium transition-all duration-200 border-2 ${
                                  isSelected
                                    ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300'
                                    : 'border-transparent bg-muted/50 text-muted-foreground hover:bg-muted'
                                }`}
                              >
                                <Icon className="w-5 h-5" />
                                {roleLabels[r]}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Student: Class selection */}
                      {joinRole === 'STUDENT' && (
                        <div className="space-y-2 animate-fade-in">
                          <Label>Classe <span className="text-red-500">*</span></Label>
                          {!codeVerified ? (
                            <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
                              Entrez un code école valide pour voir les classes disponibles.
                            </p>
                          ) : availableClasses.length > 0 ? (
                            <div className="grid gap-2 max-h-40 overflow-y-auto">
                              {availableClasses.map((cls) => (
                                <button
                                  key={cls.id}
                                  type="button"
                                  onClick={() => {
                                    setJoinClassIds((prev) =>
                                      prev.includes(cls.id) ? prev.filter((id) => id !== cls.id) : [cls.id]
                                    );
                                  }}
                                  className={`flex items-center justify-between p-3 rounded-xl text-sm transition-all duration-200 border-2 ${
                                    joinClassIds.includes(cls.id)
                                      ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300'
                                      : 'border-transparent bg-muted/50 text-muted-foreground hover:bg-muted'
                                  }`}
                                >
                                  <div className="flex items-center gap-2">
                                    <GraduationCap className="w-4 h-4" />
                                    <span>{cls.name}</span>
                                  </div>
                                  <Badge variant="outline" className="text-xs">{cls.level}</Badge>
                                </button>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
                              Aucune classe disponible dans cette école.
                            </p>
                          )}
                        </div>
                      )}

                      {/* Teacher: Class selection (multi) */}
                      {joinRole === 'TEACHER' && codeVerified && availableClasses.length > 0 && (
                        <div className="space-y-2 animate-fade-in">
                          <Label>Classes enseignées <span className="text-xs text-muted-foreground font-normal">(optionnel)</span></Label>
                          <div className="grid gap-2 max-h-40 overflow-y-auto">
                            {availableClasses.map((cls) => (
                              <button
                                key={cls.id}
                                type="button"
                                onClick={() => {
                                  setJoinClassIds((prev) =>
                                    prev.includes(cls.id) ? prev.filter((id) => id !== cls.id) : [...prev, cls.id]
                                  );
                                }}
                                className={`flex items-center justify-between p-3 rounded-xl text-sm transition-all duration-200 border-2 ${
                                  joinClassIds.includes(cls.id)
                                    ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300'
                                    : 'border-transparent bg-muted/50 text-muted-foreground hover:bg-muted'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <UserCheck className="w-4 h-4" />
                                  <span>{cls.name}</span>
                                </div>
                                <Badge variant="outline" className="text-xs">{cls.level}</Badge>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Parent: Parent code */}
                      {joinRole === 'PARENT' && (
                        <div className="space-y-2 animate-fade-in">
                          <Label htmlFor="join-parent-code" className="flex items-center gap-2">
                            <Key className="w-3.5 h-3.5 text-amber-600" />
                            Code parent <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            id="join-parent-code"
                            placeholder="P-XXXXXX"
                            value={joinParentCode}
                            onChange={(e) => setJoinParentCode(e.target.value.toUpperCase())}
                            className="h-11 rounded-xl font-mono tracking-wider"
                          />
                          <p className="text-xs text-muted-foreground">
                            Le code généré par votre enfant (élève) dans son profil
                          </p>
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label htmlFor="join-password">Mot de passe</Label>
                        <div className="relative">
                          <Input
                            id="join-password"
                            type={showJoinPassword ? 'text' : 'password'}
                            placeholder="••••••••"
                            value={joinPassword}
                            onChange={(e) => setJoinPassword(e.target.value)}
                            className="h-11 rounded-xl pr-10"
                          />
                          <button
                            type="button"
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                            onClick={() => setShowJoinPassword(!showJoinPassword)}
                          >
                            {showJoinPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        <PasswordStrengthIndicator password={joinPassword} />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="join-confirm">Confirmer le mot de passe</Label>
                        <div className="relative">
                          <Input
                            id="join-confirm"
                            type={showJoinConfirmPassword ? 'text' : 'password'}
                            placeholder="••••••••"
                            value={joinConfirmPassword}
                            onChange={(e) => setJoinConfirmPassword(e.target.value)}
                            className="h-11 rounded-xl pr-10"
                          />
                          <button
                            type="button"
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                            onClick={() => setShowJoinConfirmPassword(!showJoinConfirmPassword)}
                          >
                            {showJoinConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <Button
                        type="submit"
                        className="w-full h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 hover:scale-[1.02] active:scale-[0.97] transition-all duration-200 shadow-lg shadow-blue-500/25"
                        size="lg"
                        disabled={joinLoading}
                      >
                        {joinLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            Inscription...
                          </>
                        ) : (
                          `S'inscrire comme ${roleLabels[joinRole]}`
                        )}
                      </Button>

                      <button
                        type="button"
                        onClick={() => setRegMode('create')}
                        className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1 py-2"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        Créer une école à la place
                      </button>
                    </form>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* PWA Download Buttons */}
          <div className="mt-8 flex flex-col sm:flex-row gap-3 animate-fade-in">
            {(!isAppInstalled) && (
              <>
                <Button 
                  type="button"
                  variant="outline" 
                  className="flex-1 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm border-blue-200 dark:border-blue-900 hover:bg-blue-50 dark:hover:bg-blue-900/30"
                  onClick={async () => {
                    if (isInstallable) {
                      const success = await installPWA();
                      if (success) {
                        toast({ title: "Succès", description: "Installation en cours..." });
                      }
                    } else {
                      toast({
                        title: "Application déjà installée ou non supportée",
                        description: "Ouvrez le menu de votre navigateur (les 3 petits points) et cherchez 'Installer l'application' ou 'Ajouter à l'écran d'accueil'."
                      });
                    }
                  }}
                >
                  <Smartphone className="w-4 h-4 mr-2 text-green-600" />
                  Télécharger Android
                </Button>
                <Button 
                  type="button"
                  variant="outline" 
                  className="flex-1 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm border-blue-200 dark:border-blue-900 hover:bg-blue-50 dark:hover:bg-blue-900/30"
                  onClick={() => {
                    toast({
                      title: "Installation iOS",
                      description: "Apple ne permet pas l'installation automatique. Dans Safari, touchez l'icône Partager (carré avec une flèche) puis 'Sur l'écran d'accueil'."
                    });
                  }}
                >
                  <Apple className="w-4 h-4 mr-2 text-slate-700 dark:text-slate-300" />
                  Télécharger iOS
                </Button>
              </>
            )}
            {isAppInstalled && (
              <div className="w-full text-center py-2 bg-green-50/50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-400 text-sm flex items-center justify-center gap-2">
                <Check className="w-4 h-4" />
                Application installée
              </div>
            )}
          </div>

          <div className="pt-8 space-y-3">
            <p className="text-sm text-muted-foreground text-center">
              © GradeUp – Créé par Axion Labs Technologies
            </p>
            <div className="flex items-center justify-center gap-6 flex-wrap">
              <a
                href="https://wa.me/243845072349"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-muted-foreground hover:text-emerald-600 transition-colors text-sm"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                +243 845 072 349
              </a>
              <a
                href="https://instagram.com/axion_labs_technologies"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-muted-foreground hover:text-pink-600 transition-colors text-sm"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                </svg>
                @axion_labs_technologies
              </a>
              <a
                href="https://axionlabstechnologies.netlify.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-muted-foreground hover:text-blue-600 transition-colors text-sm"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                </svg>
                Site web
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
