'use client';

import React, { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { useToast } from '@/hooks/use-toast';
import type { UserRole, PageView } from '@/lib/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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

export default function AuthPage() {
  const { setUser, setCurrentPage } = useAppStore();
  const { toast } = useToast();

  // Login state
  const [loginInviteCode, setLoginInviteCode] = useState('');
  const [loginFullName, setLoginFullName] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);

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

  // Available classes (fetched when invite code changes)
  const [availableClasses, setAvailableClasses] = useState<{ id: string; name: string; level: string }[]>([]);
  const [codeVerified, setCodeVerified] = useState(false);

  // Created invite code display
  const [createdInviteCode, setCreatedInviteCode] = useState('');
  const [codeCopied, setCodeCopied] = useState(false);

  // Fetch classes for an invite code
  const fetchClasses = async (code: string) => {
    if (!code || code.length < 8) {
      setAvailableClasses([]);
      setCodeVerified(false);
      return;
    }
    try {
      const res = await fetch('/api/classes', {
        headers: { 'X-School-Invite': code },
      });
      // Try to find school by checking if code is valid via invite-code
      const checkRes = await fetch('/api/config?inviteCode=' + code);
      if (checkRes.ok) {
        const data = await checkRes.json();
        if (data.school) {
          setCodeVerified(true);
          // Fetch classes for this school
          const classRes = await fetch(`/api/classes?schoolId=${data.school.id}`);
          if (classRes.ok) {
            const classData = await classRes.json();
            setAvailableClasses(classData.classes || []);
          }
        } else {
          setCodeVerified(false);
          setAvailableClasses([]);
        }
      }
    } catch {
      // Try fetching classes via the config endpoint
      try {
        const res = await fetch(`/api/config?inviteCode=${code}`);
        const data = await res.json();
        if (data.school) {
          setCodeVerified(true);
          const classRes = await fetch(`/api/classes?schoolId=${data.school.id}`);
          if (classRes.ok) {
            const classData = await classRes.json();
            setAvailableClasses(classData.classes || []);
          }
        }
      } catch {
        setCodeVerified(false);
        setAvailableClasses([]);
      }
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginInviteCode || !loginFullName || !loginPassword) {
      toast({ title: 'Erreur', description: 'Veuillez remplir tous les champs.', variant: 'destructive' });
      return;
    }
    setLoginLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inviteCode: loginInviteCode.toUpperCase(),
          fullName: loginFullName,
          password: loginPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: 'Erreur de connexion', description: data.error || 'Identifiants incorrects.', variant: 'destructive' });
        return;
      }
      setUser(data.user);
      setCurrentPage(roleDashboardMap[data.user.role as UserRole]);
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
          fullName: joinFullName,
          password: joinPassword,
          inviteCode: joinInviteCode.toUpperCase(),
          role: joinRole,
          classIds: joinRole === 'STUDENT' ? joinClassIds : joinRole === 'TEACHER' ? joinClassIds : undefined,
          parentCode: joinRole === 'PARENT' ? joinParentCode.toUpperCase() : undefined,
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
          © GradeUp – Créé par Axions Labs
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
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
              <p className="text-sm font-medium text-emerald-800 mb-2">🏆 Votre école a été créée !</p>
              <div className="flex items-center justify-center gap-2 bg-white rounded-lg p-3 border border-emerald-200">
                <Key className="w-4 h-4 text-emerald-600" />
                <span className="text-lg font-bold tracking-wider text-emerald-700">{createdInviteCode}</span>
                <button
                  onClick={() => copyCode(createdInviteCode)}
                  className="text-emerald-600 hover:text-emerald-800 transition-colors"
                >
                  {codeCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-emerald-600 mt-2">Partagez ce code pour que les membres rejoignent votre école</p>
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
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
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
                    <Button type="submit" className="w-full h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 hover:scale-[1.02] active:scale-[0.97] transition-all duration-200 shadow-lg shadow-blue-500/25" size="lg" disabled={loginLoading}>
                      {loginLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
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
                          🏫 Vous êtes administrateur ? Créez votre école et recevez un code de parrainage unique.
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
                      <Button type="submit" className="w-full h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 hover:scale-[1.02] active:scale-[0.97] transition-all duration-200 shadow-lg shadow-blue-500/25" size="lg" disabled={regLoading}>
                        {regLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
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
                              const code = e.target.value.toUpperCase();
                              setJoinInviteCode(code);
                              if (code.length >= 12) {
                                fetchClasses(code);
                              }
                            }}
                            className="h-11 rounded-xl font-mono tracking-wider pr-10"
                          />
                          {codeVerified && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                              <Check className="w-4 h-4 text-emerald-500" />
                            </div>
                          )}
                        </div>
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
                          {availableClasses.length > 0 ? (
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
                              Entrez un code école valide pour voir les classes disponibles.
                            </p>
                          )}
                        </div>
                      )}

                      {/* Teacher: Class selection (multi) */}
                      {joinRole === 'TEACHER' && availableClasses.length > 0 && (
                        <div className="space-y-2 animate-fade-in">
                          <Label>Classes enseignées</Label>
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

                      <Button type="submit" className="w-full h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 hover:scale-[1.02] active:scale-[0.97] transition-all duration-200 shadow-lg shadow-blue-500/25" size="lg" disabled={joinLoading}>
                        {joinLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
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

          <p className="text-center text-xs text-muted-foreground mt-6">
            © GradeUp – Créé par Axions Labs
          </p>
        </div>
      </div>
    </div>
  );
}
