'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAppStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
  Plus,
  Pencil,
  Trash2,
  BookOpen,
  Users,
  GraduationCap,
} from 'lucide-react';
import { toast } from 'sonner';

interface ClassItem {
  id: string;
  name: string;
  level: string;
  fees: number;
  _count?: {
    enrollments: number;
    courses: number;
  };
}

const levelColors: Record<string, string> = {
  Maternelle: 'bg-pink-100 text-pink-700 border-pink-200',
  Primaire: 'bg-blue-100 text-blue-700 border-blue-200',
  Secondaire: 'bg-amber-100 text-amber-700 border-amber-200',
};

const levelIcons: Record<string, typeof GraduationCap> = {
  Maternelle: BookOpen,
  Primaire: GraduationCap,
  Secondaire: BookOpen,
};

export default function AdminClasses() {
  const { user } = useAppStore();
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassItem | null>(null);
  const [deletingClass, setDeletingClass] = useState<ClassItem | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [formName, setFormName] = useState('');
  const [formLevel, setFormLevel] = useState('Primaire');
  const [formFees, setFormFees] = useState('0');

  const fetchClasses = useCallback(async () => {
    try {
      const res = await fetch(`/api/classes?schoolId=${user?.schoolId}`);
      const data = await res.json();
      setClasses(data.classes || []);
    } catch {
      toast.error('Erreur lors du chargement des classes');
    } finally {
      setLoading(false);
    }
  }, [user?.schoolId]);

  useEffect(() => {
    if (user?.schoolId) {
      fetchClasses();
    }
  }, [fetchClasses, user?.schoolId]);

  const resetForm = () => {
    setFormName('');
    setFormLevel('Primaire');
    setFormFees('0');
    setEditingClass(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (c: ClassItem) => {
    setEditingClass(c);
    setFormName(c.name);
    setFormLevel(c.level);
    setFormFees(String(c.fees));
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formName.trim()) {
      toast.error('Le nom de la classe est requis');
      return;
    }

    setSubmitting(true);
    try {
      if (editingClass) {
        const res = await fetch(`/api/classes/${editingClass.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            schoolId: user?.schoolId,
            name: formName,
            level: formLevel,
            fees: parseFloat(formFees) || 0,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erreur');
        toast.success('Classe modifiée avec succès');
      } else {
        const res = await fetch('/api/classes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            schoolId: user?.schoolId,
            name: formName,
            level: formLevel,
            fees: parseFloat(formFees) || 0,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erreur');
        toast.success('Classe créée avec succès');
      }

      setDialogOpen(false);
      resetForm();
      fetchClasses();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Erreur lors de l\'opération');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingClass) return;
    try {
      const res = await fetch(`/api/classes/${deletingClass.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur');
      toast.success('Classe supprimée avec succès');
      setDeleteDialogOpen(false);
      setDeletingClass(null);
      fetchClasses();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la suppression');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des classes</h1>
          <p className="text-muted-foreground">Créez et gérez les classes de votre école</p>
        </div>
        <Button onClick={openCreateDialog} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          Créer une classe
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      ) : classes.length === 0 ? (
        <div className="text-center py-16">
          <BookOpen className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-1">Aucune classe</h3>
          <p className="text-muted-foreground mb-4">Commencez par créer votre première classe</p>
          <Button onClick={openCreateDialog} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-2" />
            Créer une classe
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {classes.map((c) => {
            const LevelIcon = levelIcons[c.level] || BookOpen;
            return (
              <Card key={c.id} className="relative group">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-xl ${levelColors[c.level]?.split(' ')[0] || 'bg-gray-100'}`}>
                        <LevelIcon className={`h-5 w-5 ${levelColors[c.level]?.split(' ')[1] || 'text-gray-600'}`} />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{c.name}</CardTitle>
                        <Badge
                          variant="outline"
                          className={`mt-1 ${levelColors[c.level] || ''}`}
                        >
                          {c.level}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEditDialog(c)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => {
                          setDeletingClass(c);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        <Users className="h-4 w-4" />
                        Élèves
                      </span>
                      <span className="font-semibold">{c._count?.enrollments || 0}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        <GraduationCap className="h-4 w-4" />
                        Cours
                      </span>
                      <span className="font-semibold">{c._count?.courses || 0}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm pt-1 border-t">
                      <span className="text-muted-foreground">Frais scolaires</span>
                      <span className="font-semibold text-emerald-600">{Number(c.fees).toLocaleString()} USD</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingClass ? 'Modifier la classe' : 'Créer une classe'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="class-name">Nom *</Label>
              <Input
                id="class-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Ex: 6ème Année A"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="class-level">Niveau</Label>
              <Select value={formLevel} onValueChange={setFormLevel}>
                <SelectTrigger id="class-level">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Maternelle">Maternelle</SelectItem>
                  <SelectItem value="Primaire">Primaire</SelectItem>
                  <SelectItem value="Secondaire">Secondaire</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="class-fees">Frais scolaires (USD)</Label>
              <Input
                id="class-fees"
                type="number"
                min="0"
                value={formFees}
                onChange={(e) => setFormFees(e.target.value)}
                placeholder="0"
              />
            </div>
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
              {submitting ? 'Enregistrement...' : editingClass ? 'Modifier' : 'Créer'}
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
              Êtes-vous sûr de vouloir supprimer la classe &quot;{deletingClass?.name}&quot; ?
              Toutes les inscriptions associées seront également supprimées. Cette action est irréversible.
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
