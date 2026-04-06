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
  GraduationCap,
  Loader2,
  Eye,
  EyeOff,
  Shield,
  Sparkles,
  Users,
  BookOpen,
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
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left Branding Panel */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-[55%] bg-gradient-to-br from-primary via-primary/90 to-primary/80 text-white flex-col justify-between p-8 xl:p-12 relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-white/5" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-white/5" />
        <div className="absolute top-1/2 left-1/3 w-48 h-48 rounded-full bg-white/5" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <GraduationCap className="w-8 h-8 text-white" />
            </div>
            <span className="text-2xl font-bold tracking-tight">GradeUp</span>
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
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
              <Shield className="w-6 h-6 mb-2 text-white/90" />
              <p className="text-sm font-medium text-white/90">Sécurisé</p>
              <p className="text-xs text-white/60">Données protégées</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
              <Users className="w-6 h-6 mb-2 text-white/90" />
              <p className="text-sm font-medium text-white/90">Multi-rôles</p>
              <p className="text-xs text-white/60">Admin, prof, élève, parent</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
              <BookOpen className="w-6 h-6 mb-2 text-white/90" />
              <p className="text-sm font-medium text-white/90">Cours & Notes</p>
              <p className="text-xs text-white/60">Gestion complète</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
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
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-8 lg:p-12 bg-background">
        {/* Mobile branding */}
        <div className="lg:hidden flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center">
            <GraduationCap className="w-6 h-6" />
          </div>
          <span className="text-xl font-bold text-foreground">GradeUp</span>
        </div>

        <div className="w-full max-w-md">
          <Card className="border-0 shadow-lg">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-2xl font-bold">Bienvenue</CardTitle>
              <CardDescription>
                Connectez-vous ou créez votre école
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="login" className="w-full">
                <TabsList className="w-full grid grid-cols-2 mb-6">
                  <TabsTrigger value="login">Connexion</TabsTrigger>
                  <TabsTrigger value="register">Inscription</TabsTrigger>
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
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="login-school">Nom de l&apos;école</Label>
                      <Input
                        id="login-school"
                        placeholder="École Excellence"
                        value={loginSchoolName}
                        onChange={(e) => setLoginSchoolName(e.target.value)}
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
                        <SelectTrigger className="w-full" id="login-role">
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
                    <Button type="submit" className="w-full" size="lg" disabled={loginLoading}>
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
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reg-school">Nom de l&apos;école</Label>
                      <Input
                        id="reg-school"
                        placeholder="École Excellence"
                        value={regSchoolName}
                        onChange={(e) => setRegSchoolName(e.target.value)}
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
                    <Button type="submit" className="w-full" size="lg" disabled={regLoading}>
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
