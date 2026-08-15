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

const migrationPath = path.resolve(__dirname, '../../supabase/migrations/20260815_student_application_lifecycle.sql');
const sql = await readFile(migrationPath, 'utf8');
const client = new pg.Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });

try {
  await client.connect();
  await client.query(sql);
  const { rows } = await client.query(`
    SELECT
      EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'room_applications' AND column_name = 'submission_step') AS submission_step_ready,
      EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'academic_profiles' AND column_name = 'siblings_json') AS biography_json_ready,
      EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'signed-applications' AND public = false) AS signed_documents_private;
  `);
  console.log(JSON.stringify(rows[0]));
} finally {
  await client.end();
}
