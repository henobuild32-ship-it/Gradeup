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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Plus,
  Search,
  DollarSign,
  MoreVertical,
  CreditCard,
  CheckCircle,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';

interface PaymentItem {
  id: string;
  studentId: string;
  amount: number;
  status: string;
  month: string;
  method: string;
  createdAt: string;
  student?: { id: string; fullName: string };
}

interface StudentItem {
  id: string;
  fullName: string;
}

const statusConfig: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  paid: { label: 'Payé', color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle },
  pending: { label: 'En attente', color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: Clock },
  overdue: { label: 'En retard', color: 'bg-red-100 text-red-700 border-red-200', icon: AlertTriangle },
};

const months = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

export default function AdminPayments() {
  const { user } = useAppStore();
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterClass, setFilterClass] = useState('ALL');
  const [filterMonth, setFilterMonth] = useState('ALL');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [formStudentId, setFormStudentId] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formMonth, setFormMonth] = useState('');
  const [formStatus, setFormStatus] = useState('pending');
  const [formMethod, setFormMethod] = useState('cash');

  const fetchPayments = useCallback(async () => {
    try {
      let url = `/api/payments?schoolId=${user?.schoolId}`;
      if (activeTab !== 'ALL') url += `&status=${activeTab}`;
      const res = await fetch(url);
      const data = await res.json();
      setPayments(data.payments || []);
    } catch {
      toast.error('Erreur lors du chargement des paiements');
    } finally {
      setLoading(false);
    }
  }, [user?.schoolId, activeTab]);

  const fetchStudents = useCallback(async () => {
    try {
      const res = await fetch(`/api/users?schoolId=${user?.schoolId}&role=STUDENT`);
      const data = await res.json();
      setStudents(data.users || []);
    } catch {
      console.error('Failed to fetch students');
    }
  }, [user?.schoolId]);

  const fetchClasses = useCallback(async () => {
    try {
      const res = await fetch(`/api/classes?schoolId=${user?.schoolId}`);
      const data = await res.json();
      setClasses(data.classes || []);
    } catch {
      console.error('Failed to fetch classes');
    }
  }, [user?.schoolId]);

  useEffect(() => {
    if (user?.schoolId) {
      setLoading(true);
      fetchPayments();
      fetchStudents();
      fetchClasses();
    }
  }, [fetchPayments, fetchStudents, fetchClasses, user?.schoolId]);

  const resetForm = () => {
    setFormStudentId('');
    setFormAmount('');
    setFormMonth('');
    setFormStatus('pending');
    setFormMethod('cash');
  };

  const handleSubmit = async () => {
    if (!formStudentId) {
      toast.error('Veuillez sélectionner un élève');
      return;
    }
    if (!formAmount || parseFloat(formAmount) <= 0) {
      toast.error('Veuillez entrer un montant valide');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolId: user?.schoolId,
          studentId: formStudentId,
          amount: parseFloat(formAmount),
          month: formMonth,
          status: formStatus,
          method: formMethod,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur');
      toast.success('Paiement enregistré avec succès');
      setDialogOpen(false);
      resetForm();
      fetchPayments();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Erreur lors de l\'opération');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (paymentId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/payments/${paymentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolId: user?.schoolId,
          status: newStatus,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur');
      toast.success('Statut mis à jour avec succès');
      fetchPayments();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la mise à jour');
    }
  };

  const filteredPayments = payments.filter((p) => {
    const matchesSearch =
      !searchQuery ||
      p.student?.fullName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const totalPaid = payments
    .filter((p) => p.status === 'paid')
    .reduce((sum, p) => sum + p.amount, 0);
  const totalPending = payments
    .filter((p) => p.status === 'pending')
    .reduce((sum, p) => sum + p.amount, 0);
  const totalOverdue = payments
    .filter((p) => p.status === 'overdue')
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des paiements</h1>
          <p className="text-muted-foreground">Suivez et gérez les paiements des élèves</p>
        </div>
        <Button onClick={() => { resetForm(); setDialogOpen(true); }} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          Nouveau paiement
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-green-200">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-green-50">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Payé</p>
              <p className="text-xl font-bold text-green-600">{totalPaid.toLocaleString()} USD</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-yellow-200">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-yellow-50">
              <Clock className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">En attente</p>
              <p className="text-xl font-bold text-yellow-600">{totalPending.toLocaleString()} USD</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-red-200">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-red-50">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">En retard</p>
              <p className="text-xl font-bold text-red-600">{totalOverdue.toLocaleString()} USD</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <TabsList>
            <TabsTrigger value="ALL">Tous</TabsTrigger>
            <TabsTrigger value="paid">Payé</TabsTrigger>
            <TabsTrigger value="pending">En attente</TabsTrigger>
            <TabsTrigger value="overdue">En retard</TabsTrigger>
          </TabsList>
          <div className="flex gap-2">
            <Select value={filterClass} onValueChange={setFilterClass}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Toutes les classes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Toutes les classes</SelectItem>
                {classes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterMonth} onValueChange={setFilterMonth}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Tous les mois" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tous les mois</SelectItem>
                {months.map((m) => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Tabs>

      {/* Payments Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un élève..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredPayments.length === 0 ? (
            <div className="text-center py-8">
              <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">Aucun paiement trouvé</p>
            </div>
          ) : (
            <ScrollArea className="max-h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Élève</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead>Mois</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Méthode</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments.map((p) => {
                    const status = statusConfig[p.status] || statusConfig.pending;
                    const StatusIcon = status.icon;
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">
                          {p.student?.fullName || 'Inconnu'}
                        </TableCell>
                        <TableCell className="font-semibold">
                          {Number(p.amount).toLocaleString()} USD
                        </TableCell>
                        <TableCell>{p.month || '—'}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={status.color}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="capitalize">{p.method || '—'}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {p.createdAt ? new Date(p.createdAt).toLocaleDateString('fr-FR') : '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleUpdateStatus(p.id, 'paid')}>
                                <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                                Marquer payé
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleUpdateStatus(p.id, 'pending')}>
                                <Clock className="h-4 w-4 mr-2 text-yellow-600" />
                                Marquer en attente
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleUpdateStatus(p.id, 'overdue')}>
                                <AlertTriangle className="h-4 w-4 mr-2 text-red-600" />
                                Marquer en retard
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Create Payment Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nouveau paiement</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="pay-student">Élève *</Label>
              <Select value={formStudentId} onValueChange={setFormStudentId}>
                <SelectTrigger id="pay-student">
                  <SelectValue placeholder="Sélectionner un élève" />
                </SelectTrigger>
                <SelectContent>
                  {students.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pay-amount">Montant (USD) *</Label>
              <Input
                id="pay-amount"
                type="number"
                min="0"
                step="0.01"
                value={formAmount}
                onChange={(e) => setFormAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pay-month">Mois</Label>
              <Select value={formMonth} onValueChange={setFormMonth}>
                <SelectTrigger id="pay-month">
                  <SelectValue placeholder="Sélectionner un mois" />
                </SelectTrigger>
                <SelectContent>
                  {months.map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pay-status">Statut</Label>
                <Select value={formStatus} onValueChange={setFormStatus}>
                  <SelectTrigger id="pay-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">En attente</SelectItem>
                    <SelectItem value="paid">Payé</SelectItem>
                    <SelectItem value="overdue">En retard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pay-method">Méthode</Label>
                <Select value={formMethod} onValueChange={setFormMethod}>
                  <SelectTrigger id="pay-method">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="virement">Virement</SelectItem>
                    <SelectItem value="mobile">Mobile Money</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
              {submitting ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
