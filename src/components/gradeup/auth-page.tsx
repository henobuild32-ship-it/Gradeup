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
import {
  Loader2,
  Eye,
  EyeOff,
  Shield,
  Sparkles,
  Users,
  BookOpen,
  ArrowLeft,
} from 'lucide-react';

const roleDashboardMap: Record<UserRole, PageView> = {
  ADMIN: 'admin-dashboard',
  TEACHER: 'teacher-dashboard',
  STUDENT: 'student-dashboard',
  PARENT: 'parent-dashboard',
};

export default function AuthPage() {
  const { setUser, setCurrentPage } = useAppStore();
  const { toast } = useToast();

  // Login state
  const [loginFullName, setLoginFullName] = useState('');
  const [loginSchoolName, setLoginSchoolName] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginRole, setLoginRole] = useState<UserRole>('STUDENT');
  const [loginLoading, setLoginLoading] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Register state
  const [regFullName, setRegFullName] = useState('');
  const [regSchoolName, setRegSchoolName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regLoading, setRegLoading] = useState(false);
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);
  const [activeTab, setActiveTab] = useState('login');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginFullName || !loginSchoolName || !loginPassword || !loginRole) {
      toast({ title: 'Erreur', description: 'Veuillez remplir tous les champs.', variant: 'destructive' });
      return;
    }
    setLoginLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: loginFullName,
          schoolName: loginSchoolName,
          password: loginPassword,
          role: loginRole,
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

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regFullName || !regSchoolName || !regEmail || !regPassword || !regConfirmPassword) {
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
          fullName: regFullName,
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
      // Auto-login after registration
      const loginRes = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: regFullName,
          schoolName: regSchoolName,
          password: regPassword,
          role: 'ADMIN',
        }),
      });
      const loginData = await loginRes.json();
      if (loginRes.ok && loginData.user) {
        setUser(loginData.user);
        setCurrentPage('admin-dashboard');
        toast({ title: 'École créée !', description: `Bienvenue dans GradeUp, ${loginData.user.fullName} !` });
      } else {
        setUser(data.user);
        setCurrentPage('admin-dashboard');
        toast({ title: 'École créée !', description: 'Veuillez vous connecter.' });
      }
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de se connecter au serveur.', variant: 'destructive' });
    } finally {
      setRegLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row relative overflow-hidden">
      {/* Animated background dots */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[10%] left-[60%] w-64 h-64 rounded-full bg-blue-100/40 animate-[pulse_4s_ease-in-out_infinite]" />
        <div className="absolute top-[60%] left-[30%] w-48 h-48 rounded-full bg-indigo-100/40 animate-[pulse_5s_ease-in-out_infinite_1s]" />
        <div className="absolute top-[80%] left-[70%] w-32 h-32 rounded-full bg-blue-200/30 animate-[pulse_3s_ease-in-out_infinite_0.5s]" />
        <div className="absolute top-[20%] left-[80%] w-20 h-20 rounded-full bg-indigo-200/30 animate-[pulse_6s_ease-in-out_infinite_2s]" />
        <div className="absolute top-[40%] left-[10%] w-40 h-40 rounded-full bg-blue-50/50 animate-[pulse_7s_ease-in-out_infinite]" />
      </div>

      {/* Left Branding Panel */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-[55%] bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white flex-col justify-between p-8 xl:p-12 relative overflow-hidden">
        {/* Animated gradient shift overlay */}
        <div className="absolute inset-0 bg-gradient-to-tl from-indigo-900/40 via-transparent to-blue-400/20 animate-gradient-bg" />
        
        {/* Decorative circles */}
        <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-white/5 animate-[spin_30s_linear_infinite]" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-white/5 animate-[spin_25s_linear_infinite_reverse]" />
        <div className="absolute top-1/2 left-1/3 w-48 h-48 rounded-full bg-white/5 animate-[spin_20s_linear_infinite]" />

        {/* Floating decorative shapes */}
        <div className="absolute top-16 right-24 w-16 h-16 rounded-full bg-white/10 animate-float" />
        <div className="absolute bottom-32 right-16 w-10 h-10 rounded-full bg-white/8 animate-float-delayed" />
        <div className="absolute top-1/2 right-48 w-6 h-6 rounded-full bg-white/12 animate-float" />

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
              <p className="text-sm font-medium text-white/90">Sécurisé</p>
              <p className="text-xs text-white/60">Données protégées</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10 hover:bg-white/15 transition-colors">
              <Users className="w-6 h-6 mb-2 text-white/90" />
              <p className="text-sm font-medium text-white/90">Multi-rôles</p>
              <p className="text-xs text-white/60">Admin, prof, élève, parent</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10 hover:bg-white/15 transition-colors">
              <BookOpen className="w-6 h-6 mb-2 text-white/90" />
              <p className="text-sm font-medium text-white/90">Cours & Notes</p>
              <p className="text-xs text-white/60">Gestion complète</p>
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

        <div className="w-full max-w-md">
          <Card className="border-0 shadow-2xl shadow-blue-500/10 relative overflow-hidden animate-fade-in rounded-2xl">
            {/* Gradient border effect */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-600" />
            
            <CardHeader className="text-center pb-2 pt-8">
              <img src="/logo-gradeup.png" alt="GradeUp" className="mx-auto w-20 h-20 object-contain mb-4 drop-shadow-lg" />
              <CardTitle className="text-2xl font-bold">Bienvenue</CardTitle>
              <CardDescription>
                Connectez-vous ou créez votre école
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-8">
              <Tabs defaultValue="login" value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="w-full grid grid-cols-2 mb-6">
                  <TabsTrigger value="login" className="transition-all duration-500">Connexion</TabsTrigger>
                  <TabsTrigger value="register" className="transition-all duration-500">Inscription</TabsTrigger>
                </TabsList>

                {/* Login Tab */}
                <TabsContent value="login">
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-name">Nom complet</Label>
                      <Input
                        id="login-name"
                        placeholder="Jean Dupont"
                        value={loginFullName}
                        onChange={(e) => setLoginFullName(e.target.value)}
                        className="h-11 focus-visible:ring-2 focus-visible:ring-blue-500/30 focus-visible:ring-offset-2 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 rounded-xl"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="login-school">Nom de l&apos;école</Label>
                      <Input
                        id="login-school"
                        placeholder="École Excellence"
                        value={loginSchoolName}
                        onChange={(e) => setLoginSchoolName(e.target.value)}
                        className="h-11 focus-visible:ring-2 focus-visible:ring-blue-500/30 focus-visible:ring-offset-2 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 rounded-xl"
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
                          className="h-11 focus-visible:ring-2 focus-visible:ring-blue-500/30 focus-visible:ring-offset-2 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 rounded-xl"
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
                    <div className="space-y-2">
                      <Label htmlFor="login-role">Type de compte</Label>
                      <Select value={loginRole} onValueChange={(v) => setLoginRole(v as UserRole)}>
                        <SelectTrigger className="w-full h-11 focus-visible:ring-2 focus-visible:ring-blue-500/30 focus-visible:ring-offset-2 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 rounded-xl" id="login-role">
                          <SelectValue placeholder="Sélectionner..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="STUDENT">Élève</SelectItem>
                          <SelectItem value="TEACHER">Professeur</SelectItem>
                          <SelectItem value="ADMIN">Admin</SelectItem>
                          <SelectItem value="PARENT">Parent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button type="submit" className="w-full h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 hover:scale-[1.02] hover:brightness-110 active:scale-[0.97] transition-all duration-200 shadow-lg shadow-blue-500/25" size="lg" disabled={loginLoading}>
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

                {/* Register Tab */}
                <TabsContent value="register">
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="reg-name">Nom complet</Label>
                      <Input
                        id="reg-name"
                        placeholder="Jean Dupont"
                        value={regFullName}
                        onChange={(e) => setRegFullName(e.target.value)}
                        className="h-11 focus-visible:ring-2 focus-visible:ring-blue-500/30 focus-visible:ring-offset-2 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 rounded-xl"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reg-school">Nom de l&apos;école</Label>
                      <Input
                        id="reg-school"
                        placeholder="École Excellence"
                        value={regSchoolName}
                        onChange={(e) => setRegSchoolName(e.target.value)}
                        className="h-11 focus-visible:ring-2 focus-visible:ring-blue-500/30 focus-visible:ring-offset-2 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 rounded-xl"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reg-email">Email</Label>
                      <Input
                        id="reg-email"
                        type="email"
                        placeholder="admin@ecole.com"
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        className="h-11 focus-visible:ring-2 focus-visible:ring-blue-500/30 focus-visible:ring-offset-2 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 rounded-xl"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reg-password">Mot de passe</Label>
                      <div className="relative">
                        <Input
                          id="reg-password"
                          type={showRegPassword ? 'text' : 'password'}
                          placeholder="••••••••"
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          className="h-11 focus-visible:ring-2 focus-visible:ring-blue-500/30 focus-visible:ring-offset-2 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 rounded-xl"
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
                      <Label htmlFor="reg-confirm-password">Confirmer mot de passe</Label>
                      <div className="relative">
                        <Input
                          id="reg-confirm-password"
                          type={showRegConfirmPassword ? 'text' : 'password'}
                          placeholder="••••••••"
                          value={regConfirmPassword}
                          onChange={(e) => setRegConfirmPassword(e.target.value)}
                          className="h-11 focus-visible:ring-2 focus-visible:ring-blue-500/30 focus-visible:ring-offset-2 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 rounded-xl"
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
                    <Button type="submit" className="w-full h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 hover:scale-[1.02] hover:brightness-110 active:scale-[0.97] transition-all duration-200 shadow-lg shadow-blue-500/25" size="lg" disabled={regLoading}>
                      {regLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Création...
                        </>
                      ) : (
                        'Créer mon école'
                      )}
                    </Button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('login')}
                      className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1 py-2"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      Retour à la connexion
                    </button>
                  </form>
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
