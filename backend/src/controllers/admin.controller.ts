import { Response } from 'express';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { AuthenticatedRequest } from '../types/index.js';
import { db } from '../config/database.js';
import { assets, plants, userPlants, users } from '../db/schema.js';

const allowedRoles = [
  'superadmin',
  'admin_empresa',
  'gestor_manutencao',
  'supervisor',
  'tecnico',
  'leitor',
];

const roleLabels: Record<string, string> = {
  superadmin: 'Super Admin',
  admin_empresa: 'Admin Empresa',
  gestor_manutencao: 'Gestor Manutencao',
  supervisor: 'Supervisor',
  tecnico: 'Tecnico',
  leitor: 'Leitor',
};

const normalizePlantIds = (value: unknown) => {
  if (Array.isArray(value)) {
    return value.filter((id) => typeof id === 'string' && id.trim().length > 0);
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    return [value.trim()];
  }

  return [];
};

const validateRole = (role: string) => allowedRoles.includes(role);

const normalizeRole = (role: unknown) => String(role || '').trim().toLowerCase();

const normalizePlantRoles = (
  value: unknown,
): Array<{ plant_id: string; role: string }> => {
  if (!Array.isArray(value)) return [];
  return value
    .map((row) => ({
      plant_id: String((row as any)?.plant_id || '').trim(),
      role: normalizeRole((row as any)?.role),
    }))
    .filter((r) => r.plant_id.length > 0 && validateRole(r.role));
};

export async function listPlants(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.tenantId;

    if (!tenantId) {
      return res.status(400).json({ success: false, error: 'Tenant ID is required' });
    }

    const data = await db.query.plants.findMany({
      where: (fields: any, { eq }: any) => eq(fields.tenant_id, tenantId),
      orderBy: (fields: any) => [fields.name],
    });

    return res.json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to fetch plants' });
  }
}

export async function createPlant(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.tenantId;
    const { name, code, address, city, country, latitude, longitude, is_active } = req.body || {};

    if (!tenantId) {
      return res.status(400).json({ success: false, error: 'Tenant ID is required' });
    }

    if (!name || !code) {
      return res.status(400).json({ success: false, error: 'Name and code are required' });
    }

    const existingCount = await db.execute(
      sql`SELECT COUNT(*) AS total FROM plants WHERE tenant_id = ${tenantId}`,
    );

    if (Number(existingCount.rows[0]?.total || 0) > 0) {
      return res.status(400).json({ success: false, error: 'Single plant mode: creation disabled' });
    }

    const existing = await db.query.plants.findFirst({
      where: (fields: any, { eq, and }: any) =>
        and(eq(fields.tenant_id, tenantId), eq(fields.code, code)),
    });

    if (existing) {
      return res.status(409).json({ success: false, error: 'Plant code already exists' });
    }

    const [plant] = await db
      .insert(plants)
      .values({
        id: uuidv4(),
        tenant_id: tenantId,
        name,
        code,
        address,
        city,
        country,
        latitude,
        longitude,
        is_active: is_active ?? true,
      })
      .returning();

    return res.status(201).json({ success: true, data: plant });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to create plant' });
  }
}

export async function updatePlant(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.tenantId;
    const { plantId } = req.params;
    const { name, code, address, city, country, latitude, longitude, is_active } = req.body || {};

    if (!tenantId || !plantId) {
      return res.status(400).json({ success: false, error: 'Plant ID is required' });
    }

    const plant = await db.query.plants.findFirst({
      where: (fields: any, { eq, and }: any) =>
        and(eq(fields.tenant_id, tenantId), eq(fields.id, plantId)),
    });

    if (!plant) {
      return res.status(404).json({ success: false, error: 'Plant not found' });
    }

    if (code && code !== plant.code) {
      const duplicate = await db.query.plants.findFirst({
        where: (fields: any, { eq, and }: any) =>
          and(eq(fields.tenant_id, tenantId), eq(fields.code, code)),
      });

      if (duplicate) {
        return res.status(409).json({ success: false, error: 'Plant code already exists' });
      }
    }

    const [updated] = await db
      .update(plants)
      .set({
        name: name ?? plant.name,
        code: code ?? plant.code,
        address: address ?? plant.address,
        city: city ?? plant.city,
        country: country ?? plant.country,
        latitude: latitude ?? plant.latitude,
        longitude: longitude ?? plant.longitude,
        is_active: is_active ?? plant.is_active,
        updated_at: new Date(),
      })
      .where(and(eq(plants.tenant_id, tenantId), eq(plants.id, plantId)))
      .returning();

    return res.json({ success: true, data: updated });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to update plant' });
  }
}

export async function deactivatePlant(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.tenantId;
    const { plantId } = req.params;

    if (!tenantId || !plantId) {
      return res.status(400).json({ success: false, error: 'Plant ID is required' });
    }

    const assetsCount = await db.execute(
      sql`SELECT COUNT(*) AS total FROM assets WHERE tenant_id = ${tenantId} AND plant_id = ${plantId} AND deleted_at IS NULL`,
    );

    if (Number(assetsCount.rows[0]?.total || 0) > 0) {
      return res.status(400).json({
        success: false,
        error: 'Plant has active assets and cannot be deactivated',
      });
    }

    const [updated] = await db
      .update(plants)
      .set({
        is_active: false,
        deleted_at: new Date(),
        updated_at: new Date(),
      })
      .where(and(eq(plants.tenant_id, tenantId), eq(plants.id, plantId)))
      .returning();

    return res.json({ success: true, data: updated });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to deactivate plant' });
  }
}

export async function listUsers(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.tenantId;

    if (!tenantId) {
      return res.status(400).json({ success: false, error: 'Tenant ID is required' });
    }

    const result = await db.execute(sql`
      SELECT
        u.id,
        u.username,
        u.email,
        u.first_name,
        u.last_name,
        u.role,
        u.is_active,
        u.created_at,
        COALESCE(array_remove(array_agg(up.plant_id), NULL), '{}') AS plant_ids,
        COALESCE(
          jsonb_agg(
            CASE WHEN up.plant_id IS NULL THEN NULL
            ELSE jsonb_build_object('plant_id', up.plant_id, 'role', up.role)
            END
          ) FILTER (WHERE up.plant_id IS NOT NULL),
          '[]'::jsonb
        ) AS plant_roles
      FROM users u
      LEFT JOIN user_plants up ON u.id = up.user_id
      WHERE u.tenant_id = ${tenantId}
      GROUP BY u.id
      ORDER BY u.created_at DESC
    `);

    return res.json({ success: true, data: result.rows });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to fetch users' });
  }
}

export async function createUser(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.tenantId;
    const { username, email, password, first_name, last_name, role, plant_ids, plant_roles, is_active } = req.body || {};

    if (!tenantId) {
      return res.status(400).json({ success: false, error: 'Tenant ID is required' });
    }

    if (!username || !email || !password || !first_name || !last_name) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    if (!role || !validateRole(role)) {
      return res.status(400).json({ success: false, error: 'Invalid role' });
    }

    const plantRoles = normalizePlantRoles(plant_roles);
    const plantIds = plantRoles.length > 0 ? plantRoles.map((r) => r.plant_id) : normalizePlantIds(plant_ids);
    if (plantIds.length === 0) {
      return res.status(400).json({ success: false, error: 'At least one plant is required' });
    }

    const normalizedUsername = String(username).trim().toLowerCase();
    const existing = await db.query.users.findFirst({
      where: (fields: any, { eq, and }: any) =>
        and(eq(fields.tenant_id, tenantId), eq(fields.username, normalizedUsername)),
    });

    if (existing) {
      return res.status(409).json({ success: false, error: 'Username already exists' });
    }

    const existingEmail = await db.query.users.findFirst({
      where: (fields: any, { eq, and }: any) =>
        and(eq(fields.tenant_id, tenantId), eq(fields.email, email)),
    });

    if (existingEmail) {
      return res.status(409).json({ success: false, error: 'Email already exists' });
    }

    const plantsFound = await db.query.plants.findMany({
      where: (fields: any, { eq, and, inArray }: any) =>
        and(eq(fields.tenant_id, tenantId), inArray(fields.id, plantIds)),
    });

    if (plantsFound.length !== plantIds.length) {
      return res.status(400).json({ success: false, error: 'Invalid plant selection' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const [user] = await db
      .insert(users)
      .values({
        id: uuidv4(),
        tenant_id: tenantId,
        username: normalizedUsername,
        email,
        password_hash: passwordHash,
        first_name,
        last_name,
        role,
        is_active: is_active ?? true,
      })
      .returning();

    const effectivePlantRoles =
      plantRoles.length > 0
        ? plantRoles
        : plantIds.map((plantId: string) => ({ plant_id: plantId, role }));

    const userPlantRows = effectivePlantRoles.map((row) => ({
      id: uuidv4(),
      user_id: user.id,
      plant_id: row.plant_id,
      role: row.role,
    }));

    await db.insert(userPlants).values(userPlantRows);

    return res.status(201).json({ success: true, data: user });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to create user' });
  }
}

export async function updateUser(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.tenantId;
    const { userId } = req.params;
    const { username, first_name, last_name, role, password, plant_ids, plant_roles, is_active } = req.body || {};

    if (!tenantId || !userId) {
      return res.status(400).json({ success: false, error: 'User ID is required' });
    }

    const user = await db.query.users.findFirst({
      where: (fields: any, { eq, and }: any) =>
        and(eq(fields.tenant_id, tenantId), eq(fields.id, userId)),
    });

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    if (role && !validateRole(role)) {
      return res.status(400).json({ success: false, error: 'Invalid role' });
    }

    let normalizedUsername: string | undefined;
    if (username) {
      normalizedUsername = String(username).trim().toLowerCase();
      if (!normalizedUsername) {
        return res.status(400).json({ success: false, error: 'Invalid username' });
      }

      if (normalizedUsername !== user.username) {
        const duplicate = await db.query.users.findFirst({
          where: (fields: any, { eq, and }: any) =>
            and(eq(fields.tenant_id, tenantId), eq(fields.username, normalizedUsername)),
        });

        if (duplicate) {
          return res.status(409).json({ success: false, error: 'Username already exists' });
        }
      }
    }

    let passwordHash: string | undefined;
    if (password) {
      passwordHash = await bcrypt.hash(password, 10);
    }

    const [updated] = await db
      .update(users)
      .set({
        username: normalizedUsername ?? user.username,
        first_name: first_name ?? user.first_name,
        last_name: last_name ?? user.last_name,
        role: role ?? user.role,
        is_active: is_active ?? user.is_active,
        password_hash: passwordHash ?? user.password_hash,
        updated_at: new Date(),
      })
      .where(and(eq(users.tenant_id, tenantId), eq(users.id, userId)))
      .returning();

    if (plant_roles !== undefined || plant_ids !== undefined) {
      const incomingPlantRoles = normalizePlantRoles(plant_roles);
      const plantIds =
        incomingPlantRoles.length > 0
          ? incomingPlantRoles.map((r) => r.plant_id)
          : normalizePlantIds(plant_ids);

      if (plantIds.length === 0) {
        return res.status(400).json({ success: false, error: 'At least one plant is required' });
      }

      const plantsFound = await db.query.plants.findMany({
        where: (fields: any, { eq, and, inArray }: any) =>
          and(eq(fields.tenant_id, tenantId), inArray(fields.id, plantIds)),
      });

      if (plantsFound.length !== plantIds.length) {
        return res.status(400).json({ success: false, error: 'Invalid plant selection' });
      }

      await db.delete(userPlants).where(eq(userPlants.user_id, userId));

      const effectivePlantRoles =
        incomingPlantRoles.length > 0
          ? incomingPlantRoles
          : plantIds.map((plantId: string) => ({
              plant_id: plantId,
              role: normalizeRole(role ?? updated.role) || 'tecnico',
            }));

      const userPlantRows = effectivePlantRoles.map((row) => ({
        id: uuidv4(),
        user_id: userId,
        plant_id: row.plant_id,
        role: row.role,
      }));

      await db.insert(userPlants).values(userPlantRows);
    }

    return res.json({ success: true, data: updated });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to update user' });
  }
}

export async function listRoles(_req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = _req.tenantId;
    if (!tenantId) {
      return res.json({
        success: true,
        data: allowedRoles.map((role) => ({
          value: role,
          label: roleLabels[role] || role,
        })),
      });
    }

    const result = await db.execute(sql`
      SELECT key, name
      FROM rbac_roles
      WHERE tenant_id = ${tenantId}
      ORDER BY name ASC;
    `);

    if ((result.rows?.length || 0) === 0) {
      return res.json({
        success: true,
        data: allowedRoles.map((role) => ({
          value: role,
          label: roleLabels[role] || role,
        })),
      });
    }

    return res.json({
      success: true,
      data: (result.rows || []).map((r: any) => ({
        value: String(r.key),
        label: String(r.name),
      })),
    });
  } catch {
    return res.json({
      success: true,
      data: allowedRoles.map((role) => ({
        value: role,
        label: roleLabels[role] || role,
      })),
    });
  }
}

export async function resetUserPassword(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.tenantId;
    const { userId } = req.params;
    const { password } = req.body || {};

    if (!tenantId || !userId) {
      return res.status(400).json({ success: false, error: 'User ID is required' });
    }

    if (!password || String(password).length < 6) {
      return res.status(400).json({ success: false, error: 'Password inválida' });
    }

    const user = await db.query.users.findFirst({
      where: (fields: any, { eq, and }: any) =>
        and(eq(fields.tenant_id, tenantId), eq(fields.id, userId)),
    });

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await db
      .update(users)
      .set({ password_hash: passwordHash, updated_at: new Date() })
      .where(and(eq(users.tenant_id, tenantId), eq(users.id, userId)));

    return res.json({ success: true, message: 'Password atualizada' });
  } catch {
    return res.status(500).json({ success: false, error: 'Failed to reset password' });
  }
}

export async function listPermissions(req: AuthenticatedRequest, res: Response) {
  try {
    const result = await db.execute(sql`
      SELECT key, label, group_name, description
      FROM rbac_permissions
      ORDER BY group_name ASC, label ASC;
    `);
    return res.json({ success: true, data: result.rows || [] });
  } catch {
    return res.status(500).json({ success: false, error: 'Failed to fetch permissions' });
  }
}

export async function getRolePermissions(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.tenantId;
    const { roleKey } = req.params;

    if (!tenantId || !roleKey) {
      return res.status(400).json({ success: false, error: 'Tenant/role are required' });
    }

    const result = await db.execute(sql`
      SELECT permission_key
      FROM rbac_role_permissions
      WHERE tenant_id = ${tenantId} AND role_key = ${normalizeRole(roleKey)}
      ORDER BY permission_key ASC;
    `);

    return res.json({
      success: true,
      data: (result.rows || []).map((r: any) => String(r.permission_key)),
    });
  } catch {
    return res.status(500).json({ success: false, error: 'Failed to fetch role permissions' });
  }
}

export async function setRolePermissions(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.tenantId;
    const { roleKey } = req.params;
    const { permissions } = req.body || {};

    if (!tenantId || !roleKey) {
      return res.status(400).json({ success: false, error: 'Tenant/role are required' });
    }

    const perms = Array.isArray(permissions)
      ? permissions.map((p: any) => String(p).trim()).filter((p: string) => p.length > 0)
      : [];

    const normalizedRoleKey = normalizeRole(roleKey);

    // Replace set
    await db.execute(sql`
      DELETE FROM rbac_role_permissions
      WHERE tenant_id = ${tenantId} AND role_key = ${normalizedRoleKey};
    `);

    for (const perm of perms) {
      await db.execute(sql`
        INSERT INTO rbac_role_permissions (tenant_id, role_key, permission_key)
        VALUES (${tenantId}, ${normalizedRoleKey}, ${perm})
        ON CONFLICT (tenant_id, role_key, permission_key) DO NOTHING;
      `);
    }

    return res.json({ success: true, message: 'Permissões atualizadas', data: perms });
  } catch {
    return res.status(500).json({ success: false, error: 'Failed to update role permissions' });
  }
}
