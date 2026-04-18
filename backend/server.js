import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import connectDB from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import realtimeRoutes from './routes/realtimeRoutes.js';
import { generalLimiter } from './middleware/rateLimiter.js';
import { testCloudinaryConnection } from './config/cloudinary.js';

// Load environment variables
dotenv.config();

// Validate required environment variables
const requiredEnvVars = [
  'JWT_SECRET',
  'MONGO_URI',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
const isProduction = process.env.NODE_ENV === 'production';

if (missingEnvVars.length > 0) {
  console.error('🚨 Missing required environment variables:', missingEnvVars.join(', '));
  process.exit(1);
}

// Validate JWT_SECRET strength
if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
  console.error('🚨 JWT_SECRET is too weak! Must be at least 32 characters.');
  console.error('💡 Generate a secure JWT secret with:');
  console.error('   node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"');
  process.exit(1);
}

if (isProduction) {
  // Keep production logs minimal and deterministic: disable ad-hoc console output.
  console.log = () => {};
  console.info = () => {};
  console.warn = () => {};
  console.error = () => {};
  console.debug = () => {};
}

const app = express();
app.set('trust proxy', 1);

if (isProduction) {
  // Only request connection logs in production.
  app.use((req, res, next) => {
    process.stdout.write(
      `[REQ] ${new Date().toISOString()} ${req.ip} ${req.method} ${req.originalUrl}\n`
    );
    next();
  });
}

// --- Security headers ---
app.use((req, res, next) => {
  res.header('X-Content-Type-Options', 'nosniff');
  res.header('X-Frame-Options', 'DENY');
  res.header('X-XSS-Protection', '1; mode=block');
  res.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.header(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src '*'"
  );
  res.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.header('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  next();
});

// --- CORS ---
const allowedOrigins = [
  process.env.FRONTEND_URL
].filter(Boolean);

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('Blocked by CORS:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

// --- Body parsing ---
app.use(
  express.json({
    limit: '10mb',
    verify: (req, res, buf, encoding) => {
      try {
        JSON.parse(buf.toString(encoding));
      } catch (e) {
        const err = new Error('Invalid JSON payload');
        err.status = 400;
        throw err;
      }
    },
  })
);
app.use(
  express.urlencoded({
    extended: true,
    limit: '10mb',
    parameterLimit: 1000,
  })
);
app.use(cookieParser());

// --- Request timeout middleware ---
app.use((req, res, next) => {
  const isUploadEndpoint = req.path.startsWith('/api/reports/upload');
  const timeoutMs = isUploadEndpoint ? 180000 : 30000; // 3 min for uploads, 30s default
  req.setTimeout(timeoutMs);
  res.setTimeout(timeoutMs);
  next();
});

// --- General rate limiter for all routes ---
app.use('/api/', generalLimiter);

// --- Health check endpoint ---
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development',
  });
});

// --- API Routes ---
app.use('/api/auth', authRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/events', realtimeRoutes);

// --- 404 Handler ---
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl,
  });
});

// --- Centralized error handler ---
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors,
    });
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return res.status(400).json({
      success: false,
      message: `${field} already exists`,
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token',
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired',
    });
  }

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// --- Start server after DB connection ---
const PORT = process.env.PORT || 5000;

(async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`🔧 Email test mode: ${process.env.EMAIL_TEST_MODE === 'true' ? 'ENABLED' : 'DISABLED'}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔓 Allowed Origins: ${allowedOrigins.join(', ')}`);
    });
  } catch (err) {
    console.error('❌ Failed to connect to database', err);
    process.exit(1);
  }
})();

// Test Cloudinary connection
testCloudinaryConnection();