import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { uploadFile } from '@/lib/storage';

export const runtime = 'nodejs';

const MAX_SIZE = 20 * 1024 * 1024;
const ALLOWED: Record<string, string> = {
  'application/pdf': '.pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'text/plain': '.txt',
  'image/jpeg': '.jpg',
  'image/png': '.png',
};

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'Fichier requis.' }, { status: 400 });
    if (!ALLOWED[file.type]) return NextResponse.json({ error: 'Type non supporté.' }, { status: 415 });
    if (file.size > MAX_SIZE) return NextResponse.json({ error: 'Fichier trop volumineux (20 Mo).' }, { status: 413 });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const ext = ALLOWED[file.type];
    const { url } = await uploadFile(buffer, `${randomUUID()}${ext}`, file.type);
    return NextResponse.json({ url });
  } catch (error) {
    console.error('Resource upload error:', error);
    return NextResponse.json({ error: 'Erreur d\'upload.' }, { status: 500 });
  }
}
