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
    { name: 'WorkOrders' },
    { name: 'Preventive' },
    { name: 'Alerts' },
    { name: 'Documents' },
    { name: 'Setup' },
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
