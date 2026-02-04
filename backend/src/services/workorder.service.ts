import { db } from '../config/database';
import {
  workOrders,
  workOrderTasks,
} from '../db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

export class WorkOrderService {
  static async createWorkOrder(data: {
    tenant_id: string;
    plant_id: string;
    asset_id: string;
    created_by: string;
    title: string;
    description?: string;
    priority?: string;
    estimated_hours?: string;
    assigned_to?: string;
    scheduled_date?: Date | string;
    sla_deadline?: Date | string;
  }) {
    const priority = data.priority || 'media';
    const slaHoursMap: Record<string, number> = {
      baixa: 96,
      media: 72,
      alta: 24,
      critica: 8,
    };

    const slaHours = slaHoursMap[priority] || 72;
    const baseDate = data.scheduled_date
      ? new Date(data.scheduled_date)
      : new Date();

    const calculatedSla = new Date(baseDate.getTime() + slaHours * 60 * 60 * 1000);

    const [workOrder] = await db
      .insert(workOrders)
      .values({
        tenant_id: data.tenant_id,
        plant_id: data.plant_id,
        asset_id: data.asset_id,
        created_by: data.created_by,
        title: data.title,
        description: data.description,
        assigned_to: data.assigned_to,
        estimated_hours: data.estimated_hours,
        status: 'aberta' as any,
        priority: priority as any,
        scheduled_date: data.scheduled_date ? new Date(data.scheduled_date) : null,
        sla_deadline: data.sla_deadline ? new Date(data.sla_deadline) : calculatedSla,
      })
      .returning();

    return workOrder;
  }

  static async getWorkOrderById(tenantId: string, workOrderId: string) {
    return db.query.workOrders.findFirst({
      where: (fields: any, { eq, and }: any) =>
        and(eq(fields.tenant_id, tenantId), eq(fields.id, workOrderId)),
      with: {
        asset: {
          with: {
            category: true,
          },
        },
        assignedUser: {
          columns: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
          },
        },
        createdByUser: {
          columns: {
            id: true,
            first_name: true,
            last_name: true,
          },
        },
        tasks: true,
        attachments: true,
      },
    });
  }

  static async updateWorkOrder(
    tenantId: string,
    workOrderId: string,
    data: Partial<any>,
  ) {
    const [updated] = await db
      .update(workOrders)
      .set({
        ...data,
        updated_at: new Date(),
      })
      .where(
        and(eq(workOrders.tenant_id, tenantId), eq(workOrders.id, workOrderId)),
      )
      .returning();

    return updated;
  }

  static async getPlantWorkOrders(
    tenantId: string,
    plantId: string,
    status?: string,
  ) {
    let query = db.query.workOrders.findMany({
      where: (fields: any, { eq, and }: any) => {
        const conditions = [
          eq(fields.tenant_id, tenantId),
          eq(fields.plant_id, plantId),
        ];

        if (status) {
          conditions.push(eq(fields.status, status));
        }

        return and(...conditions);
      },
      with: {
        asset: true,
        assignedUser: {
          columns: {
            id: true,
            first_name: true,
            last_name: true,
          },
        },
      },
      orderBy: (fields: any) => [desc(fields.created_at)],
      limit: 100,
    });

    return query;
  }

  static async addTask(workOrderId: string, taskDescription: string) {
    const [task] = await db
      .insert(workOrderTasks)
      .values({
        id: uuidv4(),
        work_order_id: workOrderId,
        description: taskDescription,
        is_completed: false,
      })
      .returning();

    return task;
  }

  static async completeTask(taskId: string) {
    const [task] = await db
      .update(workOrderTasks)
      .set({
        is_completed: true,
        completed_at: new Date(),
      })
      .where(eq(workOrderTasks.id, taskId))
      .returning();

    return task;
  }
}
