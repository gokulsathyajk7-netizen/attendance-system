import logger from '../config/logger.js';

// ===============================
// 404 Not Found
// ===============================
export const notFound = (req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.originalUrl}`,
    timestamp: new Date().toISOString(),
  });
};

// ===============================
// Global Error Handler
// ===============================
export const errorHandler = (err, req, res, next) => {
  let statusCode = err.status || 500;
  let message = err.message || 'Internal Server Error';

  // ===============================
  // MySQL Errors
  // ===============================
  if (err.code === 'ER_DUP_ENTRY') {
    statusCode = 409;
    message = 'Duplicate entry. Record already exists.';
  }

  if (err.code === 'ER_NO_REFERENCED_ROW_2') {
    statusCode = 400;
    message = 'Referenced record does not exist.';
  }

  // ===============================
  // JWT Errors
  // ===============================
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token.';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired.';
  }

  // ===============================
  // Multer Errors
  // ===============================
  if (err.code === 'LIMIT_FILE_SIZE') {
    statusCode = 400;
    message = 'File size exceeds the allowed limit.';
  }

  // ===============================
  // Validation Errors
  // ===============================
  if (Array.isArray(err.errors)) {
    statusCode = 422;
    message = 'Validation failed.';
  }

  // ===============================
  // Production Hide Errors
  // ===============================
  if (process.env.NODE_ENV === 'production' && statusCode === 500) {
    message = 'Internal Server Error';
  }

  // ===============================
  // Logging
  // ===============================
  logger.error({
    status: statusCode,
    message: err.message,
    stack: err.stack,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
  });

  // ===============================
  // Response
  // ===============================
  res.status(statusCode).json({
    success: false,
    message,
    ...(Array.isArray(err.errors) && { errors: err.errors }),
    ...(process.env.NODE_ENV !== 'production' && {
      stack: err.stack,
    }),
    timestamp: new Date().toISOString(),
  });
};