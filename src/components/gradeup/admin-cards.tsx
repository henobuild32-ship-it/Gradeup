'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAppStore } from '@/lib/store';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { QRCodeSVG } from 'qrcode.react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { IdCard, Printer, RefreshCw, Phone, Edit, Calendar, User, BookOpen, GraduationCap, Building2, Upload } from 'lucide-react';
import { toast } from 'sonner';

interface EnrolledClassInfo {
  class: { id: string; name: string; level: string };
}

interface StudentItem {
  id: string;
  fullName: string;
  postName?: string;
  gender?: string;
  birthDate?: string;
  matricule?: string;
  phone?: string;
  parentPhone?: string;
  parentPhone2?: string;
  academicYear?: string;
  section?: string;
  photoUrl?: string;
  cardId?: string;
  classEnrollments?: EnrolledClassInfo[];
  password?: string;
  className?: string;
}

export default function AdminCards() {
  const { user } = useAppStore();
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('ALL');

  // Edit/Create State
  const [editingStudent, setEditingStudent] = useState<StudentItem | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form Fields
  const [formData, setFormData] = useState<Partial<StudentItem>>({});

  const fetchStudents = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/users?schoolId=${user?.schoolId}&role=STUDENT`);
      const data = await res.json();
      setStudents(Array.isArray(data.users) ? data.users : []);
    } catch {
      toast.error('Erreur lors du chargement des élèves');
    } finally {
      setLoading(false);
    }
  }, [user?.schoolId]);

  useEffect(() => {
    if (user?.schoolId) fetchStudents();
  }, [fetchStudents, user?.schoolId]);

  const generateCards = async (action: 'generate-all' | 'generate-class' | 'generate-single', classId?: string, studentId?: string) => {
    try {
      setGenerating(true);
      const res = await fetch('/api/users/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schoolId: user?.schoolId, action, classId, userId: studentId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      toast.success(action === 'generate-single' ? 'Carte générée' : `${data.generatedCount || 0} cartes générées`);
      fetchStudents();
    } catch (e: any) {
      toast.error(e.message || 'Erreur');
    } finally {
      setGenerating(false);
    }
  };

  const openEditModal = (student: StudentItem) => {
    setEditingStudent(student);
    setIsCreating(false);
    setFormData({
      fullName: student.fullName,
      postName: student.postName || '',
      gender: student.gender || 'M',
      birthDate: student.birthDate || '',
      matricule: student.matricule || '',
      phone: student.phone || '',
      parentPhone: student.parentPhone || '',
      parentPhone2: student.parentPhone2 || '',
      academicYear: student.academicYear || '2025-2026',
      section: student.section || '',
      photoUrl: student.photoUrl || '',
      className: student.classEnrollments?.[0]?.class?.name || '',
    });
  };

  const openCreateModal = () => {
    setEditingStudent(null);
    setIsCreating(true);
    setFormData({
      fullName: '',
      postName: '',
      gender: 'M',
      birthDate: '',
      matricule: '',
      phone: '',
      parentPhone: '',
      parentPhone2: '',
      academicYear: new Date().getFullYear() + '-' + (new Date().getFullYear() + 1),
      section: '',
      photoUrl: '',
      className: '',
      password: 'studentpassword123', // Default password for card creation
    });
  };

  useEffect(() => {
    if (isCreating && formData.fullName) {
      const firstLetter = formData.fullName.trim().charAt(0).toUpperCase();
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const autoMatricule = `${firstLetter}${year}${month}`;
      // Only set if they haven't manually typed something different that doesn't match the auto pattern
      if (!formData.matricule || formData.matricule.startsWith(firstLetter)) {
        setFormData(prev => ({ ...prev, matricule: autoMatricule }));
      }
    }
  }, [formData.fullName, isCreating]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error('L\'image est trop grande (max 2MB)');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, photoUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpdate = async () => {
    if (isCreating && !formData.fullName) {
      toast.error('Le nom complet est obligatoire.');
      return;
    }
    setSubmitting(true);
    try {
      if (isCreating) {
        const res = await fetch(`/api/users`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            schoolId: user?.schoolId, 
            role: 'STUDENT',
            ...formData 
          }),
        });
        if (!res.ok) throw new Error('Erreur lors de la création');
        toast.success('Nouvelle carte (élève) créée avec succès');
      } else if (editingStudent) {
        const res = await fetch(`/api/users`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: editingStudent.id, ...formData }),
        });
        if (!res.ok) throw new Error('Erreur de mise à jour');
        toast.success('Informations mises à jour');
      }
      setIsCreating(false);
      setEditingStudent(null);
      fetchStudents();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Grouping logic
  const classesMap = new Map<string, { id: string; name: string; students: StudentItem[] }>();
  classesMap.set('UNASSIGNED', { id: 'unassigned', name: 'Sans Classe', students: [] });

  students.forEach((s) => {
    if (!s.classEnrollments || s.classEnrollments.length === 0) {
      classesMap.get('UNASSIGNED')!.students.push(s);
    } else {
      s.classEnrollments.forEach((enrollment) => {
        const cls = enrollment.class;
        if (!classesMap.has(cls.id)) classesMap.set(cls.id, { id: cls.id, name: cls.name, students: [] });
        classesMap.get(cls.id)!.students.push(s);
      });
    }
  });

  if (classesMap.get('UNASSIGNED')!.students.length === 0) classesMap.delete('UNASSIGNED');
  const allClasses = Array.from(classesMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  const filteredStudents = activeTab === 'ALL' ? students : activeTab === 'UNASSIGNED' ? classesMap.get('UNASSIGNED')?.students || [] : classesMap.get(activeTab)?.students || [];

  return (
    <div className="space-y-6">
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * { visibility: hidden; }
          #print-section, #print-section * { visibility: visible; }
          #print-section { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
          @page { margin: 0; size: A4 portrait; }
        }
      `}} />

      <div className="mb-6 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 p-6 no-print">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <IdCard className="w-6 h-6 text-blue-600" /> Cartes Élèves Premium
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Gérez et éditez les cartes d'identification sécurisées.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={openCreateModal} className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-md">
              Créer une carte
            </Button>
            <Button variant="outline" onClick={() => generateCards('generate-all')} disabled={generating || students.length === 0} className="bg-white">
              <RefreshCw className={`w-4 h-4 mr-2 ${generating ? 'animate-spin' : ''}`} />
              Générer IDs
            </Button>
            <Button onClick={() => window.print()} disabled={filteredStudents.length === 0} className="bg-blue-600 hover:bg-blue-700 text-white">
              <Printer className="h-4 w-4 mr-2" /> Imprimer
            </Button>
          </div>
        </div>
      </div>

      <div className="no-print">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="overflow-x-auto pb-2">
            <TabsList className="inline-flex w-max">
              <TabsTrigger value="ALL" className="gap-1.5">Tous <Badge variant="secondary" className="ml-1 text-xs">{students.length}</Badge></TabsTrigger>
              {allClasses.map((c) => (
                <TabsTrigger key={c.id} value={c.id} className="gap-1.5">{c.name} <Badge variant="secondary" className="ml-1 text-xs">{c.students.length}</Badge></TabsTrigger>
              ))}
            </TabsList>
          </div>
        </Tabs>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 no-print">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[250px] w-full rounded-2xl" />)}
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="text-center py-16 no-print bg-muted/20 rounded-xl border border-dashed">
          <IdCard className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
          <h3 className="text-lg font-semibold">Aucun élève</h3>
        </div>
      ) : (
        <div id="print-section" className="grid grid-cols-1 lg:grid-cols-2 gap-6 content-start print:grid-cols-2 print:gap-4 print:p-4">
          {filteredStudents.map((s) => {
            const className = s.classEnrollments?.[0]?.class?.name || 'Sans Classe';
            const levelName = s.classEnrollments?.[0]?.class?.level || '';
            const schoolName = user?.school?.name || 'GradeUp School';

            return (
              <div key={s.id} className="break-inside-avoid relative group">
                {/* Premium Bank Card Design */}
                <div className="relative w-full max-w-[480px] h-[260px] mx-auto rounded-[20px] shadow-xl overflow-hidden bg-gradient-to-br from-indigo-900 via-blue-900 to-slate-900 border border-white/20 text-white">
                  {/* Glassmorphism Background Elements */}
                  <div className="absolute top-[-50%] left-[-20%] w-96 h-96 bg-blue-500/30 rounded-full blur-3xl pointer-events-none" />
                  <div className="absolute bottom-[-30%] right-[-10%] w-72 h-72 bg-purple-500/20 rounded-full blur-2xl pointer-events-none" />
                  
                  {/* Card Header */}
                  <div className="absolute top-0 left-0 right-0 px-6 py-4 flex justify-between items-start z-10 bg-black/10 backdrop-blur-sm border-b border-white/10">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-blue-300" />
                      <h3 className="font-bold text-lg tracking-wider drop-shadow-md uppercase text-white/95">{schoolName}</h3>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] uppercase tracking-widest text-blue-200/80 font-semibold mb-0.5">Année Scolaire</p>
                      <p className="text-xs font-bold bg-white/10 px-2 py-0.5 rounded-full">{s.academicYear || '2025-2026'}</p>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="absolute top-[72px] left-0 right-0 bottom-0 px-6 py-4 flex gap-5 z-10">
                    {/* Left Column: Photo & QR */}
                    <div className="flex flex-col items-center justify-between w-[90px] shrink-0">
                      <div className="w-20 h-20 rounded-xl border-2 border-white/40 shadow-inner bg-slate-800/50 overflow-hidden flex items-center justify-center backdrop-blur-md">
                        {s.photoUrl ? (
                          <img src={s.photoUrl} alt={s.fullName} className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-10 h-10 text-white/50" />
                        )}
                      </div>
                      <div className="mt-2 bg-white p-1 rounded-lg shadow-sm w-[76px] h-[76px] flex items-center justify-center">
                        {s.cardId ? (
                          <QRCodeSVG value={s.id} size={68} level="L" includeMargin={false} />
                        ) : (
                          <span className="text-[9px] text-gray-400 text-center leading-tight">Générer<br/>ID</span>
                        )}
                      </div>
                    </div>

                    {/* Right Column: Details */}
                    <div className="flex flex-col flex-1 h-full justify-between">
                      <div>
                        <div className="flex justify-between items-start">
                          <div>
                            <h2 className="text-xl font-bold leading-tight tracking-wide drop-shadow-sm text-white">{s.fullName}</h2>
                            <p className="text-xs text-blue-200/90 font-medium h-4 mt-0.5">
                              {s.postName ? s.postName : ''} {s.postName && s.gender ? '•' : ''} {s.gender ? (s.gender === 'M' ? 'Masculin' : 'Féminin') : ''}
                            </p>
                          </div>
                          {s.cardId && (
                            <div className="bg-white/10 border border-white/20 backdrop-blur-md px-2.5 py-1 rounded-lg">
                              <p className="text-[9px] text-blue-200/80 uppercase font-bold tracking-wider mb-0.5">N° Carte</p>
                              <p className="font-mono text-sm font-bold tracking-widest text-white drop-shadow-md">{s.cardId}</p>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-x-2 gap-y-3 mt-3">
                        <div>
                          <p className="text-[9px] uppercase tracking-widest text-blue-300/70 font-semibold mb-0.5 flex items-center gap-1"><BookOpen className="w-2.5 h-2.5"/> Classe</p>
                          <p className="text-sm font-semibold truncate text-white">{className}</p>
                        </div>
                        {s.matricule && (
                          <div>
                            <p className="text-[9px] uppercase tracking-widest text-blue-300/70 font-semibold mb-0.5">Matricule</p>
                            <p className="text-xs font-mono font-bold tracking-wide text-white">{s.matricule}</p>
                          </div>
                        )}
                        {(s.section || levelName) && (
                          <div>
                            <p className="text-[9px] uppercase tracking-widest text-blue-300/70 font-semibold mb-0.5 flex items-center gap-1"><GraduationCap className="w-2.5 h-2.5"/> Section</p>
                            <p className="text-xs font-medium truncate text-white/90">{s.section || levelName}</p>
                          </div>
                        )}
                        {s.birthDate && (
                          <div>
                            <p className="text-[9px] uppercase tracking-widest text-blue-300/70 font-semibold mb-0.5 flex items-center gap-1"><Calendar className="w-2.5 h-2.5"/> Naissance</p>
                            <p className="text-xs font-medium text-white/90">{s.birthDate}</p>
                          </div>
                        )}
                      </div>

                      <div className="mt-auto pt-2 border-t border-white/10 flex flex-wrap gap-x-4 gap-y-1">
                        {s.phone ? (
                          <div className="flex items-center text-[10px] font-medium text-white/80">
                            <Phone className="w-2.5 h-2.5 mr-1 text-blue-300" /> {s.phone}
                          </div>
                        ) : null}
                        {s.parentPhone ? (
                          <div className="flex items-center text-[10px] font-medium text-white/80">
                            <User className="w-2.5 h-2.5 mr-1 text-orange-300" /> Par. 1: {s.parentPhone}
                          </div>
                        ) : null}
                        {s.parentPhone2 ? (
                          <div className="flex items-center text-[10px] font-medium text-white/80">
                            <User className="w-2.5 h-2.5 mr-1 text-orange-300" /> Par. 2: {s.parentPhone2}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Edit Button (Hidden on Print) */}
                <Button 
                  onClick={() => openEditModal(s)}
                  className="absolute top-2 right-2 opacity-80 hover:opacity-100 transition-opacity no-print rounded-full shadow-lg h-9 w-9 p-0 bg-white text-blue-600 border border-blue-200"
                  title="Modifier les informations"
                >
                  <Edit className="w-4 h-4" />
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit/Create Dialog */}
      <Dialog open={!!editingStudent || isCreating} onOpenChange={(o) => { if (!o) { setEditingStudent(null); setIsCreating(false); } }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isCreating ? 'Créer une nouvelle carte' : 'Modifier les informations de la carte'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 py-4">
            <div className="space-y-2">
              <Label>Nom Complet *</Label>
              <Input value={formData.fullName || ''} onChange={(e) => setFormData({...formData, fullName: e.target.value})} placeholder="Nom obligatoire" />
            </div>
            <div className="space-y-2">
              <Label>Post-nom / Prénom secondaire</Label>
              <Input value={formData.postName || ''} onChange={(e) => setFormData({...formData, postName: e.target.value})} placeholder="Optionnel" />
            </div>
            <div className="space-y-2">
              <Label>Sexe</Label>
              <Select value={formData.gender || 'M'} onValueChange={(v) => setFormData({...formData, gender: v})}>
                <SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="M">Masculin</SelectItem>
                  <SelectItem value="F">Féminin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Date de naissance</Label>
              <Input type="date" value={formData.birthDate || ''} onChange={(e) => setFormData({...formData, birthDate: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Numéro Matricule</Label>
              <Input value={formData.matricule || ''} onChange={(e) => setFormData({...formData, matricule: e.target.value})} placeholder="Identifiant interne" />
            </div>
            <div className="space-y-2">
              <Label>Classe</Label>
              <Input value={formData.className || ''} onChange={(e) => setFormData({...formData, className: e.target.value})} placeholder="Tapez pour affecter (création auto)" />
            </div>
            <div className="space-y-2">
              <Label>Section / Option</Label>
              <Input value={formData.section || ''} onChange={(e) => setFormData({...formData, section: e.target.value})} placeholder="Ex: Scientifique" />
            </div>
            <div className="space-y-2">
              <Label>Année Scolaire</Label>
              <Input value={formData.academicYear || ''} onChange={(e) => setFormData({...formData, academicYear: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Téléphone Élève</Label>
              <Input value={formData.phone || ''} onChange={(e) => setFormData({...formData, phone: e.target.value})} placeholder="Optionnel" />
            </div>
            <div className="space-y-2">
              <Label>Téléphone Parent 1</Label>
              <Input value={formData.parentPhone || ''} onChange={(e) => setFormData({...formData, parentPhone: e.target.value})} placeholder="Optionnel" />
            </div>
            <div className="space-y-2">
              <Label>Téléphone Parent 2</Label>
              <Input value={formData.parentPhone2 || ''} onChange={(e) => setFormData({...formData, parentPhone2: e.target.value})} placeholder="Optionnel" />
            </div>
            <div className="space-y-2 col-span-1 md:col-span-2 lg:col-span-3">
              <Label>Photo de l'élève</Label>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full border bg-muted flex items-center justify-center overflow-hidden shrink-0">
                  {formData.photoUrl ? (
                    <img src={formData.photoUrl} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-8 h-8 text-muted-foreground/50" />
                  )}
                </div>
                <div className="flex-1">
                  <Label htmlFor="photo-upload" className="cursor-pointer">
                    <div className="flex items-center justify-center gap-2 border-2 border-dashed rounded-lg p-4 hover:bg-muted/50 transition-colors">
                      <Upload className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Cliquez pour importer une photo (Max 2MB)</span>
                    </div>
                  </Label>
                  <Input id="photo-upload" type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditingStudent(null); setIsCreating(false); }}>Annuler</Button>
            <Button onClick={handleUpdate} disabled={submitting} className="bg-blue-600 hover:bg-blue-700 text-white">
              {submitting ? 'Enregistrement...' : isCreating ? 'Créer la carte' : 'Enregistrer les modifications'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
