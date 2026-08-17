const { createClient } = require('@supabase/supabase-js');

let client;

const createConfigurationError = (message) => {
  const error = new Error(message);
  error.statusCode = 503;
  error.code = 'SUPABASE_NOT_CONFIGURED';
  return error;
};

function getSupabase() {
  if (client) return client;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw createConfigurationError(
      'Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in backend/.env.'
    );
  }

  client = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return client;
}

function requireStorageConfiguration() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const error = createConfigurationError(
      'Supabase Storage is not configured. Set SUPABASE_SERVICE_ROLE_KEY in backend/.env.'
    );
    error.code = 'SUPABASE_STORAGE_NOT_CONFIGURED';
    throw error;
  }
  return getSupabase();
}

// Compatibility proxy: existing feature controllers can use `supabase.from(...)`,
// while newer modules can use the explicit lazy `getSupabase()` helper.
module.exports = new Proxy(
  { getSupabase, requireStorageConfiguration },
  {
    get(target, property) {
      if (property in target) return target[property];
      const value = getSupabase()[property];
      return typeof value === 'function' ? value.bind(getSupabase()) : value;
    },
  }
);
