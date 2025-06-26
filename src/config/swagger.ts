import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Express TypeScript API',
      version: '1.0.0',
      description: 'REST API with Express and TypeScript',
    },
    servers: [
      {
        url: 'http://localhost:3030/api',
        description: 'Development server',
      },
    ],
    tags: [
      {
        name: 'Auth',
        description: 'Authentication endpoints'
      },
      {
        name: 'Health',
        description: 'Health check endpoints'
      },
      {
        name: 'Users',
        description: 'User management endpoints (Admin only)'
      }
    ],
    components: {
      schemas: {
        Error: {
          type: 'object',
          properties: {
            message: {
              type: 'string'
            }
          }
        },
        User: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              description: 'User unique identifier'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address'
            },
            role: {
              type: 'string',
              enum: ['user', 'admin'],
              description: 'User role'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'User creation date'
            }
          }
        }
      },
      securitySchemes: {
        sessionAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'connect.sid',
          description: 'Session-based authentication using cookies'
        },
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Bearer token authentication (JWT)'
        }
      }
    }
  },
  apis: ['./src/routes/*.ts', './src/app.ts'],
};

export default swaggerJsdoc(options); 