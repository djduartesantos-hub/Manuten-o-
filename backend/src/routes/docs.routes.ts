import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';

const router = Router();

const openapi = {
  openapi: '3.0.3',
  info: {
    title: 'Manuten-o CMMS API',
    version: '1.3.0-beta.2',
    description: 'API documentation (baseline). Extend paths as needed.',
  },
  servers: [{ url: '/api' }],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    '/auth/login': {
      post: {
        summary: 'Login',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  email: { type: 'string' },
                  password: { type: 'string' },
                  tenant_slug: { type: 'string' },
                },
                required: ['email', 'password'],
              },
            },
          },
        },
        responses: {
          '200': { description: 'OK' },
          '401': { description: 'Unauthorized' },
        },
      },
    },
    '/alerts/configurations': {
      get: {
        summary: 'List alert configurations',
        responses: { '200': { description: 'OK' } },
      },
      post: {
        summary: 'Create alert configuration',
        responses: { '201': { description: 'Created' } },
      },
    },
    '/alerts/documents': {
      get: { summary: 'List asset documents', responses: { '200': { description: 'OK' } } },
      post: { summary: 'Upload asset document (supports multipart or JSON)', responses: { '201': { description: 'Created' } } },
    },
    '/alerts/documents/{id}/versions': {
      get: {
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
    '/health': {
      get: { summary: 'Health check', security: [], responses: { '200': { description: 'OK' } } },
    },
  },
};

router.get('/openapi.json', (_req, res) => {
  res.json(openapi);
});

router.use('/docs', swaggerUi.serve);
router.get('/docs', swaggerUi.setup(openapi, { explorer: true }));

export default router;
