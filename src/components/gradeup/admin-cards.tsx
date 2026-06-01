'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { QRCodeSVG } from 'qrcode.react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { 
  IdCard, Printer, RefreshCw, Phone, Edit, Calendar, User, 
  BookOpen, GraduationCap, Building2, Upload, CreditCard, 
  ExternalLink, Loader2, Mail, MapPin, Hash, Shield, 
  CheckCircle, School, Users, Eye, EyeOff 
} from 'lucide-react';
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
  parentEmail?: string;
  address?: string;
  academicYear?: string;
  section?: string;
  photoUrl?: string;
  cardId?: string;
  cardIssuedDate?: string;
  cardExpiryDate?: string;
  classEnrollments?: EnrolledClassInfo[];
  password?: string;
  className?: string;
  bloodType?: string;
  nationality?: string;
}

export default function AdminCards() {
  const { user } = useAppStore();
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('ALL');
  const printRef = useRef<HTMLDivElement>(null);

  // Edit/Create State
  const [editingStudent, setEditingStudent] = useState<StudentItem | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Form Fields
  const [formData, setFormData] = useState<Partial<StudentItem>>({});

  // Payment states
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);

  // Check if payment was successful on mount (from URL params)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const paymentStatus = params.get('payment');
      if (paymentStatus === 'success') {
        setShowPaymentDialog(false);
        toast.success('✅ Paiement de 15$ réussi ! Vous pouvez maintenant créer la carte.', { duration: 5000 });
        window.history.replaceState({}, '', window.location.pathname);
        setTimeout(() => openCreateModal(), 300);
      } else if (paymentStatus === 'cancel') {
        setShowPaymentDialog(false);
        toast.error('Paiement annulé. Vous devez payer 15$ pour créer une carte.');
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, []);

  const handleInitiatePayment = async () => {
    setPaymentLoading(true);
    try {
      const successUrl = `${window.location.origin}/api/payments/pawapay/success?schoolId=${user?.schoolId}&action=generate-single&userId=new-card`;
      const cancelUrl = `${window.location.origin}/api/payments/pawapay/cancel`;

      const res = await fetch('/api/payments/pawapay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: 1500,
          currency: 'USD',
          description: 'GradeUp - Création de carte d\'identité scolaire',
          successUrl,
          cancelUrl,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erreur paiement');
      }

      const data = await res.json();
      
      if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
      } else {
        throw new Error('URL de paiement manquante');
      }
    } catch (e: any) {
      toast.error(e.message || 'Erreur lors de l\'initialisation du paiement');
      setPaymentLoading(false);
    }
  };

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
      const payload = {
        schoolId: user?.schoolId,
        action,
        classId,
        userId: studentId,
      };
      const res = await fetch('/api/users/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(action === 'generate-single' ? 'Carte générée avec succès !' : `${data.generatedCount || 0} carte(s) générée(s) avec succès !`);
      fetchStudents();
    } catch (e: any) {
      toast.error(e.message || 'Erreur lors de la génération');
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
      parentEmail: student.parentEmail || '',
      address: student.address || '',
      academicYear: student.academicYear || new Date().getFullYear() + '-' + (new Date().getFullYear() + 1),
      section: student.section || '',
      photoUrl: student.photoUrl || '',
      className: student.classEnrollments?.[0]?.class?.name || '',
      bloodType: student.bloodType || '',
      nationality: student.nationality || '',
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
      parentEmail: '',
      address: '',
      academicYear: new Date().getFullYear() + '-' + (new Date().getFullYear() + 1),
      section: '',
      photoUrl: '',
      className: '',
      bloodType: '',
      nationality: '',
      password: Math.random().toString(36).slice(-8),
    });
  };

  useEffect(() => {
    if (isCreating && formData.fullName) {
      const firstLetter = formData.fullName.trim().charAt(0).toUpperCase();
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const autoMatricule = `${firstLetter}${year}${month}`;
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

  const handlePrint = () => {
    const printContents = printRef.current?.innerHTML;
    const originalContents = document.body.innerHTML;
    
    if (printContents) {
      document.body.innerHTML = printContents;
      window.print();
      document.body.innerHTML = originalContents;
      window.location.reload();
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

  const StudentCard = ({ student }: { student: StudentItem }) => {
    const className = student.classEnrollments?.[0]?.class?.name || 'Sans Classe';
    const levelName = student.classEnrollments?.[0]?.class?.level || '';
    const schoolName = user?.school?.name || 'GradeUp School';
    const cardExpiry = student.cardExpiryDate || new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toLocaleDateString();

    return (
      <div className="break-inside-avoid relative group">
        <div className="relative w-full max-w-[520px] mx-auto rounded-2xl overflow-hidden shadow-2xl hover:shadow-3xl transition-all duration-300">
          {/* Carte principale avec design premium */}
          <div className="relative bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
            {/* Effet de fond */}
            {/* Decorative background (removed complex inline SVG URL to avoid JSX parsing issues) */}
            <div className="absolute inset-0 opacity-20" />
            
            {/* En-tête avec nom de l'école */}
            <div className="relative px-6 pt-6 pb-3 border-b border-white/10">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-white/10 rounded-lg backdrop-blur-sm">
                    <School className="w-5 h-5 text-blue-300" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg tracking-tight text-white/95 uppercase">{schoolName}</h3>
                    <p className="text-[10px] text-blue-200/70">Établissement d'Excellence</p>
                  </div>
                </div>
                <div className="text-right bg-white/5 backdrop-blur-sm px-3 py-1.5 rounded-lg">
                  <p className="text-[8px] uppercase tracking-wider text-blue-200/80 font-semibold">Année Scolaire</p>
                  <p className="text-xs font-bold text-white">{student.academicYear || '2025-2026'}</p>
                </div>
              </div>
            </div>

            {/* Corps de la carte */}
            <div className="relative px-6 py-4">
              <div className="flex gap-5">
                {/* Colonne gauche - Photo et QR Code */}
                <div className="flex flex-col items-center gap-3 w-[110px] shrink-0">
                  <div className="relative">
                    <div className="w-24 h-24 rounded-xl border-2 border-white/30 shadow-lg overflow-hidden bg-gradient-to-br from-slate-700 to-slate-800">
                      {student.photoUrl ? (
                        <img src={student.photoUrl} alt={student.fullName} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <User className="w-12 h-12 text-white/40" />
                        </div>
                      )}
                    </div>
                    <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-0.5">
                      <CheckCircle className="w-3 h-3 text-white" />
                    </div>
                  </div>
                  
                  {/* QR Code */}
                  <div className="bg-white p-1.5 rounded-xl shadow-lg">
                    {student.cardId ? (
                      <QRCodeSVG value={`${student.id}-${student.cardId}`} size={80} level="H" includeMargin={false} />
                    ) : (
                      <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center">
                        <span className="text-[9px] text-gray-400 text-center">Générer QR</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Colonne droite - Informations */}
                <div className="flex-1 space-y-3">
                  {/* Nom de l'étudiant */}
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h2 className="text-xl font-bold text-white leading-tight">{student.fullName}</h2>
                      {student.gender && (
                        <Badge variant="secondary" className="bg-white/20 text-white border-white/30 text-[10px]">
                          {student.gender === 'M' ? 'Masculin' : 'Féminin'}
                        </Badge>
                      )}
                    </div>
                    {student.postName && (
                      <p className="text-sm text-blue-200/80">{student.postName}</p>
                    )}
                  </div>

                  {/* Informations clés en grille */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-white/5 backdrop-blur-sm rounded-lg p-2">
                      <div className="flex items-center gap-1 mb-1">
                        <Hash className="w-3 h-3 text-blue-300" />
                        <p className="text-[8px] uppercase text-blue-200/70 font-semibold">Matricule</p>
                      </div>
                      <p className="text-xs font-mono font-bold text-white">{student.matricule || 'N/A'}</p>
                    </div>
                    
                    <div className="bg-white/5 backdrop-blur-sm rounded-lg p-2">
                      <div className="flex items-center gap-1 mb-1">
                        <BookOpen className="w-3 h-3 text-blue-300" />
                        <p className="text-[8px] uppercase text-blue-200/70 font-semibold">Classe</p>
                      </div>
                      <p className="text-xs font-semibold text-white truncate">{className}</p>
                    </div>

                    {(student.section || levelName) && (
                      <div className="bg-white/5 backdrop-blur-sm rounded-lg p-2">
                        <div className="flex items-center gap-1 mb-1">
                          <GraduationCap className="w-3 h-3 text-blue-300" />
                          <p className="text-[8px] uppercase text-blue-200/70 font-semibold">Section/Option</p>
                        </div>
                        <p className="text-xs font-medium text-white/90 truncate">{student.section || levelName}</p>
                      </div>
                    )}

                    {student.birthDate && (
                      <div className="bg-white/5 backdrop-blur-sm rounded-lg p-2">
                        <div className="flex items-center gap-1 mb-1">
                          <Calendar className="w-3 h-3 text-blue-300" />
                          <p className="text-[8px] uppercase text-blue-200/70 font-semibold">Naissance</p>
                        </div>
                        <p className="text-xs text-white/90">{student.birthDate}</p>
                      </div>
                    )}

                    {student.bloodType && (
                      <div className="bg-white/5 backdrop-blur-sm rounded-lg p-2">
                        <div className="flex items-center gap-1 mb-1">
                          <Shield className="w-3 h-3 text-red-300" />
                          <p className="text-[8px] uppercase text-blue-200/70 font-semibold">Groupe Sanguin</p>
                        </div>
                        <p className="text-xs font-bold text-white">{student.bloodType}</p>
                      </div>
                    )}

                    {student.nationality && (
                      <div className="bg-white/5 backdrop-blur-sm rounded-lg p-2">
                        <div className="flex items-center gap-1 mb-1">
                          <MapPin className="w-3 h-3 text-blue-300" />
                          <p className="text-[8px] uppercase text-blue-200/70 font-semibold">Nationalité</p>
                        </div>
                        <p className="text-xs text-white/90">{student.nationality}</p>
                      </div>
                    )}
                  </div>

                  {/* Contacts */}
                  {(student.phone || student.parentPhone) && (
                    <div className="bg-white/5 backdrop-blur-sm rounded-lg p-2">
                      <div className="grid grid-cols-2 gap-2">
                        {student.phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-green-300" />
                            <div>
                              <p className="text-[8px] text-blue-200/70">Élève</p>
                              <p className="text-[10px] font-medium text-white">{student.phone}</p>
                            </div>
                          </div>
                        )}
                        {student.parentPhone && (
                          <div className="flex items-center gap-1">
                            <Users className="w-3 h-3 text-orange-300" />
                            <div>
                              <p className="text-[8px] text-blue-200/70">Parent</p>
                              <p className="text-[10px] font-medium text-white">{student.parentPhone}</p>
                            </div>
                          </div>
                        )}
                      </div>
                      {student.parentEmail && (
                        <div className="flex items-center gap-1 mt-1">
                          <Mail className="w-3 h-3 text-blue-300" />
                          <p className="text-[9px] text-white/80 truncate">{student.parentEmail}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {student.address && (
                    <div className="flex items-center gap-1 text-[9px] text-white/70">
                      <MapPin className="w-3 h-3" />
                      <span className="truncate">{student.address}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Pied de carte avec numéro de carte */}
            <div className="relative px-6 py-3 border-t border-white/10 bg-black/20 backdrop-blur-sm">
              <div className="flex justify-between items-center text-[9px]">
                <div className="flex items-center gap-2">
                  <Shield className="w-3 h-3 text-blue-300" />
                  <span className="text-white/70">Carte d'Identité Scolaire</span>
                </div>
                {student.cardId && (
                  <div className="font-mono font-bold text-white">
                    N°: {student.cardId}
                  </div>
                )}
                <div className="text-white/50">
                  Valable jusqu'au: {cardExpiry}
                </div>
              </div>
            </div>
          </div>

          {/* Bouton d'édition */}
          <Button 
            onClick={() => openEditModal(student)}
            className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-300 rounded-full shadow-lg h-8 w-8 p-0 bg-white text-blue-600 hover:bg-blue-50 border border-blue-200 no-print"
            title="Modifier les informations"
          >
            <Edit className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * { visibility: hidden; }
          #print-section, #print-section * { visibility: visible; }
          #print-section { 
            position: absolute; 
            left: 0; 
            top: 0; 
            width: 100%;
            background: white;
          }
          .no-print { display: none !important; }
          @page { 
            margin: 0.5cm;
            size: A4;
          }
          .break-inside-avoid {
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }
      `}} />

      {/* En-tête */}
      <div className="mb-6 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 p-6 no-print">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <IdCard className="w-6 h-6 text-blue-600" /> 
              Cartes d'Identité Scolaire
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Gérez et éditez les cartes d'identification sécurisées avec QR code
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setShowPaymentDialog(true)} className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-md">
              <CreditCard className="w-4 h-4 mr-2" />
              Nouvelle Carte (15$)
            </Button>
            <Button variant="outline" onClick={() => generateCards('generate-all')} disabled={generating || students.length === 0}>
              <RefreshCw className={`w-4 h-4 mr-2 ${generating ? 'animate-spin' : ''}`} />
              Générer IDs
            </Button>
            <Button onClick={handlePrint} disabled={filteredStudents.length === 0} className="bg-blue-600 hover:bg-blue-700 text-white">
              <Printer className="h-4 w-4 mr-2" /> Imprimer
            </Button>
          </div>
        </div>
      </div>

      {/* Onglets de filtrage */}
      <div className="no-print">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="overflow-x-auto pb-2">
            <TabsList className="inline-flex w-max">
              <TabsTrigger value="ALL" className="gap-1.5">
                Tous 
                <Badge variant="secondary" className="ml-1 text-xs">{students.length}</Badge>
              </TabsTrigger>
              {allClasses.map((c) => (
                <TabsTrigger key={c.id} value={c.id} className="gap-1.5">
                  {c.name} 
                  <Badge variant="secondary" className="ml-1 text-xs">{c.students.length}</Badge>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
        </Tabs>
      </div>

      {/* Liste des cartes */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 no-print">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[320px] w-full rounded-2xl" />
          ))}
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="text-center py-16 no-print bg-muted/20 rounded-xl border border-dashed">
          <IdCard className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
          <h3 className="text-lg font-semibold">Aucun élève trouvé</h3>
          <p className="text-sm text-muted-foreground mt-2">
            Commencez par créer une nouvelle carte d'identité
          </p>
        </div>
      ) : (
        <div ref={printRef} id="print-section" className="grid grid-cols-1 lg:grid-cols-2 gap-6 content-start print:grid-cols-2 print:gap-4">
          {filteredStudents.map((student) => (
            <StudentCard key={student.id} student={student} />
          ))}
        </div>
      )}

      {/* Dialog de paiement */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <div className="p-1.5 rounded-lg bg-emerald-50">
                <CreditCard className="h-5 w-5 text-emerald-600" />
              </div>
              Paiement requis — 15$
            </DialogTitle>
            <DialogDescription>
              Un paiement de <strong>15 USD</strong> est requis pour créer une nouvelle carte d'identité scolaire.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="rounded-xl bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/30 p-6 text-center border border-emerald-200">
              <p className="text-sm text-muted-foreground mb-2">Montant à payer</p>
              <p className="text-4xl font-bold text-emerald-600">15 $</p>
              <p className="text-xs text-muted-foreground mt-2">Paiement unique par carte</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <IdCard className="h-5 w-5 text-blue-500 shrink-0" />
                <div>
                  <p className="text-sm font-medium">Carte premium avec QR code</p>
                  <p className="text-xs text-muted-foreground">Design moderne et sécurisé</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <RefreshCw className="h-5 w-5 text-purple-500 shrink-0" />
                <div>
                  <p className="text-sm font-medium">Mise à jour en temps réel</p>
                  <p className="text-xs text-muted-foreground">Notifications envoyées</p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)} disabled={paymentLoading}>
              Annuler
            </Button>
            <Button
              onClick={handleInitiatePayment}
              disabled={paymentLoading}
              className="bg-gradient-to-r from-emerald-600 to-emerald-500"
            >
              {paymentLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Redirection...
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4 mr-2" />
                  Payer 15 $
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog d'édition/création */}
      <Dialog open={!!editingStudent || isCreating} onOpenChange={(o) => { if (!o) { setEditingStudent(null); setIsCreating(false); } }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <IdCard className="w-5 h-5" />
              {isCreating ? 'Créer une nouvelle carte' : 'Modifier la carte'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 py-4">
            <div className="space-y-2">
              <Label>Nom Complet *</Label>
              <Input 
                value={formData.fullName || ''} 
                onChange={(e) => setFormData({...formData, fullName: e.target.value})} 
                placeholder="Nom et prénom"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Post-nom</Label>
              <Input 
                value={formData.postName || ''} 
                onChange={(e) => setFormData({...formData, postName: e.target.value})} 
                placeholder="Nom du père"
              />
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
              <Input 
                type="date" 
                value={formData.birthDate || ''} 
                onChange={(e) => setFormData({...formData, birthDate: e.target.value})} 
              />
            </div>
            
            <div className="space-y-2">
              <Label>Matricule</Label>
              <Input 
                value={formData.matricule || ''} 
                onChange={(e) => setFormData({...formData, matricule: e.target.value})} 
                placeholder="Numéro d'identification"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Groupe Sanguin</Label>
              <Select value={formData.bloodType || ''} onValueChange={(v) => setFormData({...formData, bloodType: v})}>
                <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="A+">A+</SelectItem>
                  <SelectItem value="A-">A-</SelectItem>
                  <SelectItem value="B+">B+</SelectItem>
                  <SelectItem value="B-">B-</SelectItem>
                  <SelectItem value="AB+">AB+</SelectItem>
                  <SelectItem value="AB-">AB-</SelectItem>
                  <SelectItem value="O+">O+</SelectItem>
                  <SelectItem value="O-">O-</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Nationalité</Label>
              <Input 
                value={formData.nationality || ''} 
                onChange={(e) => setFormData({...formData, nationality: e.target.value})} 
                placeholder="Nationalité"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Classe</Label>
              <Input 
                value={formData.className || ''} 
                onChange={(e) => setFormData({...formData, className: e.target.value})} 
                placeholder="Ex: 6ème A"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Section / Option</Label>
              <Input 
                value={formData.section || ''} 
                onChange={(e) => setFormData({...formData, section: e.target.value})} 
                placeholder="Ex: Scientifique"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Année Scolaire</Label>
              <Input 
                value={formData.academicYear || ''} 
                onChange={(e) => setFormData({...formData, academicYear: e.target.value})} 
                placeholder="2025-2026"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Téléphone Élève</Label>
              <Input 
                value={formData.phone || ''} 
                onChange={(e) => setFormData({...formData, phone: e.target.value})} 
                placeholder="Optionnel"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Téléphone Parent 1</Label>
              <Input 
                value={formData.parentPhone || ''} 
                onChange={(e) => setFormData({...formData, parentPhone: e.target.value})} 
                placeholder="Optionnel"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Téléphone Parent 2</Label>
              <Input 
                value={formData.parentPhone2 || ''} 
                onChange={(e) => setFormData({...formData, parentPhone2: e.target.value})} 
                placeholder="Optionnel"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Email Parent</Label>
              <Input 
                type="email"
                value={formData.parentEmail || ''} 
                onChange={(e) => setFormData({...formData, parentEmail: e.target.value})} 
                placeholder="Optionnel"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Adresse</Label>
              <Input 
                value={formData.address || ''} 
                onChange={(e) => setFormData({...formData, address: e.target.value})} 
                placeholder="Adresse complète"
              />
            </div>
            
            {isCreating && (
              <div className="space-y-2">
                <Label>Mot de passe temporaire</Label>
                <div className="flex gap-2">
                  <Input 
                    value={formData.password || ''} 
                    onChange={(e) => setFormData({...formData, password: e.target.value})} 
                    type={showPassword ? "text" : "password"}
                    placeholder="Mot de passe"
                  />
                  <Button 
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            )}
            
            <div className="space-y-2 col-span-1 md:col-span-2 lg:col-span-3">
              <Label>Photo de l'élève</Label>
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-xl border-2 border-dashed border-muted-foreground/30 bg-muted/20 flex items-center justify-center overflow-hidden shrink-0">
                  {formData.photoUrl ? (
                    <img src={formData.photoUrl} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-8 h-8 text-muted-foreground/50" />
                  )}
                </div>
                <div className="flex-1">
                  <Label htmlFor="photo-upload" className="cursor-pointer">
                    <div className="flex items-center justify-center gap-2 border-2 border-dashed rounded-lg p-3 hover:bg-muted/50 transition-colors">
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
            <Button variant="outline" onClick={() => { setEditingStudent(null); setIsCreating(false); }}>
              Annuler
            </Button>
            <Button onClick={handleUpdate} disabled={submitting} className="bg-blue-600 hover:bg-blue-700">
              {submitting ? 'Enregistrement...' : isCreating ? 'Créer la carte' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}