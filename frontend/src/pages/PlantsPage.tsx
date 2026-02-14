import { useEffect, useMemo, useState } from 'react';
import { MainLayout } from '../layouts/MainLayout';
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  Save,
  Trash2,
  Users,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useAppStore } from '../context/store';
import {
  createAdminPlant,
  deactivateAdminPlant,
  getAdminPlants,
  getAdminUsers,
  updateAdminPlant,
  updateAdminUser,
} from '../services/api';

interface Plant {
  id: string;
  name: string;
  code: string;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  latitude?: string | null;
  longitude?: string | null;
  is_active?: boolean;
}

interface AdminUser {
  id: string;
  username?: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  is_active: boolean;
  plant_ids?: string[];
  plant_roles?: Array<{ plant_id: string; role: string }>;
}

const allowedRoles = new Set(['superadmin', 'admin_empresa']);

const normalizeCoord = (value: string) => {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

export function PlantsPage({ embedded = false }: { embedded?: boolean } = {}) {
  const { user } = useAuth();
  const { setPlants: setAppPlants } = useAppStore();
  const [plants, setPlants] = useState<Plant[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newPlant, setNewPlant] = useState({
    name: '',
    code: '',
    address: '',
    city: '',
    country: '',
    latitude: '',
    longitude: '',
    is_active: true,
  });

  const [editingPlantId, setEditingPlantId] = useState<string | null>(null);
  const [plantForm, setPlantForm] = useState({
    name: '',
    code: '',
    address: '',
    city: '',
    country: '',
    latitude: '',
    longitude: '',
    is_active: true,
  });

  const [selectedPlantId, setSelectedPlantId] = useState<string>('');
  const [assignedUserIds, setAssignedUserIds] = useState<Set<string>>(new Set());
  const [originalAssignedUserIds, setOriginalAssignedUserIds] = useState<Set<string>>(
    new Set(),
  );
  const [assignedUserRoles, setAssignedUserRoles] = useState<Record<string, string>>({});

  const getUserPlantRoleMap = (user: AdminUser) => {
    const map: Record<string, string> = {};
    const plantRoles = Array.isArray(user.plant_roles) ? user.plant_roles : [];

    for (const row of plantRoles) {
      const plantId = String(row?.plant_id || '').trim();
      const role = String(row?.role || '').trim();
      if (plantId && role) map[plantId] = role;
    }

    if (Object.keys(map).length === 0 && Array.isArray(user.plant_ids)) {
      for (const plantIdRaw of user.plant_ids) {
        const plantId = String(plantIdRaw || '').trim();
        if (plantId) map[plantId] = String(user.role || 'tecnico');
      }
    }

    return map;
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [plantsData, usersData] = await Promise.all([
        getAdminPlants(),
        getAdminUsers(),
      ]);
      const safePlants = plantsData || [];
      setPlants(safePlants);
      setAppPlants(safePlants);
      setUsers(usersData || []);
    } catch (err: any) {
      setError(err.message || 'Falha ao carregar plantas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!selectedPlantId && plants.length > 0) {
      setSelectedPlantId(plants[0].id);
    }
  }, [plants, selectedPlantId]);

  useEffect(() => {
    if (!selectedPlantId) return;

    const assigned = new Set(
      users.filter((user) => user.plant_ids?.includes(selectedPlantId)).map((user) => user.id),
    );
    setAssignedUserIds(assigned);
    setOriginalAssignedUserIds(new Set(assigned));
    const roleMap: Record<string, string> = {};
    users.forEach((user) => {
      const plantRoleMap = getUserPlantRoleMap(user);
      roleMap[user.id] = plantRoleMap[selectedPlantId] || String(user.role || 'tecnico');
    });
    setAssignedUserRoles(roleMap);
  }, [selectedPlantId, users]);

  const selectedPlant = useMemo(
    () => plants.find((plant) => plant.id === selectedPlantId) || null,
    [plants, selectedPlantId],
  );

  const handleCreatePlant = async () => {
    if (!newPlant.name.trim() || !newPlant.code.trim()) {
      setError('Nome e codigo da planta sao obrigatorios');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await createAdminPlant({
        name: newPlant.name.trim(),
        code: newPlant.code.trim(),
        address: newPlant.address.trim() || undefined,
        city: newPlant.city.trim() || undefined,
        country: newPlant.country.trim() || undefined,
        latitude: normalizeCoord(newPlant.latitude),
        longitude: normalizeCoord(newPlant.longitude),
        is_active: newPlant.is_active,
      });
      setNewPlant({
        name: '',
        code: '',
        address: '',
        city: '',
        country: '',
        latitude: '',
        longitude: '',
        is_active: true,
      });
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Erro ao criar planta');
    } finally {
      setSaving(false);
    }
  };

  const handleStartEdit = (plant: Plant) => {
    setEditingPlantId(plant.id);
    setPlantForm({
      name: plant.name || '',
      code: plant.code || '',
      address: plant.address || '',
      city: plant.city || '',
      country: plant.country || '',
      latitude: plant.latitude || '',
      longitude: plant.longitude || '',
      is_active: plant.is_active ?? true,
    });
  };

  const handleUpdatePlant = async () => {
    if (!editingPlantId) return;

    setSaving(true);
    setError(null);
    try {
      await updateAdminPlant(editingPlantId, {
        name: plantForm.name.trim() || undefined,
        code: plantForm.code.trim() || undefined,
        address: plantForm.address.trim() || undefined,
        city: plantForm.city.trim() || undefined,
        country: plantForm.country.trim() || undefined,
        latitude: normalizeCoord(plantForm.latitude),
        longitude: normalizeCoord(plantForm.longitude),
        is_active: plantForm.is_active,
      });
      setEditingPlantId(null);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Erro ao atualizar planta');
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (plantId: string) => {
    if (!window.confirm('Desativar esta planta?')) return;

    setSaving(true);
    setError(null);
    try {
      await deactivateAdminPlant(plantId);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Erro ao desativar planta');
    } finally {
      setSaving(false);
    }
  };

  const toggleUserAssignment = (userId: string) => {
    setAssignedUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
        setAssignedUserRoles((current) => ({
          ...current,
          [userId]: current[userId] || 'tecnico',
        }));
      }
      return next;
    });
  };

  const handleSaveAssignments = async () => {
    if (!selectedPlantId) return;

    setSaving(true);
    setError(null);
    try {
      const updates = users
        .map((user) => {
          const wasAssigned = originalAssignedUserIds.has(user.id);
          const isAssigned = assignedUserIds.has(user.id);
          const roleMap = getUserPlantRoleMap(user);
          const currentRole = roleMap[selectedPlantId];
          const nextRole = assignedUserRoles[user.id] || currentRole || user.role || 'tecnico';
          const roleChanged = isAssigned && currentRole !== nextRole;

          if (wasAssigned === isAssigned && !roleChanged) return null;

          if (isAssigned) {
            roleMap[selectedPlantId] = nextRole;
          } else {
            delete roleMap[selectedPlantId];
          }

          const nextPlantRoles = Object.entries(roleMap).map(([plantId, role]) => ({
            plant_id: plantId,
            role,
          }));

          return { userId: user.id, plant_roles: nextPlantRoles };
        })
        .filter(Boolean) as Array<{ userId: string; plant_roles: Array<{ plant_id: string; role: string }> }>;

      await Promise.all(
        updates.map((update) => updateAdminUser(update.userId, { plant_roles: update.plant_roles })),
      );

      setOriginalAssignedUserIds(new Set(assignedUserIds));
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Erro ao atualizar atribuicoes');
    } finally {
      setSaving(false);
    }
  };

  const canEdit = allowedRoles.has(user?.role || '');

  const content = (
    <div className="space-y-8 font-display">
        <section className="relative overflow-hidden rounded-3xl border theme-border bg-[radial-gradient(circle_at_top,var(--dash-panel)_0%,var(--dash-bg)_70%)] p-8 shadow-sm">
          <div className="absolute -right-12 -top-16 h-56 w-56 rounded-full bg-emerald-200/40 blur-3xl" />
          <div className="absolute -left-16 bottom-0 h-44 w-44 rounded-full bg-lime-200/40 blur-3xl" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
                Gestao de plantas
              </p>
              <h1 className="mt-3 text-3xl font-semibold theme-text sm:text-4xl">
                Instalações, locais e equipas
              </h1>
              <p className="mt-2 max-w-2xl text-sm theme-text-muted">
                Crie plantas, ajuste definicoes e atribua utilizadores por instalacao.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="rounded-full border theme-border bg-[color:var(--dash-panel)] px-3 py-2 text-xs font-semibold theme-text">
                {plants.length} plantas
              </div>
            </div>
          </div>
        </section>

        {!canEdit && (
          <div className="rounded-3xl border border-amber-500/20 bg-amber-500/10 p-6 text-sm theme-text">
            Esta pagina esta disponivel apenas para super admin e admin empresa.
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm theme-text">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_0.9fr]">
          <section className="rounded-3xl border theme-border theme-card p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold theme-text">Criar nova planta</h2>
                <p className="text-sm theme-text-muted">Defina codigo, local e status.</p>
              </div>
              <Building2 className="h-5 w-5 text-[color:var(--dash-muted)]" />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium theme-text mb-1">Nome</label>
                <input
                  className="input"
                  value={newPlant.name}
                  onChange={(event) => setNewPlant({ ...newPlant, name: event.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium theme-text mb-1">Codigo</label>
                <input
                  className="input"
                  value={newPlant.code}
                  onChange={(event) => setNewPlant({ ...newPlant, code: event.target.value })}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium theme-text mb-1">Endereco</label>
                <input
                  className="input"
                  value={newPlant.address}
                  onChange={(event) =>
                    setNewPlant({ ...newPlant, address: event.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium theme-text mb-1">Cidade</label>
                <input
                  className="input"
                  value={newPlant.city}
                  onChange={(event) => setNewPlant({ ...newPlant, city: event.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium theme-text mb-1">Pais</label>
                <input
                  className="input"
                  value={newPlant.country}
                  onChange={(event) => setNewPlant({ ...newPlant, country: event.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium theme-text mb-1">Latitude</label>
                <input
                  className="input"
                  value={newPlant.latitude}
                  onChange={(event) => setNewPlant({ ...newPlant, latitude: event.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium theme-text mb-1">Longitude</label>
                <input
                  className="input"
                  value={newPlant.longitude}
                  onChange={(event) => setNewPlant({ ...newPlant, longitude: event.target.value })}
                />
              </div>
              <label className="flex items-center gap-2 text-sm theme-text-muted md:col-span-2">
                <input
                  type="checkbox"
                  checked={newPlant.is_active}
                  onChange={(event) =>
                    setNewPlant({ ...newPlant, is_active: event.target.checked })
                  }
                />
                Planta ativa
              </label>
            </div>

            <button
              className="btn-primary inline-flex items-center gap-2"
              onClick={handleCreatePlant}
              disabled={saving || !canEdit}
            >
              <Plus className="h-4 w-4" />
              Criar planta
            </button>
          </section>

          <section className="rounded-3xl border theme-border theme-card p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold theme-text">Atribuir utilizadores</h2>
                <p className="text-sm theme-text-muted">Defina quem tem acesso a cada planta.</p>
              </div>
              <Users className="h-5 w-5 text-[color:var(--dash-muted)]" />
            </div>

            <div>
              <label className="block text-sm font-medium theme-text mb-1">Planta</label>
              <select
                className="input"
                value={selectedPlantId}
                onChange={(event) => setSelectedPlantId(event.target.value)}
              >
                {plants.map((plant) => (
                  <option key={plant.id} value={plant.id}>
                    {plant.code} - {plant.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="rounded-2xl border theme-border bg-[color:var(--dash-surface)] p-3 space-y-2">
              {users.map((userItem) => {
                const isAssigned = assignedUserIds.has(userItem.id);
                const onlyThisPlant =
                  (userItem.plant_ids || []).length === 1 &&
                  userItem.plant_ids?.includes(selectedPlantId);

                return (
                  <div
                    key={userItem.id}
                    className="flex flex-col gap-2 rounded-2xl border theme-border bg-[color:var(--dash-panel)] px-3 py-2 text-sm theme-text"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span>
                        {userItem.first_name} {userItem.last_name}
                        <span className="ml-2 text-xs theme-text-muted">{userItem.role}</span>
                      </span>
                      <input
                        type="checkbox"
                        checked={isAssigned}
                        onChange={() => toggleUserAssignment(userItem.id)}
                        disabled={!canEdit || onlyThisPlant}
                      />
                    </div>
                    <div className="flex items-center justify-between gap-3 text-xs theme-text-muted">
                      <span>Role nesta planta</span>
                      <select
                        className="input h-8"
                        value={assignedUserRoles[userItem.id] || userItem.role || 'tecnico'}
                        onChange={(event) =>
                          setAssignedUserRoles((current) => ({
                            ...current,
                            [userItem.id]: event.target.value,
                          }))
                        }
                        disabled={!isAssigned || !canEdit}
                      >
                        {Array.from(allowedRoles).map((role) => (
                          <option key={role} value={role}>
                            {role.replace(/_/g, ' ')}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                );
              })}
              {users.length === 0 && (
                <p className="text-sm theme-text-muted">Nenhum utilizador encontrado.</p>
              )}
            </div>

            <div className="text-xs theme-text-muted">
              Cada utilizador precisa de pelo menos uma planta associada.
            </div>

            <button
              className="btn-primary inline-flex items-center gap-2"
              onClick={handleSaveAssignments}
              disabled={saving || !canEdit}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Guardar atribuicoes
            </button>
          </section>
        </div>

        <section className="rounded-3xl border theme-border theme-card p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold theme-text">Plantas existentes</h2>
              <p className="text-sm theme-text-muted">Edite definicoes e status.</p>
            </div>
            <MapPin className="h-5 w-5 text-[color:var(--dash-muted)]" />
          </div>

          {loading && (
            <div className="flex items-center gap-2 text-sm theme-text-muted">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando plantas...
            </div>
          )}

          {!loading && plants.length === 0 && (
            <div className="rounded-2xl border border-dashed theme-border p-6 text-sm theme-text-muted">
              Nenhuma planta cadastrada.
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            {plants.map((plant) => (
              <div
                key={plant.id}
                className="rounded-2xl border theme-border bg-[color:var(--dash-surface)] p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold theme-text">
                      {plant.code} - {plant.name}
                    </p>
                    <p className="text-xs theme-text-muted">
                      {plant.city || 'Cidade'} · {plant.country || 'Pais'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        plant.is_active
                          ? 'bg-emerald-500/10 text-emerald-600'
                          : 'border theme-border bg-[color:var(--dash-panel)] theme-text-muted'
                      }`}
                    >
                      {plant.is_active ? 'Ativa' : 'Inativa'}
                    </span>
                    <button
                      className="text-xs theme-text-muted hover:text-[color:var(--dash-text)] disabled:opacity-60"
                      onClick={() => handleStartEdit(plant)}
                      disabled={!canEdit}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      className="text-xs text-rose-500 hover:text-rose-400 disabled:opacity-60"
                      onClick={() => handleDeactivate(plant.id)}
                      disabled={!canEdit}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-3 text-xs theme-text-muted">
                  {plant.address || 'Endereco nao informado'}
                </div>

                {editingPlantId === plant.id && (
                  <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                    <input
                      className="input"
                      value={plantForm.name}
                      onChange={(event) =>
                        setPlantForm({ ...plantForm, name: event.target.value })
                      }
                      placeholder="Nome"
                    />
                    <input
                      className="input"
                      value={plantForm.code}
                      onChange={(event) =>
                        setPlantForm({ ...plantForm, code: event.target.value })
                      }
                      placeholder="Codigo"
                    />
                    <input
                      className="input"
                      value={plantForm.address}
                      onChange={(event) =>
                        setPlantForm({ ...plantForm, address: event.target.value })
                      }
                      placeholder="Endereco"
                    />
                    <input
                      className="input"
                      value={plantForm.city}
                      onChange={(event) =>
                        setPlantForm({ ...plantForm, city: event.target.value })
                      }
                      placeholder="Cidade"
                    />
                    <input
                      className="input"
                      value={plantForm.country}
                      onChange={(event) =>
                        setPlantForm({ ...plantForm, country: event.target.value })
                      }
                      placeholder="Pais"
                    />
                    <input
                      className="input"
                      value={plantForm.latitude}
                      onChange={(event) =>
                        setPlantForm({ ...plantForm, latitude: event.target.value })
                      }
                      placeholder="Latitude"
                    />
                    <input
                      className="input"
                      value={plantForm.longitude}
                      onChange={(event) =>
                        setPlantForm({ ...plantForm, longitude: event.target.value })
                      }
                      placeholder="Longitude"
                    />
                    <label className="flex items-center gap-2 text-xs theme-text-muted md:col-span-2">
                      <input
                        type="checkbox"
                        checked={plantForm.is_active}
                        onChange={(event) =>
                          setPlantForm({ ...plantForm, is_active: event.target.checked })
                        }
                      />
                      Planta ativa
                    </label>
                    <div className="flex items-center gap-2 md:col-span-2">
                      <button
                        className="btn-primary"
                        onClick={handleUpdatePlant}
                        disabled={saving}
                      >
                        Guardar
                      </button>
                      <button
                        className="btn-secondary"
                        onClick={() => setEditingPlantId(null)}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}

                {(plant.latitude || plant.longitude) && (
                  <div className="mt-3 flex items-center gap-2 text-xs theme-text-muted">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    Coordenadas: {plant.latitude || '-'} , {plant.longitude || '-'}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {selectedPlant && (
          <section className="rounded-3xl border theme-border theme-card p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold theme-text">Resumo da planta</h2>
                <p className="text-sm theme-text-muted">
                  {selectedPlant.code} - {selectedPlant.name}
                </p>
              </div>
              <AlertCircle className="h-5 w-5 text-[color:var(--dash-muted)]" />
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border theme-border bg-[color:var(--dash-surface)] p-4">
                <p className="text-xs theme-text-muted">Endereco</p>
                <p className="text-sm theme-text">
                  {selectedPlant.address || 'Nao informado'}
                </p>
              </div>
              <div className="rounded-2xl border theme-border bg-[color:var(--dash-surface)] p-4">
                <p className="text-xs theme-text-muted">Local</p>
                <p className="text-sm theme-text">
                  {[selectedPlant.city, selectedPlant.country].filter(Boolean).join(' · ') ||
                    'Nao informado'}
                </p>
              </div>
            </div>
          </section>
        )}
    </div>
  );

  if (embedded) {
    return content;
  }

  return <MainLayout>{content}</MainLayout>;
}
