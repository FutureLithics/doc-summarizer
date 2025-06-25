import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './config/swagger';
import { errorHandler } from './middleware/errorHandler';
import routes from './routes';
import authRoutes from './routes/auth';
import extractionRoutes from './routes/extractions';
import Extraction from './models/Extraction';

const app: Express = express();

// Configure EJS as template engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Serve static files (CSS, JS, images)
app.use(express.static(path.join(__dirname, '../public')));

app.use(cors());
app.use(helmet());
app.use(express.json());

// Homepage route with dynamic data
app.get('/', async (req, res) => {
  try {
    // Fetch extraction statistics from database
    const totalExtractions = await Extraction.countDocuments();
    const completed = await Extraction.countDocuments({ status: 'completed' });
    const processing = await Extraction.countDocuments({ status: 'processing' });
    const failed = await Extraction.countDocuments({ status: 'failed' });

    const stats = {
      totalExtractions,
      completed,
      processing,
      failed
    };

    res.render('layout', {
      title: 'Home',
      page: 'home',
      stats
    });
  } catch (error) {
    // Fallback stats if database is unavailable
    const stats = {
      totalExtractions: 0,
      completed: 0,
      processing: 0,
      failed: 0
    };

    res.render('layout', {
      title: 'Home',
      page: 'home',
      stats
    });
  }
});

app.get('/extractions', async (req, res) => {
  try {
    // Fetch extractions with only the required fields (including _id for links)
    const extractions = await Extraction.find()
      .select('_id summary createdAt fileName status')
      .sort({ createdAt: -1 }) // Most recent first
      .lean();

    res.render('layout', {
      title: 'Extractions',
      page: 'extractions',
      extractions
    });
  } catch (error) {
    console.error('Error fetching extractions:', error);
    res.status(500).render('layout', {
      title: 'Error',
      page: 'error',
      message: 'Failed to load extractions',
      error: { status: 500 }
    });
  }
});

app.get('/extraction/:id', async (req, res) => {
  try {
    const extraction = await Extraction.findById(req.params.id).lean();
    
    if (!extraction) {
      return res.status(404).render('layout', {
        title: 'Extraction Not Found',
        page: 'error',
        message: `The extraction with ID "${req.params.id}" was not found.`,
        error: { status: 404 }
      });
    }

    res.render('layout', {
      title: 'Extraction Details',
      page: 'extraction',
      extraction
    });
  } catch (error) {
    console.error('Error fetching extraction:', error);
    res.status(500).render('layout', {
      title: 'Error',
      page: 'error',
      message: 'Failed to load extraction details',
      error: { status: 500 }
    });
  }
});

app.get('/extractions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const extraction = await Extraction.findById(id);
    res.render('layout', {
      title: 'Extraction Details',
      page: 'extraction',
      extraction
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch extraction' });
  }

});

app.use('/api', routes);
app.use('/api/auth', authRoutes);
app.use('/api/extractions', extractionRoutes);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// 404 handler for any unmatched routes
app.use((req, res) => {
  res.status(404).render('layout', {
    title: 'Page Not Found',
    page: 'error',
    message: `The page "${req.path}" was not found on this server.`,
    error: { status: 404 }
  });
});

app.use(errorHandler);

export default app; 