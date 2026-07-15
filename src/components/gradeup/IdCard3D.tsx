'use client';

import { useState, useRef, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  User, School, BookOpen, GraduationCap, Calendar,
  Shield, MapPin, Phone, Mail, Hash, Download, RotateCw,
  Droplets, Heart, FileText, PhoneCall, Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { toPng } from 'html-to-image';

interface CardUser {
  id: string;
  fullName: string;
  email?: string;
  postName?: string;
  gender?: string;
  birthDate?: string;
  matricule?: string;
  ine?: string;
  phone?: string;
  parentPhone?: string;
  parentEmail?: string;
  address?: string;
  academicYear?: string;
  section?: string;
  photoUrl?: string;
  cardId?: string;
  bloodType?: string;
  nationality?: string;
  tuteur?: string;
  contactTuteur?: string;
  allergies?: string;
  assurance?: string;
  role?: string;
  roleLabel?: string;
  className?: string;
  courseName?: string;
}

interface CardSchool {
  name: string;
  logoUrl?: string | null;
  color?: string;
  email?: string;
  province?: string;
  city?: string;
  commune?: string;
  academicYear?: string;
}

interface IdCard3DProps {
  user: CardUser;
  school: CardSchool;
  role: 'STUDENT' | 'TEACHER';
}

function getAge(birthDateStr?: string): number | null {
  if (!birthDateStr) return null;
  const m = birthDateStr.match(/(\d{4})/);
  if (m) {
    const y = parseInt(m[1]);
    if (y > 1900 && y <= new Date().getFullYear()) return new Date().getFullYear() - y;
  }
  return null;
}

const CARD_W = 850;
const CARD_H = 530;
const BAND_H = 6;

export default function IdCard3D({ user, school, role }: IdCard3DProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const validLogo = school.logoUrl && !logoError;
  const color = school.color || '#2563eb';
  const age = getAge(user.birthDate);
  const qrUrl = `https://gradeup.ci/carte/${user.matricule || user.id}`;
  const genderLabel = user.gender === 'M' ? 'Masculin' : user.gender === 'F' ? 'Féminin' : user.gender || '';

  const handleFlip = () => setIsFlipped(!isFlipped);

  const handleDownload = useCallback(async () => {
    if (!cardRef.current) return;
    setDownloading(true);
    try {
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 3,
        style: { transform: 'none', borderRadius: '0' },
      });
      const link = document.createElement('a');
      const name = user.fullName.replace(/\s+/g, '-').toLowerCase();
      link.download = `carte-${name}-${user.matricule || user.id}.png`;
      link.href = dataUrl;
      link.click();
      toast.success('Carte téléchargée avec succès !');
    } catch {
      toast.error('Erreur lors du téléchargement');
    } finally {
      setDownloading(false);
    }
  }, [user, cardRef]);

  const Field = ({ icon: Icon, label, value }: { icon: any; label: string; value?: string | null }) =>
    value ? (
      <div className="flex items-center gap-1.5 text-[10px]">
        <Icon className="w-3 h-3 shrink-0" style={{ color }} />
        <span className="text-slate-500 font-medium min-w-[60px]">{label} :</span>
        <span className="text-slate-800 font-semibold truncate">{value}</span>
      </div>
    ) : null;

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-[500px] mx-auto">
      <div
        className="relative w-full cursor-pointer"
        style={{ perspective: '1200px', aspectRatio: `${CARD_W}/${CARD_H}` }}
        onClick={handleFlip}
      >
        <div
          ref={cardRef}
          className="relative w-full h-full transition-transform duration-700 ease-out"
          style={{ transformStyle: 'preserve-3d', transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
        >
          {/* ────────── RECTO ────────── */}
          <div
            className="absolute inset-0 rounded-xl overflow-hidden shadow-2xl bg-white border border-slate-200 flex flex-col"
            style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
          >
            {/* Bandeau couleur */}
            <div className="shrink-0" style={{ height: BAND_H, backgroundColor: color }} />

            {/* Watermark logo */}
            {validLogo && (
              <div
                className="absolute inset-0 pointer-events-none opacity-[0.08] flex items-center justify-center bg-center bg-no-repeat"
                style={{ backgroundImage: `url(${school.logoUrl})`, backgroundSize: '300px', top: BAND_H }}
              />
            )}

            <div className="flex-1 flex p-4 gap-5 relative z-10 min-h-0">
              {/* Photo */}
              <div className="flex flex-col items-center gap-1.5 shrink-0 self-start">
                <div className="w-28 h-32 rounded-lg border-2 overflow-hidden bg-slate-100 flex items-center justify-center shadow-sm" style={{ borderColor: color + '40' }}>
                  {user.photoUrl ? (
                    <img src={user.photoUrl} alt={user.fullName} className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center gap-1 text-slate-400">
                      <User className="w-8 h-8" />
                      <span className="text-[8px] font-semibold">{user.fullName?.charAt(0) || '?'}</span>
                    </div>
                  )}
                </div>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full text-white text-center w-full" style={{ backgroundColor: color }}>
                  {user.roleLabel || (role === 'TEACHER' ? 'Enseignant' : 'Élève')}
                </span>
              </div>

              {/* Infos */}
              <div className="flex-1 min-w-0 flex flex-col justify-between gap-0.5">
                <div>
                  <h2 className="text-sm font-black text-slate-900 leading-tight uppercase truncate">{user.fullName}</h2>
                  {user.postName && <p className="text-[10px] text-slate-500 truncate">{user.postName}</p>}
                </div>

                <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px] mt-1">
                  {role === 'STUDENT' && user.className && (
                    <div className="flex items-center gap-1.5">
                      <GraduationCap className="w-3 h-3 shrink-0" style={{ color }} />
                      <span className="text-slate-500">Classe :</span>
                      <span className="text-slate-800 font-semibold truncate">{user.className}</span>
                    </div>
                  )}
                  {role === 'TEACHER' && user.courseName && (
                    <div className="flex items-center gap-1.5">
                      <BookOpen className="w-3 h-3 shrink-0" style={{ color }} />
                      <span className="text-slate-500">Matière :</span>
                      <span className="text-slate-800 font-semibold truncate">{user.courseName}</span>
                    </div>
                  )}
                  {user.section && (
                    <div className="flex items-center gap-1.5">
                      <BookOpen className="w-3 h-3 shrink-0" style={{ color }} />
                      <span className="text-slate-500">Section :</span>
                      <span className="text-slate-800 font-semibold truncate">{user.section}</span>
                    </div>
                  )}
                </div>

                <div className="border-t border-slate-100 pt-1 mt-0.5 grid grid-cols-2 gap-x-3 gap-y-0.5">
                  <Field icon={Calendar} label="Né(e) le" value={user.birthDate} />
                  {age !== null && <Field icon={Calendar} label="Âge" value={`${age} ans`} />}
                  <Field icon={User} label="Sexe" value={genderLabel} />
                  <Field icon={Hash} label="Matricule" value={user.matricule} />
                  <Field icon={Shield} label="INE" value={user.ine} />
                  <Field icon={Phone} label="Téléphone" value={user.phone} />
                  <Field icon={Mail} label="Email" value={user.email} />
                  <Field icon={MapPin} label="Adresse" value={user.address} />
                  <Field icon={Users} label="Tuteur" value={user.tuteur} />
                  <Field icon={PhoneCall} label="Contact Tuteur" value={user.contactTuteur} />
                  <Field icon={Droplets} label="Gp. Sanguin" value={user.bloodType} />
                  <Field icon={Heart} label="Allergies" value={user.allergies} />
                  <Field icon={FileText} label="Assurance" value={user.assurance} />
                </div>
              </div>

              {/* QR Code column */}
              <div className="flex flex-col items-center justify-center gap-1 shrink-0 self-center">
                <div className="bg-white p-1 rounded-lg shadow-md border border-slate-200">
                  {user.matricule || user.id ? (
                    <QRCodeSVG value={qrUrl} size={64} level="M" />
                  ) : (
                    <div className="w-16 h-16 bg-slate-100 flex items-center justify-center rounded">
                      <span className="text-[6px] text-slate-400 text-center leading-tight">QR</span>
                    </div>
                  )}
                </div>
                <span className="text-[6px] text-slate-400 text-center leading-tight max-w-[80px]">Scannez pour vérifier</span>
              </div>
            </div>

            {/* Footer */}
            <div className="shrink-0 flex items-center justify-between px-4 py-1.5 border-t border-slate-100 bg-slate-50/80">
              <div className="flex items-center gap-1.5 min-w-0">
                {validLogo ? (
                  <img src={school.logoUrl!} alt="" className="w-4 h-4 object-contain rounded" onError={() => setLogoError(true)} />
                ) : (
                  <School className="w-4 h-4 shrink-0" style={{ color }} />
                )}
                <span className="text-[8px] text-slate-600 font-semibold truncate max-w-[200px]">{school.name}</span>
              </div>
              <span className="text-[8px] text-slate-400 font-mono shrink-0">{school.academicYear || user.academicYear || new Date().getFullYear() + '-' + (new Date().getFullYear() + 1)}</span>
            </div>
          </div>

          {/* ────────── VERSO ────────── */}
          <div
            className="absolute inset-0 rounded-xl overflow-hidden shadow-2xl bg-white border border-slate-200 flex flex-col items-center justify-center"
            style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
          >
            <div className="shrink-0 w-full" style={{ height: BAND_H, backgroundColor: color }} />

            {validLogo ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8">
                <div className="w-40 h-40 rounded-2xl border border-slate-200 bg-white flex items-center justify-center p-2 shadow-lg">
                  <img src={school.logoUrl!} alt={school.name} className="max-w-full max-h-full object-contain" />
                </div>
                <h3 className="text-lg font-black text-slate-800 text-center uppercase tracking-wide">{school.name}</h3>
                <p className="text-[11px] text-slate-400 font-medium">Carte Officielle • GradeUp Platform</p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8">
                <School className="w-20 h-20 text-slate-200" />
                <p className="text-sm text-slate-300 font-medium">{school.name}</p>
                <p className="text-[11px] text-slate-300">Carte Officielle • GradeUp Platform</p>
              </div>
            )}

            <div className="shrink-0 w-full" style={{ height: BAND_H, backgroundColor: color }} />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2 justify-center w-full max-w-[400px]">
        <Button variant="outline" size="sm" onClick={handleFlip} className="gap-1.5 border-slate-300">
          <RotateCw className="w-4 h-4" />
          Retourner
        </Button>
        <Button variant="default" size="sm" onClick={handleDownload} disabled={downloading} className="gap-1.5" style={{ backgroundColor: color }}>
          <Download className="w-4 h-4" />
          {downloading ? 'Téléchargement...' : 'Télécharger PNG'}
        </Button>
      </div>
    </div>
  );
}
