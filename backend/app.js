require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

const app = express();
const configuredOrigins = (process.env.FRONTEND_URL || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowedOrigins = new Set([
  'http://localhost:3000',
  'https://ksit-dorm.vercel.app',
  'https://ksit-dormitory-system.vercel.app',
  ...configuredOrigins,
]);

function isAllowedOrigin(origin) {
  if (allowedOrigins.has(origin)) return true;
  // Allow previews from this application only; never reflect arbitrary Vercel sites with credentials.
  return /^https:\/\/ksit-dormitory-system-[a-z0-9-]+\.vercel\.app$/i.test(origin);
}

const corsOptions = {
  origin(origin, callback) {
    if (!origin || isAllowedOrigin(origin)) return callback(null, true);
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86_400,
  optionsSuccessStatus: 204,
};

app.options(/.*/, cors(corsOptions));
app.use(cors(corsOptions));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

if (process.env.NODE_ENV !== 'production') {
  app.use((req, _res, next) => {
    console.info(`${new Date().toISOString()} ${req.method} ${req.path}`);
    next();
  });
}

app.get('/health', (_req, res) => {
  res.json({
    success: true,
    message: 'KSIT Dormitory API is running.',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

app.get('/health-db', async (_req, res) => {
  try {
    const { getSupabase } = require('./config/supabase');
    const supabase = getSupabase();
    const { data, error, count } = await supabase.from('users').select('*', { count: 'exact' });
    res.json({
      success: !error,
      error: error ? error.message : null,
      supabaseUrlConfigured: !!process.env.SUPABASE_URL,
      userCount: count ?? data?.length,
      users: data?.map(u => ({ email: u.email, role: u.role }))
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api', require('./routes/domain.routes'));

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
