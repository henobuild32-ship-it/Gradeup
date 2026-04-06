'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  User,
  Mail,
  Lock,
  School,
  Save,
  Eye,
  EyeOff,
  Shield,
  Building2,
  CheckCircle2,
  Loader2,
  LogOut,
} from 'lucide-react';

const roleLabels: Record<string, string> = {
  ADMIN: 'Administrateur',
  TEACHER: 'Professeur',
  STUDENT: 'Élève',
  PARENT: 'Parent',
};

export default function ProfilePage() {
  const { user, setUser, setCurrentPage } = useAppStore();
  const { toast } = useToast();

  const [name, setName] = useState(user?.fullName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [saving, setSaving] = useState(false);

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const [schoolName, setSchoolName] = useState(user?.school?.name || '');
  const [currency, setCurrency] = useState(user?.school?.currency || '');
  const [savingConfig, setSavingConfig] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.fullName);
      setEmail(user.email);
      if (user.school) {
        setSchoolName(user.school.name);
        setCurrency(user.school.currency);
      }
    }
  }, [user]);

  if (!user) return null;

  const initials = user.fullName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const handleLogout = () => {
    setUser(null);
    setCurrentPage('auth');
    toast({ title: 'Déconnexion', description: 'Vous avez été déconnecté.' });
  };

  const handleSaveProfile = async () => {
    if (!name.trim() || !email.trim()) {
      toast({ title: 'Erreur', description: 'Veuillez remplir tous les champs obligatoires.', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: name.trim(), email: email.trim() }),
      });

      if (!res.ok) {
        const err = await res.json();
        toast({ title: 'Erreur', description: err.error || 'Erreur lors de la mise à jour', variant: 'destructive' });
        return;
      }

      const updated = await res.json();
      if (updated.user) {
        setUser({ ...user, fullName: updated.user.fullName, email: updated.user.email });
      }
      toast({ title: 'Succès', description: 'Profil mis à jour avec succès !' });
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de se connecter au serveur.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      toast({ title: 'Erreur', description: 'Veuillez remplir tous les champs du mot de passe.', variant: 'destructive' });
      return;
    }
    if (newPassword.length < 4) {
      toast({ title: 'Erreur', description: 'Le nouveau mot de passe doit contenir au moins 4 caractères.', variant: 'destructive' });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: 'Erreur', description: 'La confirmation du mot de passe ne correspond pas.', variant: 'destructive' });
      return;
    }

    setSavingPassword(true);
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldPassword, newPassword }),
      });

      if (!res.ok) {
        const err = await res.json();
        toast({ title: 'Erreur', description: err.error || 'Erreur lors du changement de mot de passe', variant: 'destructive' });
        return;
      }

      toast({ title: 'Succès', description: 'Mot de passe modifié avec succès !' });
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de se connecter au serveur.', variant: 'destructive' });
    } finally {
      setSavingPassword(false);
    }
  };

  const handleSaveConfig = async () => {
    if (!schoolName.trim()) {
      toast({ title: 'Erreur', description: "Le nom de l'école est obligatoire.", variant: 'destructive' });
      return;
    }

    setSavingConfig(true);
    try {
      const res = await fetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schoolId: user.schoolId, name: schoolName.trim(), currency: currency.trim() }),
      });

      if (!res.ok) {
        const err = await res.json();
        toast({ title: 'Erreur', description: err.error || 'Erreur lors de la mise à jour', variant: 'destructive' });
        return;
      }

      const updated = await res.json();
      if (updated.school) {
        setUser({
          ...user,
          school: { ...user.school!, name: updated.school.name, currency: updated.school.currency },
        });
      }
      toast({ title: 'Succès', description: "Configuration de l'école mise à jour !" });
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de se connecter au serveur.', variant: 'destructive' });
    } finally {
      setSavingConfig(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      {/* User Info Card */}
      <Card className="overflow-hidden transition-all duration-300 hover:shadow-lg">
        <div className="bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20 ring-4 ring-white/30 shadow-lg">
                <AvatarFallback className="text-2xl bg-white/20 text-white font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-2xl font-bold">{user.fullName}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className="bg-white/20 text-white hover:bg-white/30 border-0">
                    <Shield className="h-3 w-3 mr-1" />
                    {roleLabels[user.role]}
                  </Badge>
                </div>
                <p className="text-blue-100 text-sm mt-1 flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" />
                  {user.email}
                </p>
              </div>
            </div>
            <Button
              onClick={handleLogout}
              variant="ghost"
              className="text-white/80 hover:text-white hover:bg-white/10 border border-white/20"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Déconnexion
            </Button>
          </div>
        </div>
      </Card>

      {/* School Info (all roles can see) */}
      {user.school && (
        <Card className="transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/30">
                <School className="h-4 w-4 text-blue-600" />
              </div>
              Informations de l&apos;école
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <Building2 className="h-5 w-5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-sm text-muted-foreground">Nom de l&apos;école</p>
                <p className="font-semibold">{user.school.name}</p>
              </div>
            </div>
            <Separator />
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-sm text-muted-foreground">Email de l&apos;école</p>
                <p className="font-semibold">{user.school.email}</p>
              </div>
            </div>
            <Separator />
            <div className="flex items-center gap-3">
              <School className="h-5 w-5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-sm text-muted-foreground">Devise</p>
                <p className="font-semibold">{user.school.currency || 'USD'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Profile Form */}
      <Card className="transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/30">
              <User className="h-4 w-4 text-blue-600" />
            </div>
            Modifier le profil
          </CardTitle>
          <CardDescription>Mettez à jour vos informations personnelles</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="profile-name">Nom complet</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="profile-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pl-9"
                  placeholder="Nom complet"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-email">Adresse e-mail</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="profile-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9"
                  placeholder="email@exemple.com"
                />
              </div>
            </div>
          </div>
          <Button
            onClick={handleSaveProfile}
            disabled={saving}
            className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white shadow-md shadow-blue-500/20 transition-all duration-200 hover:scale-[1.02] active:scale-[0.97]"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
          </Button>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card className="transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/30">
              <Lock className="h-4 w-4 text-amber-600" />
            </div>
            Changer le mot de passe
          </CardTitle>
          <CardDescription>Modifiez votre mot de passe de connexion</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="old-password">Ancien mot de passe</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="old-password"
                type={showOld ? 'text' : 'password'}
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                className="pl-9 pr-10"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowOld(!showOld)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showOld ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">Nouveau mot de passe</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="new-password"
                  type={showNew ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="pl-9 pr-10"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirmer le mot de passe</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirm-password"
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-9 pr-10"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 h-4" />}
                </button>
              </div>
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  Les mots de passe ne correspondent pas
                </p>
              )}
              {confirmPassword && newPassword === confirmPassword && (
                <p className="text-xs text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Correspond
                </p>
              )}
            </div>
          </div>
          <Button
            onClick={handleChangePassword}
            disabled={savingPassword}
            variant="outline"
            className="border-amber-200 text-amber-700 hover:bg-amber-50 transition-all duration-200 hover:scale-[1.02] active:scale-[0.97]"
          >
            {savingPassword ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Lock className="h-4 w-4 mr-2" />
            )}
            {savingPassword ? 'Modification...' : 'Changer le mot de passe'}
          </Button>
        </CardContent>
      </Card>

      {/* Admin Only: School Config */}
      {user.role === 'ADMIN' && (
        <Card className="transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 border-blue-200 dark:border-blue-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30">
                <Building2 className="h-4 w-4 text-emerald-600" />
              </div>
              Configuration de l&apos;école
              <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 ml-2">Admin</Badge>
            </CardTitle>
            <CardDescription>Modifier les paramètres généraux de l&apos;école</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="school-name">Nom de l&apos;école</Label>
                <div className="relative">
                  <School className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="school-name"
                    value={schoolName}
                    onChange={(e) => setSchoolName(e.target.value)}
                    className="pl-9"
                    placeholder="Nom de l'école"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Devise</Label>
                <div className="relative">
                  <School className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="currency"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="pl-9"
                    placeholder="USD, EUR, XOF..."
                  />
                </div>
              </div>
            </div>
            <Button
              onClick={handleSaveConfig}
              disabled={savingConfig}
              className="bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white shadow-md shadow-emerald-500/20 transition-all duration-200 hover:scale-[1.02] active:scale-[0.97]"
            >
              {savingConfig ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {savingConfig ? 'Enregistrement...' : 'Enregistrer la configuration'}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
