import React from 'react';
import toast from 'react-hot-toast';
import { MainLayout } from '../layouts/MainLayout';
import { useAuthStore } from '../context/store';
import { changePassword, getProfile, updateProfile, type UserProfile } from '../services/api';
import { KeyRound, Phone, Mail, User as UserIcon, Shield } from 'lucide-react';

export function ProfilePage() {
  const { user, token, refreshToken, setAuth } = useAuthStore();
  const [loading, setLoading] = React.useState(false);

  const [profile, setProfile] = React.useState<UserProfile | null>(null);
  const [firstName, setFirstName] = React.useState(user?.firstName || '');
  const [lastName, setLastName] = React.useState(user?.lastName || '');
  const [email, setEmail] = React.useState(user?.email || '');
  const [phone, setPhone] = React.useState('');

  const [currentPassword, setCurrentPassword] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');

  const initials = React.useMemo(() => {
    const a = (firstName || user?.firstName || '').trim().slice(0, 1);
    const b = (lastName || user?.lastName || '').trim().slice(0, 1);
    return `${a}${b}`.trim() || 'U';
  }, [firstName, lastName, user?.firstName, user?.lastName]);

  React.useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await getProfile();
        setProfile(data);
        setFirstName(data.firstName || '');
        setLastName(data.lastName || '');
        setEmail(data.email || '');
        setPhone(data.phone || '');
      } catch (error: any) {
        toast.error(error?.message || 'Falha ao carregar perfil');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const handleSaveProfile = async (event: React.FormEvent) => {
    event.preventDefault();

    setLoading(true);
    try {
      const updated = await updateProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phone: phone.trim(),
      });

      setProfile(updated);

      if (token && refreshToken) {
        setAuth(
          {
            id: updated.id,
            username: updated.username,
            email: updated.email,
            firstName: updated.firstName,
            lastName: updated.lastName,
            role: updated.role,
            tenantId: updated.tenantId,
          },
          token,
          refreshToken,
        );
      }

      toast.success('Perfil atualizado');
    } catch (error: any) {
      toast.error(error?.message || 'Falha ao atualizar perfil');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!currentPassword || !newPassword) {
      toast.error('Preencha as passwords');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('A confirmação não coincide');
      return;
    }

    setLoading(true);
    try {
      await changePassword({ currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast.success('Password atualizada');
    } catch (error: any) {
      toast.error(error?.message || 'Falha ao atualizar password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold theme-text">Perfil</h1>
            <p className="mt-1 text-sm theme-text-muted">
              Atualize os seus dados e a segurança da conta.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {loading && (
              <span className="text-xs theme-text-muted">A guardar…</span>
            )}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-5">
          {/* Summary */}
          <div className="lg:col-span-2">
            <div className="rounded-2xl border theme-border theme-card p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl theme-surface text-lg font-semibold theme-text">
                  {initials}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold theme-text">
                    {(firstName || user?.firstName || '').trim()}{' '}
                    {(lastName || user?.lastName || '').trim()}
                  </p>
                  <p className="truncate text-sm theme-text-muted">
                    @{profile?.username || user?.username || 'utilizador'}
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-3">
                <div className="flex items-center gap-3 rounded-2xl border theme-border theme-card px-4 py-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-2xl theme-surface">
                    <UserIcon className="h-4 w-4 theme-text-muted" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wider theme-text-muted">
                      Função
                    </p>
                    <p className="truncate text-sm font-semibold theme-text">
                      {profile?.roleLabel || (profile?.role || user?.role || '').replace(/_/g, ' ') || '—'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-2xl border theme-border theme-card px-4 py-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-2xl theme-surface">
                    <Mail className="h-4 w-4 theme-text-muted" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wider theme-text-muted">
                      Email
                    </p>
                    <p className="truncate text-sm font-semibold theme-text">
                      {email || '—'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-2xl border theme-border theme-card px-4 py-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-2xl theme-surface">
                    <Phone className="h-4 w-4 theme-text-muted" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wider theme-text-muted">
                      Telefone
                    </p>
                    <p className="truncate text-sm font-semibold theme-text">
                      {phone || '—'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Forms */}
          <div className="grid gap-6 lg:col-span-3">
            <form
              onSubmit={handleSaveProfile}
              className="rounded-2xl border theme-border theme-card p-6"
            >
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-2xl theme-surface">
                      <UserIcon className="h-4 w-4 theme-text-muted" />
                    </div>
                    <div>
                      <h2 className="text-sm font-semibold theme-text">Dados pessoais</h2>
                      <p className="text-xs theme-text-muted">Informação básica do utilizador.</p>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-full bg-[color:var(--dash-accent)] px-4 py-2 text-sm font-semibold text-white transition disabled:opacity-60"
                >
                  Guardar
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wider theme-text-muted">
                    Primeiro nome
                  </span>
                  <input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full rounded-2xl border theme-border theme-card px-4 py-3 text-sm theme-text focus:outline-none focus:ring-2 focus:ring-emerald-200"
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wider theme-text-muted">
                    Último nome
                  </span>
                  <input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full rounded-2xl border theme-border theme-card px-4 py-3 text-sm theme-text focus:outline-none focus:ring-2 focus:ring-emerald-200"
                  />
                </label>

                <label className="block sm:col-span-2">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wider theme-text-muted">
                    Email
                  </span>
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    type="email"
                    className="w-full rounded-2xl border theme-border theme-card px-4 py-3 text-sm theme-text focus:outline-none focus:ring-2 focus:ring-emerald-200"
                  />
                </label>

                <label className="block sm:col-span-2">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wider theme-text-muted">
                    Telefone
                  </span>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full rounded-2xl border theme-border theme-card px-4 py-3 text-sm theme-text focus:outline-none focus:ring-2 focus:ring-emerald-200"
                  />
                </label>
              </div>
            </form>

            <form
              onSubmit={handleChangePassword}
              className="rounded-2xl border theme-border theme-card p-6"
            >
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-2xl theme-surface">
                      <Shield className="h-4 w-4 theme-text-muted" />
                    </div>
                    <div>
                      <h2 className="text-sm font-semibold theme-text">Segurança</h2>
                      <p className="text-xs theme-text-muted">Alterar palavra-passe.</p>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-full bg-[color:var(--dash-accent)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-95 disabled:opacity-60"
                >
                  Atualizar
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="block sm:col-span-2">
                  <span className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider theme-text-muted">
                    <KeyRound className="h-3.5 w-3.5" />
                    Password atual
                  </span>
                  <input
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    type="password"
                    autoComplete="current-password"
                    className="w-full rounded-2xl border theme-border theme-card px-4 py-3 text-sm theme-text focus:outline-none focus:ring-2 focus:ring-emerald-200"
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wider theme-text-muted">
                    Password nova
                  </span>
                  <input
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    type="password"
                    autoComplete="new-password"
                    className="w-full rounded-2xl border theme-border theme-card px-4 py-3 text-sm theme-text focus:outline-none focus:ring-2 focus:ring-emerald-200"
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wider theme-text-muted">
                    Confirmar
                  </span>
                  <input
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    type="password"
                    autoComplete="new-password"
                    className="w-full rounded-2xl border theme-border theme-card px-4 py-3 text-sm theme-text focus:outline-none focus:ring-2 focus:ring-emerald-200"
                  />
                </label>
              </div>
            </form>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
