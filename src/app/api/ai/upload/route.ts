import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';

export const runtime = 'nodejs';

const MAX_SIZE = 20 * 1024 * 1024; // 20 Mo

const ALLOWED_TYPES: Record<string, string> = {
  'application/pdf': '.pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'text/plain': '.txt',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

async function extractText(buffer: Buffer, mimeType: string): Promise<string> {
  try {
    if (mimeType === 'application/pdf') {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require('pdf-parse');
      const data = await pdfParse(buffer);
      return data.text || '';
    }

    if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mammoth = require('mammoth');
      const result = await mammoth.extractRawText({ buffer });
      return result.value || '';
    }

    if (mimeType === 'text/plain') {
      return buffer.toString('utf-8');
    }

    // Pour les images : retour vide (OCR optionnel – nécessite tesseract.js)
    return '';
  } catch (error) {
    console.error('Erreur extraction texte:', error);
    return '';
  }
}

async function generateSummary(text: string, fileName: string): Promise<string> {
  const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
  if (!DEEPSEEK_API_KEY || !text) return '';

  try {
    const res = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        stream: false,
        temperature: 0.5,
        max_tokens: 400,
        messages: [
          {
            role: 'system',
            content: 'Tu es Gradie, une IA scolaire. Résume le document ci-dessous en français de manière claire, concise et utile pour un élève ou un professeur. Maximum 3 paragraphes.',
          },
          {
            role: 'user',
            content: `Document : "${fileName}"\n\n${text.slice(0, 6000)}`,
          },
        ],
      }),
    });
    if (!res.ok) return '';
    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  } catch {
    return '';
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const conversationId = formData.get('conversationId') as string | null;
    const userId = formData.get('userId') as string | null;

    if (!file || !conversationId || !userId) {
      return NextResponse.json(
        { error: 'Fichier, conversationId et userId sont requis.' },
        { status: 400 }
      );
    }

    // Vérification du type MIME
    if (!ALLOWED_TYPES[file.type]) {
      return NextResponse.json(
        { error: `Type de fichier non supporté : ${file.type}. Acceptés : PDF, DOCX, TXT, JPEG, PNG.` },
        { status: 415 }
      );
    }

    // Vérification de la taille (20 Mo max)
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'Le fichier dépasse la taille maximale autorisée (20 Mo).' },
        { status: 413 }
      );
    }

    // Vérification que la conversation appartient bien à l'utilisateur
    const conversation = await db.aiConversation.findFirst({
      where: { id: conversationId, userId },
    });
    if (!conversation) {
      return NextResponse.json({ error: 'Conversation introuvable.' }, { status: 404 });
    }

    // Sauvegarde du fichier
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const ext = ALLOWED_TYPES[file.type];
    const fileName = `${randomUUID()}${ext}`;
    const uploadsDir = join(process.cwd(), 'public', 'uploads');
    await mkdir(uploadsDir, { recursive: true });
    const filePath = join(uploadsDir, fileName);
    await writeFile(filePath, buffer);
    const fileUrl = `/uploads/${fileName}`;

    // Extraction du texte
    const extractedText = await extractText(buffer, file.type);

    // Génération du résumé via l'IA
    const summary = await generateSummary(extractedText, file.name);

    // Sauvegarde en base
    const document = await db.aiDocument.create({
      data: {
        conversationId,
        name: file.name,
        mimeType: file.type,
        url: fileUrl,
        size: file.size,
        extractedText: extractedText.slice(0, 50000), // limiter la taille
        summary,
      },
    });

    // Ajout d'un message système dans la conversation pour signaler le document
    await db.aiMessage.create({
      data: {
        conversationId,
        role: 'assistant',
        content: `📄 **Document reçu : ${file.name}**\n\n${summary || 'Le document a été analysé et est maintenant disponible dans cette conversation.'}`,
      },
    });

    // Mise à jour du titre de la conversation si c'est le premier document
    if (conversation.title === 'Nouvelle conversation') {
      await db.aiConversation.update({
        where: { id: conversationId },
        data: { title: `📎 ${file.name.slice(0, 40)}` },
      });
    }

    return NextResponse.json({
      document: {
        id: document.id,
        name: document.name,
        mimeType: document.mimeType,
        size: document.size,
        summary: document.summary,
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erreur interne du serveur.';
    console.error('Upload error:', error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
