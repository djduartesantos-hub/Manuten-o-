import { db } from '../config/database.js';
import {
  alertConfigurations,
  alertsHistory,
  workOrders,
} from '../db/schema.js';
import { eq, and, desc, inArray, notInArray, gt } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { CacheKeys, CacheTTL, RedisService } from './redis.service.js';
import { logger } from '../config/logger.js';
import { getSocketManager, isSocketManagerReady } from '../utils/socket-instance.js';

export class AlertService {
  // ========== ALERT CONFIGURATIONS ==========

  static async createAlertConfiguration(data: {
    tenant_id: string;
    asset_id: string;
    alert_type: string;
    threshold: number;
    time_unit: string;
    notify_roles?: string[];
    notify_email?: boolean;
    notify_push?: boolean;
    escalate_after_hours?: number;
    description?: string;
  }) {
    const [alert] = await db
      .insert(alertConfigurations)
      .values({
        id: uuidv4(),
        tenant_id: data.tenant_id,
        asset_id: data.asset_id,
        alert_type: data.alert_type,
        threshold: data.threshold,
        time_unit: data.time_unit,
        notify_roles: data.notify_roles,
        notify_email: data.notify_email !== false,
        notify_push: data.notify_push ?? false,
        escalate_after_hours: data.escalate_after_hours,
        description: data.description,
      })
      .returning();

    // Invalidate cache
    try {
      await RedisService.delMultiple([
        CacheKeys.alertConfigs(data.tenant_id),
        CacheKeys.alertConfigs(data.tenant_id, data.asset_id),
      ]);
    } catch (cacheError) {
      logger.warn('Alert config cache invalidation error:', cacheError);
    }

    return alert;
  }

  static async getAlertConfigurations(tenantId: string, assetId?: string): Promise<any[]> {
    try {
      const cacheKey = CacheKeys.alertConfigs(tenantId, assetId);
      const cached = await RedisService.getJSON<any[]>(cacheKey);
      if (cached) {
        logger.debug(`Cache hit for alert configs: ${cacheKey}`);
        return cached;
      }
    } catch (cacheError) {
      logger.warn('Cache read error, continuing with DB query:', cacheError);
    }

    const conditions = [eq(alertConfigurations.tenant_id, tenantId)];
    if (assetId) {
      conditions.push(eq(alertConfigurations.asset_id, assetId));
    }

    const configs = await db.query.alertConfigurations.findMany({
      where: and(...conditions),
      with: {
        asset: {
          columns: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    try {
      const cacheKey = CacheKeys.alertConfigs(tenantId, assetId);
      await RedisService.setJSON(cacheKey, configs, CacheTTL.ALERTS);
    } catch (cacheError) {
      logger.warn('Cache write error:', cacheError);
    }

    return configs;
  }

  static async updateAlertConfiguration(
    alertId: string,
    tenantId: string,
    data: Partial<{
      threshold: number;
      time_unit: string;
      notify_roles: string[];
      notify_email: boolean;
      notify_push: boolean;
      escalate_after_hours: number;
      description: string;
      is_active: boolean;
    }>,
  ) {
    const [updated] = await db
      .update(alertConfigurations)
      .set({
        ...data,
        updated_at: new Date(),
      })
      .where(
        and(
          eq(alertConfigurations.id, alertId),
          eq(alertConfigurations.tenant_id, tenantId),
        ),
      )
      .returning();

    // Invalidate cache
    try {
      await RedisService.delMultiple([
        CacheKeys.alertConfigs(tenantId),
        CacheKeys.alertConfigs(tenantId, updated.asset_id),
      ]);
    } catch (cacheError) {
      logger.warn('Alert config cache invalidation error:', cacheError);
    }

    return updated;
  }

  static async deleteAlertConfiguration(alertId: string, tenantId: string) {
    const existing = await db.query.alertConfigurations.findFirst({
      where: and(
        eq(alertConfigurations.id, alertId),
        eq(alertConfigurations.tenant_id, tenantId),
      ),
    });

    await db
      .delete(alertConfigurations)
      .where(
        and(
          eq(alertConfigurations.id, alertId),
          eq(alertConfigurations.tenant_id, tenantId),
        ),
      );

    // Invalidate cache
    try {
      await RedisService.delMultiple([
        CacheKeys.alertConfigs(tenantId),
        CacheKeys.alertConfigs(tenantId, existing?.asset_id),
      ]);
    } catch (cacheError) {
      logger.warn('Alert config cache invalidation error:', cacheError);
    }
  }

  // ========== ALERTS HISTORY ==========

  static async createAlert(
    data: {
      tenant_id: string;
      alert_config_id: string;
      asset_id: string;
      severity: string;
      message: string;
    },
    options?: {
      dedupe?: {
        scope: 'config' | 'message';
        windowHours?: number;
      };
    },
  ) {
    const dedupeScope = options?.dedupe?.scope;
    if (dedupeScope) {
      const windowHours = options?.dedupe?.windowHours ?? 24;
      const since = new Date(Date.now() - windowHours * 60 * 60 * 1000);

      const conditions = [
        eq(alertsHistory.tenant_id, data.tenant_id),
        eq(alertsHistory.alert_config_id, data.alert_config_id),
        eq(alertsHistory.asset_id, data.asset_id),
        eq(alertsHistory.is_resolved, false),
        gt(alertsHistory.created_at, since),
      ];

      if (dedupeScope === 'message') {
        conditions.push(eq(alertsHistory.message, data.message));
      }

      const existing = await db.query.alertsHistory.findFirst({
        where: and(...conditions),
        orderBy: desc(alertsHistory.created_at),
      });

      if (existing) {
        return existing;
      }
    }

    const [alert] = await db
      .insert(alertsHistory)
      .values({
        id: uuidv4(),
        tenant_id: data.tenant_id,
        alert_config_id: data.alert_config_id,
        asset_id: data.asset_id,
        severity: data.severity,
        message: data.message,
        is_resolved: false,
      })
      .returning();

    // Invalidate cache
    try {
      await RedisService.del(CacheKeys.alertsHistory(data.tenant_id));
    } catch (cacheError) {
      logger.warn('Alert history cache invalidation error:', cacheError);
    }

    // Emit real-time alert
    if (isSocketManagerReady()) {
      const socketManager = getSocketManager();
      socketManager.emitAlertTriggered(data.tenant_id, {
        ...alert,
        message: data.message,
        severity: data.severity,
      });
    }

    return alert;
  }

  static async getAlerts(
    tenantId: string,
    filter?: {
      asset_id?: string;
      severity?: string;
      is_resolved?: boolean;
      limit?: number;
      offset?: number;
    },
  ) {
    const hasFilters =
      !!filter?.asset_id ||
      !!filter?.severity ||
      filter?.is_resolved !== undefined ||
      !!filter?.limit ||
      !!filter?.offset;

    if (!hasFilters) {
      try {
        const cacheKey = CacheKeys.alertsHistory(tenantId);
        const cached = await RedisService.getJSON(cacheKey);
        if (cached) {
          logger.debug(`Cache hit for alerts history: ${cacheKey}`);
          return cached;
        }
      } catch (cacheError) {
        logger.warn('Cache read error, continuing with DB query:', cacheError);
      }
    }

    const conditions = [eq(alertsHistory.tenant_id, tenantId)];

    if (filter?.asset_id) {
      conditions.push(eq(alertsHistory.asset_id, filter.asset_id));
    }

    if (filter?.severity) {
      conditions.push(eq(alertsHistory.severity, filter.severity));
    }

    if (filter?.is_resolved !== undefined) {
      conditions.push(eq(alertsHistory.is_resolved, filter.is_resolved));
    }

    const alerts = await db.query.alertsHistory.findMany({
      where: and(...conditions),
      with: {
        asset: {
          columns: {
            id: true,
            name: true,
            code: true,
          },
        },
        alertConfig: {
          columns: {
            alert_type: true,
            threshold: true,
          },
        },
        resolvedBy: {
          columns: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
          },
        },
      },
      orderBy: desc(alertsHistory.created_at),
      limit: filter?.limit || 50,
      offset: filter?.offset || 0,
    });

    if (!hasFilters) {
      try {
        const cacheKey = CacheKeys.alertsHistory(tenantId);
        await RedisService.setJSON(cacheKey, alerts, CacheTTL.ALERTS);
      } catch (cacheError) {
        logger.warn('Cache write error:', cacheError);
      }
    }

    return alerts;
  }

  static async resolveAlert(
    alertId: string,
    tenantId: string,
    data: {
      resolved_by: string;
      resolution_notes?: string;
    },
  ) {
    const [updated] = await db
      .update(alertsHistory)
      .set({
        is_resolved: true,
        resolved_at: new Date(),
        resolved_by: data.resolved_by,
        resolution_notes: data.resolution_notes,
      })
      .where(
        and(
          eq(alertsHistory.id, alertId),
          eq(alertsHistory.tenant_id, tenantId),
        ),
      )
      .returning();

    // Invalidate cache
    try {
      await RedisService.del(CacheKeys.alertsHistory(tenantId));
    } catch (cacheError) {
      logger.warn('Alert history cache invalidation error:', cacheError);
    }

    return updated;
  }

  static async getAlertStats(tenantId: string) {
    const allAlerts = await db.query.alertsHistory.findMany({
      where: eq(alertsHistory.tenant_id, tenantId),
    });

    const unresolved = allAlerts.filter((a) => !a.is_resolved).length;
    const critical = allAlerts.filter(
      (a) => a.severity === 'critical' && !a.is_resolved,
    ).length;
    const high = allAlerts.filter(
      (a) => a.severity === 'high' && !a.is_resolved,
    ).length;

    return {
      total_unresolved: unresolved,
      critical_count: critical,
      high_count: high,
      total_alerts: allAlerts.length,
      resolution_rate: (
        ((allAlerts.filter((a) => a.is_resolved).length / allAlerts.length) *
          100) || 0
      ).toFixed(2),
    };
  }

  // ========== PREDICTIVE WARNINGS ==========

  static async generateMaintenanceWarnings(
    tenantId: string,
    assetId: string,
  ) {
    // Obter histórico de ordens de trabalho para este equipamento
    const workOrderHistory = await db.query.workOrders.findMany({
      where: and(
        eq(workOrders.tenant_id, tenantId),
        eq(workOrders.asset_id, assetId),
      ),
      orderBy: desc(workOrders.created_at),
    });

    if (workOrderHistory.length === 0) {
      return null;
    }

    // Análise de padrões
    const last90Days = new Date();
    last90Days.setDate(last90Days.getDate() - 90);

    const recentFailures = workOrderHistory.filter(
      (wo) => new Date(wo.created_at) > last90Days,
    );

    const failureCount = recentFailures.length;
    const avgDaysInterval =
      recentFailures.length > 1
        ? Math.round(
            (new Date(recentFailures[0].created_at).getTime() -
              new Date(
                recentFailures[recentFailures.length - 1].created_at,
              ).getTime()) /
              (1000 * 60 * 60 * 24 * (recentFailures.length - 1)),
          )
        : 0;

    // Detectar tendências
    let severity = 'low';
    let type = 'normal';
    let message = '';
    let recommendation = '';

    if (failureCount > 5) {
      severity = 'critical';
      type = 'high_failure_rate';
      message = `Equipamento com ${failureCount} falhas nos últimos 90 dias. Risco muito elevado.`;
      recommendation =
        'Manutenção urgente recomendada. Considere parar o equipamento para inspeção detalhada.';
    } else if (failureCount > 3) {
      severity = 'high';
      type = 'increasing_failures';
      message = `Equipamento com ${failureCount} falhas nos últimos 90 dias. Degradação detectada.`;
      recommendation =
        'Agendar manutenção preventiva urgente nas próximas 2 semanas.';
    } else if (failureCount > 1 && avgDaysInterval < 30) {
      severity = 'high';
      type = 'short_interval';
      message = `Falhas em intervalos curtos (média ${avgDaysInterval} dias). Equipamento instável.`;
      recommendation = 'Análise detalhada necessária. Possível desgaste prematuro.';
    } else if (failureCount > 0) {
      severity = 'medium';
      type = 'recurring_issue';
      message = `Equipamento tem tido problemas periódicos. Possível padrão.`;
      recommendation = 'Monitorar próximas semanas. Agendar inspeção se continuar.';
    }

    return {
      severity,
      type,
      message,
      recommendation,
      metrics: {
        failures_90_days: failureCount,
        avg_days_between_failures: avgDaysInterval,
        last_failure: recentFailures[0]?.created_at,
        total_failures: workOrderHistory.length,
      },
    };
  }

  // ========== CHECK & TRIGGER ALERTS ==========

  static async checkAndTriggerAlerts(tenantId: string, assetId: string) {
    const configs = await this.getAlertConfigurations(tenantId, assetId);

    for (const config of configs) {
      if (!config.is_active) continue;

      // Verificar SLA crítico
      if (config.alert_type === 'sla_critical') {
        const criticalOrders = await db.query.workOrders.findMany({
          where: and(
            eq(workOrders.tenant_id, tenantId),
            eq(workOrders.asset_id, assetId),
            notInArray(workOrders.status, ['concluida', 'fechada', 'cancelada'] as any),
          ),
        });

        const now = new Date();
        for (const order of criticalOrders) {
          if (order.sla_deadline && new Date(order.sla_deadline) < now) {
            await this.createAlert({
              tenant_id: tenantId,
              alert_config_id: config.id,
              asset_id: assetId,
              severity: 'critical',
              message: `SLA crítico: Ordem ${order.id} passou do prazo`,
            }, {
              dedupe: { scope: 'message', windowHours: 24 },
            });
          }
        }
      }

      // Verificar maintenance_overdue
      if (config.alert_type === 'maintenance_overdue') {
        const lastMaintenance = await db.query.workOrders.findFirst({
          where: and(
            eq(workOrders.tenant_id, tenantId),
            eq(workOrders.asset_id, assetId),
            inArray(workOrders.status, ['concluida', 'fechada'] as any),
          ),
          orderBy: desc(workOrders.completed_at),
        });

        if (lastMaintenance?.completed_at) {
          const daysSinceLastMaintenance = Math.floor(
            (new Date().getTime() - new Date(lastMaintenance.completed_at).getTime()) /
              (1000 * 60 * 60 * 24),
          );

          if (daysSinceLastMaintenance > config.threshold) {
            await this.createAlert({
              tenant_id: tenantId,
              alert_config_id: config.id,
              asset_id: assetId,
              severity:
                daysSinceLastMaintenance > config.threshold * 1.5
                  ? 'high'
                  : 'medium',
              message: `Manutenção em atraso. Última manutenção há ${daysSinceLastMaintenance} dias.`,
            }, {
              dedupe: { scope: 'config', windowHours: 24 },
            });
          }
        }
      }
    }
  }
}
