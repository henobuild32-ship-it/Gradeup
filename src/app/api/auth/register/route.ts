import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

function generateCode(prefix: string, length: number = 6): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = prefix + '-';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

async function generateUniqueInviteCode(): Promise<string> {
  let code = generateCode('ECOLE', 6);
  while (await db.school.findUnique({ where: { inviteCode: code } })) {
    code = generateCode('ECOLE', 6);
  }
  return code;
}

async function generateUniqueParentCode(): Promise<string> {
  let code = generateCode('P', 6);
  while (await db.user.findUnique({ where: { parentCode: code } })) {
    code = generateCode('P', 6);
  }
  return code;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { mode, schoolName, fullName, email, password, inviteCode, role, classIds, parentCode } = body;

    // === MODE: create-school (Admin creates a school) ===
    if (mode === 'create-school') {
      if (!fullName || !schoolName || !email || !password) {
        return NextResponse.json(
          { error: 'Veuillez remplir tous les champs.' },
          { status: 400 }
        );
      }
      if (password.length < 4) {
        return NextResponse.json(
          { error: 'Le mot de passe doit contenir au moins 4 caractères.' },
          { status: 400 }
        );
      }

      const existingSchool = await db.school.findUnique({ where: { email } });
      if (existingSchool) {
        return NextResponse.json(
          { error: 'Une école avec cet email existe déjà.' },
          { status: 409 }
        );
      }

      const code = await generateUniqueInviteCode();

      const school = await db.school.create({
        data: {
          name: schoolName,
          email,
          password,
          inviteCode: code,
        },
      });

      const parentCodeVal = await generateUniqueParentCode();

      const user = await db.user.create({
        data: {
          schoolId: school.id,
          fullName,
          email,
          password,
          role: 'ADMIN',
          parentCode: parentCodeVal,
        },
        include: {
          school: true,
          classEnrollments: { include: { class: true } },
        },
      });

      return NextResponse.json({
        user: formatUser(user, school),
        inviteCode: code,
      }, { status: 201 });
    }

    // === MODE: join-school (Non-admin joins an existing school) ===
    if (mode === 'join-school') {
      const cleanFullName = (fullName || '').trim();
      const cleanInviteCode = (inviteCode || '').trim().toUpperCase();

      if (!cleanFullName || !password || !cleanInviteCode || !role) {
        return NextResponse.json(
          { error: 'Veuillez remplir tous les champs obligatoires.' },
          { status: 400 }
        );
      }
      if (password.length < 4) {
        return NextResponse.json(
          { error: 'Le mot de passe doit contenir au moins 4 caractères.' },
          { status: 400 }
        );
      }

      // Find school by invite code
      const school = await db.school.findUnique({ where: { inviteCode: cleanInviteCode } });
      if (!school) {
        return NextResponse.json(
          { error: 'Code école invalide. Vérifiez le code fourni par votre administrateur.' },
          { status: 404 }
        );
      }

      // Check if user already exists (case-insensitive name comparison)
      const existingUsers = await db.user.findMany({
        where: { schoolId: school.id, role },
      });
      const nameExists = existingUsers.some(
        (u) => u.fullName.trim().toLowerCase() === cleanFullName.toLowerCase()
      );
      if (nameExists) {
        return NextResponse.json(
          { error: 'Un utilisateur avec ce nom et ce rôle existe déjà dans cette école.' },
          { status: 409 }
        );
      }

      const parentCodeVal = await generateUniqueParentCode();

      // Build user data (use cleaned fullName)
      const userData: Record<string, unknown> = {
        schoolId: school.id,
        fullName: cleanFullName,
        password,
        role,
        parentCode: parentCodeVal,
        email: email || '',
      };

      // Role-specific logic
      let linkedStudent: { id: string; fullName: string } | null = null;
      if (role === 'PARENT') {
        if (!parentCode) {
          return NextResponse.json(
            { error: 'Le code parent est obligatoire pour créer un compte parent.' },
            { status: 400 }
          );
        }
        // Find the student by parent code
        const student = await db.user.findUnique({ where: { parentCode } });
        if (!student || student.schoolId !== school.id || student.role !== 'STUDENT') {
          return NextResponse.json(
            { error: 'Code parent invalide. Veuillez vérifier avec votre enfant.' },
            { status: 404 }
          );
        }
        linkedStudent = { id: student.id, fullName: student.fullName };
      }

      const user = await db.user.create({
        data: userData as never,
        include: {
          school: true,
          classEnrollments: { include: { class: true } },
        },
      });

      // If student, auto-enroll in selected class
      if (role === 'STUDENT' && classIds && classIds.length > 0) {
        for (const classId of classIds) {
          const schoolClass = await db.schoolClass.findFirst({
            where: { id: classId, schoolId: school.id },
          });
          if (schoolClass) {
            await db.enrolledClass.create({
              data: { userId: user.id, classId: schoolClass.id },
            });
          }
        }
      }

      // If teacher, optionally create courses for selected classes
      if (role === 'TEACHER' && classIds && classIds.length > 0) {
        for (const classId of classIds) {
          const schoolClass = await db.schoolClass.findFirst({
            where: { id: classId, schoolId: school.id },
          });
          if (schoolClass) {
            // Create a generic course for this teacher in this class
            await db.course.create({
              data: {
                schoolId: school.id,
                classId: schoolClass.id,
                teacherId: user.id,
                name: `${user.fullName} - ${schoolClass.name}`,
                description: `Cours dispensé par ${user.fullName}`,
              },
            });
          }
        }
      }

      // If parent, link student to this parent
      if (linkedStudent) {
        await db.user.update({
          where: { id: linkedStudent.id },
          data: { parentId: user.id },
        });
      }

      // Refresh user with enrollments
      const finalUser = await db.user.findUnique({
        where: { id: user.id },
        include: {
          school: true,
          classEnrollments: { include: { class: true } },
          children: true,
        },
      });

      return NextResponse.json({
        user: finalUser ? formatUser(finalUser, school) : formatUser(user, school),
      }, { status: 201 });
    }

    return NextResponse.json(
      { error: 'Mode d\'inscription invalide.' },
      { status: 400 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur interne du serveur.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function formatUser(user: {
  id: string;
  schoolId: string;
  fullName: string;
  email: string;
  role: string;
  photoUrl: string;
  parentId?: string | null;
  parentCode?: string;
  active?: boolean;
  school: { id: string; name: string; email: string; currency: string; inviteCode?: string };
  classEnrollments?: { id: string; userId: string; classId: string; class: { id: string; schoolId: string; name: string; level: string; fees: number } }[];
  children?: { id: string; fullName: string; role: string }[];
}, school: { id: string; name: string; email: string; currency: string; inviteCode?: string }) {
  return {
    id: user.id,
    schoolId: user.schoolId,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    photoUrl: user.photoUrl,
    parentId: user.parentId,
    parentCode: user.parentCode,
    active: user.active,
    school: {
      id: school.id,
      name: school.name,
      email: school.email,
      currency: school.currency,
      inviteCode: school.inviteCode,
    },
    classEnrollments: user.classEnrollments?.map((e) => ({
      id: e.id,
      userId: e.userId,
      classId: e.classId,
      class: e.class,
    })) || [],
    children: user.children || [],
  };
}
