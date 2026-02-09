import { Response } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import { WorkOrderService } from '../services/workorder.service.js';
import { NotificationService } from '../services/notification.service.js';
import { AlertService } from '../services/alert.service.js';
import { AuditService } from '../services/audit.service.js';
import { logger } from '../config/logger.js';
import { getSocketManager, isSocketManagerReady } from '../utils/socket-instance.js';

export class WorkOrderController {
  private static isAdmin(role?: string) {
    return role === 'superadmin' || role === 'admin_empresa';
  }

  private static isManager(role?: string) {
    return role === 'gestor_manutencao' || role === 'supervisor';
  }

  static async list(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { plantId } = req.params;
      const { status } = req.query;
      const tenantId = req.tenantId;

      if (!tenantId || !plantId) {
        res.status(400).json({
          success: false,
          error: 'Plant ID is required',
        });
        return;
      }

      const workOrders = await WorkOrderService.getPlantWorkOrders(
        tenantId,
        plantId,
        status as string,
      );

      res.json({
        success: true,
        data: workOrders,
      });
    } catch (error) {
      logger.error('List work orders error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch work orders',
      });
    }
  }

  static async get(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { workOrderId } = req.params;
      const { plantId } = req.params;
      const tenantId = req.tenantId;

      if (!tenantId || !workOrderId || !plantId) {
        res.status(400).json({
          success: false,
          error: 'Work order ID and plant ID are required',
        });
        return;
      }

      const workOrder = await WorkOrderService.getWorkOrderById(tenantId, workOrderId, plantId);

      if (!workOrder) {
        res.status(404).json({
          success: false,
          error: 'Work order not found',
        });
        return;
      }

      res.json({
        success: true,
        data: workOrder,
      });
    } catch (error) {
      logger.error('Get work order error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch work order',
      });
    }
  }

  static async create(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { plantId } = req.params;
      const tenantId = req.tenantId;
      const { asset_id, title, description, priority, estimated_hours } = req.body;

      if (!tenantId || !plantId) {
        res.status(400).json({
          success: false,
          error: 'Tenant ID and plant ID are required',
        });
        return;
      }

      const workOrder = await WorkOrderService.createWorkOrder({
        tenant_id: tenantId,
        plant_id: plantId,
        asset_id,
        created_by: req.user?.userId || '',
        title,
        description,
        priority,
        estimated_hours,
      });

      if (req.user?.userId) {
        await AuditService.createLog({
          tenant_id: tenantId,
          user_id: req.user.userId,
          action: 'create',
          entity_type: 'work_order',
          entity_id: workOrder.id,
          new_values: {
            title: workOrder.title,
            status: workOrder.status,
            priority: workOrder.priority,
            asset_id: workOrder.asset_id,
            assigned_to: workOrder.assigned_to,
          },
          ip_address: req.ip,
        });
      }

      if (workOrder.asset_id) {
        void AlertService.checkAndTriggerAlerts(tenantId, workOrder.asset_id).catch((err) => {
          logger.warn('Alert check failed after work order create', {
            error: err instanceof Error ? err.message : err,
            workOrderId: workOrder.id,
          });
        });
      }

      // Emit real-time notification
      if (isSocketManagerReady()) {
        const socketManager = getSocketManager();
        socketManager.emitOrderCreated(tenantId, {
          id: workOrder.id,
          title: workOrder.title,
          asset_id: workOrder.asset_id,
          priority: workOrder.priority,
          status: workOrder.status,
          created_at: workOrder.created_at,
        });
      }

      res.status(201).json({
        success: true,
        data: workOrder,
      });
    } catch (error) {
      logger.error('Create work order error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create work order',
      });
    }
  }

  static async update(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { workOrderId } = req.params;
      const { plantId } = req.params;
      const tenantId = req.tenantId;
      const updates = req.body;
      const userId = req.user?.userId;
      const role = req.user?.role;

      if (!tenantId || !workOrderId || !plantId) {
        res.status(400).json({
          success: false,
          error: 'Work order ID is required',
        });
        return;
      }

      const existing = await WorkOrderService.getWorkOrderById(tenantId, workOrderId, plantId);

      if (!existing) {
        res.status(404).json({
          success: false,
          error: 'Work order not found',
        });
        return;
      }

      const isAdmin = WorkOrderController.isAdmin(role);
      const isManager = WorkOrderController.isManager(role);
      const isCreator = Boolean(userId && existing.created_by === userId);

      const updatedAssigned = updates.assigned_to ?? existing.assigned_to;
      const isAssignedUser = Boolean(userId && updatedAssigned === userId);
      const isSelfAssign = Boolean(
        !existing.assigned_to && userId && updates.assigned_to === userId,
      );

      const editFields = [
        'title',
        'description',
        'priority',
        'scheduled_date',
        'estimated_hours',
        'asset_id',
        'plan_id',
      ];
      const operationalFields = [
        'status',
        'actual_hours',
        'completed_at',
        'notes',
        'work_performed',
        'assigned_to',
        'started_at',
        'analysis_started_at',
        'paused_at',
        'pause_reason',
        'cancelled_at',
        'cancel_reason',
        'downtime_started_at',
        'downtime_ended_at',
        'downtime_minutes',
        'downtime_reason',
        'downtime_type',
        'downtime_category',
        'root_cause',
        'corrective_action',
        'sub_status',
      ];

      const wantsEditFields = editFields.some((field) => Object.prototype.hasOwnProperty.call(updates, field));
      const wantsOperational = operationalFields.some((field) => Object.prototype.hasOwnProperty.call(updates, field));

      const requestedEditFields = editFields.filter((field) =>
        Object.prototype.hasOwnProperty.call(updates, field),
      );
      const onlyPlanningEdits =
        requestedEditFields.length > 0 &&
        requestedEditFields.every((field) => field === 'scheduled_date' || field === 'estimated_hours');

      const normalizeExistingStatus = (status: string) => {
        if (status === 'aprovada' || status === 'planeada' || status === 'atribuida') return 'em_analise';
        if (status === 'em_curso') return 'em_execucao';
        return status;
      };

      const assertValidTransition = (currentRaw: string, nextRaw: string) => {
        const current = normalizeExistingStatus(currentRaw);
        const next = normalizeExistingStatus(nextRaw);

        if (!current || !next || current === next) return;

        if (current === 'fechada' || current === 'cancelada') {
          throw new Error('Esta ordem já está finalizada e não pode mudar de estado');
        }

        if (next === 'cancelada') return;

        if (next === 'em_pausa') {
          if (current !== 'em_execucao') {
            throw new Error('Só é possível pausar uma ordem em execução');
          }
          return;
        }

        if (current === 'em_pausa') {
          if (next !== 'em_execucao') {
            throw new Error('Uma ordem em pausa só pode voltar para Em Execução');
          }
          return;
        }

        const allowedNextByStatus: Record<string, string[]> = {
          aberta: ['em_analise'],
          em_analise: ['em_execucao'],
          em_execucao: ['concluida', 'em_pausa'],
          concluida: ['fechada'],
        };

        const allowed = allowedNextByStatus[current] || [];
        if (!allowed.includes(next)) {
          throw new Error(`Transição de estado inválida: ${current} → ${next}`);
        }
      };

      const normalizedExistingStatus = normalizeExistingStatus(existing.status);

      if (Object.prototype.hasOwnProperty.call(updates, 'status') && updates.status) {
        try {
          assertValidTransition(String(existing.status), String(updates.status));
        } catch (e: any) {
          res.status(400).json({
            success: false,
            error: e?.message || 'Transição de estado inválida',
          });
          return;
        }
      }

      const isStartingOrder =
        updates.status === 'em_execucao' &&
        ['aberta', 'em_analise', 'em_pausa'].includes(normalizedExistingStatus) &&
        Object.prototype.hasOwnProperty.call(updates, 'started_at');
      const allowOperatorPlanningOnStart =
        wantsOperational &&
        isStartingOrder &&
        onlyPlanningEdits &&
        (isAdmin || isAssignedUser || isSelfAssign);

      if (wantsEditFields && !(isAdmin || isManager || isCreator || allowOperatorPlanningOnStart)) {
        res.status(403).json({
          success: false,
          error: 'Sem permissao para editar esta ordem',
        });
        return;
      }

      if (wantsOperational) {
        if (existing.assigned_to && existing.assigned_to !== userId && !isAdmin && !isManager) {
          res.status(403).json({
            success: false,
            error: 'Ordem atribuida a outro utilizador',
          });
          return;
        }

        if (updates.assigned_to && updates.assigned_to !== existing.assigned_to) {
          if (!isAdmin && !isSelfAssign) {
            res.status(403).json({
              success: false,
              error: 'Sem permissao para atribuir esta ordem',
            });
            return;
          }
        }

        if (!isAdmin && !isManager && !isAssignedUser) {
          res.status(403).json({
            success: false,
            error: 'Somente o responsavel pode atualizar o estado',
          });
          return;
        }

        const normalizeOptionalText = (value: any) => {
          if (value === null || value === undefined) return null;
          const trimmed = String(value).trim();
          return trimmed ? trimmed : null;
        };

        if (Object.prototype.hasOwnProperty.call(updates, 'root_cause')) {
          updates.root_cause = normalizeOptionalText(updates.root_cause);
        }

        if (Object.prototype.hasOwnProperty.call(updates, 'corrective_action')) {
          updates.corrective_action = normalizeOptionalText(updates.corrective_action);
        }

        if (Object.prototype.hasOwnProperty.call(updates, 'downtime_type')) {
          const value = normalizeOptionalText(updates.downtime_type);
          const allowed = new Set(['total', 'parcial']);
          if (value && !allowed.has(String(value))) {
            res.status(400).json({
              success: false,
              error: 'Paragem: tipo inválido (use total ou parcial)',
            });
            return;
          }
          updates.downtime_type = value;
        }

        if (Object.prototype.hasOwnProperty.call(updates, 'downtime_category')) {
          const value = normalizeOptionalText(updates.downtime_category);
          const allowed = new Set(['producao', 'seguranca', 'energia', 'pecas', 'outras']);
          if (value && !allowed.has(String(value))) {
            res.status(400).json({
              success: false,
              error: 'Paragem: categoria inválida',
            });
            return;
          }
          updates.downtime_category = value;
        }

        if (updates.status === 'concluida') {
          const hasIncomplete = await WorkOrderService.hasIncompleteTasks(existing.id);
          if (hasIncomplete) {
            res.status(400).json({
              success: false,
              error: 'Conclua todas as tarefas antes de terminar a ordem',
            });
            return;
          }

          const workPerformed = String(updates.work_performed ?? existing.work_performed ?? '').trim();
          if (workPerformed.length < 3) {
            res.status(400).json({
              success: false,
              error: 'Registe o trabalho realizado antes de terminar a ordem',
            });
            return;
          }
        }

        if (updates.status === 'em_pausa') {
          const reason = String(updates.pause_reason ?? '').trim();
          if (reason.length < 3) {
            res.status(400).json({
              success: false,
              error: 'Motivo é obrigatório ao colocar a ordem em pausa',
            });
            return;
          }
        }

        if (updates.status === 'cancelada') {
          const reason = String(updates.cancel_reason ?? '').trim();
          if (reason.length < 3) {
            res.status(400).json({
              success: false,
              error: 'Motivo é obrigatório ao cancelar a ordem',
            });
            return;
          }
        }

        if (updates.status === 'fechada') {
          const actualHours = updates.actual_hours ?? existing.actual_hours;
          const completedAt = updates.completed_at ?? existing.completed_at;

          if (existing.status !== 'concluida' && !isAdmin) {
            res.status(400).json({
              success: false,
              error: 'A ordem precisa estar concluida antes de fechar',
            });
            return;
          }

          if (!actualHours) {
            res.status(400).json({
              success: false,
              error: 'Registe as horas reais antes de fechar a ordem',
            });
            return;
          }

          if (!completedAt) {
            res.status(400).json({
              success: false,
              error: 'Registe a data de conclusao antes de fechar a ordem',
            });
            return;
          }
        }
      }

      // Server-side lifecycle timestamps/metadata
      if (updates.status === 'em_analise' && !updates.analysis_started_at && !(existing as any).analysis_started_at) {
        updates.analysis_started_at = new Date().toISOString();
      }

      if (updates.status === 'em_execucao' && !updates.started_at && !existing.started_at) {
        updates.started_at = new Date().toISOString();
      }

      if (updates.status === 'em_pausa' && !updates.paused_at) {
        updates.paused_at = new Date().toISOString();
      }

      if (updates.status === 'concluida' && !updates.completed_at && !existing.completed_at) {
        updates.completed_at = new Date().toISOString();
      }

      if (updates.status === 'cancelada' && !updates.cancelled_at) {
        updates.cancelled_at = new Date().toISOString();
      }

      if (updates.status === 'fechada') {
        if (!updates.closed_at) {
          updates.closed_at = new Date().toISOString();
        }
        if (!updates.closed_by && req.user?.userId) {
          updates.closed_by = req.user.userId;
        }
      }

      const hasDowntimeStart = Object.prototype.hasOwnProperty.call(updates, 'downtime_started_at');
      const hasDowntimeEnd = Object.prototype.hasOwnProperty.call(updates, 'downtime_ended_at');

      if (hasDowntimeStart || hasDowntimeEnd) {
        const normalizeIso = (value: any) => {
          const raw = value === null || value === undefined ? '' : String(value);
          const trimmed = raw.trim();
          return trimmed ? trimmed : null;
        };

        const startIso = normalizeIso(
          hasDowntimeStart ? updates.downtime_started_at : (existing as any).downtime_started_at,
        );
        const endIso = normalizeIso(
          hasDowntimeEnd ? updates.downtime_ended_at : (existing as any).downtime_ended_at,
        );

        if (!startIso && !endIso) {
          updates.downtime_minutes = null;
        } else if (!startIso || !endIso) {
          res.status(400).json({
            success: false,
            error: 'Paragem: indique início e fim (ou deixe ambos vazios)',
          });
          return;
        } else {
          const start = new Date(startIso);
          const end = new Date(endIso);
          const diffMs = end.getTime() - start.getTime();
          if (Number.isNaN(diffMs) || diffMs < 0) {
            res.status(400).json({
              success: false,
              error: 'Paragem: datas inválidas (fim deve ser depois do início)',
            });
            return;
          }
          updates.downtime_minutes = Math.round(diffMs / 60000);
        }
      }

      const workOrder = await WorkOrderService.updateWorkOrder(
        tenantId,
        workOrderId,
        updates,
        plantId,
      );

      const shouldTriggerAlerts = Boolean(
        updates.status || updates.sla_deadline || updates.asset_id || updates.completed_at || updates.priority,
      );
      const assetIdForAlerts = workOrder.asset_id || existing.asset_id;
      if (shouldTriggerAlerts && assetIdForAlerts) {
        void AlertService.checkAndTriggerAlerts(tenantId, assetIdForAlerts).catch((err) => {
          logger.warn('Alert check failed after work order update', {
            error: err instanceof Error ? err.message : err,
            workOrderId: workOrder.id,
          });
        });
      }

      if (req.user?.userId) {
        const fields = Object.keys(updates || {});
        if (fields.length > 0) {
          const oldValues: Record<string, any> = {};
          const newValues: Record<string, any> = {};
          fields.forEach((field) => {
            oldValues[field] = (existing as any)[field];
            newValues[field] = (workOrder as any)[field];
          });

          await AuditService.createLog({
            tenant_id: tenantId,
            user_id: req.user.userId,
            action: 'update',
            entity_type: 'work_order',
            entity_id: workOrder.id,
            old_values: oldValues,
            new_values: newValues,
            ip_address: req.ip,
          });
        }
      }

      const nextStatus = updates.status ?? existing.status;
      const assignmentChanged =
        Object.prototype.hasOwnProperty.call(updates, 'assigned_to') &&
        updates.assigned_to !== existing.assigned_to;

      if (nextStatus !== existing.status) {
        await NotificationService.notifyWorkOrderEvent({
          tenantId,
          plantId,
          eventType: 'work_order_status_changed',
          assignedTo: workOrder.assigned_to,
          createdBy: workOrder.created_by,
          title: 'Mudanca de estado',
          message: `Ordem ${workOrder.title} passou para ${workOrder.status}.`,
          type: 'info',
          workOrderId: workOrder.id,
        });
      }

      if (assignmentChanged && updates.assigned_to) {
        await NotificationService.notifyWorkOrderEvent({
          tenantId,
          plantId,
          eventType: 'work_order_assigned',
          assignedTo: updates.assigned_to,
          createdBy: workOrder.created_by,
          title: 'Ordem atribuida',
          message: `Ordem ${workOrder.title} foi atribuida.`,
          type: 'success',
          workOrderId: workOrder.id,
        });
      }

      // Emit real-time notifications
      if (isSocketManagerReady()) {
        const socketManager = getSocketManager();
        
        // Check if status changed
        if (updates.status) {
          socketManager.emitOrderStatusChanged(tenantId, {
            id: workOrder.id,
            title: workOrder.title,
            status: workOrder.status,
            updated_at: workOrder.updated_at,
          }, updates.previous_status || 'unknown');
        } else {
          // Emit generic update
          socketManager.emitOrderUpdated(tenantId, {
            id: workOrder.id,
            title: workOrder.title,
            priority: workOrder.priority,
            status: workOrder.status,
            updated_at: workOrder.updated_at,
          });
        }
      }

      res.json({
        success: true,
        data: workOrder,
      });
    } catch (error) {
      logger.error('Update work order error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update work order',
      });
    }
  }

  static async remove(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { workOrderId } = req.params;
      const { plantId } = req.params;
      const tenantId = req.tenantId;
      const userId = req.user?.userId;
      const role = req.user?.role;

      if (!tenantId || !workOrderId || !plantId) {
        res.status(400).json({
          success: false,
          error: 'Work order ID is required',
        });
        return;
      }

      const existing = await WorkOrderService.getWorkOrderById(tenantId, workOrderId, plantId);

      if (!existing) {
        res.status(404).json({
          success: false,
          error: 'Work order not found',
        });
        return;
      }

      const isAdmin = WorkOrderController.isAdmin(role);
      const isCreator = Boolean(userId && existing.created_by === userId);

      if (!isAdmin && !isCreator) {
        res.status(403).json({
          success: false,
          error: 'Sem permissao para eliminar esta ordem',
        });
        return;
      }

      if (req.user?.userId) {
        await AuditService.createLog({
          tenant_id: tenantId,
          user_id: req.user.userId,
          action: 'delete',
          entity_type: 'work_order',
          entity_id: existing.id,
          old_values: {
            title: existing.title,
            status: existing.status,
            priority: existing.priority,
            asset_id: existing.asset_id,
            assigned_to: existing.assigned_to,
          },
          ip_address: req.ip,
        });
      }

      await WorkOrderService.deleteWorkOrder(tenantId, workOrderId, plantId);

      res.json({
        success: true,
        data: { id: workOrderId },
      });
    } catch (error) {
      logger.error('Delete work order error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete work order',
      });
    }
  }

  static async listTasks(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { workOrderId, plantId } = req.params;
      const tenantId = req.tenantId;

      if (!tenantId || !workOrderId || !plantId) {
        res.status(400).json({
          success: false,
          error: 'Work order ID is required',
        });
        return;
      }

      const workOrder = await WorkOrderService.getWorkOrderById(tenantId, workOrderId, plantId);
      if (!workOrder) {
        res.status(404).json({
          success: false,
          error: 'Work order not found',
        });
        return;
      }

      const tasks = await WorkOrderService.getTasks(workOrderId);
      res.json({
        success: true,
        data: tasks,
      });
    } catch (error) {
      logger.error('List work order tasks error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch work order tasks',
      });
    }
  }

  static async addTask(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { workOrderId, plantId } = req.params;
      const tenantId = req.tenantId;
      const { description } = req.body;

      if (!tenantId || !workOrderId || !plantId) {
        res.status(400).json({
          success: false,
          error: 'Work order ID is required',
        });
        return;
      }

      if (!description || String(description).trim() === '') {
        res.status(400).json({
          success: false,
          error: 'Descricao da tarefa e obrigatoria',
        });
        return;
      }

      const workOrder = await WorkOrderService.getWorkOrderById(tenantId, workOrderId, plantId);
      if (!workOrder) {
        res.status(404).json({
          success: false,
          error: 'Work order not found',
        });
        return;
      }

      const task = await WorkOrderService.addTask(workOrderId, String(description).trim());
      res.status(201).json({
        success: true,
        data: task,
      });
    } catch (error) {
      logger.error('Add work order task error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to add task',
      });
    }
  }

  static async updateTask(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { workOrderId, plantId, taskId } = req.params;
      const tenantId = req.tenantId;
      const { is_completed } = req.body;

      if (!tenantId || !workOrderId || !plantId || !taskId) {
        res.status(400).json({
          success: false,
          error: 'Task ID is required',
        });
        return;
      }

      if (typeof is_completed !== 'boolean') {
        res.status(400).json({
          success: false,
          error: 'Estado da tarefa invalido',
        });
        return;
      }

      const workOrder = await WorkOrderService.getWorkOrderById(tenantId, workOrderId, plantId);
      if (!workOrder) {
        res.status(404).json({
          success: false,
          error: 'Work order not found',
        });
        return;
      }

      const tasks = await WorkOrderService.getTasks(workOrderId);
      const taskExists = tasks.some((task: any) => task.id === taskId);
      if (!taskExists) {
        res.status(404).json({
          success: false,
          error: 'Task not found',
        });
        return;
      }

      const task = await WorkOrderService.setTaskCompletion(taskId, is_completed);
      res.json({
        success: true,
        data: task,
      });
    } catch (error) {
      logger.error('Update work order task error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update task',
      });
    }
  }

  static async listAuditLogs(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { workOrderId, plantId } = req.params;
      const tenantId = req.tenantId;

      if (!tenantId || !workOrderId || !plantId) {
        res.status(400).json({
          success: false,
          error: 'Work order ID is required',
        });
        return;
      }

      const workOrder = await WorkOrderService.getWorkOrderById(tenantId, workOrderId, plantId);
      if (!workOrder) {
        res.status(404).json({
          success: false,
          error: 'Work order not found',
        });
        return;
      }

      const logs = await AuditService.getEntityLogs(tenantId, 'work_order', workOrderId);
      res.json({
        success: true,
        data: logs,
      });
    } catch (error) {
      logger.error('List work order audit logs error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch audit logs',
      });
    }
  }
}
