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
        }
      }
    }
  },
  apis: ['./src/routes/*.ts'],
};

export default swaggerJsdoc(options); 