import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Building2,
  Download,
  Loader2,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  RefreshCcw,
  Search,
  Trash2,
  Users,
} from 'lucide-react';
import { MainLayout } from '../layouts/MainLayout';
import { useAppStore } from '../context/store';
import {
  createSupplier,
  deleteSupplier,
  getSuppliers,
  updateSupplier,
} from '../services/api';

interface Supplier {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  created_at?: string;
  updated_at?: string;
}

export function SuppliersPage({ embedded = false }: { embedded?: boolean } = {}) {
  const { selectedPlant } = useAppStore();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [saving, setSaving] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    country: '',
  });

  const loadSuppliers = async (query?: string) => {
    if (!selectedPlant || !selectedPlant.trim()) {
      setSuppliers([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await getSuppliers(selectedPlant, query);
      setSuppliers(data || []);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar fornecedores');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setSearchQuery(searchInput.trim());
    }, 350);

    return () => window.clearTimeout(handle);
  }, [searchInput]);

  useEffect(() => {
    loadSuppliers(searchQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPlant, searchQuery]);

  const supplierSummary = useMemo(() => {
    const total = suppliers.length;
    const withEmail = suppliers.filter((supplier) => supplier.email).length;
    const withPhone = suppliers.filter((supplier) => supplier.phone).length;
    const countries = new Set(
      suppliers.map((supplier) => (supplier.country || '').trim()).filter(Boolean),
    );

    return {
      total,
      withEmail,
      withPhone,
      countries: countries.size,
    };
  }, [suppliers]);

  const topCountries = useMemo(() => {
    const counts = suppliers.reduce<Record<string, number>>((acc, supplier) => {
      const key = supplier.country?.trim() || 'Sem pais';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(counts)
      .map(([country, count]) => ({ country, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
  }, [suppliers]);

  const resetForm = () => {
    setForm({
      name: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      country: '',
    });
    setEditingSupplier(null);
  };

  const handleExportCsv = () => {
    if (suppliers.length === 0) {
      setError('Nao ha fornecedores para exportar');
      return;
    }

    const headers = ['Nome', 'Email', 'Telefone', 'Endereco', 'Cidade', 'Pais'];
    const rows = suppliers.map((supplier) => [
      supplier.name || '',
      supplier.email || '',
      supplier.phone || '',
      supplier.address || '',
      supplier.city || '',
      supplier.country || '',
    ]);

    const escapeCsvValue = (value: string) => {
      const escaped = value.replace(/"/g, '""');
      return `"${escaped}"`;
    };

    const csvContent = [headers, ...rows]
      .map((row) => row.map((value) => escapeCsvValue(String(value))).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'fornecedores.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const handleSubmit = async () => {
    if (!selectedPlant) {
      setError('Selecione uma fabrica');
      return;
    }

    if (!form.name.trim()) {
      setError('Preencha o nome do fornecedor');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (editingSupplier) {
        await updateSupplier(selectedPlant, editingSupplier.id, {
          name: form.name.trim(),
          email: form.email.trim() || undefined,
          phone: form.phone.trim() || undefined,
          address: form.address.trim() || undefined,
          city: form.city.trim() || undefined,
          country: form.country.trim() || undefined,
        });
      } else {
        await createSupplier(selectedPlant, {
          name: form.name.trim(),
          email: form.email.trim() || undefined,
          phone: form.phone.trim() || undefined,
          address: form.address.trim() || undefined,
          city: form.city.trim() || undefined,
          country: form.country.trim() || undefined,
        });
      }

      resetForm();
      setShowForm(false);
      await loadSuppliers(searchQuery);
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar fornecedor');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setForm({
      name: supplier.name || '',
      email: supplier.email || '',
      phone: supplier.phone || '',
      address: supplier.address || '',
      city: supplier.city || '',
      country: supplier.country || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (supplierId: string) => {
    if (!selectedPlant) {
      setError('Selecione uma fabrica');
      return;
    }

    if (!window.confirm('Eliminar este fornecedor?')) return;

    setSaving(true);
    setError(null);
    try {
      await deleteSupplier(selectedPlant, supplierId);
      await loadSuppliers(searchQuery);
    } catch (err: any) {
      setError(err.message || 'Erro ao eliminar fornecedor');
    } finally {
      setSaving(false);
    }
  };

  const content = (
    <div className="space-y-8 font-display">
        <section className="relative overflow-hidden rounded-3xl border theme-border bg-[linear-gradient(135deg,var(--dash-panel),var(--dash-panel-2))] p-8 shadow-sm">
          <div className="absolute -right-12 -top-16 h-56 w-56 rounded-full bg-[color:var(--dash-accent)] opacity-20 blur-3xl" />
          <div className="absolute -left-16 bottom-0 h-44 w-44 rounded-full bg-[color:var(--dash-accent-2)] opacity-20 blur-3xl" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] theme-text-muted">
                Rede de parceiros
              </p>
              <h1 className="mt-3 text-3xl font-semibold theme-text sm:text-4xl">
                Fornecedores confiaveis e organizados
              </h1>
              <p className="mt-2 max-w-2xl text-sm theme-text-muted">
                Centralize contatos, enderecos e disponibilidade para manter compras
                e reposicoes em dia.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => {
                  if (!showForm) resetForm();
                  setShowForm((value) => !value);
                }}
                className="btn-primary inline-flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Novo fornecedor
              </button>
              <button
                onClick={handleExportCsv}
                className="btn-secondary inline-flex items-center gap-2"
                disabled={loading || suppliers.length === 0}
              >
                <Download className="h-4 w-4" />
                Exportar CSV
              </button>
              <button
                onClick={() => loadSuppliers(searchQuery)}
                className="btn-secondary inline-flex items-center gap-2"
                disabled={loading}
              >
                <RefreshCcw className="h-4 w-4" />
                Atualizar
              </button>
            </div>
          </div>

          <div className="relative mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border theme-border theme-card p-4">
              <div className="flex items-center gap-3 text-sm theme-text-muted">
                <Users className="h-4 w-4 text-[color:var(--suppliers-card-icon-total)]" />
                Fornecedores ativos
              </div>
              <p className="mt-3 text-2xl font-semibold text-[color:var(--suppliers-card-value)]">
                {supplierSummary.total}
              </p>
              <p className="mt-1 text-xs text-[color:var(--suppliers-card-updated)]">Base central</p>
            </div>
            <div className="rounded-2xl border theme-border theme-card p-4">
              <div className="flex items-center gap-3 text-sm theme-text-muted">
                <Mail className="h-4 w-4 text-[color:var(--suppliers-card-icon-email)]" />
                Emails validados
              </div>
              <p className="mt-3 text-2xl font-semibold text-[color:var(--suppliers-card-value)]">
                {supplierSummary.withEmail}
              </p>
              <p className="mt-1 text-xs text-[color:var(--suppliers-card-updated)]">Contato rapido</p>
            </div>
            <div className="rounded-2xl border theme-border theme-card p-4">
              <div className="flex items-center gap-3 text-sm theme-text-muted">
                <Phone className="h-4 w-4 text-[color:var(--suppliers-card-icon-phone)]" />
                Telefones ativos
              </div>
              <p className="mt-3 text-2xl font-semibold text-[color:var(--suppliers-card-value)]">
                {supplierSummary.withPhone}
              </p>
              <p className="mt-1 text-xs text-[color:var(--suppliers-card-updated)]">Canal direto</p>
            </div>
            <div className="rounded-2xl border theme-border theme-card p-4">
              <div className="flex items-center gap-3 text-sm theme-text-muted">
                <MapPin className="h-4 w-4 text-[color:var(--suppliers-card-icon-country)]" />
                Paises mapeados
              </div>
              <p className="mt-3 text-2xl font-semibold text-[color:var(--suppliers-card-value)]">
                {supplierSummary.countries}
              </p>
              <p className="mt-1 text-xs text-[color:var(--suppliers-card-updated)]">Cobertura regional</p>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border theme-border theme-card p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold theme-text">Pesquisa rapida</h2>
              <p className="text-sm theme-text-muted">
                Filtre por nome, email, telefone ou localizacao.
              </p>
            </div>
            <div className="relative w-full lg:w-80">
              <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-[color:var(--dash-muted)]" />
              <input
                className="input pl-9"
                placeholder="Buscar fornecedores"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
              />
            </div>
          </div>

          {topCountries.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {topCountries.map((item) => (
                <span
                  key={item.country}
                  className="rounded-full border theme-border bg-[color:var(--dash-surface)] px-3 py-1 text-xs font-semibold theme-text"
                >
                  {item.country} · {item.count}
                </span>
              ))}
            </div>
          )}
        </section>

        {showForm && (
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  {editingSupplier ? 'Editar fornecedor' : 'Novo fornecedor'}
                </h2>
                <p className="text-sm text-slate-600">
                  Preencha os dados principais para contato rapido.
                </p>
              </div>
              <button
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                className="btn-secondary"
              >
                Fechar
              </button>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome</label>
                <input
                  className="input"
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Email
                </label>
                <input
                  className="input"
                  value={form.email}
                  onChange={(event) => setForm({ ...form, email: event.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Telefone
                </label>
                <input
                  className="input"
                  value={form.phone}
                  onChange={(event) => setForm({ ...form, phone: event.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Endereco
                </label>
                <input
                  className="input"
                  value={form.address}
                  onChange={(event) => setForm({ ...form, address: event.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Cidade
                </label>
                <input
                  className="input"
                  value={form.city}
                  onChange={(event) => setForm({ ...form, city: event.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Pais
                </label>
                <input
                  className="input"
                  value={form.country}
                  onChange={(event) => setForm({ ...form, country: event.target.value })}
                />
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                onClick={handleSubmit}
                className="btn-primary inline-flex items-center gap-2"
                disabled={saving}
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingSupplier ? 'Atualizar fornecedor' : 'Criar fornecedor'}
              </button>
              <button
                onClick={() => {
                  resetForm();
                }}
                className="btn-secondary"
                disabled={saving}
              >
                Limpar
              </button>
            </div>
          </section>
        )}

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Lista de fornecedores</h2>
              <p className="text-sm text-slate-600">
                {suppliers.length} fornecedores cadastrados.
              </p>
            </div>
          </div>

          {error && (
            <div className="mt-4 flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          {loading && (
            <div className="mt-6 flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando fornecedores...
            </div>
          )}

          {!loading && suppliers.length === 0 && (
            <div className="mt-6 rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
              Nenhum fornecedor encontrado.
            </div>
          )}

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {suppliers.map((supplier) => (
              <div
                key={supplier.id}
                className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Building2 className="h-4 w-4 text-slate-500" />
                      Fornecedor
                    </div>
                    <h3 className="mt-1 text-lg font-semibold text-slate-900">
                      {supplier.name}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEdit(supplier)}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                    >
                      <span className="inline-flex items-center gap-1">
                        <Pencil className="h-3 w-3" />
                        Editar
                      </span>
                    </button>
                    <button
                      onClick={() => handleDelete(supplier.id)}
                      className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                      disabled={saving}
                    >
                      <span className="inline-flex items-center gap-1">
                        <Trash2 className="h-3 w-3" />
                        Eliminar
                      </span>
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid gap-2 text-sm text-slate-600">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-slate-400" />
                    <span>{supplier.email || 'Sem email'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-slate-400" />
                    <span>{supplier.phone || 'Sem telefone'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-slate-400" />
                    <span>
                      {[supplier.city, supplier.country].filter(Boolean).join(' · ') ||
                        'Localizacao nao informada'}
                    </span>
                  </div>
                </div>

                {supplier.address && (
                  <div className="mt-3 text-xs text-slate-500">{supplier.address}</div>
                )}
              </div>
            ))}
          </div>
        </section>
    </div>
  );

  if (embedded) {
    return content;
  }

  return <MainLayout>{content}</MainLayout>;
}
