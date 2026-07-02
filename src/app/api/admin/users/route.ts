import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/adminAuth";

/** Verify the requester is an admin */
async function requireAdmin(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.userId) return null;
  const user = await db.user.findUnique({ where: { id: session.userId } });
  if (!user || user.accessLevel !== "admin") return null;
  return user;
}

/**
 * GET /api/admin/users
 * Returns all users with their access level, auth providers, and signup date.
 */
export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const users = await db.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      avatar: true,
      accessLevel: true,
      googleId: true,
      discordId: true,
      telegramId: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  // Mark which user is the protected super admin
  const enriched = users.map((u) => ({
    ...u,
    isSuperAdmin: isSuperAdmin(u),
  }));

  return NextResponse.json({
    users: enriched,
    // Only the super admin may modify roles; the UI hides controls otherwise
    requesterIsSuperAdmin: isSuperAdmin(admin),
  });
}

/**
 * PATCH /api/admin/users
 * Body: { userId: string, accessLevel: "user" | "holder" | "admin" }
 * Promotes or demotes a user. Only the super admin can change roles —
 * regular admins are view-only. The super admin can never be demoted.
 */
export async function PATCH(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!isSuperAdmin(admin)) {
    return NextResponse.json(
      { error: "Only the super admin can change user roles." },
      { status: 403 }
    );
  }

  const body = await req.json();
  const { userId, accessLevel } = body;

  if (!userId || !accessLevel) {
    return NextResponse.json({ error: "Missing userId or accessLevel" }, { status: 400 });
  }

  const validLevels = ["user", "holder", "admin"];
  if (!validLevels.includes(accessLevel)) {
    return NextResponse.json({ error: "Invalid accessLevel" }, { status: 400 });
  }

  // Fetch the target user to check if they are super admin
  const target = await db.user.findUnique({ where: { id: userId } });
  if (!target) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // 🔒 Super admin protection — no one can remove their admin status
  if (isSuperAdmin(target) && accessLevel !== "admin") {
    return NextResponse.json(
      { error: "Cannot demote the super admin." },
      { status: 403 }
    );
  }

  const updated = await db.user.update({
    where: { id: userId },
    data: { accessLevel },
    select: {
      id: true,
      name: true,
      email: true,
      accessLevel: true,
    },
  });

  return NextResponse.json({ user: updated });
}
