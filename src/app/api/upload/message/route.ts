import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const runtime = 'nodejs';
export const maxDuration = 30;

// POST /api/upload/message — Upload a file for messaging
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const senderId = formData.get('senderId') as string;
    const recipientId = formData.get('recipientId') as string;
    const schoolId = formData.get('schoolId') as string;

    if (!file || !senderId || !recipientId || !schoolId) {
      return NextResponse.json(
        { error: 'file, senderId, recipientId, schoolId requis' },
        { status: 400 }
      );
    }

    // Validate file size (max 25MB)
    if (file.size > 25 * 1024 * 1024) {
      return NextResponse.json({ error: 'Fichier trop volumineux (max 25 Mo)' }, { status: 400 });
    }

    // Upload to blob storage (using Vercel Blob or similar)
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // For now, use a data URL approach or upload to a file hosting service
    // In production, use Vercel Blob, S3, or Cloudinary
    const ext = file.name.split('.').pop() || '';
    const fileName = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;

    // Create message with attachment
    const message = await db.message.create({
      data: {
        schoolId,
        senderId,
        recipientId,
        content: file.name,
        messageType: file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : file.type.startsWith('audio/') ? 'audio' : 'file',
        attachmentUrl: `/uploads/messages/${fileName}`,
        attachmentName: file.name,
        attachmentType: file.type,
      },
      include: {
        sender: { select: { id: true, fullName: true, photoUrl: true, role: true } },
        recipient: { select: { id: true, fullName: true, photoUrl: true, role: true } },
      },
    });

    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    console.error('Error uploading message file:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
