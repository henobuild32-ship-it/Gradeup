import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const user = await db.user.findUnique({
      where: { id },
      include: {
        school: true,
        classEnrollments: {
          include: { class: true },
        },
        children: true,
        parent: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { fullName, email, password, newPassword, oldPassword, role, photoUrl, parentId } = body;

    const existing = await db.user.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Password change: validate old password
    if (newPassword !== undefined) {
      if (!oldPassword) {
        return NextResponse.json(
          { error: 'L\'ancien mot de passe est requis.' },
          { status: 400 }
        );
      }
      if (oldPassword !== existing.password) {
        return NextResponse.json(
          { error: 'L\'ancien mot de passe est incorrect.' },
          { status: 401 }
        );
      }
      if (newPassword.length < 4) {
        return NextResponse.json(
          { error: 'Le nouveau mot de passe doit contenir au moins 4 caractères.' },
          { status: 400 }
        );
      }
    }

    const user = await db.user.update({
      where: { id },
      data: {
        ...(fullName !== undefined && { fullName }),
        ...(email !== undefined && { email }),
        ...(newPassword !== undefined && { password: newPassword }),
        ...(password !== undefined && newPassword === undefined && { password }),
        ...(role !== undefined && { role }),
        ...(photoUrl !== undefined && { photoUrl }),
        ...(parentId !== undefined && { parentId: parentId || null }),
      },
      include: {
        school: true,
        classEnrollments: {
          include: { class: true },
        },
      },
    });

    return NextResponse.json({ user });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await db.user.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    await db.enrolledClass.deleteMany({ where: { userId: id } });
    await db.user.delete({ where: { id } });

    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
