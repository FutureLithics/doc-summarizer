import { Request, Response, NextFunction } from 'express';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: 'user' | 'admin';
  };
}

export const requireAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const session = req.session as any;
  if (!session.user) {
    // For API routes, return JSON error
    if (req.path.startsWith('/api/')) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    // For web routes, redirect to login
    session.returnTo = req.originalUrl;
    return res.redirect('/login');
  }
  
  req.user = session.user;
  next();
};

export const requireGuest = (req: Request, res: Response, next: NextFunction) => {
  const session = req.session as any;
  if (session.user) {
    return res.redirect('/');
  }
  next();
};

export const optionalAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const session = req.session as any;
  if (session.user) {
    req.user = session.user;
  }
  next();
};

export const requireAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const session = req.session as any;
  if (!session.user) {
    // For API routes, return JSON error
    if (req.path.startsWith('/api/')) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    // For web routes, redirect to login
    session.returnTo = req.originalUrl;
    return res.redirect('/login');
  }
  
  if (session.user.role !== 'admin') {
    // For API routes, return JSON error
    if (req.path.startsWith('/api/')) {
      return res.status(403).json({ message: 'Admin access required' });
    }
    
    // For web routes, show error or redirect
    return res.status(403).render('layout', {
      title: 'Access Denied',
      page: 'error',
      message: 'Admin access required',
      error: { status: 403 }
    });
  }
  
  req.user = session.user;
  next();
}; 