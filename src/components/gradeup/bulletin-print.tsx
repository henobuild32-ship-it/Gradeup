'use client';

/**
 * BulletinPrint
 * ─────────────────────────────────────────────────────────────────────────────
 * Printable RDC bulletin (A4) for students & parents.
 * Renders the official bulletin sheet from a ReportCard and provides an
 * "Imprimer / PDF" action that opens a clean print window.
 */

import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Printer, FileText } from 'lucide-react';

interface BulletinPrintProps {
  report: {
    reportNumber: string;
    trimester: string;
    academicYear: string;
    studentName: string;
    studentGender?: string;
    studentBirthDate?: string;
    permanentNumber?: string;
    class?: { name: string; level: string } | null;
    averageGrade: number;
    mention: string;
    classRank?: number | null;
    totalPointsObtained: number;
    totalPointsPossible: number;
    overallPercentage: number;
    gradesData?: Record<string, unknown> | null;
  };
  schoolName?: string;
}

type RawRow = {
  id?: string;
  name?: string;
  courseName?: string;
  tj1?: string | number;
  tj2?: string | number;
  exam1?: string | number;
  tj3?: string | number;
  tj4?: string | number;
  exam2?: string | number;
  score?: string | number;
  maxScore?: string | number;
  normalizedScore?: string | number;
  coefficient?: string | number;
};

export default function BulletinPrint({ report, schoolName }: BulletinPrintProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const gd = report.gradesData as Record<string, any> | undefined;
  const metadata = (gd?.metadata as Record<string, any>) || {};
  const rawRows: RawRow[] = Array.isArray(gd?.rawRows) ? gd.rawRows : [];
  const serialized: RawRow[] = Array.isArray(gd?.serializedGrades) ? gd.serializedGrades : [];

  const trimesterLabel =
    report.trimester === '1'
      ? '1er TRIMESTRE'
      : report.trimester === '2'
      ? '2e TRIMESTRE'
      : report.trimester === '3'
      ? '3e TRIMESTRE'
      : `TRIMESTRE ${report.trimester}`;

  const displayRows: RawRow[] =
    rawRows.length > 0
      ? rawRows
      : serialized.map((s) => ({
          name: s.courseName || s.name || '—',
          tj1: s.score,
          tj2: undefined,
          exam1: undefined,
          normalizedScore: s.normalizedScore,
          coefficient: s.coefficient,
        }));

  const hasPeriodCols = displayRows.some((r) => r.tj1 !== undefined || r.tj2 !== undefined || r.exam1 !== undefined || r.tj3 !== undefined || r.tj4 !== undefined || r.exam2 !== undefined);

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Bulletin de notes - ${(report.studentName || 'RDC').replace(/\s+/g, '_')}</title>
          <meta charset="utf-8">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { background: white !important; font-family: 'Times New Roman', Times, serif, sans-serif; }
            @page { size: A4; margin: 5mm 7mm; }
            .bulletin-paper {
              width: 210mm !important;
              min-height: 265mm !important;
              padding: 5mm 8mm !important;
              border: 1px solid #000000 !important;
              background: white !important;
              color: #000000 !important;
              box-sizing: border-box !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              page-break-inside: avoid !important;
            }
            .b-header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 3mm; margin-bottom: 3mm; }
            .b-header h2 { font-size: 13px; letter-spacing: 1px; text-transform: uppercase; margin: 1mm 0; }
            .b-header p { font-size: 10px; margin: 0.5mm 0; }
            .b-school { display: flex; justify-content: space-between; font-size: 11px; font-weight: bold; margin: 2mm 0; }
            .b-info { display: flex; justify-content: space-between; flex-wrap: wrap; font-size: 10px; border: 1px solid #000; padding: 2mm; margin-bottom: 3mm; }
            .b-info div { width: 48%; margin: 0.5mm 0; }
            table { width: 100%; border-collapse: collapse; }
            table th, table td { border: 1px solid #000; padding: 1.5px 2px; font-size: 9px; text-align: center; height: 18px; }
            table th { text-transform: uppercase; font-weight: bold; background: #f0f0f0; }
            td.branch { text-align: left; padding-left: 6px; font-weight: bold; }
            .b-summary { display: flex; justify-content: space-between; flex-wrap: wrap; border: 1px solid #000; border-top: none; padding: 2mm; font-size: 10px; }
            .b-summary div { width: 30%; margin: 0.5mm 0; }
            .b-sign { display: flex; justify-content: space-between; margin-top: 8mm; font-size: 10px; text-align: center; }
            .b-sign .sig { width: 30%; }
            .sig-name { margin-top: 12mm; font-weight: bold; text-decoration: underline; }
          </style>
        </head>
        <body>
          <div class="bulletin-paper">${printContent.innerHTML}</div>
          <script>
            window.onload = () => { setTimeout(() => { window.print(); window.close(); }, 300); };
          </script>
        </body>
      </html>
    `);

    Array.from(document.querySelectorAll('style, link[rel="stylesheet"]')).forEach((el) => {
      printWindow.document.head.appendChild(el.cloneNode(true));
    });
    printWindow.document.close();
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="no-print flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-muted-foreground">
          <FileText className="h-4 w-4" />
          <span className="text-sm">Bulletin {report.reportNumber}</span>
        </div>
        <Button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5">
          <Printer className="h-4 w-4" />
          Imprimer / PDF
        </Button>
      </div>

      {/* Printable sheet */}
      <div className="overflow-x-auto bg-neutral-200/60 p-4 md:p-8 flex justify-center rounded-2xl">
        <div ref={printRef} className="bulletin-paper w-full" style={{ maxWidth: '210mm' }}>
          <style>{`
            .bulletin-paper {
              background: #ffffff;
              color: #000000;
              font-family: 'Times New Roman', Times, serif;
              padding: 16px;
              border: 1px solid #000000;
            }
            .b-header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 6px; margin-bottom: 6px; }
            .b-header h2 { font-size: 14px; letter-spacing: 1px; text-transform: uppercase; margin: 2px 0; }
            .b-header p { font-size: 11px; margin: 1px 0; }
            .b-school { display: flex; justify-content: space-between; font-size: 12px; font-weight: bold; margin: 4px 0; }
            .b-info { display: flex; justify-content: space-between; flex-wrap: wrap; font-size: 11px; border: 1px solid #000; padding: 4px; margin-bottom: 6px; }
            .b-info div { width: 48%; margin: 1px 0; }
            .b-table { width: 100%; border-collapse: collapse; }
            .b-table th, .b-table td { border: 1px solid #000; padding: 2px 3px; font-size: 10px; text-align: center; height: 20px; }
            .b-table th { text-transform: uppercase; font-weight: bold; background: #f0f0f0; }
            .b-table td.branch { text-align: left; padding-left: 6px; font-weight: bold; }
            .b-summary { display: flex; justify-content: space-between; flex-wrap: wrap; border: 1px solid #000; border-top: none; padding: 5px; font-size: 11px; }
            .b-summary div { width: 30%; margin: 2px 0; }
            .b-sign { display: flex; justify-content: space-between; margin-top: 14px; font-size: 11px; text-align: center; }
            .b-sign .sig { width: 30%; }
            .sig-name { margin-top: 20px; font-weight: bold; text-decoration: underline; }
            @media print {
              .bulletin-paper {
                border: 1px solid #000 !important;
                max-width: none !important;
                width: 210mm !important;
              }
            }
          `}</style>

          {/* Header */}
          <div className="b-header">
            <h2>République Démocratique du Congo</h2>
            <p>Ministère de l'Enseignement Primaire, Secondaire et Technique (EPST)</p>
            <div className="b-school">
              <span>{metadata.schoolName || schoolName || 'École'}</span>
              <span>{report.academicYear}</span>
            </div>
            <p><strong>BULLETIN SCOLAIRE — {trimesterLabel}</strong></p>
          </div>

          {/* Student info */}
          <div className="b-info">
            <div><strong>Nom :</strong> {report.studentName}</div>
            <div><strong>N° :</strong> {report.reportNumber}</div>
            <div><strong>Sexe :</strong> {report.studentGender || metadata.studentGender || '—'}</div>
            <div><strong>Date de naissance :</strong> {report.studentBirthDate || metadata.studentBirthDate || '—'}</div>
            <div><strong>Matricule :</strong> {report.permanentNumber || metadata.permanentNumber || '—'}</div>
            <div><strong>Classe :</strong> {report.class?.name || '—'} ({report.class?.level || ''})</div>
          </div>

          {/* Grades table */}
          <table className="b-table">
            <thead>
              <tr>
                <th style={{ width: 24 }}>N°</th>
                <th>Désignation des branches</th>
                {hasPeriodCols && (
                  <>
                    <th>TJ1 /20</th>
                    <th>TJ2 /20</th>
                    <th>Ex1 /20</th>
                    <th>TJ3 /20</th>
                    <th>TJ4 /20</th>
                    <th>Ex2 /20</th>
                  </>
                )}
                <th>Coef</th>
                <th>Moyenne /20</th>
              </tr>
            </thead>
            <tbody>
              {displayRows.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: 12 }}>
                    Aucune note enregistrée pour ce bulletin.
                  </td>
                </tr>
              ) : (
                displayRows.map((row, idx) => {
                  const rowScore = row.normalizedScore !== undefined && row.normalizedScore !== ''
                    ? Number(row.normalizedScore)
                    : (row.score !== undefined && row.score !== '' ? Number(row.score) : null);
                  const coeff = row.coefficient !== undefined ? Number(row.coefficient) : 1;
                  const perCourseAvg =
                    rowScore !== null
                      ? rowScore
                      : (() => {
                          const vals = [row.tj1, row.tj2, row.exam1, row.tj3, row.tj4, row.exam2]
                            .map((v) => (v === undefined || v === '' ? null : Number(v)))
                            .filter((v): v is number => v !== null);
                          if (vals.length === 0) return null;
                          return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100;
                        })();
                  return (
                    <tr key={row.id || idx}>
                      <td>{idx + 1}</td>
                      <td className="branch">{row.name || '—'}</td>
                      {hasPeriodCols && (
                        <>
                          <td>{row.tj1 !== undefined ? row.tj1 : ''}</td>
                          <td>{row.tj2 !== undefined ? row.tj2 : ''}</td>
                          <td>{row.exam1 !== undefined ? row.exam1 : ''}</td>
                          <td>{row.tj3 !== undefined ? row.tj3 : ''}</td>
                          <td>{row.tj4 !== undefined ? row.tj4 : ''}</td>
                          <td>{row.exam2 !== undefined ? row.exam2 : ''}</td>
                        </>
                      )}
                      <td>{coeff}</td>
                      <td style={{ fontWeight: 'bold' }}>{perCourseAvg !== null ? perCourseAvg : '—'}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          {/* Summary */}
          <div className="b-summary">
            <div><strong>Points obtenus :</strong> {report.totalPointsObtained}</div>
            <div><strong>Points possibles :</strong> {report.totalPointsPossible}</div>
            <div><strong>Pourcentage :</strong> {report.overallPercentage}%</div>
            <div><strong>Moyenne :</strong> {report.averageGrade}/20</div>
            <div><strong>Rang :</strong> {report.classRank && report.classRank > 0 ? `${report.classRank}e` : '—'}</div>
            <div><strong>Mention :</strong> {report.mention || '—'}</div>
          </div>

          {/* Signatures */}
          <div className="b-sign">
            <div className="sig">
              Le Directeur
              <div className="sig-name">Signature</div>
            </div>
            <div className="sig">
              Le Professeur Titulaire
              <div className="sig-name">Signature</div>
            </div>
            <div className="sig">
              Les Parents
              <div className="sig-name">Signature</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
