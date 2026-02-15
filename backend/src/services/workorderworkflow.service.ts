import { and, asc, eq, isNull } from 'drizzle-orm';
import { db } from '../config/database.js';
import { workOrderWorkflows } from '../db/schema.js';

export type WorkflowTransitionRule = {
  from: string;
  to: string[] | string;
  allowed_roles?: string[];
  approval_roles?: string[];
};

export type WorkflowConfig = {
  transitions: WorkflowTransitionRule[];
};

export class WorkOrderWorkflowService {
  private defaultConfig(): WorkflowConfig {
    return {
      transitions: [
        { from: 'aberta', to: ['em_analise', 'cancelada'] },
        { from: 'em_analise', to: ['em_execucao', 'cancelada'] },
        { from: 'em_execucao', to: ['concluida', 'em_pausa', 'cancelada'] },
        { from: 'em_pausa', to: ['em_execucao', 'cancelada'] },
        { from: 'concluida', to: ['fechada', 'cancelada'] },
        { from: 'fechada', to: ['aberta', 'em_analise'] },
      ],
    };
  }

  async listWorkflows(tenantId: string, plantId?: string) {
    const where = plantId
      ? and(eq(workOrderWorkflows.tenant_id, tenantId), eq(workOrderWorkflows.plant_id, plantId))
      : eq(workOrderWorkflows.tenant_id, tenantId);

    return db
      .select()
      .from(workOrderWorkflows)
      .where(where)
      .orderBy(asc(workOrderWorkflows.created_at));
  }

  async getActiveWorkflow(tenantId: string, plantId: string) {
    const plantRows = await db
      .select()
      .from(workOrderWorkflows)
      .where(and(eq(workOrderWorkflows.tenant_id, tenantId), eq(workOrderWorkflows.plant_id, plantId)))
      .orderBy(asc(workOrderWorkflows.created_at));

    const plantDefault = plantRows.find((row: any) => row.is_default) || plantRows[0];
    if (plantDefault) {
      return plantDefault;
    }

    const tenantRows = await db
      .select()
      .from(workOrderWorkflows)
      .where(and(eq(workOrderWorkflows.tenant_id, tenantId), isNull(workOrderWorkflows.plant_id)))
      .orderBy(asc(workOrderWorkflows.created_at));

    const tenantDefault = tenantRows.find((row: any) => row.is_default) || tenantRows[0];
    return tenantDefault ?? null;
  }

  getConfigOrDefault(row: any | null): WorkflowConfig {
    const config = row?.config as WorkflowConfig | null | undefined;
    if (!config || !Array.isArray(config.transitions)) {
      return this.defaultConfig();
    }
    return config;
  }

  async createWorkflow(input: {
    tenantId: string;
    plantId?: string | null;
    name: string;
    isDefault?: boolean;
    config: WorkflowConfig;
    userId?: string | null;
  }) {
    if (input.isDefault) {
      await db
        .update(workOrderWorkflows)
        .set({ is_default: false, updated_at: new Date(), updated_by: input.userId ?? null })
        .where(
          and(
            eq(workOrderWorkflows.tenant_id, input.tenantId),
            input.plantId ? eq(workOrderWorkflows.plant_id, input.plantId) : isNull(workOrderWorkflows.plant_id),
          ),
        );
    }

    const [row] = await db
      .insert(workOrderWorkflows)
      .values({
        tenant_id: input.tenantId,
        plant_id: input.plantId ?? null,
        name: input.name,
        is_default: Boolean(input.isDefault),
        config: input.config,
        created_by: input.userId ?? null,
        updated_by: input.userId ?? null,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning();

    return row;
  }

  async updateWorkflow(input: {
    workflowId: string;
    tenantId: string;
    plantId?: string | null;
    name?: string;
    isDefault?: boolean;
    config?: WorkflowConfig;
    userId?: string | null;
  }) {
    if (input.isDefault) {
      await db
        .update(workOrderWorkflows)
        .set({ is_default: false, updated_at: new Date(), updated_by: input.userId ?? null })
        .where(
          and(
            eq(workOrderWorkflows.tenant_id, input.tenantId),
            input.plantId ? eq(workOrderWorkflows.plant_id, input.plantId) : isNull(workOrderWorkflows.plant_id),
          ),
        );
    }

    const [row] = await db
      .update(workOrderWorkflows)
      .set({
        name: input.name,
        is_default: input.isDefault,
        config: input.config,
        updated_by: input.userId ?? null,
        updated_at: new Date(),
      })
      .where(and(eq(workOrderWorkflows.id, input.workflowId), eq(workOrderWorkflows.tenant_id, input.tenantId)))
      .returning();

    return row ?? null;
  }

  async deleteWorkflow(tenantId: string, workflowId: string) {
    const [row] = await db
      .delete(workOrderWorkflows)
      .where(and(eq(workOrderWorkflows.tenant_id, tenantId), eq(workOrderWorkflows.id, workflowId)))
      .returning();

    return row ?? null;
  }
}
