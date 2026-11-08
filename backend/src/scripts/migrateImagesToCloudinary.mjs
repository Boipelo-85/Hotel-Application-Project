import { config } from 'dotenv';
import pg from 'pg';
import { createHash } from 'node:crypto';
import { readFile, stat, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
config({ path: path.join(root, '.env'), quiet: true });
const apply = process.argv.includes('--apply');
const tables = ['branch_images', 'room_images'];
const uploads = path.join(root, 'uploads');

async function main() {
  for (const key of ['DATABASE_URL', 'CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET']) {
    if (!process.env[key]?.trim()) throw new Error(`Missing ${key} in backend/.env`);
  }
  const dbUrl = new URL(process.env.DATABASE_URL);
  if (!dbUrl.hostname.endsWith('.neon.tech')) throw new Error('DATABASE_URL must point to your Neon database.');
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 15000, query_timeout: 20000 });
  try {
    const plan = [];
    let external = 0;
    await pool.query('BEGIN READ ONLY');
    try {
      for (const table of tables) {
        const { rows } = await pool.query(`SELECT id::text, image_url FROM ${table} ORDER BY id`);
        for (const row of rows) {
          let pathname = row.image_url;
          if (/^https?:\/\//i.test(pathname)) pathname = new URL(pathname).pathname;
          if (!pathname.startsWith('/uploads/')) { external++; continue; }
          const file = path.resolve(root, '.' + decodeURIComponent(pathname));
          if (!file.startsWith(uploads + path.sep)) throw new Error('Invalid upload path in database.');
          const exists = await stat(file).then(s => s.isFile()).catch(() => false);
          plan.push({ table, id: row.id, oldUrl: row.image_url, file, exists });
        }
      }
      await pool.query('COMMIT');
    } catch (error) { await pool.query('ROLLBACK'); throw error; }
    console.table(plan.map(p => ({ table: p.table, id: p.id, file: path.basename(p.file), status: p.exists ? 'READY' : 'MISSING FILE' })));
    console.log(`Ready: ${plan.filter(p => p.exists).length}. Missing: ${plan.filter(p => !p.exists).length}. Already external: ${external}.`);
    if (!apply) { console.log('Preview only: no uploads or database changes were made.'); return; }
    const backupDir = path.join(uploads, 'migration-backups');
    await mkdir(backupDir, { recursive: true });
    const backup = path.join(backupDir, `cloudinary-${Date.now()}.json`);
    await writeFile(backup, JSON.stringify(plan, null, 2), { flag: 'wx' });
    console.log('Saved original image records in backend/uploads/migration-backups.');
    for (const item of plan.filter(p => p.exists)) {
      const timestamp = String(Math.floor(Date.now() / 1000));
      const digest = createHash('sha256').update(await readFile(item.file)).digest('hex');
      const publicId = `hotel-migration/${item.table}/${item.id}-${digest.slice(0, 24)}`;
      const params = `overwrite=false&public_id=${publicId}&timestamp=${timestamp}`;
      const signature = createHash('sha256').update(params + process.env.CLOUDINARY_API_SECRET).digest('hex');
      const form = new FormData();
      form.set('file', new Blob([await readFile(item.file)]), path.basename(item.file));
      form.set('api_key', process.env.CLOUDINARY_API_KEY);
      form.set('timestamp', timestamp);
      form.set('public_id', publicId);
      form.set('overwrite', 'false');
      form.set('signature', signature);
      const response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(process.env.CLOUDINARY_CLOUD_NAME)}/image/upload`, { method: 'POST', body: form, signal: AbortSignal.timeout(60000) });
      const result = await response.json();
      if (!response.ok || typeof result.secure_url !== 'string' || !result.secure_url.startsWith('https://res.cloudinary.com/')) {
        throw new Error(`Cloudinary upload failed for ${item.table} record ${item.id} (HTTP ${response.status}). Check your credentials and Cloudinary dashboard.`);
      }
      const updated = await pool.query(`UPDATE ${item.table} SET image_url = $1 WHERE id = $2 AND image_url = $3`, [result.secure_url, item.id, item.oldUrl]);
      console.log(`${item.table} ${item.id}: ${updated.rowCount === 1 ? 'updated' : 'skipped because the database record changed'}`);
    }
    console.log('Transfer finished. Local pictures have been preserved.');
  } finally { await pool.end(); }
}
main().catch(error => {
  const message = error instanceof Error ? error.message : 'Unknown failure';
  console.error(message.replace(/postgres(?:ql)?:\/\/\S+/gi, '[database connection hidden]'));
  process.exitCode = 1;
});
