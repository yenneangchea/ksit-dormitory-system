import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const databaseUrl = process.env.KSIT_SUPABASE_DATABASE_URL;

if (!databaseUrl) {
  console.error('Set KSIT_SUPABASE_DATABASE_URL through a secure environment prompt before running this migration.');
  process.exit(1);
}

const migrationPath = path.resolve(__dirname, '../../supabase/migrations/20260815_google_drive_application_storage.sql');
const sql = await readFile(migrationPath, 'utf8');
const client = new pg.Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });

try {
  await client.connect();
  await client.query(sql);
  const { rows } = await client.query(`
    SELECT
      EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'room_applications' AND column_name = 'google_drive_folder_id') AS drive_folder_ready,
      EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'room_applications' AND column_name = 'signed_application_drive_url') AS signed_document_drive_ready;
  `);
  console.log(JSON.stringify(rows[0]));
} finally {
  await client.end();
}
