import winston from 'winston';
import path from 'path';

// Define log levels
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each log level
const logColors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

// Add colors to winston
winston.addColors(logColors);

// Create log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`
  )
);

// Create file format (without colors)
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.json()
);

// Define transports
const transports = [
  // Console transport
  new winston.transports.Console({
    format: logFormat,
    level: process.env.NODE_ENV === 'production' ? 'warn' : 'debug',
  }),
  
  // Error log file
  new winston.transports.File({
    filename: path.join(__dirname, '../../logs/error.log'),
    level: 'error',
    format: fileFormat,
    maxsize: 5242880, // 5MB
    maxFiles: 5,
  }),
  
  // Combined log file
  new winston.transports.File({
    filename: path.join(__dirname, '../../logs/combined.log'),
    format: fileFormat,
    maxsize: 5242880, // 5MB
    maxFiles: 5,
  }),
];

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels: logLevels,
  transports,
  exitOnError: false,
});

// Create logs directory if it doesn't exist
import fs from 'fs';
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Enhanced logging functions with context
export const logError = (message: string, error?: any, context?: any) => {
  const logData = {
    message,
    error: error ? {
      name: error.name,
      message: error.message,
      stack: error.stack,
    } : undefined,
    context,
    timestamp: new Date().toISOString(),
  };
  logger.error(JSON.stringify(logData));
};

export const logWarn = (message: string, context?: any) => {
  logger.warn(JSON.stringify({ message, context, timestamp: new Date().toISOString() }));
};

export const logInfo = (message: string, context?: any) => {
  logger.info(JSON.stringify({ message, context, timestamp: new Date().toISOString() }));
};

export const logHttp = (message: string, context?: any) => {
  logger.http(JSON.stringify({ message, context, timestamp: new Date().toISOString() }));
};

export const logDebug = (message: string, context?: any) => {
  logger.debug(JSON.stringify({ message, context, timestamp: new Date().toISOString() }));
};

// Request logging middleware
export const requestLogger = (req: any, res: any, next: any) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      userId: req.admin?.id || req.user?.id,
    };
    
    if (res.statusCode >= 400) {
      logError(`HTTP ${res.statusCode} - ${req.method} ${req.url}`, null, logData);
    } else {
      logHttp(`${req.method} ${req.url} - ${res.statusCode}`, logData);
    }
  });
  
  next();
};

// Database operation logger
export const logDatabaseOperation = (operation: string, table: string, duration?: number, error?: any) => {
  const logData = {
    operation,
    table,
    duration: duration ? `${duration}ms` : undefined,
    timestamp: new Date().toISOString(),
  };
  
  if (error) {
    logError(`Database operation failed: ${operation} on ${table}`, error, logData);
  } else {
    logDebug(`Database operation: ${operation} on ${table}`, logData);
  }
};

// Security event logger
export const logSecurityEvent = (event: string, details: any, severity: 'low' | 'medium' | 'high' = 'medium') => {
  const logData = {
    event,
    severity,
    details,
    timestamp: new Date().toISOString(),
  };
  
  if (severity === 'high') {
    logError(`SECURITY ALERT: ${event}`, null, logData);
  } else if (severity === 'medium') {
    logWarn(`Security event: ${event}`, logData);
  } else {
    logInfo(`Security event: ${event}`, logData);
  }
};

// Performance logger
export const logPerformance = (operation: string, duration: number, threshold: number = 1000) => {
  const logData = {
    operation,
    duration: `${duration}ms`,
    threshold: `${threshold}ms`,
    timestamp: new Date().toISOString(),
  };
  
  if (duration > threshold) {
    logWarn(`Slow operation detected: ${operation}`, logData);
  } else {
    logDebug(`Performance: ${operation}`, logData);
  }
};

export default logger; 