'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAppStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Users,
  GraduationCap,
  UserCheck,
} from 'lucide-react';
import { toast } from 'sonner';

interface UserItem {
  id: string;
  fullName: string;
  email: string;
  role: string;
  classEnrollments?: Array<{ class: { id: string; name: string } }>;
}

interface ClassItem {
  id: string;
  name: string;
}

const roleLabels: Record<string, string> = {
  ADMIN: 'Administrateur',
  TEACHER: 'Professeur',
  STUDENT: 'Élève',
  PARENT: 'Parent',
};

const roleColors: Record<string, string> = {
  ADMIN: 'bg-red-100 text-red-700',
  TEACHER: 'bg-green-100 text-green-700',
  STUDENT: 'bg-blue-100 text-blue-700',
  PARENT: 'bg-purple-100 text-purple-700',
};

export default function AdminUsers() {
  const { user } = useAppStore();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [parents, setParents] = useState<{ id: string; fullName: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [deletingUser, setDeletingUser] = useState<UserItem | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRole, setFormRole] = useState('STUDENT');
  const [formClassId, setFormClassId] = useState('');
  const [formParentId, setFormParentId] = useState('');

  const fetchUsers = useCallback(async () => {
    try {
      let url = `/api/users?schoolId=${user?.schoolId}`;
      if (activeTab !== 'ALL') url += `&role=${activeTab}`;
      const res = await fetch(url);
      const data = await res.json();
      setUsers(data.users || []);
    } catch {
      toast.error('Erreur lors du chargement des utilisateurs');
    } finally {
      setLoading(false);
    }
  }, [user?.schoolId, activeTab]);

  const fetchClasses = useCallback(async () => {
    try {
      const res = await fetch(`/api/classes?schoolId=${user?.schoolId}`);
      const data = await res.json();
      setClasses(data.classes || []);
    } catch {
      console.error('Failed to fetch classes');
    }
  }, [user?.schoolId]);

  const fetchParents = useCallback(async () => {
    try {
      const res = await fetch(`/api/users?schoolId=${user?.schoolId}&role=PARENT`);
      const data = await res.json();
      setParents(data.users || []);
    } catch {
      console.error('Failed to fetch parents');
    }
  }, [user?.schoolId]);

  useEffect(() => {
    if (user?.schoolId) {
      setLoading(true);
      fetchUsers();
      fetchClasses();
      fetchParents();
    }
  }, [fetchUsers, fetchClasses, fetchParents, user?.schoolId]);

  const resetForm = () => {
    setFormName('');
    setFormEmail('');
    setFormPassword('');
    setFormRole('STUDENT');
    setFormClassId('');
    setFormParentId('');
    setEditingUser(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (u: UserItem) => {
    setEditingUser(u);
    setFormName(u.fullName);
    setFormEmail(u.email);
    setFormPassword('');
    setFormRole(u.role);
    setFormClassId(u.classEnrollments?.[0]?.class?.id || '');
    setFormParentId('');
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formName.trim()) {
      toast.error('Le nom complet est requis');
      return;
    }
    if (!editingUser && !formPassword.trim()) {
      toast.error('Le mot de passe est requis');
      return;
    }

    setSubmitting(true);
    try {
      if (editingUser) {
        const body: Record<string, unknown> = {
          schoolId: user?.schoolId,
          fullName: formName,
          email: formEmail,
          role: formRole,
        };
        if (formPassword) body.password = formPassword;

        const res = await fetch(`/api/users/${editingUser.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erreur');
        toast.success('Utilisateur modifié avec succès');
      } else {
        const body: Record<string, unknown> = {
          schoolId: user?.schoolId,
          fullName: formName,
          email: formEmail,
          password: formPassword,
          role: formRole,
        };
        if (formRole === 'STUDENT' && formClassId) body.classId = formClassId;
        if (formRole === 'STUDENT' && formParentId) body.parentId = formParentId;

        const res = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erreur');
        toast.success('Utilisateur créé avec succès');
      }

      setDialogOpen(false);
      resetForm();
      fetchUsers();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Erreur lors de l\'opération');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingUser) return;
    try {
      const res = await fetch(`/api/users/${deletingUser.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur');
      toast.success('Utilisateur supprimé avec succès');
      setDeleteDialogOpen(false);
      setDeletingUser(null);
      fetchUsers();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la suppression');
    }
  };

  const filteredUsers = users.filter((u) =>
    u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des utilisateurs</h1>
          <p className="text-muted-foreground">Gérez les élèves, professeurs et parents</p>
        </div>
        <Button onClick={openCreateDialog} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          Ajouter
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="ALL">
            <Users className="h-4 w-4 mr-1" />
            Tous
          </TabsTrigger>
          <TabsTrigger value="STUDENT">
            <UserCheck className="h-4 w-4 mr-1" />
            Élèves
          </TabsTrigger>
          <TabsTrigger value="TEACHER">
            <GraduationCap className="h-4 w-4 mr-1" />
            Professeurs
          </TabsTrigger>
          <TabsTrigger value="PARENT">
            <Users className="h-4 w-4 mr-1" />
            Parents
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un utilisateur..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">Aucun utilisateur trouvé</p>
            </div>
          ) : (
            <ScrollArea className="max-h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Rôle</TableHead>
                    <TableHead>Classe</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.fullName}</TableCell>
                      <TableCell className="text-muted-foreground">{u.email || '—'}</TableCell>
                      <TableCell>
                        <Badge className={roleColors[u.role] || ''} variant="secondary">
                          {roleLabels[u.role] || u.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {u.classEnrollments && u.classEnrollments.length > 0
                          ? u.classEnrollments.map((e) => e.class.name).join(', ')
                          : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(u)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setDeletingUser(u);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingUser ? 'Modifier l\'utilisateur' : 'Ajouter un utilisateur'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="form-name">Nom complet *</Label>
              <Input
                id="form-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Ex: Jean Dupont"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="form-email">Email</Label>
              <Input
                id="form-email"
                type="email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                placeholder="jean@exemple.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="form-password">
                Mot de passe {editingUser ? '(laisser vide pour ne pas modifier)' : '*'}
              </Label>
              <Input
                id="form-password"
                type="password"
                value={formPassword}
                onChange={(e) => setFormPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="form-role">Rôle *</Label>
              <Select value={formRole} onValueChange={setFormRole}>
                <SelectTrigger id="form-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="STUDENT">Élève</SelectItem>
                  <SelectItem value="TEACHER">Professeur</SelectItem>
                  <SelectItem value="PARENT">Parent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {formRole === 'STUDENT' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="form-class">Classe *</Label>
                  <Select value={formClassId} onValueChange={setFormClassId}>
                    <SelectTrigger id="form-class">
                      <SelectValue placeholder="Sélectionner une classe" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="form-parent">Parent (optionnel)</Label>
                  <Select value={formParentId} onValueChange={setFormParentId}>
                    <SelectTrigger id="form-parent">
                      <SelectValue placeholder="Sélectionner un parent" />
                    </SelectTrigger>
                    <SelectContent>
                      {parents.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.fullName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>
              Annuler
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {submitting ? 'Enregistrement...' : editingUser ? 'Modifier' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer {deletingUser?.fullName} ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
