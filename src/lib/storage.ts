import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { getSupabaseServerClient } from './supabase-server';

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'gradeup';

export interface StorageResult {
  url: string;
  provider: 'supabase' | 'local';
}

/**
 * Uploads a file to Supabase Storage when configured (service role key + bucket),
 * otherwise falls back to the local filesystem under /public/uploads.
 * Returns a publicly reachable URL.
 */
export async function uploadFile(
  buffer: Buffer,
  path: string,
  contentType: string
): Promise<StorageResult> {
  const client = getSupabaseServerClient();

  if (client) {
    const { error } = await client.storage
      .from(BUCKET)
      .upload(path, buffer, { contentType, upsert: true });

    if (!error) {
      const { data } = client.storage.from(BUCKET).getPublicUrl(path);
      return { url: data.publicUrl, provider: 'supabase' };
    }
    console.warn(`[storage] Supabase upload failed, falling back to local FS: ${error.message}`);
  }

  const uploadsDir = join(process.cwd(), 'public', 'uploads');
  await mkdir(uploadsDir, { recursive: true });
  await writeFile(join(uploadsDir, path), buffer);
  return { url: `/uploads/${path}`, provider: 'local' };
}

export function isCloudStorageConfigured(): boolean {
  return getSupabaseServerClient() !== null;
}
