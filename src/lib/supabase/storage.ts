import { createClient } from './client';

const BUCKET = 'service-media';

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB

export type MediaType = 'image' | 'video';

export function getMediaType(file: File): MediaType | null {
  if (IMAGE_TYPES.includes(file.type)) return 'image';
  if (VIDEO_TYPES.includes(file.type)) return 'video';
  return null;
}

export function validateFile(file: File): string | null {
  const mediaType = getMediaType(file);
  if (!mediaType) return 'Tipo de archivo no soportado. Usa JPG, PNG, WebP, MP4, MOV o WebM.';
  if (mediaType === 'image' && file.size > MAX_IMAGE_SIZE) return 'La imagen no puede exceder 5MB.';
  if (mediaType === 'video' && file.size > MAX_VIDEO_SIZE) return 'El video no puede exceder 50MB.';
  return null;
}

export async function uploadServiceMedia(
  userId: string,
  file: File,
): Promise<string> {
  const supabase = createClient();
  const ext = file.name.split('.').pop()?.toLowerCase() || 'bin';
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  });
  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function deleteServiceMedia(url: string): Promise<void> {
  const supabase = createClient();
  // Extract path from public URL: ...service-media/userId/filename.ext
  const parts = url.split(`/storage/v1/object/public/${BUCKET}/`);
  if (parts.length < 2) return;
  const path = parts[1];

  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) throw error;
}

// ─── PROFILE UPLOADS ─────────────────────────────────────────

const PROFILE_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const DOCUMENT_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
const MAX_PROFILE_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024; // 10MB

export function validateProfileImage(file: File): string | null {
  if (!PROFILE_IMAGE_TYPES.includes(file.type)) return 'Tipo de archivo no soportado. Usa JPG, PNG o WebP.';
  if (file.size > MAX_PROFILE_IMAGE_SIZE) return 'La imagen no puede exceder 5MB.';
  return null;
}

export function validateDocument(file: File): string | null {
  if (!DOCUMENT_TYPES.includes(file.type)) return 'Tipo de archivo no soportado. Usa PDF, JPG o PNG.';
  if (file.size > MAX_DOCUMENT_SIZE) return 'El documento no puede exceder 10MB.';
  return null;
}

export async function uploadProfilePicture(userId: string, file: File): Promise<string> {
  const validationError = validateProfileImage(file);
  if (validationError) throw new Error(validationError);

  const supabase = createClient();
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const path = `${userId}/avatars/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  });
  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadDocument(userId: string, file: File): Promise<string> {
  const validationError = validateDocument(file);
  if (validationError) throw new Error(validationError);

  const supabase = createClient();
  const ext = file.name.split('.').pop()?.toLowerCase() || 'pdf';
  const path = `${userId}/documents/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  });
  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
