import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import session from 'express-session';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './config/swagger';
import { errorHandler } from './middleware/errorHandler';
import { optionalAuth, requireAuth, requireAdmin, AuthenticatedRequest } from './middleware/auth';
import routes from './routes';
import authRoutes from './routes/auth';
import extractionRoutes from './routes/extractions';
import usersRoutes from './routes/users';
import organizationsRoutes from './routes/organizations';
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

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-here',
  resave: false,
  saveUninitialized: false,
  rolling: true, // Reset expiration on activity
  cookie: {
    secure: false, // Set to true in production with HTTPS
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
    sameSite: 'lax' // Improve cookie security while maintaining functionality
  }
}));

// Add user data to all requests for templates
app.use((req, res, next) => {
  res.locals.user = (req as any).session?.user || null;
  next();
});

// Homepage route with dynamic data
app.get('/', optionalAuth, async (req, res) => {
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
      stats,
      user: (req as any).user || null
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
      stats,
      user: (req as any).user || null
    });
  }
});

app.get('/extractions', requireAuth as any, async (req: any, res) => {
  try {
    const userId = (req as any).user?.id;
    const userRole = (req as any).user?.role;

    // Build filter based on user role
    let filter;
    if (userRole === 'admin' || userRole === 'superadmin') {
      // Admins and superadmins can see all extractions
      filter = {};
    } else {
      // Regular users see their own extractions and ones shared with them
      filter = {
        $or: [
          { userId: userId },
          { sharedWith: userId }
        ]
      };
    }

    // Fetch extractions with populated user data for author display
    const extractions = await Extraction.find(filter)
      .populate('userId', 'email role')
      .populate('sharedWith', 'email role')
      .select('_id summary createdAt fileName status userId sharedWith')
      .sort({ createdAt: -1 }) // Most recent first
      .lean();

    // Add permission flags for each extraction
    const extractionsWithPermissions = extractions.map(extraction => {
      const isOwner = extraction.userId._id.toString() === userId;
      const isShared = extraction.sharedWith && extraction.sharedWith.some((user: any) => user._id.toString() === userId);
      
      return {
        ...extraction,
        isOwner,
        isShared,
        canShare: isOwner || userRole === 'admin' || userRole === 'superadmin'
      };
    });

    res.render('layout', {
      title: 'Extractions',
      page: 'extractions',
      extractions: extractionsWithPermissions,
      user: (req as any).user || null
    });
  } catch (error) {
    console.error('Error fetching extractions:', error);
    res.status(500).render('layout', {
      title: 'Error',
      page: 'error',
      message: 'Failed to load extractions',
      error: { status: 500 },
      user: (req as any).user || null
    });
  }
});

app.get('/extraction/:id', requireAuth as any, async (req: any, res) => {
  try {
    const userId = (req as any).user?.id;
    const userRole = (req as any).user?.role;
    
    if (!userId) {
      return res.status(401).render('layout', {
        title: 'Authentication Required',
        page: 'error',
        message: 'You must be logged in to view this extraction.',
        error: { status: 401 },
        user: null
      });
    }

    // Superadmins can access any extraction without restrictions
    let extraction;
    if (userRole === 'superadmin') {
      extraction = await Extraction.findById(req.params.id)
        .populate('userId', 'email role')
        .populate('sharedWith', 'email role')
        .lean();
    } else {
      // Build filter to check access permissions for non-superadmins
      let filter;
      if (userRole === 'admin') {
        // Admins can access any extraction
        filter = { _id: req.params.id };
      } else {
        // Regular users can only access their own extractions or ones shared with them
        filter = {
          _id: req.params.id,
          $or: [
            { userId: userId },
            { sharedWith: userId }
          ]
        };
      }

      // Fetch extraction with populated user data
      extraction = await Extraction.findOne(filter)
        .populate('userId', 'email role')
        .populate('sharedWith', 'email role')
        .lean();
    }
    
    if (!extraction) {
      return res.status(404).render('layout', {
        title: 'Extraction Not Found',
        page: 'error',
        message: `The extraction with ID "${req.params.id}" was not found or you don't have permission to access it.`,
        error: { status: 404 },
        user: (req as any).user || null
      });
    }

    // Add permission flags for the template
    const isOwner = extraction.userId._id.toString() === userId;
    const isShared = extraction.sharedWith && extraction.sharedWith.some((user: any) => user._id.toString() === userId);
    const canShare = isOwner || userRole === 'admin' || userRole === 'superadmin';
    const canEdit = isOwner || isShared || userRole === 'admin' || userRole === 'superadmin';

    res.render('layout', {
      title: 'Extraction Details',
      page: 'extraction',
      extraction,
      isOwner,
      isShared,
      canShare,
      canEdit,
      user: (req as any).user || null
    });
  } catch (error) {
    console.error('Error fetching extraction:', error);
    res.status(500).render('layout', {
      title: 'Error',
      page: 'error',
      message: 'Failed to load extraction details',
      error: { status: 500 },
      user: (req as any).user || null
    });
  }
});

// Users management route (admin and superadmin only)
app.get('/users', requireAuth as any, async (req: any, res) => {
  // Check if user is admin or superadmin
  const user = (req as any).user;
  if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
    res.status(403).render('layout', {
      title: 'Access Denied',
      page: 'error',
      message: 'Admin access required',
      error: { status: 403 },
      user: user || null
    });
    return;
  }

  res.render('layout', {
    title: 'User Management',
    page: 'users',
    user: user
  });
});

// Organizations management route (superadmin only)
app.get('/organizations', requireAuth as any, async (req: any, res) => {
  // Check if user is superadmin
  const user = (req as any).user;
  if (!user || user.role !== 'superadmin') {
    res.status(403).render('layout', {
      title: 'Access Denied',
      page: 'error',
      message: 'Super admin access required',
      error: { status: 403 },
      user: user || null
    });
    return;
  }

  res.render('layout', {
    title: 'Organization Management',
    page: 'organizations',
    user: user
  });
});

// User profile routes (protected)
app.get('/profile', requireAuth as any, async (req: any, res) => {
  try {
    const User = (await import('./models/User')).default;
    const profileUser = await User.findById(req.user.id).select('-password');
    
    if (!profileUser) {
      return res.status(404).render('layout', { 
        title: 'User Not Found',
        page: 'error',
        message: 'The requested user profile could not be found.',
        error: { status: 404 },
        user: req.user || null
      });
    }

    res.render('layout', {
      title: 'My Profile - DocExtract',
      page: 'user-profile',
      profileUser: profileUser.toObject(),
      isOwnProfile: true,
      user: req.user
    });
  } catch (error) {
    console.error('Error loading profile:', error);
    res.status(500).render('layout', {
      title: 'Server Error',
      page: 'error',
      message: 'An error occurred while loading your profile.',
      error: { status: 500 },
      user: req.user || null
    });
  }
});

// View specific user profile (admin only)
app.get('/user/:id', requireAuth as any, requireAdmin as any, async (req: any, res) => {
  try {
    const { id } = req.params;
    const User = (await import('./models/User')).default;
    
    const profileUser = await User.findById(id).select('-password');
    
    if (!profileUser) {
      return res.status(404).render('layout', { 
        title: 'User Not Found',
        page: 'error',
        message: 'The requested user profile could not be found.',
        error: { status: 404 },
        user: req.user || null
      });
    }

    res.render('layout', {
      title: `${profileUser.email} - User Profile - DocExtract`,
      page: 'user-profile',
      profileUser: profileUser.toObject(),
      isOwnProfile: false,
      user: req.user
    });
  } catch (error) {
    console.error('Error loading user profile:', error);
    res.status(500).render('layout', {
      title: 'Server Error',
      page: 'error',
      message: 'An error occurred while loading the user profile.',
      error: { status: 500 },
      user: req.user || null
    });
  }
});

app.use('/', authRoutes); // Mount auth routes at root for web pages
app.use('/api', routes);
app.use('/api/auth', authRoutes); // Keep API routes
app.use('/api/extractions', extractionRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/organizations', organizationsRoutes);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// 404 handler for any unmatched routes
app.use((req, res) => {
  res.status(404).render('layout', {
    title: 'Page Not Found',
    page: 'error',
    message: `The page "${req.path}" was not found on this server.`,
    error: { status: 404 },
    user: (req as any).user || null
  });
});

app.use(errorHandler);

export default app; 