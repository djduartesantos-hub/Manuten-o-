import { MainLayout } from '../layouts/MainLayout';
import { useEffect, useMemo, useState } from 'react';
import {
  BadgeCheck,
  ClipboardCheck,
  QrCode,
  RefreshCcw,
  ShieldCheck,
  Tag,
  Wrench,
} from 'lucide-react';
import { useAppStore } from '../context/store';
import {
  type AssetLifecycle,
  createAssetCalibration,
  createAssetCertification,
  createAssetInspection,
  createAssetTag,
  deleteAssetCalibration,
  deleteAssetCertification,
  deleteAssetInspection,
  deleteAssetTag,
  getAssetLifecycle,
  getAssets,
  listAssetCalibrations,
  listAssetCertifications,
  listAssetInspections,
  listAssetTags,
  upsertAssetLifecycle,
} from '../services/api';

interface AssetOption {
  id: string;
  code: string;
  name: string;
}

const tabs = [
  { key: 'lifecycle', label: 'Ciclo de vida', icon: ShieldCheck },
  { key: 'certifications', label: 'Certificacoes', icon: BadgeCheck },
  { key: 'inspections', label: 'Inspecoes', icon: ClipboardCheck },
  { key: 'calibrations', label: 'Calibracoes', icon: Wrench },
  { key: 'tags', label: 'Etiquetas QR/NFC', icon: QrCode },
];

function toDateInput(value?: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

function toNumberInput(value?: number | string | null): string {
  if (value === null || value === undefined) return '';
  const num = Number(value);
  return Number.isFinite(num) ? String(num) : '';
}

export function CompliancePage() {
  const { selectedPlant } = useAppStore();
  const [assets, setAssets] = useState<AssetOption[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [activeTab, setActiveTab] = useState('lifecycle');
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [lifecycle, setLifecycle] = useState<AssetLifecycle | null>(null);
  const [certifications, setCertifications] = useState<any[]>([]);
  const [inspections, setInspections] = useState<any[]>([]);
  const [calibrations, setCalibrations] = useState<any[]>([]);
  const [tags, setTags] = useState<any[]>([]);

  const [lifecycleForm, setLifecycleForm] = useState({
    commissioning_date: '',
    warranty_expires_at: '',
    expected_lifespan_years: '',
    depreciation_method: '',
    depreciation_years: '',
    depreciation_rate: '',
    residual_value: '',
    replacement_due_at: '',
    decommissioned_at: '',
    notes: '',
  });

  const [certForm, setCertForm] = useState({
    certification_type: '',
    standard: '',
    issuer: '',
    reference_code: '',
    issued_at: '',
    expires_at: '',
    status: 'valid',
    notes: '',
  });

  const [inspectionForm, setInspectionForm] = useState({
    inspection_date: '',
    inspector: '',
    result: 'passed',
    next_due_at: '',
    notes: '',
  });

  const [calibrationForm, setCalibrationForm] = useState({
    calibration_date: '',
    due_at: '',
    provider: '',
    reference_code: '',
    status: 'valid',
    notes: '',
  });

  const [tagForm, setTagForm] = useState({
    tag_type: 'qr',
    tag_code: '',
    status: 'assigned',
    notes: '',
  });

  const selectedAsset = useMemo(
    () => assets.find((asset) => asset.id === selectedAssetId) || null,
    [assets, selectedAssetId],
  );

  const loadAssets = async () => {
    if (!selectedPlant) {
      setAssets([]);
      setSelectedAssetId('');
      return;
    }

    setLoadingAssets(true);
    setError(null);
    try {
      const data = await getAssets(selectedPlant);
      const mapped = Array.isArray(data)
        ? data.map((asset) => ({
            id: String((asset as any).id || ''),
            code: String((asset as any).code || ''),
            name: String((asset as any).name || ''),
          }))
        : [];
      setAssets(mapped);
      if (mapped.length > 0 && !selectedAssetId) {
        setSelectedAssetId(mapped[0].id);
      }
    } catch (err: any) {
      setError(err?.message || 'Erro ao carregar equipamentos');
      setAssets([]);
    } finally {
      setLoadingAssets(false);
    }
  };

  const loadCompliance = async (assetId: string) => {
    if (!assetId) return;
    setLoadingData(true);
    setError(null);
    try {
      const [lifecycleData, certData, inspData, calibData, tagData] = await Promise.all([
        getAssetLifecycle(assetId),
        listAssetCertifications(assetId),
        listAssetInspections(assetId),
        listAssetCalibrations(assetId),
        listAssetTags(assetId),
      ]);
      setLifecycle(lifecycleData || null);
      setCertifications(Array.isArray(certData) ? certData : []);
      setInspections(Array.isArray(inspData) ? inspData : []);
      setCalibrations(Array.isArray(calibData) ? calibData : []);
      setTags(Array.isArray(tagData) ? tagData : []);

      setLifecycleForm({
        commissioning_date: toDateInput(lifecycleData?.commissioning_date),
        warranty_expires_at: toDateInput(lifecycleData?.warranty_expires_at),
        expected_lifespan_years: toNumberInput(lifecycleData?.expected_lifespan_years),
        depreciation_method: lifecycleData?.depreciation_method || '',
        depreciation_years: toNumberInput(lifecycleData?.depreciation_years),
        depreciation_rate: toNumberInput(lifecycleData?.depreciation_rate),
        residual_value: toNumberInput(lifecycleData?.residual_value),
        replacement_due_at: toDateInput(lifecycleData?.replacement_due_at),
        decommissioned_at: toDateInput(lifecycleData?.decommissioned_at),
        notes: lifecycleData?.notes || '',
      });
    } catch (err: any) {
      setError(err?.message || 'Erro ao carregar compliance');
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    loadAssets();
  }, [selectedPlant]);

  useEffect(() => {
    if (!selectedAssetId) return;
    loadCompliance(selectedAssetId);
  }, [selectedAssetId]);

  const handleSaveLifecycle = async () => {
    if (!selectedAssetId) return;
    setLoadingData(true);
    setError(null);
    try {
      await upsertAssetLifecycle(selectedAssetId, {
        commissioning_date: lifecycleForm.commissioning_date || undefined,
        warranty_expires_at: lifecycleForm.warranty_expires_at || undefined,
        expected_lifespan_years: lifecycleForm.expected_lifespan_years
          ? Number(lifecycleForm.expected_lifespan_years)
          : undefined,
        depreciation_method: lifecycleForm.depreciation_method || undefined,
        depreciation_years: lifecycleForm.depreciation_years
          ? Number(lifecycleForm.depreciation_years)
          : undefined,
        depreciation_rate: lifecycleForm.depreciation_rate
          ? Number(lifecycleForm.depreciation_rate)
          : undefined,
        residual_value: lifecycleForm.residual_value ? Number(lifecycleForm.residual_value) : undefined,
        replacement_due_at: lifecycleForm.replacement_due_at || undefined,
        decommissioned_at: lifecycleForm.decommissioned_at || undefined,
        notes: lifecycleForm.notes || undefined,
      });
      await loadCompliance(selectedAssetId);
    } catch (err: any) {
      setError(err?.message || 'Erro ao guardar ciclo de vida');
    } finally {
      setLoadingData(false);
    }
  };

  const handleCreateCertification = async () => {
    if (!selectedAssetId) return;
    if (!certForm.certification_type.trim()) {
      setError('Indique o tipo de certificacao');
      return;
    }

    setLoadingData(true);
    setError(null);
    try {
      await createAssetCertification(selectedAssetId, {
        certification_type: certForm.certification_type.trim(),
        standard: certForm.standard.trim() || undefined,
        issuer: certForm.issuer.trim() || undefined,
        reference_code: certForm.reference_code.trim() || undefined,
        issued_at: certForm.issued_at || undefined,
        expires_at: certForm.expires_at || undefined,
        status: certForm.status || undefined,
        notes: certForm.notes.trim() || undefined,
      });
      setCertForm({
        certification_type: '',
        standard: '',
        issuer: '',
        reference_code: '',
        issued_at: '',
        expires_at: '',
        status: 'valid',
        notes: '',
      });
      await loadCompliance(selectedAssetId);
    } catch (err: any) {
      setError(err?.message || 'Erro ao criar certificacao');
    } finally {
      setLoadingData(false);
    }
  };

  const handleCreateInspection = async () => {
    if (!selectedAssetId) return;
    if (!inspectionForm.inspection_date) {
      setError('Indique a data da inspecao');
      return;
    }

    setLoadingData(true);
    setError(null);
    try {
      await createAssetInspection(selectedAssetId, {
        inspection_date: inspectionForm.inspection_date,
        inspector: inspectionForm.inspector.trim() || undefined,
        result: inspectionForm.result || undefined,
        next_due_at: inspectionForm.next_due_at || undefined,
        notes: inspectionForm.notes.trim() || undefined,
      });
      setInspectionForm({
        inspection_date: '',
        inspector: '',
        result: 'passed',
        next_due_at: '',
        notes: '',
      });
      await loadCompliance(selectedAssetId);
    } catch (err: any) {
      setError(err?.message || 'Erro ao criar inspecao');
    } finally {
      setLoadingData(false);
    }
  };

  const handleCreateCalibration = async () => {
    if (!selectedAssetId) return;
    if (!calibrationForm.calibration_date) {
      setError('Indique a data de calibracao');
      return;
    }

    setLoadingData(true);
    setError(null);
    try {
      await createAssetCalibration(selectedAssetId, {
        calibration_date: calibrationForm.calibration_date,
        due_at: calibrationForm.due_at || undefined,
        provider: calibrationForm.provider.trim() || undefined,
        reference_code: calibrationForm.reference_code.trim() || undefined,
        status: calibrationForm.status || undefined,
        notes: calibrationForm.notes.trim() || undefined,
      });
      setCalibrationForm({
        calibration_date: '',
        due_at: '',
        provider: '',
        reference_code: '',
        status: 'valid',
        notes: '',
      });
      await loadCompliance(selectedAssetId);
    } catch (err: any) {
      setError(err?.message || 'Erro ao criar calibracao');
    } finally {
      setLoadingData(false);
    }
  };

  const handleCreateTag = async () => {
    if (!selectedAssetId) return;
    if (!tagForm.tag_code.trim()) {
      setError('Indique o codigo da etiqueta');
      return;
    }

    setLoadingData(true);
    setError(null);
    try {
      await createAssetTag(selectedAssetId, {
        tag_type: tagForm.tag_type,
        tag_code: tagForm.tag_code.trim(),
        status: tagForm.status || undefined,
        notes: tagForm.notes.trim() || undefined,
      });
      setTagForm({
        tag_type: 'qr',
        tag_code: '',
        status: 'assigned',
        notes: '',
      });
      await loadCompliance(selectedAssetId);
    } catch (err: any) {
      setError(err?.message || 'Erro ao criar etiqueta');
    } finally {
      setLoadingData(false);
    }
  };

  return (
    <MainLayout>
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="relative overflow-hidden rounded-3xl border theme-border glass-panel p-6 shadow-sm">
          <div className="absolute left-0 top-0 h-1 w-full bg-[linear-gradient(90deg,var(--dash-accent),var(--dash-accent-2))]" />
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] theme-text-muted">Compliance</p>
              <h1 className="mt-2 text-2xl font-semibold theme-text">Certificacoes, inspecoes e calibracoes</h1>
              <p className="mt-1 text-sm theme-text-muted">
                Controle validade, evidencias e etiquetas por equipamento.
              </p>
            </div>
            <button
              type="button"
              onClick={() => selectedAssetId && loadCompliance(selectedAssetId)}
              disabled={loadingAssets || loadingData}
              className="btn-secondary flex items-center gap-2"
            >
              <RefreshCcw className="h-4 w-4" />
              Recarregar
            </button>
          </div>
        </section>

        {error && (
          <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-700">
            {error}
          </div>
        )}

        <section className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <div className="rounded-3xl border theme-border glass-panel p-5">
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold theme-text">
              <Tag className="h-4 w-4" />
              Equipamentos
            </div>
            {loadingAssets ? (
              <p className="text-sm theme-text-muted">A carregar...</p>
            ) : assets.length === 0 ? (
              <p className="text-sm theme-text-muted">Sem equipamentos.</p>
            ) : (
              <div className="space-y-2">
                {assets.map((asset) => (
                  <button
                    key={asset.id}
                    type="button"
                    onClick={() => setSelectedAssetId(asset.id)}
                    className={`w-full rounded-2xl border px-3 py-2 text-left text-sm transition ${
                      selectedAssetId === asset.id
                        ? 'border-[color:var(--dash-accent)] bg-[color:var(--dash-panel)]'
                        : 'border-transparent hover:border-[color:var(--dash-border)]'
                    }`}
                  >
                    <p className="font-semibold theme-text">{asset.code}</p>
                    <p className="text-xs theme-text-muted">{asset.name}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-3xl border theme-border glass-panel p-6">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold theme-text">
                  {selectedAsset ? `${selectedAsset.code} - ${selectedAsset.name}` : 'Selecione um equipamento'}
                </p>
                <p className="text-xs theme-text-muted">Gerir compliance e validade</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setActiveTab(tab.key)}
                      className={`flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold transition ${
                        activeTab === tab.key
                          ? 'bg-[color:var(--dash-accent)] text-white'
                          : 'bg-[color:var(--dash-panel)] theme-text-muted'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {!selectedAssetId ? (
              <div className="rounded-2xl border border-dashed theme-border bg-[color:var(--dash-panel)] p-8 text-center">
                <p className="text-sm theme-text-muted">Escolha um equipamento para ver os registos.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {activeTab === 'lifecycle' && (
                  <div className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="block text-xs font-semibold uppercase theme-text-muted">
                        Comissionamento
                        <input
                          type="date"
                          className="input mt-2"
                          value={lifecycleForm.commissioning_date}
                          onChange={(e) =>
                            setLifecycleForm({ ...lifecycleForm, commissioning_date: e.target.value })
                          }
                        />
                      </label>
                      <label className="block text-xs font-semibold uppercase theme-text-muted">
                        Garantia ate
                        <input
                          type="date"
                          className="input mt-2"
                          value={lifecycleForm.warranty_expires_at}
                          onChange={(e) =>
                            setLifecycleForm({ ...lifecycleForm, warranty_expires_at: e.target.value })
                          }
                        />
                      </label>
                      <label className="block text-xs font-semibold uppercase theme-text-muted">
                        Vida util (anos)
                        <input
                          type="number"
                          className="input mt-2"
                          value={lifecycleForm.expected_lifespan_years}
                          onChange={(e) =>
                            setLifecycleForm({ ...lifecycleForm, expected_lifespan_years: e.target.value })
                          }
                        />
                      </label>
                      <label className="block text-xs font-semibold uppercase theme-text-muted">
                        Metodo depreciacao
                        <input
                          type="text"
                          className="input mt-2"
                          value={lifecycleForm.depreciation_method}
                          onChange={(e) =>
                            setLifecycleForm({ ...lifecycleForm, depreciation_method: e.target.value })
                          }
                        />
                      </label>
                      <label className="block text-xs font-semibold uppercase theme-text-muted">
                        Anos depreciacao
                        <input
                          type="number"
                          className="input mt-2"
                          value={lifecycleForm.depreciation_years}
                          onChange={(e) =>
                            setLifecycleForm({ ...lifecycleForm, depreciation_years: e.target.value })
                          }
                        />
                      </label>
                      <label className="block text-xs font-semibold uppercase theme-text-muted">
                        Taxa depreciacao
                        <input
                          type="number"
                          className="input mt-2"
                          value={lifecycleForm.depreciation_rate}
                          onChange={(e) =>
                            setLifecycleForm({ ...lifecycleForm, depreciation_rate: e.target.value })
                          }
                        />
                      </label>
                      <label className="block text-xs font-semibold uppercase theme-text-muted">
                        Valor residual
                        <input
                          type="number"
                          className="input mt-2"
                          value={lifecycleForm.residual_value}
                          onChange={(e) =>
                            setLifecycleForm({ ...lifecycleForm, residual_value: e.target.value })
                          }
                        />
                      </label>
                      <label className="block text-xs font-semibold uppercase theme-text-muted">
                        Substituicao prevista
                        <input
                          type="date"
                          className="input mt-2"
                          value={lifecycleForm.replacement_due_at}
                          onChange={(e) =>
                            setLifecycleForm({ ...lifecycleForm, replacement_due_at: e.target.value })
                          }
                        />
                      </label>
                      <label className="block text-xs font-semibold uppercase theme-text-muted">
                        Desativacao
                        <input
                          type="date"
                          className="input mt-2"
                          value={lifecycleForm.decommissioned_at}
                          onChange={(e) =>
                            setLifecycleForm({ ...lifecycleForm, decommissioned_at: e.target.value })
                          }
                        />
                      </label>
                      <label className="block text-xs font-semibold uppercase theme-text-muted sm:col-span-2">
                        Notas
                        <textarea
                          className="input mt-2 min-h-[90px]"
                          value={lifecycleForm.notes}
                          onChange={(e) => setLifecycleForm({ ...lifecycleForm, notes: e.target.value })}
                        />
                      </label>
                    </div>
                    <button
                      type="button"
                      onClick={handleSaveLifecycle}
                      disabled={loadingData}
                      className="btn-primary"
                    >
                      Guardar ciclo de vida
                    </button>
                  </div>
                )}

                {activeTab === 'certifications' && (
                  <div className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="block text-xs font-semibold uppercase theme-text-muted">
                        Tipo
                        <input
                          className="input mt-2"
                          value={certForm.certification_type}
                          onChange={(e) => setCertForm({ ...certForm, certification_type: e.target.value })}
                        />
                      </label>
                      <label className="block text-xs font-semibold uppercase theme-text-muted">
                        Norma
                        <input
                          className="input mt-2"
                          value={certForm.standard}
                          onChange={(e) => setCertForm({ ...certForm, standard: e.target.value })}
                        />
                      </label>
                      <label className="block text-xs font-semibold uppercase theme-text-muted">
                        Emissor
                        <input
                          className="input mt-2"
                          value={certForm.issuer}
                          onChange={(e) => setCertForm({ ...certForm, issuer: e.target.value })}
                        />
                      </label>
                      <label className="block text-xs font-semibold uppercase theme-text-muted">
                        Referencia
                        <input
                          className="input mt-2"
                          value={certForm.reference_code}
                          onChange={(e) => setCertForm({ ...certForm, reference_code: e.target.value })}
                        />
                      </label>
                      <label className="block text-xs font-semibold uppercase theme-text-muted">
                        Emitido em
                        <input
                          type="date"
                          className="input mt-2"
                          value={certForm.issued_at}
                          onChange={(e) => setCertForm({ ...certForm, issued_at: e.target.value })}
                        />
                      </label>
                      <label className="block text-xs font-semibold uppercase theme-text-muted">
                        Expira em
                        <input
                          type="date"
                          className="input mt-2"
                          value={certForm.expires_at}
                          onChange={(e) => setCertForm({ ...certForm, expires_at: e.target.value })}
                        />
                      </label>
                      <label className="block text-xs font-semibold uppercase theme-text-muted">
                        Estado
                        <select
                          className="input mt-2"
                          value={certForm.status}
                          onChange={(e) => setCertForm({ ...certForm, status: e.target.value })}
                        >
                          <option value="valid">Valido</option>
                          <option value="expired">Expirado</option>
                          <option value="pending">Pendente</option>
                        </select>
                      </label>
                      <label className="block text-xs font-semibold uppercase theme-text-muted sm:col-span-2">
                        Notas
                        <textarea
                          className="input mt-2 min-h-[90px]"
                          value={certForm.notes}
                          onChange={(e) => setCertForm({ ...certForm, notes: e.target.value })}
                        />
                      </label>
                    </div>
                    <button
                      type="button"
                      onClick={handleCreateCertification}
                      disabled={loadingData}
                      className="btn-primary"
                    >
                      Adicionar certificacao
                    </button>
                    <div className="space-y-2">
                      {certifications.length === 0 ? (
                        <p className="text-sm theme-text-muted">Sem certificacoes.</p>
                      ) : (
                        certifications.map((row) => (
                          <div
                            key={row.id}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border theme-border bg-[color:var(--dash-panel)] px-4 py-3"
                          >
                            <div>
                              <p className="text-sm font-semibold theme-text">{row.certification_type}</p>
                              <p className="text-xs theme-text-muted">
                                {row.issuer || 'Sem emissor'} · {row.expires_at ? new Date(row.expires_at).toLocaleDateString() : 'Sem validade'}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={async () => {
                                await deleteAssetCertification(String(row.id));
                                await loadCompliance(selectedAssetId);
                              }}
                              className="text-xs text-rose-600 hover:text-rose-700"
                            >
                              Remover
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'inspections' && (
                  <div className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="block text-xs font-semibold uppercase theme-text-muted">
                        Data
                        <input
                          type="date"
                          className="input mt-2"
                          value={inspectionForm.inspection_date}
                          onChange={(e) => setInspectionForm({ ...inspectionForm, inspection_date: e.target.value })}
                        />
                      </label>
                      <label className="block text-xs font-semibold uppercase theme-text-muted">
                        Inspetor
                        <input
                          className="input mt-2"
                          value={inspectionForm.inspector}
                          onChange={(e) => setInspectionForm({ ...inspectionForm, inspector: e.target.value })}
                        />
                      </label>
                      <label className="block text-xs font-semibold uppercase theme-text-muted">
                        Resultado
                        <select
                          className="input mt-2"
                          value={inspectionForm.result}
                          onChange={(e) => setInspectionForm({ ...inspectionForm, result: e.target.value })}
                        >
                          <option value="passed">Aprovado</option>
                          <option value="failed">Reprovado</option>
                          <option value="pending">Pendente</option>
                        </select>
                      </label>
                      <label className="block text-xs font-semibold uppercase theme-text-muted">
                        Proxima
                        <input
                          type="date"
                          className="input mt-2"
                          value={inspectionForm.next_due_at}
                          onChange={(e) => setInspectionForm({ ...inspectionForm, next_due_at: e.target.value })}
                        />
                      </label>
                      <label className="block text-xs font-semibold uppercase theme-text-muted sm:col-span-2">
                        Notas
                        <textarea
                          className="input mt-2 min-h-[90px]"
                          value={inspectionForm.notes}
                          onChange={(e) => setInspectionForm({ ...inspectionForm, notes: e.target.value })}
                        />
                      </label>
                    </div>
                    <button
                      type="button"
                      onClick={handleCreateInspection}
                      disabled={loadingData}
                      className="btn-primary"
                    >
                      Adicionar inspecao
                    </button>
                    <div className="space-y-2">
                      {inspections.length === 0 ? (
                        <p className="text-sm theme-text-muted">Sem inspecoes.</p>
                      ) : (
                        inspections.map((row) => (
                          <div
                            key={row.id}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border theme-border bg-[color:var(--dash-panel)] px-4 py-3"
                          >
                            <div>
                              <p className="text-sm font-semibold theme-text">
                                {row.inspection_date ? new Date(row.inspection_date).toLocaleDateString() : 'Sem data'}
                              </p>
                              <p className="text-xs theme-text-muted">{row.result || 'Sem resultado'}</p>
                            </div>
                            <button
                              type="button"
                              onClick={async () => {
                                await deleteAssetInspection(String(row.id));
                                await loadCompliance(selectedAssetId);
                              }}
                              className="text-xs text-rose-600 hover:text-rose-700"
                            >
                              Remover
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'calibrations' && (
                  <div className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="block text-xs font-semibold uppercase theme-text-muted">
                        Data
                        <input
                          type="date"
                          className="input mt-2"
                          value={calibrationForm.calibration_date}
                          onChange={(e) => setCalibrationForm({ ...calibrationForm, calibration_date: e.target.value })}
                        />
                      </label>
                      <label className="block text-xs font-semibold uppercase theme-text-muted">
                        Proxima
                        <input
                          type="date"
                          className="input mt-2"
                          value={calibrationForm.due_at}
                          onChange={(e) => setCalibrationForm({ ...calibrationForm, due_at: e.target.value })}
                        />
                      </label>
                      <label className="block text-xs font-semibold uppercase theme-text-muted">
                        Fornecedor
                        <input
                          className="input mt-2"
                          value={calibrationForm.provider}
                          onChange={(e) => setCalibrationForm({ ...calibrationForm, provider: e.target.value })}
                        />
                      </label>
                      <label className="block text-xs font-semibold uppercase theme-text-muted">
                        Referencia
                        <input
                          className="input mt-2"
                          value={calibrationForm.reference_code}
                          onChange={(e) => setCalibrationForm({ ...calibrationForm, reference_code: e.target.value })}
                        />
                      </label>
                      <label className="block text-xs font-semibold uppercase theme-text-muted">
                        Estado
                        <select
                          className="input mt-2"
                          value={calibrationForm.status}
                          onChange={(e) => setCalibrationForm({ ...calibrationForm, status: e.target.value })}
                        >
                          <option value="valid">Valido</option>
                          <option value="expired">Expirado</option>
                          <option value="pending">Pendente</option>
                        </select>
                      </label>
                      <label className="block text-xs font-semibold uppercase theme-text-muted sm:col-span-2">
                        Notas
                        <textarea
                          className="input mt-2 min-h-[90px]"
                          value={calibrationForm.notes}
                          onChange={(e) => setCalibrationForm({ ...calibrationForm, notes: e.target.value })}
                        />
                      </label>
                    </div>
                    <button
                      type="button"
                      onClick={handleCreateCalibration}
                      disabled={loadingData}
                      className="btn-primary"
                    >
                      Adicionar calibracao
                    </button>
                    <div className="space-y-2">
                      {calibrations.length === 0 ? (
                        <p className="text-sm theme-text-muted">Sem calibracoes.</p>
                      ) : (
                        calibrations.map((row) => (
                          <div
                            key={row.id}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border theme-border bg-[color:var(--dash-panel)] px-4 py-3"
                          >
                            <div>
                              <p className="text-sm font-semibold theme-text">
                                {row.calibration_date ? new Date(row.calibration_date).toLocaleDateString() : 'Sem data'}
                              </p>
                              <p className="text-xs theme-text-muted">{row.provider || 'Sem fornecedor'}</p>
                            </div>
                            <button
                              type="button"
                              onClick={async () => {
                                await deleteAssetCalibration(String(row.id));
                                await loadCompliance(selectedAssetId);
                              }}
                              className="text-xs text-rose-600 hover:text-rose-700"
                            >
                              Remover
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'tags' && (
                  <div className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="block text-xs font-semibold uppercase theme-text-muted">
                        Tipo
                        <select
                          className="input mt-2"
                          value={tagForm.tag_type}
                          onChange={(e) => setTagForm({ ...tagForm, tag_type: e.target.value })}
                        >
                          <option value="qr">QR</option>
                          <option value="nfc">NFC</option>
                        </select>
                      </label>
                      <label className="block text-xs font-semibold uppercase theme-text-muted">
                        Codigo
                        <input
                          className="input mt-2"
                          value={tagForm.tag_code}
                          onChange={(e) => setTagForm({ ...tagForm, tag_code: e.target.value })}
                        />
                      </label>
                      <label className="block text-xs font-semibold uppercase theme-text-muted">
                        Estado
                        <select
                          className="input mt-2"
                          value={tagForm.status}
                          onChange={(e) => setTagForm({ ...tagForm, status: e.target.value })}
                        >
                          <option value="assigned">Atribuida</option>
                          <option value="inactive">Inativa</option>
                          <option value="lost">Perdida</option>
                        </select>
                      </label>
                      <label className="block text-xs font-semibold uppercase theme-text-muted sm:col-span-2">
                        Notas
                        <textarea
                          className="input mt-2 min-h-[90px]"
                          value={tagForm.notes}
                          onChange={(e) => setTagForm({ ...tagForm, notes: e.target.value })}
                        />
                      </label>
                    </div>
                    <button
                      type="button"
                      onClick={handleCreateTag}
                      disabled={loadingData}
                      className="btn-primary"
                    >
                      Adicionar etiqueta
                    </button>
                    <div className="space-y-2">
                      {tags.length === 0 ? (
                        <p className="text-sm theme-text-muted">Sem etiquetas.</p>
                      ) : (
                        tags.map((row) => (
                          <div
                            key={row.id}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border theme-border bg-[color:var(--dash-panel)] px-4 py-3"
                          >
                            <div>
                              <p className="text-sm font-semibold theme-text">{row.tag_code}</p>
                              <p className="text-xs theme-text-muted">{row.tag_type || 'tag'} · {row.status || 'assigned'}</p>
                            </div>
                            <button
                              type="button"
                              onClick={async () => {
                                await deleteAssetTag(String(row.id));
                                await loadCompliance(selectedAssetId);
                              }}
                              className="text-xs text-rose-600 hover:text-rose-700"
                            >
                              Remover
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </div>
    </MainLayout>
  );
}
