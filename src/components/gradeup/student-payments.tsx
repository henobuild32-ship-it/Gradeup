'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import type { PaymentInfo, PaymentStatus } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CreditCard, CheckCircle, Clock, AlertCircle, Receipt } from 'lucide-react';

export default function StudentPayments() {
  const user = useAppStore((s) => s.user);
  const [payments, setPayments] = useState<PaymentInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.schoolId || !user?.id) return;
    const fetchPayments = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/payments?schoolId=${user.schoolId}&studentId=${user.id}`);
        const data = await res.json();
        const sorted = (Array.isArray(data) ? data : []).sort(
          (a: PaymentInfo, b: PaymentInfo) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setPayments(sorted);
      } catch (err) {
        console.error('Erreur chargement paiements:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPayments();
  }, [user?.schoolId, user?.id]);

  const paidCount = payments.filter((p) => p.status === 'paid').length;
  const pendingCount = payments.filter((p) => p.status === 'pending').length;
  const overdueCount = payments.filter((p) => p.status === 'overdue').length;
  const totalPaid = payments
    .filter((p) => p.status === 'paid')
    .reduce((sum, p) => sum + p.amount, 0);
  const currency = user?.school?.currency || 'FCFA';

  const getStatusBadge = (status: PaymentStatus) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-700 border-green-200">Payé</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">En attente</Badge>;
      case 'overdue':
        return <Badge className="bg-red-100 text-red-700 border-red-200">En retard</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getStatusIcon = () => {
    if (overdueCount > 0) {
      return (
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
          <AlertCircle className="h-8 w-8 text-red-600" />
        </div>
      );
    }
    if (pendingCount > 0) {
      return (
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-yellow-100">
          <Clock className="h-8 w-8 text-yellow-600" />
        </div>
      );
    }
    return (
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
        <CheckCircle className="h-8 w-8 text-green-600" />
      </div>
    );
  };

  const getStatusText = () => {
    if (overdueCount > 0) return 'Paiements en retard';
    if (pendingCount > 0) return 'Paiements en attente';
    if (payments.length > 0) return 'Tous les paiements sont à jour';
    return 'Aucun paiement enregistré';
  };

  const getStatusDescription = () => {
    if (overdueCount > 0) return `Vous avez ${overdueCount} paiement(s) en retard. Veuillez régulariser votre situation.`;
    if (pendingCount > 0) return `Vous avez ${pendingCount} paiement(s) en attente de traitement.`;
    if (payments.length > 0) return `Vous avez effectué ${paidCount} paiement(s) d'un montant total de ${totalPaid.toLocaleString('fr-FR')} ${currency}.`;
    return 'Aucun paiement n\'a été enregistré pour le moment.';
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Mes paiements</h1>
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Mes paiements</h1>
        <p className="text-muted-foreground mt-1">
          Suivez l&apos;état de vos paiements scolaires
        </p>
      </div>

      {/* Status Card */}
      <Card className="bg-gradient-to-r from-blue-50 to-blue-100/50 border-blue-200">
        <CardContent className="flex items-center gap-6">
          {getStatusIcon()}
          <div className="flex-1">
            <h3 className="text-xl font-bold">{getStatusText()}</h3>
            <p className="text-sm text-muted-foreground mt-1">{getStatusDescription()}</p>
          </div>
          <div className="hidden sm:flex items-center gap-4 text-sm">
            <div className="text-center">
              <p className="text-lg font-bold text-green-600">{paidCount}</p>
              <p className="text-xs text-muted-foreground">Payé(s)</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-yellow-600">{pendingCount}</p>
              <p className="text-xs text-muted-foreground">En attente</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-red-600">{overdueCount}</p>
              <p className="text-xs text-muted-foreground">En retard</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-blue-500" />
            Historique des paiements
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {payments.length === 0 ? (
            <div className="text-center py-12">
              <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-lg font-medium">Aucun paiement</p>
              <p className="text-sm text-muted-foreground mt-1">
                Aucun paiement enregistré pour le moment.
              </p>
            </div>
          ) : (
            <ScrollArea className="max-h-96">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">Mois</TableHead>
                    <TableHead className="text-center">Montant</TableHead>
                    <TableHead className="text-center">Statut</TableHead>
                    <TableHead className="hidden sm:table-cell text-center">Méthode</TableHead>
                    <TableHead className="hidden sm:table-cell">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="pl-6 font-medium">{payment.month}</TableCell>
                      <TableCell className="text-center font-semibold">
                        {payment.amount.toLocaleString('fr-FR')} {currency}
                      </TableCell>
                      <TableCell className="text-center">
                        {getStatusBadge(payment.status)}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-center text-muted-foreground">
                        {payment.method || '—'}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">
                        {formatDate(payment.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
