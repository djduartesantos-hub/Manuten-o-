import { Response } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import { WorkOrderService } from '../services/workorder.service.js';
import { NotificationService } from '../services/notification.service.js';
import { AuditService } from '../services/audit.service.js';
import { logger } from '../config/logger.js';
import { getSocketManager, isSocketManagerReady } from '../utils/socket-instance.js';

export class WorkOrderController {
  private static isAdmin(role?: string) {
    return role === 'superadmin' || role === 'admin_empresa';
  }

  private static isManager(role?: string) {
    return role === 'gestor_manutencao';
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
      ];

      const wantsEditFields = editFields.some((field) => Object.prototype.hasOwnProperty.call(updates, field));
      const wantsOperational = operationalFields.some((field) => Object.prototype.hasOwnProperty.call(updates, field));

      if (wantsEditFields && !(isAdmin || isManager || isCreator)) {
        res.status(403).json({
          success: false,
          error: 'Sem permissao para editar esta ordem',
        });
        return;
      }

      if (wantsOperational) {
        const updatedAssigned = updates.assigned_to ?? existing.assigned_to;
        const isAssignedUser = Boolean(userId && updatedAssigned === userId);

        if (existing.assigned_to && existing.assigned_to !== userId && !isAdmin) {
          res.status(403).json({
            success: false,
            error: 'Ordem atribuida a outro utilizador',
          });
          return;
        }

        if (updates.assigned_to && updates.assigned_to !== existing.assigned_to) {
          const isSelfAssign = Boolean(!existing.assigned_to && userId && updates.assigned_to === userId);
          if (!isAdmin && !isSelfAssign) {
            res.status(403).json({
              success: false,
              error: 'Sem permissao para atribuir esta ordem',
            });
            return;
          }
        }

        if (!isAdmin && !isAssignedUser) {
          res.status(403).json({
            success: false,
            error: 'Somente o responsavel pode atualizar o estado',
          });
          return;
        }

        if (updates.status === 'concluida') {
          const workPerformed = updates.work_performed ?? existing.work_performed;
          if (!workPerformed || String(workPerformed).trim() === '') {
            res.status(400).json({
              success: false,
              error: 'Indique o trabalho realizado antes de concluir',
            });
            return;
          }

          const hasIncomplete = await WorkOrderService.hasIncompleteTasks(existing.id);
          if (hasIncomplete) {
            res.status(400).json({
              success: false,
              error: 'Conclua todas as tarefas antes de terminar a ordem',
            });
            return;
          }
        }
      }

      const workOrder = await WorkOrderService.updateWorkOrder(
        tenantId,
        workOrderId,
        updates,
        plantId,
      );

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
