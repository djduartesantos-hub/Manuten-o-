import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';

const router = Router();

const openapi = {
  openapi: '3.0.3',
  info: {
    title: 'Manuten-o CMMS API',
    version: '1.3.0-beta.2',
    description:
      'API documentation (partial). Covers core Auth, Work Orders, Preventive schedules, and Alerts/Documents endpoints.',
  },
  servers: [{ url: '/' }],
  tags: [
    { name: 'Health' },
    { name: 'Auth' },
    { name: 'Profile' },
    { name: 'WorkOrders' },
    { name: 'Preventive' },
    { name: 'Planner' },
    { name: 'Assets' },
    { name: 'SpareParts' },
    { name: 'Stock' },
    { name: 'Suppliers' },
    { name: 'Kits' },
    { name: 'Tickets' },
    { name: 'Alerts' },
    { name: 'Documents' },
    { name: 'Notifications' },
    { name: 'Dashboard' },
    { name: 'Search' },
    { name: 'Stocktake' },
    { name: 'Setup' },
    { name: 'Admin' },
    { name: 'SuperAdmin' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          error: { type: 'string' },
        },
        required: ['error'],
      },
      SuccessEnvelope: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: {},
        },
        required: ['success'],
      },
      LoginRequest: {
        type: 'object',
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string' },
          tenant_slug: { type: 'string', description: 'Optional tenant slug when multi-tenant is enabled.' },
        },
        required: ['email', 'password'],
      },
      RefreshRequest: {
        type: 'object',
        properties: {
          refreshToken: { type: 'string' },
        },
        required: ['refreshToken'],
      },
      WorkOrderCreateRequest: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          priority: { type: 'string', example: 'media' },
          asset_id: { type: 'string', format: 'uuid' },
        },
        required: ['title'],
      },
      PreventiveScheduleSkipRequest: {
        type: 'object',
        properties: {
          reason: { type: 'string' },
          notes: { type: 'string' },
        },
      },
      TicketCreateRequest: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          priority: { type: 'string', example: 'media' },
          is_general: { type: 'boolean' },
          tags: { type: 'array', items: { type: 'string' } },
        },
        required: ['title', 'description'],
      },
      TicketCommentRequest: {
        type: 'object',
        properties: {
          body: { type: 'string' },
        },
        required: ['body'],
      },
      TicketStatusRequest: {
        type: 'object',
        properties: {
          status: { type: 'string', example: 'em_progresso' },
        },
        required: ['status'],
      },
      DocumentUpdateRequest: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          tags: { type: 'array', items: { type: 'string' } },
          expires_at: { type: 'string', format: 'date-time', nullable: true },
        },
      },
    },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Health check',
        security: [],
        responses: {
          '200': {
            description: 'OK',
          },
        },
      },
    },
    '/api/auth/status': {
      get: {
        tags: ['Auth'],
        summary: 'Auth status',
        security: [],
        responses: {
          '200': { description: 'OK' },
        },
      },
    },
    '/api/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/LoginRequest' },
            },
          },
        },
        responses: {
          '200': { description: 'OK' },
          '401': { description: 'Unauthorized' },
        },
      },
    },
    '/api/auth/refresh': {
      post: {
        tags: ['Auth'],
        summary: 'Refresh token',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RefreshRequest' },
            },
          },
        },
        responses: {
          '200': { description: 'OK' },
          '401': { description: 'Unauthorized' },
        },
      },
    },
    '/api/{plantId}/work-orders': {
      get: {
        tags: ['WorkOrders'],
        summary: 'List work orders',
        parameters: [
          { name: 'plantId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': { description: 'OK' },
          '401': { description: 'Unauthorized' },
        },
      },
      post: {
        tags: ['WorkOrders'],
        summary: 'Create work order',
        parameters: [
          { name: 'plantId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/WorkOrderCreateRequest' },
            },
          },
        },
        responses: {
          '201': { description: 'Created' },
          '400': { description: 'Bad Request' },
          '401': { description: 'Unauthorized' },
        },
      },
    },
    '/api/{plantId}/preventive-schedules': {
      get: {
        tags: ['Preventive'],
        summary: 'List preventive schedules',
        parameters: [
          { name: 'plantId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: { '200': { description: 'OK' } },
      },
      post: {
        tags: ['Preventive'],
        summary: 'Create preventive schedule',
        parameters: [
          { name: 'plantId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { type: 'object' } },
          },
        },
        responses: { '201': { description: 'Created' } },
      },
    },
    '/api/{plantId}/preventive-schedules/{schedule_id}/skip': {
      post: {
        tags: ['Preventive'],
        summary: 'Skip preventive schedule cycle (with reason)',
        parameters: [
          { name: 'plantId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'schedule_id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        requestBody: {
          required: false,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/PreventiveScheduleSkipRequest' } },
          },
        },
        responses: {
          '200': { description: 'OK' },
          '401': { description: 'Unauthorized' },
          '404': { description: 'Not Found' },
        },
      },
    },
    '/api/alerts/configurations': {
      get: {
        tags: ['Alerts'],
        summary: 'List alert configurations',
        parameters: [
          { name: 'asset_id', in: 'query', required: false, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: { '200': { description: 'OK' } },
      },
      post: {
        tags: ['Alerts'],
        summary: 'Create alert configuration',
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { type: 'object' } },
          },
        },
        responses: { '201': { description: 'Created' } },
      },
    },
    '/api/alerts/configurations/{id}/test': {
      post: {
        tags: ['Alerts'],
        summary: 'Test an alert configuration (creates a low-severity test alert)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'OK' }, '404': { description: 'Not Found' } },
      },
    },
    '/api/alerts/documents': {
      get: {
        tags: ['Documents'],
        summary: 'List asset documents',
        parameters: [
          { name: 'asset_id', in: 'query', required: false, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: { '200': { description: 'OK' } },
      },
      post: {
        tags: ['Documents'],
        summary: 'Upload asset document (multipart or JSON)',
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  file: { type: 'string', format: 'binary' },
                  asset_id: { type: 'string', format: 'uuid' },
                  name: { type: 'string' },
                  description: { type: 'string' },
                },
                required: ['file', 'asset_id'],
              },
            },
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  asset_id: { type: 'string', format: 'uuid' },
                  file_url: { type: 'string' },
                  name: { type: 'string' },
                  description: { type: 'string' },
                },
                required: ['asset_id'],
              },
            },
          },
        },
        responses: { '201': { description: 'Created' } },
      },
    },
    '/api/alerts/documents/{id}/versions': {
      get: {
        tags: ['Documents'],
        summary: 'Get document version history',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/alerts/documents/{id}': {
      put: {
        tags: ['Documents'],
        summary: 'Update document metadata',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/DocumentUpdateRequest' } },
          },
        },
        responses: { '200': { description: 'OK' }, '400': { description: 'Bad Request' } },
      },
      delete: {
        tags: ['Documents'],
        summary: 'Delete document',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'OK' }, '404': { description: 'Not Found' } },
      },
    },
    '/api/alerts/documents/expiring': {
      get: {
        tags: ['Documents'],
        summary: 'List expiring documents',
        parameters: [
          { name: 'days', in: 'query', required: false, schema: { type: 'integer', example: 30 } },
        ],
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/profile': {
      get: {
        tags: ['Profile'],
        summary: 'Get my profile',
        responses: { '200': { description: 'OK' } },
      },
      patch: {
        tags: ['Profile'],
        summary: 'Update profile',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object' } } },
        },
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/profile/password': {
      patch: {
        tags: ['Profile'],
        summary: 'Change password',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object' } } },
        },
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/profile/sessions': {
      get: {
        tags: ['Profile'],
        summary: 'List my sessions',
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/profile/sessions/revoke-others': {
      post: {
        tags: ['Profile'],
        summary: 'Revoke other sessions',
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/profile/sessions/{sessionId}/revoke': {
      post: {
        tags: ['Profile'],
        summary: 'Revoke session',
        parameters: [{ name: 'sessionId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/{plantId}/assets': {
      get: {
        tags: ['Assets'],
        summary: 'List assets',
        parameters: [{ name: 'plantId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'OK' } },
      },
      post: {
        tags: ['Assets'],
        summary: 'Create asset',
        parameters: [{ name: 'plantId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
        responses: { '201': { description: 'Created' } },
      },
    },
    '/api/{plantId}/assets/{id}': {
      get: {
        tags: ['Assets'],
        summary: 'Get asset detail',
        parameters: [
          { name: 'plantId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: { '200': { description: 'OK' }, '404': { description: 'Not Found' } },
      },
      put: {
        tags: ['Assets'],
        summary: 'Update asset',
        parameters: [
          { name: 'plantId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
        responses: { '200': { description: 'OK' } },
      },
      delete: {
        tags: ['Assets'],
        summary: 'Delete asset',
        parameters: [
          { name: 'plantId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/{plantId}/spareparts': {
      get: {
        tags: ['SpareParts'],
        summary: 'List spare parts',
        parameters: [{ name: 'plantId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'OK' } },
      },
      post: {
        tags: ['SpareParts'],
        summary: 'Create spare part',
        parameters: [{ name: 'plantId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
        responses: { '201': { description: 'Created' } },
      },
    },
    '/api/{plantId}/spareparts/forecast': {
      get: {
        tags: ['SpareParts'],
        summary: 'Spare parts forecast',
        parameters: [{ name: 'plantId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/{plantId}/spareparts/{spare_part_id}': {
      get: {
        tags: ['SpareParts'],
        summary: 'Get spare part',
        parameters: [
          { name: 'plantId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'spare_part_id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: { '200': { description: 'OK' } },
      },
      patch: {
        tags: ['SpareParts'],
        summary: 'Update spare part',
        parameters: [
          { name: 'plantId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'spare_part_id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
        responses: { '200': { description: 'OK' } },
      },
      delete: {
        tags: ['SpareParts'],
        summary: 'Delete spare part',
        parameters: [
          { name: 'plantId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'spare_part_id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/{plantId}/stock-movements': {
      post: {
        tags: ['Stock'],
        summary: 'Create stock movement',
        parameters: [{ name: 'plantId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
        responses: { '201': { description: 'Created' } },
      },
    },
    '/api/{plantId}/stock-movements/plant/{plant_id}': {
      get: {
        tags: ['Stock'],
        summary: 'List stock movements by plant',
        parameters: [
          { name: 'plantId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'plant_id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/{plantId}/suppliers': {
      get: {
        tags: ['Suppliers'],
        summary: 'List suppliers',
        parameters: [{ name: 'plantId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'OK' } },
      },
      post: {
        tags: ['Suppliers'],
        summary: 'Create supplier',
        parameters: [{ name: 'plantId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
        responses: { '201': { description: 'Created' } },
      },
    },
    '/api/{plantId}/suppliers/{supplier_id}': {
      get: {
        tags: ['Suppliers'],
        summary: 'Get supplier',
        parameters: [
          { name: 'plantId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'supplier_id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: { '200': { description: 'OK' } },
      },
      patch: {
        tags: ['Suppliers'],
        summary: 'Update supplier',
        parameters: [
          { name: 'plantId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'supplier_id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
        responses: { '200': { description: 'OK' } },
      },
      delete: {
        tags: ['Suppliers'],
        summary: 'Delete supplier',
        parameters: [
          { name: 'plantId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'supplier_id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/maintenance-kits': {
      get: {
        tags: ['Kits'],
        summary: 'List maintenance kits',
        responses: { '200': { description: 'OK' } },
      },
      post: {
        tags: ['Kits'],
        summary: 'Create maintenance kit',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
        responses: { '201': { description: 'Created' } },
      },
    },
    '/api/maintenance-kits/{kitId}': {
      get: {
        tags: ['Kits'],
        summary: 'Get maintenance kit',
        parameters: [{ name: 'kitId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'OK' } },
      },
      patch: {
        tags: ['Kits'],
        summary: 'Update maintenance kit',
        parameters: [{ name: 'kitId', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/maintenance-kits/{kitId}/items': {
      get: {
        tags: ['Kits'],
        summary: 'List maintenance kit items',
        parameters: [{ name: 'kitId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'OK' } },
      },
      put: {
        tags: ['Kits'],
        summary: 'Upsert maintenance kit items',
        parameters: [{ name: 'kitId', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'array', items: { type: 'object' } } } } },
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/plants/{plantId}/tickets': {
      get: {
        tags: ['Tickets'],
        summary: 'List plant tickets',
        parameters: [{ name: 'plantId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'OK' } },
      },
      post: {
        tags: ['Tickets'],
        summary: 'Create plant ticket',
        parameters: [{ name: 'plantId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/TicketCreateRequest' } } } },
        responses: { '201': { description: 'Created' } },
      },
    },
    '/api/plants/{plantId}/tickets/{ticketId}': {
      get: {
        tags: ['Tickets'],
        summary: 'Get plant ticket',
        parameters: [
          { name: 'plantId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'ticketId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/plants/{plantId}/tickets/{ticketId}/comments': {
      post: {
        tags: ['Tickets'],
        summary: 'Add plant ticket comment',
        parameters: [
          { name: 'plantId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'ticketId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/TicketCommentRequest' } } } },
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/plants/{plantId}/tickets/{ticketId}/status': {
      patch: {
        tags: ['Tickets'],
        summary: 'Update plant ticket status',
        parameters: [
          { name: 'plantId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'ticketId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/TicketStatusRequest' } } } },
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/tickets/company': {
      get: {
        tags: ['Tickets'],
        summary: 'List company tickets',
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/tickets/company/{ticketId}': {
      get: {
        tags: ['Tickets'],
        summary: 'Get company ticket',
        parameters: [{ name: 'ticketId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'OK' } },
      },
      patch: {
        tags: ['Tickets'],
        summary: 'Update company ticket',
        parameters: [{ name: 'ticketId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/notifications': {
      get: {
        tags: ['Notifications'],
        summary: 'List notifications',
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/{plantId}/planner': {
      get: {
        tags: ['Planner'],
        summary: 'Get planner overview',
        parameters: [{ name: 'plantId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/search': {
      get: {
        tags: ['Search'],
        summary: 'Search across assets/work orders',
        parameters: [{ name: 'q', in: 'query', required: false, schema: { type: 'string' } }],
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/dashboard/metrics': {
      get: {
        tags: ['Dashboard'],
        summary: 'Get dashboard metrics',
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/{plantId}/stocktakes': {
      get: {
        tags: ['Stocktake'],
        summary: 'List stocktakes',
        parameters: [{ name: 'plantId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'OK' } },
      },
      post: {
        tags: ['Stocktake'],
        summary: 'Create stocktake',
        parameters: [{ name: 'plantId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
        responses: { '201': { description: 'Created' } },
      },
    },
    '/api/setup/initialize': {
      post: {
        tags: ['Setup'],
        summary: 'Initialize an empty database with the first admin user',
        security: [],
        responses: {
          '200': { description: 'OK' },
          '400': { description: 'Already initialized' },
          '500': { description: 'Error' },
        },
      },
    },
  },
};

router.get('/openapi.json', (_req, res) => {
  res.json(openapi);
});

router.use('/docs', swaggerUi.serve);
router.get('/docs', swaggerUi.setup(openapi, { explorer: true }));

export default router;
