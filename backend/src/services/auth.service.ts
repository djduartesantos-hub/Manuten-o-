import { db } from '../config/database';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';
import { comparePasswords, hashPassword } from '../auth/jwt';

export class AuthService {
  static async findUserByEmail(tenantId: string, email: string) {
    const user = await db.query.users.findFirst({
      where: (fields: any, { eq, and }: any) =>
        and(eq(fields.tenant_id, tenantId), eq(fields.email, email)),
    });
    return user;
  }

  static async findUserById(userId: string) {
    const user = await db.query.users.findFirst({
      where: (fields: any) => eq(fields.id, userId),
    });
    return user;
  }

  static async validateCredentials(
    tenantId: string,
    email: string,
    password: string,
  ) {
    const user = await this.findUserByEmail(tenantId, email);

    if (!user || !user.is_active) {
      return null;
    }

    const isPasswordValid = await comparePasswords(password, user.password_hash);

    if (!isPasswordValid) {
      return null;
    }

    return user;
  }

  static async createUser(data: {
    tenant_id: string;
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    role: string;
    phone?: string;
  }) {
    const passwordHash = await hashPassword(data.password);

    const [user] = await db
      .insert(users)
      .values({
        ...data,
        password_hash: passwordHash,
      })
      .returning();

    return user;
  }
}
