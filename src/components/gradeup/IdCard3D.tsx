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
  role: 'STUDENT' | 'TEACHER';
}

export default function IdCard3D({ user, schoolName, schoolLogo, role }: IdCard3DProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [downloadingRecto, setDownloadingRecto] = useState(false);
  const [downloadingVerso, setDownloadingVerso] = useState(false);
  
  const rectoRef = useRef<HTMLDivElement>(null);
  const versoRef = useRef<HTMLDivElement>(null);

  const cardExpiry = new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toLocaleDateString('fr-FR');
  const roleLabel = role === 'TEACHER' ? 'Enseignant' : 'Élève';

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
            className="absolute inset-0 w-full h-full rounded-2xl overflow-hidden shadow-2xl bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 border border-white/10 flex flex-col justify-between"
            style={{ 
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              transform: 'rotateY(0deg)'
            }}
          >
            {/* School Watermark Logo in Background */}
            {schoolLogo && (
              <div 
                className="absolute inset-0 pointer-events-none opacity-[0.06] flex items-center justify-center bg-center bg-no-repeat transition-all duration-300"
                style={{ 
                  backgroundImage: `url(${schoolLogo})`,
                  backgroundSize: '240px',
                }}
              />
            )}

            {/* Top Header */}
            <div className="relative px-6 pt-5 pb-3 border-b border-white/10 bg-black/20 backdrop-blur-sm flex justify-between items-center">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-2 bg-white/10 rounded-xl backdrop-blur-sm shrink-0">
                  <School className="w-5 h-5 text-blue-400" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-extrabold text-sm sm:text-base tracking-tight text-white/95 uppercase truncate">{schoolName}</h3>
                  <p className="text-[9px] text-blue-300/80 font-medium tracking-wider uppercase">Établissement Scolaire</p>
                </div>
              </div>

              <div className="text-right bg-white/5 border border-white/10 px-2.5 py-1 rounded-lg shrink-0">
                <p className="text-[7px] uppercase tracking-wider text-blue-200/70 font-semibold">Année Académique</p>
                <p className="text-[11px] font-black text-white">{user.academicYear || '2025-2026'}</p>
              </div>
            </div>

            {/* Body */}
            <div className="relative flex-1 px-6 py-4 flex gap-5 items-center">
              {/* Left Column: Photo */}
              <div className="flex flex-col items-center gap-2 shrink-0">
                <div className="relative">
                  <div className="w-24 h-24 rounded-2xl border-2 border-white/20 shadow-lg overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
                    {user.photoUrl ? (
                      <img src={user.photoUrl} alt={user.fullName} className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-10 h-10 text-white/30" />
                    )}
                  </div>
                  <div className="absolute -bottom-1 -right-1 bg-blue-500 rounded-full p-0.5 border border-slate-900 shadow-md">
                    <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                  </div>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-full px-2.5 py-0.5">
                  {roleLabel}
                </span>
              </div>

              {/* Right Column: User Information */}
              <div className="flex-1 min-w-0 space-y-2">
                <div>
                  <h2 className="text-lg font-black text-white leading-tight truncate">{user.fullName}</h2>
                  {user.postName && <p className="text-xs text-blue-300/70 truncate">{user.postName}</p>}
                </div>

                <div className="grid grid-cols-2 gap-2 text-left">
                  {/* Class or Subject Info */}
                  <div className="bg-white/5 rounded-lg p-1.5 border border-white/5">
                    <p className="text-[7px] uppercase text-blue-300/70 font-bold tracking-wider">
                      {role === 'TEACHER' ? 'Matière' : 'Classe'}
                    </p>
                    <p className="text-[11px] font-bold text-white truncate">
                      {role === 'TEACHER' ? (user.courseName || 'Enseignant') : (user.className || 'Non assigné')}
                    </p>
                  </div>

                  {/* ID / Matricule */}
                  <div className="bg-white/5 rounded-lg p-1.5 border border-white/5">
                    <p className="text-[7px] uppercase text-blue-300/70 font-bold tracking-wider">Matricule</p>
                    <p className="text-[11px] font-mono font-bold text-white truncate">{user.matricule || 'N/A'}</p>
                  </div>

                  {/* Section/Option */}
                  {user.section && (
                    <div className="bg-white/5 rounded-lg p-1.5 border border-white/5">
                      <p className="text-[7px] uppercase text-blue-300/70 font-bold tracking-wider">Section</p>
                      <p className="text-[11px] font-semibold text-white/95 truncate">{user.section}</p>
                    </div>
                  )}

                  {/* Blood group */}
                  {user.bloodType && (
                    <div className="bg-white/5 rounded-lg p-1.5 border border-white/5">
                      <p className="text-[7px] uppercase text-red-300/80 font-bold tracking-wider">Sang</p>
                      <p className="text-[11px] font-bold text-red-400">{user.bloodType}</p>
                    </div>
                  )}
                </div>

                {/* Additional metadata */}
                <div className="flex items-center gap-3 text-[9px] text-white/50 pt-0.5">
                  {user.birthDate && (
                    <div className="flex items-center gap-1 truncate">
                      <Calendar className="w-3 h-3 text-blue-400 shrink-0" />
                      <span>Né(e) le {user.birthDate}</span>
                    </div>
                  )}
                  {user.nationality && (
                    <div className="flex items-center gap-1 truncate">
                      <MapPin className="w-3 h-3 text-blue-400 shrink-0" />
                      <span>{user.nationality}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Footer Info */}
            <div className="px-6 py-3 border-t border-white/10 bg-black/30 backdrop-blur-sm flex justify-between items-center text-[9px] text-white/50">
              <div className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span className="font-medium text-white/70">Carte officielle GradeUp</span>
              </div>
              {user.cardId && <span className="font-mono text-white font-bold bg-white/10 rounded px-1.5 py-0.5">ID: {user.cardId}</span>}
              <span>Valide : {cardExpiry}</span>
            </div>
          </div>

          {/* ────────────────── VERSO (FACE B) ────────────────── */}
          <div 
            ref={versoRef}
            className="absolute inset-0 w-full h-full rounded-2xl overflow-hidden shadow-2xl bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 border border-white/10 flex flex-col justify-between"
            style={{ 
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)'
            }}
          >
            {/* Top Bar Logo */}
            <div className="px-6 pt-5 pb-3 border-b border-white/10 bg-black/20 backdrop-blur-sm flex justify-between items-center">
              <div className="flex items-center gap-2">
                <School className="w-4 h-4 text-blue-400" />
                <span className="text-[10px] uppercase font-bold tracking-wider text-white">{schoolName}</span>
              </div>
              <span className="text-[8px] text-white/40 uppercase tracking-widest">Informations Générales</span>
            </div>

            {/* Big Centered School Logo (verso center) */}
            <div className="flex-1 flex flex-col items-center justify-center p-6 relative">
              {schoolLogo ? (
                <div className="flex flex-col items-center gap-2">
                  <div 
                    className="w-24 h-24 bg-contain bg-center bg-no-repeat rounded-xl filter drop-shadow-[0_4px_10px_rgba(255,255,255,0.05)] transition-all duration-300"
                    style={{ backgroundImage: `url(${schoolLogo})` }}
                  />
                  <h4 className="text-white text-xs font-semibold uppercase tracking-wider">{schoolName}</h4>
                </div>
              ) : (
                <div className="text-center space-y-2">
                  <School className="w-12 h-12 text-white/10 mx-auto" />
                  <p className="text-[11px] text-white/30 italic">Aucun logo d'école défini</p>
                </div>
              )}
            </div>

            {/* Bottom Bar: QR Code + Contacts */}
            <div className="px-6 py-4 border-t border-white/10 bg-black/30 backdrop-blur flex justify-between items-center gap-4">
              <div className="space-y-1.5 flex-1 min-w-0 text-left">
                <p className="text-[9px] text-white/70 font-semibold">Conditions d'utilisation :</p>
                <p className="text-[8px] text-white/40 leading-tight">
                  Cette carte est strictement personnelle. Elle doit être présentée sur demande au sein de l'établissement.
                </p>
                {user.phone && (
                  <div className="flex items-center gap-1.5 text-[8px] text-white/60 pt-0.5">
                    <Phone className="w-2.5 h-2.5 text-blue-400 shrink-0" />
                    <span>Contact : {user.phone}</span>
                  </div>
                )}
              </div>
              
              {/* QR Code container on bottom-right of verso */}
              <div className="bg-white p-1 rounded-xl shadow-md shrink-0">
                {user.cardId ? (
                  <QRCodeSVG value={`${user.id}-${user.cardId}`} size={64} level="H" includeMargin={false} />
                ) : (
                  <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                    <span className="text-[8px] text-gray-400">Pas de QR</span>
                  </div>
                )}
              </div>
            </div>
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
