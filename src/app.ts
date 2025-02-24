import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './config/swagger';
import { errorHandler } from './middleware/errorHandler';
import routes from './routes';
import authRoutes from './routes/auth';
import extractionRoutes from './routes/extractions';

const app: Express = express();

app.use(cors());
app.use(helmet());
app.use(express.json());

app.use('/api', routes);
app.use('/api/auth', authRoutes);
app.use('/api/extractions', extractionRoutes);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use(errorHandler);

export default app; 