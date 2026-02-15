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
    { name: 'Jobs' },
    { name: 'Customization' },
    { name: 'Setup' },
    { name: 'Admin' },
    { name: 'SuperAdmin' },
    { name: 'Debug' },
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
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: { type: 'string', example: 'Invalid input' },
          details: { type: 'array', items: { type: 'object' }, nullable: true },
          requestId: { type: 'string', nullable: true },
        },
        required: ['success', 'error'],
      },
      SuccessEnvelope: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: {},
        },
        required: ['success'],
      },
      PagedEnvelope: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: { type: 'array', items: {} },
          total: { type: 'integer', example: 120 },
          limit: { type: 'integer', example: 50, nullable: true },
          offset: { type: 'integer', example: 0, nullable: true },
        },
        required: ['success', 'data'],
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
    parameters: {
      QueryParam: {
        name: 'q',
        in: 'query',
        required: false,
        schema: { type: 'string' },
        description: 'Pesquisa por titulo/descricao.',
      },
      StatusParam: {
        name: 'status',
        in: 'query',
        required: false,
        schema: { type: 'string' },
      },
      LimitParam: {
        name: 'limit',
        in: 'query',
        required: false,
        schema: { type: 'integer', minimum: 1, maximum: 200 },
      },
      OffsetParam: {
        name: 'offset',
        in: 'query',
        required: false,
        schema: { type: 'integer', minimum: 0 },
      },
      SortParam: {
        name: 'sort',
        in: 'query',
        required: false,
        schema: { type: 'string' },
        description: 'Campo de ordenacao (quando suportado).',
      },
      OrderParam: {
        name: 'order',
        in: 'query',
        required: false,
        schema: { type: 'string', enum: ['asc', 'desc'] },
        description: 'Direcao de ordenacao (quando suportado).',
      },
    },
    responses: {
      ErrorResponse: {
        description: 'Erro',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
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
          '200': {
            description: 'OK',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/PagedEnvelope' } } },
          },
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
          { name: 'asset_id', in: 'query', required: false, schema: { type: 'string', format: 'uuid' } },
          { name: 'plan_id', in: 'query', required: false, schema: { type: 'string', format: 'uuid' } },
          { $ref: '#/components/parameters/StatusParam' },
        ],
        responses: {
          '200': {
            description: 'OK',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/PagedEnvelope' } } },
          },
        },
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
    '/api/{plantId}/preventive-schedules/upcoming': {
      get: {
        tags: ['Preventive'],
        summary: 'List upcoming preventive schedules (dashboard)',
        parameters: [
          { name: 'plantId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          { $ref: '#/components/parameters/LimitParam' },
        ],
        responses: {
          '200': {
            description: 'OK',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/PagedEnvelope' } } },
          },
        },
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
        responses: {
          '200': {
            description: 'OK',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/PagedEnvelope' } } },
          },
        },
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
        responses: {
          '200': {
            description: 'OK',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/PagedEnvelope' } } },
          },
        },
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
        responses: {
          '200': {
            description: 'OK',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/PagedEnvelope' } } },
          },
        },
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
        responses: {
          '200': {
            description: 'OK',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/PagedEnvelope' } } },
          },
        },
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
        responses: {
          '200': {
            description: 'OK',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/PagedEnvelope' } } },
          },
        },
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
        responses: {
          '200': {
            description: 'OK',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/PagedEnvelope' } } },
          },
        },
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
        parameters: [
          { name: 'plantId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          { $ref: '#/components/parameters/QueryParam' },
          { $ref: '#/components/parameters/StatusParam' },
          { $ref: '#/components/parameters/LimitParam' },
          { $ref: '#/components/parameters/OffsetParam' },
          { $ref: '#/components/parameters/SortParam' },
          { $ref: '#/components/parameters/OrderParam' },
        ],
        responses: {
          '200': {
            description: 'OK',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/PagedEnvelope' } } },
          },
        },
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
        parameters: [
          { $ref: '#/components/parameters/QueryParam' },
          { $ref: '#/components/parameters/StatusParam' },
          { $ref: '#/components/parameters/LimitParam' },
          { $ref: '#/components/parameters/OffsetParam' },
          { $ref: '#/components/parameters/SortParam' },
          { $ref: '#/components/parameters/OrderParam' },
        ],
        responses: {
          '200': {
            description: 'OK',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/PagedEnvelope' } } },
          },
        },
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
        responses: {
          '200': {
            description: 'OK',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/PagedEnvelope' } } },
          },
        },
      },
    },
    '/api/plants': {
      get: {
        tags: ['Admin'],
        summary: 'List user plants',
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
        parameters: [
          { name: 'plantId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          { $ref: '#/components/parameters/StatusParam' },
        ],
        responses: {
          '200': {
            description: 'OK',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/PagedEnvelope' } } },
          },
        },
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
    '/api/setup/bootstrap': {
      post: {
        tags: ['Setup'],
        summary: 'Bootstrap database (migrations + seed demo data)',
        security: [],
        responses: {
          '200': { description: 'OK' },
          '400': { description: 'Already initialized' },
          '500': { description: 'Error' },
        },
      },
    },
    '/api/setup/status': {
      get: {
        tags: ['Setup'],
        summary: 'Check database status',
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/setup/seed': {
      post: {
        tags: ['Setup'],
        summary: 'Seed demo data',
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/setup/migrate': {
      post: {
        tags: ['Setup'],
        summary: 'Run SQL migrations',
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/setup/migrations/status': {
      get: {
        tags: ['Setup'],
        summary: 'Get SQL migrations status',
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/setup/patch/work-orders': {
      post: {
        tags: ['Setup'],
        summary: 'Patch work orders schema (work_performed)',
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/setup/patch/work-orders-downtime-rca': {
      post: {
        tags: ['Setup'],
        summary: 'Patch work orders downtime/RCA fields',
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/setup/patch/work-orders-sla-pause': {
      post: {
        tags: ['Setup'],
        summary: 'Patch work orders SLA pause fields',
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/setup/patch/all': {
      post: {
        tags: ['Setup'],
        summary: 'Apply all corrections and migrations',
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/setup/patch/rbac': {
      post: {
        tags: ['Setup'],
        summary: 'Patch RBAC structure + seed',
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/setup/patch/maintenance-plans-tolerance-mode': {
      post: {
        tags: ['Setup'],
        summary: 'Patch maintenance plans tolerance mode',
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/setup/patch/maintenance-plans-schedule-anchor-mode': {
      post: {
        tags: ['Setup'],
        summary: 'Patch maintenance plans schedule anchor mode',
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/setup/patch/stock-reservations': {
      post: {
        tags: ['Setup'],
        summary: 'Patch stock reservations table',
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/setup/patch/maintenance-kits': {
      post: {
        tags: ['Setup'],
        summary: 'Patch maintenance kits tables',
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/setup/clear': {
      post: {
        tags: ['Setup'],
        summary: 'Clear all data (dangerous)',
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/debug/me': {
      get: {
        tags: ['Debug'],
        summary: 'Inspect authenticated token claims',
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/jobs/stats': {
      get: {
        tags: ['Jobs'],
        summary: 'Get job queue stats',
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/jobs/{queue}/recent': {
      get: {
        tags: ['Jobs'],
        summary: 'List recent jobs for queue',
        parameters: [{ name: 'queue', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'OK' }, '404': { description: 'Not Found' } },
      },
    },
    '/api/jobs/{queue}/{id}': {
      get: {
        tags: ['Jobs'],
        summary: 'Get job details by id',
        parameters: [
          { name: 'queue', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: { '200': { description: 'OK' }, '404': { description: 'Not Found' } },
      },
    },
    '/api/jobs/enqueue': {
      post: {
        tags: ['Jobs'],
        summary: 'Enqueue a new job',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  queue: { type: 'string' },
                  jobName: { type: 'string' },
                  payload: { type: 'object' },
                  delayMs: { type: 'number' },
                },
                required: ['queue', 'jobName'],
              },
            },
          },
        },
        responses: { '201': { description: 'Created' }, '400': { description: 'Bad Request' } },
      },
    },
    '/api/customization/reports': {
      get: {
        tags: ['Customization'],
        summary: 'List scheduled reports',
        responses: { '200': { description: 'OK' } },
      },
      post: {
        tags: ['Customization'],
        summary: 'Create scheduled report',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
        responses: { '201': { description: 'Created' } },
      },
    },
    '/api/customization/reports/{reportId}': {
      patch: {
        tags: ['Customization'],
        summary: 'Update scheduled report',
        parameters: [{ name: 'reportId', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
        responses: { '200': { description: 'OK' } },
      },
      delete: {
        tags: ['Customization'],
        summary: 'Delete scheduled report',
        parameters: [{ name: 'reportId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/admin/plants': {
      get: {
        tags: ['Admin'],
        summary: 'List plants',
        responses: { '200': { description: 'OK' } },
      },
      post: {
        tags: ['Admin'],
        summary: 'Create plant',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
        responses: { '201': { description: 'Created' } },
      },
    },
    '/api/admin/plants/{plantId}': {
      patch: {
        tags: ['Admin'],
        summary: 'Update plant',
        parameters: [{ name: 'plantId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
        responses: { '200': { description: 'OK' } },
      },
      delete: {
        tags: ['Admin'],
        summary: 'Deactivate plant',
        parameters: [{ name: 'plantId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/admin/security-policy': {
      get: {
        tags: ['Admin'],
        summary: 'Get tenant security policy',
        responses: { '200': { description: 'OK' } },
      },
      patch: {
        tags: ['Admin'],
        summary: 'Update tenant security policy',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/admin/users': {
      get: {
        tags: ['Admin'],
        summary: 'List users',
        responses: { '200': { description: 'OK' } },
      },
      post: {
        tags: ['Admin'],
        summary: 'Create user',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
        responses: { '201': { description: 'Created' } },
      },
    },
    '/api/admin/users/{userId}': {
      patch: {
        tags: ['Admin'],
        summary: 'Update user',
        parameters: [{ name: 'userId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/admin/users/{userId}/reset-password': {
      post: {
        tags: ['Admin'],
        summary: 'Reset user password',
        parameters: [{ name: 'userId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/admin/roles': {
      get: {
        tags: ['Admin'],
        summary: 'List roles',
        responses: { '200': { description: 'OK' } },
      },
      post: {
        tags: ['Admin'],
        summary: 'Create role',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
        responses: { '201': { description: 'Created' } },
      },
    },
    '/api/admin/roles/{roleKey}': {
      patch: {
        tags: ['Admin'],
        summary: 'Update role',
        parameters: [{ name: 'roleKey', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/admin/permissions': {
      get: {
        tags: ['Admin'],
        summary: 'List permissions',
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/admin/roles/export.csv': {
      get: {
        tags: ['Admin'],
        summary: 'Export RBAC matrix (CSV)',
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/admin/roles/{roleKey}/permissions': {
      get: {
        tags: ['Admin'],
        summary: 'Get role permissions',
        parameters: [{ name: 'roleKey', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'OK' } },
      },
      put: {
        tags: ['Admin'],
        summary: 'Set role permissions',
        parameters: [{ name: 'roleKey', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/admin/role-homes': {
      get: {
        tags: ['Admin'],
        summary: 'List role home pages',
        responses: { '200': { description: 'OK' } },
      },
      put: {
        tags: ['Admin'],
        summary: 'Update role home pages',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/admin/sla-rules': {
      get: {
        tags: ['Admin'],
        summary: 'List SLA rules',
        responses: { '200': { description: 'OK' } },
      },
      post: {
        tags: ['Admin'],
        summary: 'Upsert SLA rule',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
        responses: { '201': { description: 'Created' } },
      },
    },
    '/api/admin/sla-rules/{ruleId}': {
      delete: {
        tags: ['Admin'],
        summary: 'Deactivate SLA rule',
        parameters: [{ name: 'ruleId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/superadmin/tenants': {
      get: {
        tags: ['SuperAdmin'],
        summary: 'List tenants',
        responses: { '200': { description: 'OK' } },
      },
      post: {
        tags: ['SuperAdmin'],
        summary: 'Create tenant',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
        responses: { '201': { description: 'Created' } },
      },
    },
    '/api/superadmin/tenants/{tenantId}': {
      patch: {
        tags: ['SuperAdmin'],
        summary: 'Update tenant',
        parameters: [{ name: 'tenantId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/superadmin/metrics/dashboard': {
      get: {
        tags: ['SuperAdmin'],
        summary: 'Get dashboard metrics',
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/superadmin/metrics/tenants': {
      get: {
        tags: ['SuperAdmin'],
        summary: 'List tenant metrics',
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/superadmin/metrics/tenants/export': {
      get: {
        tags: ['SuperAdmin'],
        summary: 'Export tenant metrics',
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/superadmin/metrics/activity/tenants': {
      get: {
        tags: ['SuperAdmin'],
        summary: 'Get tenant activity metrics',
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/superadmin/metrics/activity/tenants/export': {
      get: {
        tags: ['SuperAdmin'],
        summary: 'Export tenant activity metrics',
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/superadmin/metrics/plants': {
      get: {
        tags: ['SuperAdmin'],
        summary: 'List plant metrics',
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/superadmin/metrics/plants/export': {
      get: {
        tags: ['SuperAdmin'],
        summary: 'Export plant metrics',
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/superadmin/metrics/users/anomalies': {
      get: {
        tags: ['SuperAdmin'],
        summary: 'Get user anomalies',
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/superadmin/metrics/users/security': {
      get: {
        tags: ['SuperAdmin'],
        summary: 'Get user security insights',
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/superadmin/metrics/users/security/export': {
      get: {
        tags: ['SuperAdmin'],
        summary: 'Export user security insights',
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/superadmin/metrics/rbac/drift': {
      get: {
        tags: ['SuperAdmin'],
        summary: 'Get RBAC drift metrics',
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/superadmin/metrics/rbac/drift/export': {
      get: {
        tags: ['SuperAdmin'],
        summary: 'Export RBAC drift metrics',
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/superadmin/db/status': {
      get: {
        tags: ['SuperAdmin'],
        summary: 'Get database status',
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/superadmin/health': {
      get: {
        tags: ['SuperAdmin'],
        summary: 'Get health status',
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/superadmin/diagnostics/tenants': {
      get: {
        tags: ['SuperAdmin'],
        summary: 'Get tenant diagnostics',
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/superadmin/diagnostics/tenants/healthscore': {
      get: {
        tags: ['SuperAdmin'],
        summary: 'Get tenants health score',
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/superadmin/diagnostics/tenants/healthscore/export': {
      get: {
        tags: ['SuperAdmin'],
        summary: 'Export tenants health score',
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/superadmin/diagnostics/bundle/export': {
      get: {
        tags: ['SuperAdmin'],
        summary: 'Export diagnostics bundle',
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/superadmin/diagnostics/integrity': {
      get: {
        tags: ['SuperAdmin'],
        summary: 'Get integrity checks',
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/superadmin/diagnostics/integrity/export': {
      get: {
        tags: ['SuperAdmin'],
        summary: 'Export integrity checks',
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/superadmin/audit': {
      get: {
        tags: ['SuperAdmin'],
        summary: 'List superadmin audit logs',
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/superadmin/audit/export': {
      get: {
        tags: ['SuperAdmin'],
        summary: 'Export superadmin audit logs',
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/superadmin/audit/purge': {
      post: {
        tags: ['SuperAdmin'],
        summary: 'Purge superadmin audit logs',
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/superadmin/users/search': {
      get: {
        tags: ['SuperAdmin'],
        summary: 'Search users',
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/superadmin/users/{userId}/reset-password': {
      post: {
        tags: ['SuperAdmin'],
        summary: 'Reset user password',
        parameters: [{ name: 'userId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/superadmin/tickets': {
      get: {
        tags: ['SuperAdmin'],
        summary: 'List support tickets',
        parameters: [
          { $ref: '#/components/parameters/QueryParam' },
          { $ref: '#/components/parameters/StatusParam' },
          { $ref: '#/components/parameters/LimitParam' },
          { $ref: '#/components/parameters/OffsetParam' },
          { $ref: '#/components/parameters/SortParam' },
          { $ref: '#/components/parameters/OrderParam' },
        ],
        responses: {
          '200': {
            description: 'OK',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/PagedEnvelope' } } },
          },
        },
      },
    },
    '/api/superadmin/tickets/{ticketId}': {
      get: {
        tags: ['SuperAdmin'],
        summary: 'Get support ticket',
        parameters: [{ name: 'ticketId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'OK' } },
      },
      patch: {
        tags: ['SuperAdmin'],
        summary: 'Update support ticket',
        parameters: [{ name: 'ticketId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/superadmin/tickets/{ticketId}/comments': {
      post: {
        tags: ['SuperAdmin'],
        summary: 'Add support ticket comment',
        parameters: [{ name: 'ticketId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/superadmin/tickets/{ticketId}/attachments': {
      get: {
        tags: ['SuperAdmin'],
        summary: 'List support ticket attachments',
        parameters: [{ name: 'ticketId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'OK' } },
      },
      post: {
        tags: ['SuperAdmin'],
        summary: 'Upload support ticket attachment',
        parameters: [{ name: 'ticketId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: { file: { type: 'string', format: 'binary' } },
              },
            },
          },
        },
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/superadmin/tickets/suggestions': {
      get: {
        tags: ['SuperAdmin'],
        summary: 'List ticket suggestions',
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/superadmin/tickets/suggestions/{key}/create': {
      post: {
        tags: ['SuperAdmin'],
        summary: 'Create ticket from suggestion',
        parameters: [{ name: 'key', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/superadmin/db/runs/export': {
      get: {
        tags: ['SuperAdmin'],
        summary: 'Export setup runs',
        responses: { '200': { description: 'OK' } },
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
