import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { authenticateRequest, AuthError } from '@/lib/auth/authenticate';
import { notifyUser } from '@/services/notifications/notificationEngine';
import { hashPassword } from '@/lib/password';

function generateParentCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'P-';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function GET(request: NextRequest) {
  try {
    const auth = authenticateRequest(request);
    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('schoolId');
    const role = searchParams.get('role');
    const classId = searchParams.get('classId');
    const parentId = searchParams.get('parentId');
    const search = searchParams.get('search');

    if (!schoolId || schoolId !== auth.schoolId) {
      return NextResponse.json({ error: 'schoolId invalide' }, { status: 400 });
    }

    // Parent can only filter by their own parentId
    if (auth.role === 'PARENT' && parentId !== auth.userId) {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 });
    }

    const where: Record<string, unknown> = { schoolId };

    if (role) {
      where.role = role;
    }

    if (classId) {
      where.classEnrollments = {
        some: { classId },
      };
    }

    // Security: filter children by parentId so parents only see their own children
    if (parentId) {
      where.parentId = parentId;
    }

    // Full-text search on fullName or email
    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const users = await db.user.findMany({
      where,
      include: {
        school: true,
        classEnrollments: {
          include: { class: true },
        },
        children: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ users });
  } catch (err: unknown) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { schoolId, fullName, email, password, role, photoUrl, parentId, classId, className, isTitulaire, titulaireClassIds } = body;

    if (!schoolId || !fullName || !password || !role) {
      return NextResponse.json(
        { error: 'Missing required fields: schoolId, fullName, password, role' },
        { status: 400 }
      );
    }

    const existing = await db.user.findFirst({
      where: { schoolId, fullName, role },
    });

    if (existing) {
      return NextResponse.json(
        { error: `A user with name "${fullName}" and role "${role}" already exists in this school` },
        { status: 409 }
      );
    }

    let parentCodeVal = await generateParentCode();
    while (await db.user.findUnique({ where: { parentCode: parentCodeVal } })) {
      parentCodeVal = generateParentCode();
    }

    const user = await db.user.create({
      data: {
        schoolId,
        fullName,
        email: email || '',
        password: await hashPassword(password),
        role,
        photoUrl: photoUrl || '',
        parentId: parentId || null,
        parentCode: parentCodeVal,
        isTitulaire: !!isTitulaire,
        titulaireClasses: Array.isArray(titulaireClassIds) ? { connect: titulaireClassIds.map(id => ({ id })) } : undefined,
      },
      include: {
        school: true,
        classEnrollments: {
          include: { class: true },
        },
      },
    });

    if ((classId || className) && role === 'STUDENT') {
      let assignedClassId = classId;
      
      // Auto-create or find by name if className is provided
      if (!assignedClassId && className) {
        let existingClass = await db.schoolClass.findFirst({
          where: { schoolId, name: className }
        });
        if (!existingClass) {
          existingClass = await db.schoolClass.create({
            data: {
              schoolId,
              name: className,
              level: 'N/A'
            }
          });
        }
        assignedClassId = existingClass.id;
      }

      if (assignedClassId) {
        await db.enrolledClass.create({
          data: {
            userId: user.id,
            classId: assignedClassId,
          },
        });
      }
    }

    const userWithEnrollments = await db.user.findUnique({
      where: { id: user.id },
      include: {
        school: true,
        classEnrollments: {
          include: { class: true },
        },
      },
    });

    return NextResponse.json({ user: userWithEnrollments }, { status: 201 });
  } catch (err: unknown) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PATCH: Toggle user active status or update user info
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      userId, active, fullName, email,
      postName, gender, birthDate, matricule, 
      phone, parentPhone, parentPhone2, academicYear, section, photoUrl,
      bloodType, nationality, address, parentEmail,
      cardIssuedDate, cardExpiryDate, ine, tuteur, contactTuteur, allergies, assurance,
      isTitulaire, titulaireClassIds
    } = body;

    if (!userId) {
      return NextResponse.json({ error: 'userId requis.' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    if (active !== undefined) updateData.active = active;
    if (fullName !== undefined) updateData.fullName = fullName;
    if (email !== undefined) updateData.email = email;
    if (postName !== undefined) updateData.postName = postName;
    if (gender !== undefined) updateData.gender = gender;
    if (birthDate !== undefined) updateData.birthDate = birthDate;
    if (matricule !== undefined) updateData.matricule = matricule;
    if (phone !== undefined) updateData.phone = phone;
    if (parentPhone !== undefined) updateData.parentPhone = parentPhone;
    if (parentPhone2 !== undefined) updateData.parentPhone2 = parentPhone2;
    if (academicYear !== undefined) updateData.academicYear = academicYear;
    if (section !== undefined) updateData.section = section;
    if (photoUrl !== undefined) updateData.photoUrl = photoUrl;
    if (bloodType !== undefined) updateData.bloodType = bloodType;
    if (nationality !== undefined) updateData.nationality = nationality;
    if (address !== undefined) updateData.address = address;
    if (parentEmail !== undefined) updateData.parentEmail = parentEmail;
    if (cardIssuedDate !== undefined) updateData.cardIssuedDate = cardIssuedDate;
    if (cardExpiryDate !== undefined) updateData.cardExpiryDate = cardExpiryDate;
    if (ine !== undefined) updateData.ine = ine;
    if (tuteur !== undefined) updateData.tuteur = tuteur;
    if (contactTuteur !== undefined) updateData.contactTuteur = contactTuteur;
    if (allergies !== undefined) updateData.allergies = allergies;
    if (assurance !== undefined) updateData.assurance = assurance;
    if (isTitulaire !== undefined) updateData.isTitulaire = isTitulaire;
    if (titulaireClassIds !== undefined) updateData.titulaireClassIds = Array.isArray(titulaireClassIds) ? titulaireClassIds : [];

    const user = await db.user.update({
      where: { id: userId },
      data: updateData,
      include: {
        school: true,
        classEnrollments: { include: { class: true } },
        children: true,
      },
    });

    // Notify the user in real-time that their profile was updated by admin
    try { await notifyUser({
      schoolId: user.schoolId,
      userId: user.id,
      title: 'Profil Modifié 👤',
      message: 'Vos informations de profil ont été mises à jour par l\'administration.',
      type: 'PROFILE',
      priority: 'LOW',
      metadata: { userId: user.id },
    }); } catch (e) { console.error('[Users PATCH] Notification failed (non-blocking):', e); }

    return NextResponse.json({ user });
  } catch (err: unknown) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : 'Erreur interne.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE: Remove a user
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId requis.' }, { status: 400 });
    }

    // Check if user has children (parent)
    const children = await db.user.findMany({ where: { parentId: userId } });
    if (children.length > 0) {
      return NextResponse.json(
        { error: 'Impossible de supprimer un utilisateur lié à d\'autres comptes.' },
        { status: 400 }
      );
    }

    await db.user.delete({ where: { id: userId } });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : 'Erreur interne.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
