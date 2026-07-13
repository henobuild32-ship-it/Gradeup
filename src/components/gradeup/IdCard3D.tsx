'use client';

import React, { useState, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { 
  User, School, BookOpen, GraduationCap, Calendar, 
  Shield, MapPin, Phone, Mail, Hash, Download, RotateCw, CheckCircle2 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { toPng } from 'html-to-image';

interface StudentOrTeacher {
  id: string;
  fullName: string;
  email?: string; // Teacher or student email
  postName?: string;
  gender?: string;
  birthDate?: string;
  matricule?: string;
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
  role?: string; // STUDENT or TEACHER
  className?: string; // If student
  courseName?: string; // If teacher (main subject)
}

interface IdCard3DProps {
  user: StudentOrTeacher;
  schoolName: string;
  schoolLogo?: string; // Base64 or URL
  schoolEmail?: string;   // optional — shown on verso
  schoolAddress?: string; // optional — shown on verso
  role: 'STUDENT' | 'TEACHER';
}

export default function IdCard3D({ user, schoolName, schoolLogo, schoolEmail, schoolAddress, role }: IdCard3DProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [downloadingRecto, setDownloadingRecto] = useState(false);
  const [downloadingVerso, setDownloadingVerso] = useState(false);
  
  const rectoRef = useRef<HTMLDivElement>(null);
  const versoRef = useRef<HTMLDivElement>(null);

  const cardExpiry = new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toLocaleDateString('fr-FR');
  const roleLabel = role === 'TEACHER' ? 'Professeur' : 'Élève';

  // Helper to parse birth year and compute age relative to 2026
  const getAgeIn2026 = (birthDateStr?: string) => {
    if (!birthDateStr) return null;
    const match = birthDateStr.match(/(\d{4})/);
    if (match) {
      const year = parseInt(match[1]);
      if (year > 1900 && year <= 2026) {
        return 2026 - year;
      }
    }
    const parts = birthDateStr.split(/[-/.]/);
    for (const part of parts) {
      const p = parseInt(part);
      if (p > 1900 && p <= 2026) {
        return 2026 - p;
      }
    }
    return null;
  };

  const ageVal = getAgeIn2026(user.birthDate);

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleDownloadSide = async (side: 'recto' | 'verso') => {
    const ref = side === 'recto' ? rectoRef : versoRef;
    const setLoader = side === 'recto' ? setDownloadingRecto : setDownloadingVerso;
    
    if (!ref.current) return;
    
    setLoader(true);
    try {
      // Attendre un court instant que le DOM soit stable
      await new Promise((resolve) => setTimeout(resolve, 100));
      
      const dataUrl = await toPng(ref.current, {
        cacheBust: true,
        pixelRatio: 2, // Double resolution for HD print quality
        style: {
          transform: 'none', // reset transform if any
          borderRadius: '16px', // Keep corners rounded
        }
      });
      
      const link = document.createElement('a');
      link.download = `carte-${user.fullName.replace(/\s+/g, '-').toLowerCase()}-${side}.png`;
      link.href = dataUrl;
      link.click();
      toast.success(`Face ${side.toUpperCase()} téléchargée avec succès !`);
    } catch (error) {
      console.error(error);
      toast.error(`Erreur lors du téléchargement de la face ${side}`);
    } finally {
      setLoader(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-[500px] mx-auto">
      {/* 3D Card Wrapper Container */}
      <div 
        className="w-full relative cursor-pointer group"
        style={{ perspective: '1200px' }}
        onClick={handleFlip}
      >
        {/* Card Inner Container */}
        <div 
          className="relative w-full h-[320px] transition-transform duration-700 ease-out"
          style={{ 
            transformStyle: 'preserve-3d',
            transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
          }}
        >
          {/* ────────────────── RECTO (FACE A) ────────────────── */}
          <div 
            ref={rectoRef}
            className="absolute inset-0 w-full h-full rounded-2xl overflow-hidden shadow-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 border border-white/10 flex flex-col justify-between"
            style={{ 
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              transform: 'rotateY(0deg)'
            }}
          >
            {/* School Watermark Logo in Background */}
            {schoolLogo && (
              <div 
                className="absolute inset-0 pointer-events-none opacity-[0.04] flex items-center justify-center bg-center bg-no-repeat transition-all duration-300"
                style={{ 
                  backgroundImage: `url(${schoolLogo})`,
                  backgroundSize: '220px',
                }}
              />
            )}

            {role === 'TEACHER' ? (
              // ──────── TEACHER RECTO ────────
              <>
                {/* Top Header */}
                <div className="relative px-6 pt-4 pb-2.5 border-b border-white/5 bg-black/30 backdrop-blur-sm flex justify-between items-center">
                  <div className="flex items-center gap-2 min-w-0">
                    {schoolLogo ? (
                      <img src={schoolLogo} alt="logo" className="w-5 h-5 object-contain rounded" />
                    ) : (
                      <School className="w-5 h-5 text-blue-400" />
                    )}
                    <div className="min-w-0">
                      <h3 className="font-extrabold text-xs tracking-tight text-white/95 uppercase truncate max-w-[180px]">{schoolName}</h3>
                      <p className="text-[7.5px] text-blue-300/80 font-bold tracking-widest uppercase">Établissement Scolaire</p>
                    </div>
                  </div>

                  <div className="text-right bg-white/5 border border-white/10 px-2 py-0.5 rounded shrink-0">
                    <p className="text-[6px] uppercase tracking-wider text-blue-200/70 font-semibold">Formation</p>
                    <p className="text-[10px] font-black text-white">2026</p>
                  </div>
                </div>

                {/* Body */}
                <div className="relative flex-1 px-6 py-4 flex gap-5 items-center">
                  {/* Left: Photo */}
                  <div className="flex flex-col items-center gap-2 shrink-0">
                    <div className="relative">
                      <div className="w-24 h-24 rounded-2xl border-2 border-amber-500/30 shadow-lg overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
                        {user.photoUrl ? (
                          <img src={user.photoUrl} alt={user.fullName} className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-10 h-10 text-white/30" />
                        )}
                      </div>
                      <div className="absolute -bottom-1 -right-1 bg-amber-500 rounded-full p-0.5 border border-slate-900 shadow-md">
                        <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                      </div>
                    </div>
                    <span className="text-[8px] font-extrabold uppercase tracking-widest bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded px-2 py-0.5">
                      Professeur
                    </span>
                  </div>

                  {/* Right: Info */}
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div>
                      <h2 className="text-base font-black text-white leading-tight truncate uppercase">{user.fullName}</h2>
                      {user.postName && <p className="text-xs text-amber-300/70 truncate">{user.postName}</p>}
                    </div>

                    <div className="space-y-1 text-left text-[9px] text-white/80">
                      {user.phone && (
                        <div className="flex items-center gap-1.5 truncate">
                          <Phone className="w-3 h-3 text-amber-400 shrink-0" />
                          <span>{user.phone}</span>
                        </div>
                      )}
                      {user.email && (
                        <div className="flex items-center gap-1.5 truncate">
                          <Mail className="w-3 h-3 text-amber-400 shrink-0" />
                          <span>{user.email}</span>
                        </div>
                      )}
                      {user.courseName && (
                        <div className="flex items-center gap-1.5 truncate">
                          <BookOpen className="w-3 h-3 text-amber-400 shrink-0" />
                          <span>Matière : <strong className="text-white">{user.courseName}</strong></span>
                        </div>
                      )}
                      {user.birthDate && (
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3 h-3 text-amber-400 shrink-0" />
                          <span>Né(e) le {user.birthDate} {ageVal !== null && <span className="text-amber-300 font-bold">({ageVal} ans)</span>}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-2.5 border-t border-white/5 bg-black/40 backdrop-blur-sm flex justify-between items-center text-[8.5px] text-white/40">
                  <div className="flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span className="font-semibold text-white/70">Carte Officielle Enseignant</span>
                  </div>
                  {user.cardId && <span className="font-mono text-white/80 bg-white/5 rounded px-1.5 py-0.5">ID: {user.cardId}</span>}
                </div>
              </>
            ) : (
              // ──────── STUDENT RECTO (FRONT COVER) ────────
              <>
                {/* Top Header */}
                <div className="relative px-6 pt-4 pb-2.5 flex justify-between items-center bg-black/10">
                  <span className="text-[7.5px] text-blue-400/80 uppercase font-black tracking-widest">GradeUp School ID</span>
                  <div className="text-right bg-white/5 border border-white/10 px-2 py-0.5 rounded shrink-0">
                    <p className="text-[6px] uppercase tracking-wider text-blue-200/70 font-semibold">Formation</p>
                    <p className="text-[10px] font-black text-white">2026</p>
                  </div>
                </div>

                {/* Center visual identity */}
                <div className="flex-1 flex flex-col items-center justify-center px-6 py-4 gap-3">
                  {schoolLogo ? (
                    <div className="w-[100px] h-[100px] rounded-3xl border border-white/10 bg-white/5 flex items-center justify-center p-1.5 shadow-[0_0_30px_rgba(59,130,246,0.15)] overflow-hidden">
                      <img src={schoolLogo} alt="Logo" className="max-w-full max-h-full object-contain" />
                    </div>
                  ) : (
                    <div className="w-[100px] h-[100px] rounded-3xl border-2 border-dashed border-white/15 bg-white/5 flex items-center justify-center shadow-lg">
                      <School className="w-12 h-12 text-white/20" />
                    </div>
                  )}

                  <div className="text-center space-y-1 max-w-[280px]">
                    <h2 className="text-white text-base font-extrabold uppercase tracking-widest truncate leading-snug">
                      {schoolName}
                    </h2>
                    <div className="inline-block px-3 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full border border-blue-400/30 text-[9px] font-black uppercase tracking-widest text-white shadow-md">
                      Carte d&apos;Identité Élève
                    </div>
                  </div>
                </div>

                {/* Bottom branding footer */}
                <div className="px-6 py-3 border-t border-white/5 bg-black/30 flex justify-between items-center text-[8.5px] text-white/30">
                  <span className="font-semibold text-white/55">RÉPUBLIQUE DÉMOCRATIQUE DU CONGO</span>
                  <span className="font-mono text-blue-400">VALIDE EN 2026</span>
                </div>
              </>
            )}
          </div>

          {/* ────────────────── VERSO (FACE B) ────────────────── */}
          <div 
            ref={versoRef}
            className="absolute inset-0 w-full h-full rounded-2xl overflow-hidden shadow-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 border border-white/10 flex flex-col justify-between"
            style={{ 
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)'
            }}
          >
            {role === 'STUDENT' ? (
              // ──────── STUDENT VERSO (INFO SIDE) ────────
              <>
                {/* Top header on Student Verso */}
                <div className="px-6 pt-3.5 pb-2 border-b border-white/5 bg-black/20 backdrop-blur-sm flex justify-between items-center">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {schoolLogo ? (
                      <img src={schoolLogo} alt="logo" className="w-4 h-4 object-contain rounded" />
                    ) : (
                      <School className="w-4 h-4 text-blue-400" />
                    )}
                    <span className="text-[9px] uppercase font-black tracking-wider text-white/90 truncate max-w-[200px]">{schoolName}</span>
                  </div>
                  <span className="text-[7.5px] text-blue-300 font-bold uppercase tracking-widest shrink-0">Profil Élève</span>
                </div>

                {/* Body with Student Info & Photo */}
                <div className="flex-1 px-6 py-3 flex gap-4 items-center">
                  {/* Left Column: Photo */}
                  <div className="flex flex-col items-center gap-1.5 shrink-0">
                    <div className="w-20 h-20 rounded-xl border border-white/20 shadow-md overflow-hidden bg-slate-800 flex items-center justify-center">
                      {user.photoUrl ? (
                        <img src={user.photoUrl} alt={user.fullName} className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-8 h-8 text-white/20" />
                      )}
                    </div>
                    <span className="text-[7.5px] font-bold tracking-widest text-blue-300 bg-blue-500/10 border border-blue-500/20 rounded px-1.5 py-0.5">
                      Élève
                    </span>
                  </div>

                  {/* Right Column: Student Info Grid */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div>
                      <h3 className="text-sm font-black text-white leading-tight truncate uppercase">{user.fullName}</h3>
                      {user.postName && <p className="text-[10px] text-blue-300/70 truncate">{user.postName}</p>}
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 text-left text-[8.5px]">
                      <div className="bg-white/5 rounded p-1 border border-white/5">
                        <p className="text-[6px] uppercase text-blue-300/60 font-bold tracking-wider">Classe</p>
                        <p className="font-bold text-white truncate">{user.className || 'Non assigné'}</p>
                      </div>

                      <div className="bg-white/5 rounded p-1 border border-white/5">
                        <p className="text-[6px] uppercase text-blue-300/60 font-bold tracking-wider">Matricule</p>
                        <p className="font-mono font-bold text-white truncate">{user.matricule || 'N/A'}</p>
                      </div>

                      {user.section && (
                        <div className="bg-white/5 rounded p-1 border border-white/5">
                          <p className="text-[6px] uppercase text-blue-300/60 font-bold tracking-wider">Section</p>
                          <p className="font-bold text-white truncate">{user.section}</p>
                        </div>
                      )}

                      <div className="bg-white/5 rounded p-1 border border-white/5">
                        <p className="text-[6px] uppercase text-blue-300/60 font-bold tracking-wider">Âge (2026)</p>
                        <p className="font-bold text-white truncate">{ageVal !== null ? `${ageVal} ans` : 'N/A'}</p>
                      </div>
                    </div>

                    <p className="text-[8px] text-white/50 flex items-center gap-1.5 mt-1">
                      <Calendar className="w-2.5 h-2.5 text-blue-400" />
                      <span>Né(e) le {user.birthDate || '—'}</span>
                    </p>
                  </div>
                </div>

                {/* Bottom Bar: legal notice + QR Code */}
                <div className="px-5 py-2.5 border-t border-white/5 bg-black/30 flex justify-between items-center gap-4">
                  <div className="space-y-0.5 flex-1 min-w-0 text-left">
                    <p className="text-[7.5px] text-white/40 leading-tight">
                      Cette carte d&apos;élève est strictement personnelle. Présentation obligatoire au sein de l&apos;école.
                    </p>
                    {user.phone && <p className="text-[7.5px] text-white/60 font-bold">Contact : {user.phone}</p>}
                  </div>
                  
                  {/* QR Code */}
                  <div className="bg-white p-0.5 rounded shadow shrink-0">
                    {user.cardId ? (
                      <QRCodeSVG value={`${user.id}-${user.cardId}`} size={44} level="M" />
                    ) : (
                      <div className="w-[44px] h-[44px] bg-slate-100 flex items-center justify-center rounded">
                        <span className="text-[6px] text-slate-400">Pas de QR</span>
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              // ──────── TEACHER VERSO (INSTITUTION SIDE) ────────
              <>
                {/* Top Bar */}
                <div className="px-6 pt-4 pb-3 border-b border-white/10 bg-black/20 backdrop-blur-sm flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    {schoolLogo ? (
                      <img src={schoolLogo} alt="logo" className="w-5 h-5 object-contain rounded" />
                    ) : (
                      <School className="w-4 h-4 text-blue-400" />
                    )}
                    <span className="text-[10px] uppercase font-bold tracking-wider text-white truncate max-w-[180px]">{schoolName}</span>
                  </div>
                  <span className="text-[8px] text-white/40 uppercase tracking-widest shrink-0">Informations Générales</span>
                </div>

                {/* Center: Logo + School Name + Contact */}
                <div className="flex-1 flex flex-col items-center justify-center px-6 py-3 relative gap-2">
                  {/* Logo */}
                  {schoolLogo ? (
                    <div className="w-[120px] h-[120px] rounded-2xl border border-white/10 bg-white/5 flex items-center justify-center overflow-hidden shadow-[0_0_24px_rgba(99,179,237,0.12)] p-1">
                      <img src={schoolLogo} alt={`Logo ${schoolName}`} className="max-w-full max-h-full object-contain" />
                    </div>
                  ) : (
                    <div className="w-[120px] h-[120px] rounded-2xl border-2 border-dashed border-white/10 bg-white/5 flex flex-col items-center justify-center gap-1">
                      <School className="w-10 h-10 text-white/20" />
                      <span className="text-[8px] text-white/20 uppercase tracking-widest">Logo</span>
                    </div>
                  )}

                  {/* School Name */}
                  <h4 className="text-white text-[11px] font-extrabold uppercase tracking-widest text-center leading-tight">
                    {schoolName}
                  </h4>

                  {/* Contact row */}
                  <div className="flex flex-col items-center gap-0.5 mt-0.5">
                    {schoolEmail && (
                      <div className="flex items-center gap-1 text-[9px] text-blue-300/70">
                        <Mail className="w-2.5 h-2.5 shrink-0" />
                        <span className="truncate max-w-[200px]">{schoolEmail}</span>
                      </div>
                    )}
                    {schoolAddress && (
                      <div className="flex items-center gap-1 text-[9px] text-blue-300/70">
                        <MapPin className="w-2.5 h-2.5 shrink-0" />
                        <span className="truncate max-w-[200px]">{schoolAddress}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Bar: Legal notice + QR Code */}
                <div className="px-5 py-3.5 border-t border-white/10 bg-black/30 backdrop-blur flex justify-between items-start gap-4">
                  <div className="space-y-1 flex-1 min-w-0 text-left">
                    <p className="text-[8px] text-white/70 font-semibold uppercase tracking-wider">Conditions d&apos;utilisation</p>
                    <p className="text-[7.5px] text-white/40 leading-tight">
                      Cette carte est strictement personnelle et incessible. Elle doit être présentée sur demande au sein de l&apos;établissement. En cas de perte, prévenez l&apos;administration.
                    </p>
                    {user.phone && (
                      <div className="flex items-center gap-1 text-[8px] text-white/60 pt-0.5">
                        <Phone className="w-2.5 h-2.5 text-blue-400 shrink-0" />
                        <span>Contact : {user.phone}</span>
                      </div>
                    )}
                  </div>
                  
                  {/* QR Code */}
                  <div className="bg-white p-1 rounded-xl shadow-md shrink-0">
                    {user.cardId ? (
                      <QRCodeSVG value={`${user.id}-${user.cardId}`} size={60} level="H" includeMargin={false} />
                    ) : (
                      <div className="w-[60px] h-[60px] bg-gray-100 rounded-lg flex items-center justify-center">
                        <span className="text-[7px] text-gray-400 text-center leading-tight">Pas de QR</span>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons underneath card */}
      <div className="flex flex-wrap gap-2 justify-center w-full max-w-[400px]">
        <Button 
          variant="outline"
          size="sm"
          onClick={handleFlip}
          className="border-white/15 bg-white/5 hover:bg-white/10 text-white gap-1.5 shadow-sm"
        >
          <RotateCw className="w-4 h-4" />
          Retourner la carte
        </Button>

        <Button 
          variant="secondary"
          size="sm"
          disabled={downloadingRecto}
          onClick={() => handleDownloadSide('recto')}
          className="gap-1.5"
        >
          <Download className="w-4 h-4" />
          {downloadingRecto ? 'Téléchargement...' : 'Télécharger Recto'}
        </Button>

        <Button 
          variant="secondary"
          size="sm"
          disabled={downloadingVerso}
          onClick={() => handleDownloadSide('verso')}
          className="gap-1.5"
        >
          <Download className="w-4 h-4" />
          {downloadingVerso ? 'Téléchargement...' : 'Télécharger Verso'}
        </Button>
      </div>
    </div>
  );
}
