const app = require('../server/app');

// Vercel passes requests for /api/* directly to this Express application.
// The API remains server-only, so Supabase service credentials never enter
// the browser bundle.
module.exports = app;
