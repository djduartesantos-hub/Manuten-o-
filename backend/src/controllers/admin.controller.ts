import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { AuthenticatedRequest } from '../types/index.js';
import { db } from '../config/database.js';
import { assets, plants, rbacRoles, userPlants, users } from '../db/schema.js';

function generateTempPassword(length = 14): string {
  // Base64url gives URL-safe chars; slice for desired length.
  // This password is only returned once (in the create response).
  return randomBytes(24).toString('base64url').slice(0, length);
}

function stripUserSensitiveFields(user: any) {
  if (!user || typeof user !== 'object') return user;
  // Never return password hashes in API responses.
  // Keep the rest of the shape unchanged.
  const { password_hash: _passwordHash, ...rest } = user;
  return rest;
}

const allowedRoles = [
  'superadmin',
  'admin_empresa',
  'gestor_manutencao',
  'supervisor',
  'tecnico',
  'operador',
];

const roleLabels: Record<string, string> = {
  superadmin: 'SuperAdministrador',
  admin_empresa: 'Admin Empresa',
  gestor_manutencao: 'Gestor Fábrica',
  supervisor: 'Supervisor',
  tecnico: 'Técnico',
  operador: 'Operador',
};

const PROTECTED_ROLE_KEYS = new Set<string>(['superadmin']);

const normalizePlantIds = (value: unknown) => {
  if (Array.isArray(value)) {
    return value.filter((id) => typeof id === 'string' && id.trim().length > 0);
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    return [value.trim()];
  }

  return [];
};

const normalizeRole = (role: unknown) => String(role || '').trim().toLowerCase();

const isProtectedRoleKey = (roleKey: unknown) => PROTECTED_ROLE_KEYS.has(normalizeRole(roleKey));

const isSafeRoleKey = (value: string) => /^[a-z0-9_]+$/.test(value);

const normalizeHomePath = (value: unknown) => {
  const v = String(value || '').trim();
  if (!v) return null;
  if (!v.startsWith('/')) return null;
  if (v.length > 128) return null;
  return v;
};

const suggestHomeFromPermissions = (permissions: Set<string>): string => {
  if (
    permissions.has('admin:rbac') ||
    permissions.has('admin:users') ||
    permissions.has('admin:plants')
  ) {
    return '/settings';
  }

  if (permissions.has('workorders:write') && permissions.has('assets:write')) {
    return '/tecnico';
  }

  if (permissions.has('workorders:write')) {
    return '/operador';
  }

  return '/dashboard';
};

const getRoleKeysForTenant = async (tenantId: string): Promise<Set<string>> => {
  const result = await db.execute(sql`
    SELECT key
    FROM rbac_roles
    WHERE tenant_id = ${tenantId}
  `);

  const keys = new Set<string>();
  for (const row of (result.rows || []) as any[]) {
    const k = normalizeRole(row?.key);
    if (k) keys.add(k);
  }
  if (keys.size === 0) {
    for (const role of allowedRoles) keys.add(role);
  }
  return keys;
};

const normalizePlantRoles = (
  value: unknown,
): Array<{ plant_id: string; role: string }> => {
  if (!Array.isArray(value)) return [];
  return value
    .map((row) => ({
      plant_id: String((row as any)?.plant_id || '').trim(),
      role: normalizeRole((row as any)?.role),
    }))
    .filter((r) => r.plant_id.length > 0 && r.role.length > 0);
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
    const {
      username,
      email,
      password,
      first_name,
      last_name,
      role,
      plant_ids,
      plant_roles,
      is_active,
      generatePassword,
      generate_password,
    } = req.body || {};

    if (!tenantId) {
      return res.status(400).json({ success: false, error: 'Tenant ID is required' });
    }

    const shouldGeneratePassword = Boolean(generatePassword ?? generate_password);
    const incomingPassword = typeof password === 'string' ? password : String(password || '');
    const finalPassword = shouldGeneratePassword ? generateTempPassword() : incomingPassword;

    if (!username || !email || !first_name || !last_name) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    if (!finalPassword || String(finalPassword).trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Password is required' });
    }

    const roleKey = normalizeRole(role);
    if (!roleKey) {
      return res.status(400).json({ success: false, error: 'Invalid role' });
    }

    const roleKeys = await getRoleKeysForTenant(tenantId);
    if (!roleKeys.has(roleKey)) {
      return res.status(400).json({ success: false, error: 'Invalid role' });
    }

    const plantRoles = normalizePlantRoles(plant_roles);
    if (plantRoles.some((r) => !roleKeys.has(r.role))) {
      return res.status(400).json({ success: false, error: 'Invalid role in plant_roles' });
    }
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

    const passwordHash = await bcrypt.hash(finalPassword, 10);
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
        role: roleKey,
        is_active: is_active ?? true,
      })
      .returning();

    const effectivePlantRoles =
      plantRoles.length > 0
        ? plantRoles
        : plantIds.map((plantId: string) => ({ plant_id: plantId, role: roleKey }));

    const userPlantRows = effectivePlantRoles.map((row) => ({
      id: uuidv4(),
      user_id: user.id,
      plant_id: row.plant_id,
      role: row.role,
    }));

    await db.insert(userPlants).values(userPlantRows);

    const safeUser = stripUserSensitiveFields(user);
    const responseData = shouldGeneratePassword
      ? { ...safeUser, temp_password: finalPassword }
      : safeUser;

    return res.status(201).json({ success: true, data: responseData });
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

    const roleKeys = await getRoleKeysForTenant(tenantId);
    const incomingRoleKey = role !== undefined ? normalizeRole(role) : undefined;
    if (incomingRoleKey !== undefined && (!incomingRoleKey || !roleKeys.has(incomingRoleKey))) {
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
        role: incomingRoleKey ?? user.role,
        is_active: is_active ?? user.is_active,
        password_hash: passwordHash ?? user.password_hash,
        updated_at: new Date(),
      })
      .where(and(eq(users.tenant_id, tenantId), eq(users.id, userId)))
      .returning();

    if (plant_roles !== undefined || plant_ids !== undefined) {
      const incomingPlantRoles = normalizePlantRoles(plant_roles);
      if (incomingPlantRoles.some((r) => !roleKeys.has(r.role))) {
        return res.status(400).json({ success: false, error: 'Invalid role in plant_roles' });
      }
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
              role: normalizeRole(incomingRoleKey ?? updated.role) || 'tecnico',
            }));

      const userPlantRows = effectivePlantRoles.map((row) => ({
        id: uuidv4(),
        user_id: userId,
        plant_id: row.plant_id,
        role: row.role,
      }));

      await db.insert(userPlants).values(userPlantRows);
    }

    return res.json({ success: true, data: stripUserSensitiveFields(updated) });
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
          description: null,
          is_system: true,
        })),
      });
    }

    const result = await db.execute(sql`
      SELECT key, name, description, is_system
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
          description: null,
          is_system: true,
        })),
      });
    }

    return res.json({
      success: true,
      data: (result.rows || [])
        .map((r: any) => ({
          value: String(r.key),
          label: String(r.name),
          description:
            r.description === null || r.description === undefined ? null : String(r.description),
          is_system: Boolean(r.is_system),
        }))
        .filter((r: any) => normalizeRole(r?.value) !== 'leitor'),
    });
  } catch {
    return res.json({
      success: true,
      data: allowedRoles.map((role) => ({
        value: role,
        label: roleLabels[role] || role,
        description: null,
        is_system: true,
      })),
    });
  }
}

export async function createRole(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.tenantId;
    const { key, name, description } = req.body || {};

    if (!tenantId) {
      return res.status(400).json({ success: false, error: 'Tenant ID is required' });
    }

    const roleKey = normalizeRole(key);
    const roleName = String(name || '').trim();
    const roleDescription = description === undefined || description === null ? null : String(description).trim();

    if (!roleKey || !isSafeRoleKey(roleKey)) {
      return res.status(400).json({ success: false, error: 'Invalid role key' });
    }

    if (isProtectedRoleKey(roleKey)) {
      return res.status(403).json({ success: false, error: 'Role reservada do sistema' });
    }

    if (!roleName) {
      return res.status(400).json({ success: false, error: 'Role name is required' });
    }

    const existing = await db.execute(sql`
      SELECT key
      FROM rbac_roles
      WHERE tenant_id = ${tenantId} AND key = ${roleKey}
      LIMIT 1;
    `);

    if ((existing.rows?.length || 0) > 0) {
      return res.status(409).json({ success: false, error: 'Role already exists' });
    }

    const [created] = await db
      .insert(rbacRoles)
      .values({
        tenant_id: tenantId,
        key: roleKey,
        name: roleName,
        description: roleDescription,
        is_system: false,
        updated_at: new Date(),
      })
      .returning();

    return res.status(201).json({
      success: true,
      data: {
        value: String(created.key),
        label: String(created.name),
        description: created.description === null || created.description === undefined ? null : String(created.description),
        is_system: Boolean(created.is_system),
      },
    });
  } catch {
    return res.status(500).json({ success: false, error: 'Failed to create role' });
  }
}

export async function updateRole(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.tenantId;
    const { roleKey } = req.params;
    const { name, description } = req.body || {};

    if (!tenantId || !roleKey) {
      return res.status(400).json({ success: false, error: 'Tenant/role are required' });
    }

    const normalizedKey = normalizeRole(roleKey);
    if (!normalizedKey || !isSafeRoleKey(normalizedKey)) {
      return res.status(400).json({ success: false, error: 'Invalid role key' });
    }

    if (isProtectedRoleKey(normalizedKey)) {
      return res.status(403).json({
        success: false,
        error: 'Role protegida: não pode ser alterada',
      });
    }

    const existing = await db.execute(sql`
      SELECT key, name, description, is_system
      FROM rbac_roles
      WHERE tenant_id = ${tenantId} AND key = ${normalizedKey}
      LIMIT 1;
    `);

    if ((existing.rows?.length || 0) === 0) {
      return res.status(404).json({ success: false, error: 'Role not found' });
    }

    const nextName = name === undefined ? undefined : String(name).trim();
    const nextDescription = description === undefined ? undefined : (description === null ? null : String(description).trim());

    if (nextName !== undefined && !nextName) {
      return res.status(400).json({ success: false, error: 'Invalid role name' });
    }

    const [updated] = await db
      .update(rbacRoles)
      .set({
        name: nextName ?? String(existing.rows[0]?.name || ''),
        description: nextDescription ?? (existing.rows[0]?.description ?? null),
        updated_at: new Date(),
      })
      .where(and(eq(rbacRoles.tenant_id, tenantId), eq(rbacRoles.key, normalizedKey)))
      .returning();

    return res.json({
      success: true,
      data: {
        value: String(updated.key),
        label: String(updated.name),
        description: updated.description === null || updated.description === undefined ? null : String(updated.description),
        is_system: Boolean(updated.is_system),
      },
    });
  } catch {
    return res.status(500).json({ success: false, error: 'Failed to update role' });
  }
}

export async function listRoleHomePages(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      return res.status(400).json({ success: false, error: 'Tenant ID is required' });
    }

    const plantIdRaw = (req.query as any)?.plant_id;
    const plantId = typeof plantIdRaw === 'string' && plantIdRaw.trim().length > 0 ? plantIdRaw.trim() : null;

    // Roles in tenant (fallback to allowedRoles if none)
    const rolesRes = await db.execute(sql`
      SELECT key
      FROM rbac_roles
      WHERE tenant_id = ${tenantId}
    `);

    const roleKeys: string[] = ((rolesRes.rows || []) as any[])
      .map((r: any) => normalizeRole(r?.key))
      .filter((k: string) => k.length > 0);

    const uniqueRoleKeys: string[] = Array.from(
      new Set<string>(roleKeys.length > 0 ? roleKeys : allowedRoles),
    );

    // Role permissions for suggestion
    const permsRes = await db.execute(sql`
      SELECT role_key, permission_key
      FROM rbac_role_permissions
      WHERE tenant_id = ${tenantId}
    `);

    const permsByRole = new Map<string, Set<string>>();
    for (const row of (permsRes.rows || []) as any[]) {
      const rk = normalizeRole(row?.role_key);
      const pk = String(row?.permission_key || '').trim();
      if (!rk || !pk) continue;
      if (!permsByRole.has(rk)) permsByRole.set(rk, new Set());
      permsByRole.get(rk)!.add(pk);
    }

    const globalRes = await db.execute(sql`
      SELECT role_key, home_path
      FROM rbac_role_home_pages
      WHERE tenant_id = ${tenantId} AND plant_id IS NULL
    `);
    const globalHomeByRole = new Map<string, string>();
    for (const row of (globalRes.rows || []) as any[]) {
      const rk = normalizeRole(row?.role_key);
      const hp = String(row?.home_path || '').trim();
      if (rk && hp) globalHomeByRole.set(rk, hp);
    }

    const plantHomeByRole = new Map<string, string>();
    if (plantId) {
      const plantRes = await db.execute(sql`
        SELECT role_key, home_path
        FROM rbac_role_home_pages
        WHERE tenant_id = ${tenantId} AND plant_id = ${plantId}
      `);
      for (const row of (plantRes.rows || []) as any[]) {
        const rk = normalizeRole(row?.role_key);
        const hp = String(row?.home_path || '').trim();
        if (rk && hp) plantHomeByRole.set(rk, hp);
      }
    }

    const data = uniqueRoleKeys
      .map((roleKey) => {
        const perms = permsByRole.get(roleKey) || new Set<string>();
        const suggested = suggestHomeFromPermissions(perms);
        const globalHome = globalHomeByRole.get(roleKey) || null;
        const plantHome = plantId ? (plantHomeByRole.get(roleKey) || null) : null;

        const effectiveHome = plantHome || globalHome || suggested;
        return {
          role_key: roleKey,
          plant_id: plantId,
          home_path: effectiveHome,
          plant_override: plantHome,
          global_base: globalHome,
          suggested_home: suggested,
        };
      })
      .sort((a, b) => a.role_key.localeCompare(b.role_key));

    return res.json({ success: true, data });
  } catch (error: any) {
    // Backward-compat if RBAC not migrated yet
    const msg = String(error?.message || '');
    const pgCode = error?.code;
    if (pgCode === '42P01' || (msg.includes('relation') && msg.includes('does not exist'))) {
      return res.json({
        success: true,
        data: allowedRoles.map((roleKey) => ({
          role_key: roleKey,
          plant_id: null,
          home_path:
            roleKey === 'superadmin'
              ? '/settings?panel=superadmin'
              : roleKey === 'tecnico'
                ? '/tecnico'
                : roleKey === 'operador'
                  ? '/operador'
                  : '/dashboard',
          plant_override: null,
          global_base: null,
          suggested_home:
            roleKey === 'superadmin'
              ? '/settings?panel=superadmin'
              : roleKey === 'tecnico'
                ? '/tecnico'
                : roleKey === 'operador'
                  ? '/operador'
                  : '/dashboard',
        })),
      });
    }

    return res.status(500).json({ success: false, error: 'Failed to fetch role home pages' });
  }
}

export async function setRoleHomePages(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      return res.status(400).json({ success: false, error: 'Tenant ID is required' });
    }

    const { plant_id, entries } = req.body || {};
    const plantId = typeof plant_id === 'string' && plant_id.trim().length > 0 ? plant_id.trim() : null;
    const rows = Array.isArray(entries) ? entries : [];

    // Validate role keys using tenant roles (fallback to allowedRoles)
    const roleKeys = await getRoleKeysForTenant(tenantId);

    const normalizedEntries = rows
      .map((e: any) => {
        const roleKey = normalizeRole(e?.role_key);
        const homePath = normalizeHomePath(e?.home_path);
        return { roleKey, homePath };
      })
      .filter(
        (e: any) =>
          e.roleKey &&
          e.homePath &&
          roleKeys.has(e.roleKey) &&
          !isProtectedRoleKey(e.roleKey),
      );

    // Ensure one entry per role_key (last write wins)
    const byRoleKey = new Map<string, string>();
    for (const e of normalizedEntries) {
      byRoleKey.set(e.roleKey, e.homePath);
    }
    const uniqueEntries = Array.from(byRoleKey.entries()).map(([roleKey, homePath]) => ({
      roleKey,
      homePath,
    }));

    // Replace set for this scope
    if (plantId) {
      await db.execute(sql`
        DELETE FROM rbac_role_home_pages
        WHERE tenant_id = ${tenantId} AND plant_id = ${plantId} AND role_key <> 'superadmin'
      `);
    } else {
      await db.execute(sql`
        DELETE FROM rbac_role_home_pages
        WHERE tenant_id = ${tenantId} AND plant_id IS NULL AND role_key <> 'superadmin'
      `);
    }

    for (const e of uniqueEntries) {
      await db.execute(sql`
        INSERT INTO rbac_role_home_pages (tenant_id, plant_id, role_key, home_path, created_at, updated_at)
        VALUES (${tenantId}, ${plantId}, ${e.roleKey}, ${e.homePath}, NOW(), NOW())
      `);
    }

    return res.json({ success: true, message: 'Home pages atualizadas' });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to update role home pages' });
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

    if (isProtectedRoleKey(normalizedRoleKey)) {
      return res.status(403).json({
        success: false,
        error: 'Permissões do SuperAdministrador não podem ser alteradas',
      });
    }

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
