'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAppStore } from '@/lib/store';
import type { RessourceInfo } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Library, Search, Plus, Star, ExternalLink, FileText, Video, Link2, Pencil, Trash2, Clock, Filter } from 'lucide-react';

type ResType = 'LIEN' | 'VIDEO' | 'PDF' | 'FICHIER';

const TYPE_META: Record<ResType, { label: string; icon: any; color: string }> = {
  LIEN: { label: 'Lien', icon: Link2, color: 'text-sky-500' },
  VIDEO: { label: 'Vidéo', icon: Video, color: 'text-rose-500' },
  PDF: { label: 'PDF', icon: FileText, color: 'text-red-500' },
  FICHIER: { label: 'Fichier', icon: FileText, color: 'text-emerald-500' },
};

export default function LibraryHub() {
  const { user } = useAppStore();
  const isManager = user?.role === 'ADMIN' || user?.role === 'TEACHER';

  const [resources, setResources] = useState<RessourceInfo[]>([]);
  const [facets, setFacets] = useState<{ matiere: string[]; niveau: string[]; category: string[]; type: string[] }>({ matiere: [], niveau: [], category: [], type: [] });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'catalogue' | 'favoris' | 'recents'>('catalogue');

  const [q, setQ] = useState('');
  const [matiere, setMatiere] = useState('');
  const [niveau, setNiveau] = useState('');
  const [category, setCategory] = useState('');
  const [type, setType] = useState('');

  const [recents, setRecents] = useState<string[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [editRes, setEditRes] = useState<RessourceInfo | null>(null);
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState({
    title: '', description: '', matiere: '', niveau: '', category: 'Général',
    author: '', url: '', type: 'LIEN' as ResType,
    visibility: 'PUBLIC', targetRole: 'ALL', targetClassId: '',
  });
  const [fileUrl, setFileUrl] = useState('');

  const loadResources = useCallback(async (extra?: { favorites?: boolean }) => {
    if (!user?.schoolId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ schoolId: user.schoolId, userId: user.id, role: user.role });
      if (q.trim()) params.set('q', q.trim());
      if (matiere) params.set('matiere', matiere);
      if (niveau) params.set('niveau', niveau);
      if (category) params.set('category', category);
      if (type) params.set('type', type);
      if (extra?.favorites || tab === 'favoris') params.set('favorites', '1');
      const res = await fetch(`/api/resources?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setResources(data.resources || []);
        setFacets(data.facets || { matiere: [], niveau: [], category: [], type: [] });
      }
    } finally {
      setLoading(false);
    }
  }, [user?.schoolId, user?.id, user?.role, q, matiere, niveau, category, type, tab]);

  useEffect(() => {
    if (tab !== 'recents') loadResources();
  }, [loadResources, tab]);

  const openResource = (r: RessourceInfo) => {
    const target = r.type === 'LIEN' || r.type === 'VIDEO' ? r.url : r.fileUrl;
    if (target) window.open(target, '_blank');
    setRecents((prev) => [r.id, ...prev.filter((id) => id !== r.id)].slice(0, 8));
  };

  const toggleFavorite = async (r: RessourceInfo) => {
    if (!user) return;
    try {
      if (r.isFavorite) {
        await fetch(`/api/resources/${r.id}/favorite?userId=${user.id}`, { method: 'DELETE' });
      } else {
        await fetch(`/api/resources/${r.id}/favorite`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user.id }) });
      }
      setResources((prev) => prev.map((x) => (x.id === r.id ? { ...x, isFavorite: !x.isFavorite } : x)));
      if (tab === 'favoris') loadResources({ favorites: true });
    } catch {
      toast.error('Erreur favori.');
    }
  };

  const resetForm = () => {
    setForm({ title: '', description: '', matiere: '', niveau: '', category: 'Général', author: '', url: '', type: 'LIEN', visibility: 'PUBLIC', targetRole: 'ALL', targetClassId: '' });
    setFileUrl('');
  };

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/resources/upload', { method: 'POST', body: fd });
      if (res.ok) {
        const data = await res.json();
        setFileUrl(data.url);
        toast.success('Fichier téléversé.');
      } else {
        toast.error('Échec du téléversement.');
      }
    } finally {
      setUploading(false);
    }
  };

  const submitAdd = async () => {
    if (!user?.schoolId || !form.title.trim()) {
      toast.error('Le titre est requis.');
      return;
    }
    if ((form.type === 'LIEN' || form.type === 'VIDEO') && !form.url.trim()) {
      toast.error('L\'URL est requise pour ce type.');
      return;
    }
    if ((form.type === 'PDF' || form.type === 'FICHIER') && !fileUrl) {
      toast.error('Veuillez joindre un fichier.');
      return;
    }
    try {
      const res = await fetch('/api/resources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolId: user.schoolId,
          createdById: user.id,
          title: form.title,
          description: form.description,
          matiere: form.matiere,
          niveau: form.niveau,
          category: form.category,
          author: form.author,
          url: form.url,
          fileUrl,
          type: form.type,
          visibility: form.visibility,
          targetRole: form.targetRole,
          targetClassId: form.targetClassId,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        toast.success('Ressource ajoutée.' + (form.description ? '' : ' Description générée par Gradie.'));
        setAddOpen(false);
        resetForm();
        setEditRes(data.resource);
        loadResources();
      } else {
        toast.error('Erreur lors de l\'ajout.');
      }
    } catch {
      toast.error('Erreur de connexion.');
    }
  };

  const submitEdit = async () => {
    if (!editRes) return;
    try {
      const res = await fetch(`/api/resources/${editRes.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title, description: form.description, matiere: form.matiere,
          niveau: form.niveau, category: form.category, author: form.author, url: form.url,
          fileUrl: editRes.fileUrl || fileUrl, type: form.type, visibility: form.visibility,
          targetRole: form.targetRole, targetClassId: form.targetClassId,
        }),
      });
      if (res.ok) {
        toast.success('Ressource mise à jour.');
        setEditRes(null);
        resetForm();
        loadResources();
      } else {
        toast.error('Erreur de mise à jour.');
      }
    } catch {
      toast.error('Erreur de connexion.');
    }
  };

  const removeRes = async (id: string) => {
    if (!confirm('Supprimer cette ressource ?')) return;
    try {
      await fetch(`/api/resources/${id}`, { method: 'DELETE' });
      setResources((prev) => prev.filter((r) => r.id !== id));
      toast.success('Ressource supprimée.');
    } catch {
      toast.error('Erreur de suppression.');
    }
  };

  const openEdit = (r: RessourceInfo) => {
    setForm({
      title: r.title, description: r.description, matiere: r.matiere, niveau: r.niveau,
      category: r.category, author: r.author, url: r.url, type: r.type as ResType,
      visibility: r.visibility, targetRole: r.targetRole, targetClassId: r.targetClassId,
    });
    setFileUrl(r.fileUrl);
    setEditRes(r);
  };

  const recentResources = recents.map((id) => resources.find((r) => r.id === id)).filter(Boolean) as RessourceInfo[];

  const ResourceCard = ({ r }: { r: RessourceInfo }) => {
    const meta = TYPE_META[(r.type as ResType) || 'LIEN'];
    const Icon = meta.icon;
    return (
      <Card className="flex flex-col hover:shadow-md transition-shadow">
        <CardContent className="flex-1 flex flex-col gap-2 p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Icon className={`w-4 h-4 ${meta.color} flex-shrink-0`} />
              <h3 className="font-semibold text-sm truncate">{r.title}</h3>
            </div>
            {isManager && (
              <div className="flex gap-1 flex-shrink-0">
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(r)}><Pencil className="w-3.5 h-3.5" /></Button>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500" onClick={() => removeRes(r.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
              </div>
            )}
          </div>
          {r.description && <p className="text-xs text-muted-foreground line-clamp-3">{r.description}</p>}
          <div className="flex flex-wrap gap-1">
            {r.matiere && <Badge variant="secondary" className="text-[10px] font-normal">{r.matiere}</Badge>}
            {r.niveau && <Badge variant="outline" className="text-[10px] font-normal">{r.niveau}</Badge>}
            {r.category && <Badge variant="outline" className="text-[10px] font-normal">{r.category}</Badge>}
          </div>
          <div className="flex items-center gap-2 mt-auto pt-1">
            <Button size="sm" className="flex-1 bg-blue-600 hover:bg-blue-700" onClick={() => openResource(r)}>
              <ExternalLink className="w-3 h-3 mr-1" /> Ouvrir
            </Button>
            <Button size="icon" variant={r.isFavorite ? 'default' : 'outline'} className={r.isFavorite ? 'text-yellow-500' : ''} onClick={() => toggleFavorite(r)}>
              <Star className="w-4 h-4" fill={r.isFavorite ? 'currentColor' : 'none'} />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Bibliothèque Numérique</h2>
          <p className="text-muted-foreground">Ressources pédagogiques centralisées et organisées.</p>
        </div>
        {isManager && (
          <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => { resetForm(); setEditRes(null); setAddOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" /> Ajouter une ressource
          </Button>
        )}
      </div>

      {/* Filtres */}
      <div className="flex flex-col lg:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Rechercher une ressource…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Select value={matiere || 'all'} onValueChange={(v) => setMatiere(v === 'all' ? '' : v)}>
          <SelectTrigger className="lg:w-44"><SelectValue placeholder="Matière" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes matières</SelectItem>
            {[...new Set(facets.matiere)].filter(Boolean).map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={niveau || 'all'} onValueChange={(v) => setNiveau(v === 'all' ? '' : v)}>
          <SelectTrigger className="lg:w-40"><SelectValue placeholder="Niveau" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous niveaux</SelectItem>
            {[...new Set(facets.niveau)].filter(Boolean).map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={type || 'all'} onValueChange={(v) => setType(v === 'all' ? '' : v)}>
          <SelectTrigger className="lg:w-36"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous types</SelectItem>
            <SelectItem value="LIEN">Lien</SelectItem>
            <SelectItem value="VIDEO">Vidéo</SelectItem>
            <SelectItem value="PDF">PDF</SelectItem>
            <SelectItem value="FICHIER">Fichier</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList>
          <TabsTrigger value="catalogue">Catalogue</TabsTrigger>
          <TabsTrigger value="favoris">Favoris</TabsTrigger>
          <TabsTrigger value="recents"><Clock className="w-3.5 h-3.5 mr-1" />Récents</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4">
          {loading ? (
            <div className="py-8 text-center text-muted-foreground">Chargement…</div>
          ) : (tab === 'recents' ? recentResources : resources).length === 0 ? (
            <div className="py-12 flex flex-col items-center text-center">
              <Library className="w-12 h-12 text-blue-500 mb-3" />
              <h3 className="text-lg font-semibold">Aucune ressource</h3>
              <p className="text-muted-foreground max-w-sm mt-1">
                {tab === 'favoris' ? 'Vous n\'avez pas encore de favoris.' : 'Aucune ressource ne correspond à votre recherche.'}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {(tab === 'recents' ? recentResources : resources).map((r) => <ResourceCard key={r.id} r={r} />)}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialog Ajout / Édition */}
      <Dialog open={addOpen || !!editRes} onOpenChange={(o) => { if (!o) { setAddOpen(false); setEditRes(null); } }}>
        <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editRes ? 'Modifier la ressource' : 'Ajouter une ressource'}</DialogTitle>
            <DialogDescription>
              {editRes ? 'Ajustez les informations, y compris la description générée par Gradie.' : 'Laissez la description vide pour que Gradie la génère automatiquement.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="space-y-1">
              <Label>Titre *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex: Cours de fractions" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as ResType })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LIEN">Lien</SelectItem>
                    <SelectItem value="VIDEO">Vidéo</SelectItem>
                    <SelectItem value="PDF">PDF</SelectItem>
                    <SelectItem value="FICHIER">Fichier</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Catégorie</Label>
                <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Ex: Mathématiques" />
              </div>
            </div>

            {form.type === 'LIEN' || form.type === 'VIDEO' ? (
              <div className="space-y-1">
                <Label>URL {form.type === 'VIDEO' ? 'de la vidéo' : 'du lien'} *</Label>
                <Input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://…" />
              </div>
            ) : (
              <div className="space-y-1">
                <Label>Fichier {fileUrl ? '(téléversé ✓)' : '*'}</Label>
                <Input type="file" accept=".pdf,.docx,.txt,.jpg,.jpeg,.png" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} disabled={uploading} />
                {uploading && <p className="text-xs text-muted-foreground">Téléversement…</p>}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Matière</Label>
                <Input value={form.matiere} onChange={(e) => setForm({ ...form, matiere: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Niveau scolaire</Label>
                <Input value={form.niveau} onChange={(e) => setForm({ ...form, niveau: e.target.value })} placeholder="Ex: 6ème" />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Auteur</Label>
              <Input value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Description {editRes ? '(Gradie)' : '(auto si vide)'}</Label>
              <textarea className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="La description sera générée par Gradie si laissée vide…" />
            </div>
            {isManager && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Visibilité</Label>
                  <Select value={form.visibility} onValueChange={(v) => setForm({ ...form, visibility: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PUBLIC">Public</SelectItem>
                      <SelectItem value="ROLE">Par rôle</SelectItem>
                      <SelectItem value="CLASS">Par classe</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Cible (rôle)</Label>
                  <Select value={form.targetRole} onValueChange={(v) => setForm({ ...form, targetRole: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">Tous</SelectItem>
                      <SelectItem value="TEACHER">Professeurs</SelectItem>
                      <SelectItem value="STUDENT">Élèves</SelectItem>
                      <SelectItem value="PARENT">Parents</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAddOpen(false); setEditRes(null); resetForm(); }}>Annuler</Button>
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={editRes ? submitEdit : submitAdd} disabled={uploading}>
              {editRes ? 'Enregistrer' : 'Ajouter'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
