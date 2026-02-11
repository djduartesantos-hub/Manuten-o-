import { Response } from 'express';
import { and, eq, ne, sql } from 'drizzle-orm';
import { AuthenticatedRequest } from '../types/index.js';
import { db } from '../config/database.js';
import { users } from '../db/schema.js';
import { comparePasswords, hashPassword } from '../auth/jwt.js';

function toProfileDto(user: any) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    firstName: user.first_name,
    lastName: user.last_name,
    phone: user.phone,
    role: user.role,
    tenantId: user.tenant_id,
  };
}

export class ProfileController {
  static async getProfile(req: AuthenticatedRequest, res: Response): Promise<Response> {
    const tenantId = req.tenantId;
    const userId = req.user?.userId;

    if (!tenantId || !userId) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    const user = await db.query.users.findFirst({
      where: (fields: any, { eq, and }: any) =>
        and(eq(fields.tenant_id, tenantId), eq(fields.id, userId)),
    });

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    return res.json({ success: true, data: toProfileDto(user) });
  }

  static async updateProfile(req: AuthenticatedRequest, res: Response): Promise<Response> {
    const tenantId = req.tenantId;
    const userId = req.user?.userId;

    if (!tenantId || !userId) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    const { firstName, lastName, email, phone } = req.body || {};

    const user = await db.query.users.findFirst({
      where: (fields: any, { eq, and }: any) =>
        and(eq(fields.tenant_id, tenantId), eq(fields.id, userId)),
    });

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const nextEmail = typeof email === 'string' ? email.trim().toLowerCase() : undefined;

    if (nextEmail && nextEmail !== String(user.email || '').toLowerCase()) {
      const duplicate = await db
        .select({ id: users.id })
        .from(users)
        .where(
          and(
            eq(users.tenant_id, tenantId),
            sql`lower(${users.email}) = ${nextEmail}`,
            ne(users.id, userId),
          ),
        )
        .limit(1);

      if (duplicate.length > 0) {
        return res.status(409).json({ success: false, error: 'Email já em uso' });
      }
    }

    const [updated] = await db
      .update(users)
      .set({
        first_name: typeof firstName === 'string' ? firstName.trim() : user.first_name,
        last_name: typeof lastName === 'string' ? lastName.trim() : user.last_name,
        email: nextEmail ?? user.email,
        phone: typeof phone === 'string' ? phone.trim() : user.phone,
        updated_at: new Date(),
      })
      .where(and(eq(users.tenant_id, tenantId), eq(users.id, userId)))
      .returning();

    return res.json({ success: true, data: toProfileDto(updated) });
  }

  static async changePassword(req: AuthenticatedRequest, res: Response): Promise<Response> {
    const tenantId = req.tenantId;
    const userId = req.user?.userId;

    if (!tenantId || !userId) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    const { currentPassword, newPassword } = req.body || {};

    const user = await db.query.users.findFirst({
      where: (fields: any, { eq, and }: any) =>
        and(eq(fields.tenant_id, tenantId), eq(fields.id, userId)),
    });

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const ok = await comparePasswords(String(currentPassword || ''), String(user.password_hash || ''));
    if (!ok) {
      return res.status(400).json({ success: false, error: 'Password atual incorreta' });
    }

    const passwordHash = await hashPassword(String(newPassword));
    await db
      .update(users)
      .set({ password_hash: passwordHash, updated_at: new Date() })
      .where(and(eq(users.tenant_id, tenantId), eq(users.id, userId)));

    return res.json({ success: true, message: 'Password atualizada' });
  }
}
