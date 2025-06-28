import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

// Rate limiting configuration
export const createRateLimit = (windowMs: number = 15 * 60 * 1000, max: number = 100) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      error: 'Too many requests from this IP, please try again later.',
      retryAfter: Math.ceil(windowMs / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
};

// Different rate limits for different endpoints
export const authRateLimit = createRateLimit(15 * 60 * 1000, 10); // 10 attempts per 15 minutes
export const apiRateLimit = createRateLimit(15 * 60 * 1000, 500); // 500 requests per 15 minutes
export const uploadRateLimit = createRateLimit(60 * 60 * 1000, 20); // 20 uploads per hour
export const assessmentRateLimit = createRateLimit(60 * 60 * 1000, 1000); // 1000 assessment submissions per hour (for testing)

// Security headers middleware
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
});

// Input sanitization middleware
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  const sanitizeString = (str: string): string => {
    return str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
              .replace(/javascript:/gi, '')
              .replace(/on\w+\s*=/gi, '');
  };

  const sanitizeObject = (obj: any): any => {
    if (typeof obj === 'string') {
      return sanitizeString(obj);
    }
    if (typeof obj === 'object' && obj !== null) {
      const sanitized: any = Array.isArray(obj) ? [] : {};
      for (const key in obj) {
        sanitized[key] = sanitizeObject(obj[key]);
      }
      return sanitized;
    }
    return obj;
  };

  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }
  if (req.params) {
    req.params = sanitizeObject(req.params);
  }

  next();
};

// File upload validation
export const validateFileUpload = (req: Request, res: Response, next: NextFunction) => {
  if (!req.file && !req.files) {
    return next();
  }

  const allowedMimeTypes = [
    'audio/webm',
    'audio/wav',
    'audio/mp3',
    'audio/mpeg',
    'video/webm',
    'video/mp4'
  ];

  const maxFileSize = 50 * 1024 * 1024; // 50MB

  const validateFile = (file: any) => {
    if (!allowedMimeTypes.includes(file.mimetype)) {
      return res.status(400).json({ 
        error: 'Invalid file type. Only audio and video files are allowed.' 
      });
    }

    if (file.size > maxFileSize) {
      return res.status(400).json({ 
        error: 'File too large. Maximum size is 50MB.' 
      });
    }
  };

  if (req.file) {
    validateFile(req.file);
  }

  if (req.files) {
    if (Array.isArray(req.files)) {
      req.files.forEach(validateFile);
    } else {
      Object.values(req.files).forEach((fileArray: any) => {
        if (Array.isArray(fileArray)) {
          fileArray.forEach(validateFile);
        } else {
          validateFile(fileArray);
        }
      });
    }
  }

  next();
};

// Request validation schemas
export const commonSchemas = {
  uuid: z.string().uuid(),
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
  name: z.string().min(2).max(100),
  pagination: z.object({
    page: z.string().regex(/^\d+$/).transform(Number).optional(),
    limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  }),
};

// Generic validation middleware
export const validateRequest = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = schema.safeParse({
        body: req.body,
        query: req.query,
        params: req.params,
      });

      if (!result.success) {
        return res.status(400).json({
          error: 'Validation failed',
          details: result.error.format(),
        });
      }

      // Replace request data with validated data
      req.body = result.data.body || req.body;
      req.query = result.data.query || req.query;
      req.params = result.data.params || req.params;

      next();
    } catch (error) {
      res.status(400).json({ error: 'Invalid request format' });
    }
  };
};

// CORS configuration
export const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    const allowedOrigins = [
      'http://localhost:8080',
      'http://localhost:5173',
      'http://localhost:3000',
      process.env.FRONTEND_URL
    ].filter(Boolean);

    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Test-Password', 'x-test-password'],
}; 