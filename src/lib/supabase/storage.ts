import { createClient } from './client';

const BUCKET = 'service-media';

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_IMAGE_DIMENSION = 2048; // Max width/height after compression

export type MediaType = 'image' | 'video';

export function getMediaType(file: File): MediaType | null {
  if (IMAGE_TYPES.includes(file.type)) return 'image';
  if (VIDEO_TYPES.includes(file.type)) return 'video';
  return null;
}

/** Compress image using Canvas API to fit within MAX_IMAGE_SIZE */
async function compressImage(file: File): Promise<File> {
  if (file.size <= MAX_IMAGE_SIZE) return file;

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;

      // Scale down if larger than max dimension
      if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
        const ratio = Math.min(MAX_IMAGE_DIMENSION / width, MAX_IMAGE_DIMENSION / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, width, height);

      // Try quality levels until under 5MB
      const tryQuality = (quality: number) => {
        canvas.toBlob(
          (blob) => {
            if (!blob) { reject(new Error('Error al comprimir imagen')); return; }
            if (blob.size > MAX_IMAGE_SIZE && quality > 0.3) {
              tryQuality(quality - 0.1);
            } else {
              resolve(new File([blob], file.name, { type: 'image/jpeg' }));
            }
          },
          'image/jpeg',
          quality,
        );
      };
      tryQuality(0.8);
    };
    img.onerror = () => reject(new Error('Error al procesar imagen'));
    img.src = URL.createObjectURL(file);
  });
}

export function validateFile(file: File): string | null {
  const mediaType = getMediaType(file);
  if (!mediaType) return 'Tipo de archivo no soportado. Usa JPG, PNG, WebP, MP4, MOV o WebM.';
  // Images are auto-compressed, no size check needed
  if (mediaType === 'video' && file.size > MAX_VIDEO_SIZE) return 'El video no puede exceder 50MB.';
  return null;
}

export async function uploadServiceMedia(
  userId: string,
  file: File,
): Promise<string> {
  const supabase = createClient();
  const mediaType = getMediaType(file);

  // Auto-compress images that exceed the limit
  let fileToUpload = file;
  if (mediaType === 'image' && file.size > MAX_IMAGE_SIZE) {
    fileToUpload = await compressImage(file);
  }

  const ext = mediaType === 'image' && fileToUpload !== file ? 'jpg' : (file.name.split('.').pop()?.toLowerCase() || 'bin');
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, fileToUpload, {
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

// ─── BLOG UPLOADS ────────────────────────────────────────────

export async function uploadBlogMedia(file: File): Promise<string> {
  const mediaType = getMediaType(file);
  if (!mediaType) throw new Error('Tipo de archivo no soportado.');
  if (mediaType === 'video' && file.size > MAX_VIDEO_SIZE) throw new Error('El video no puede exceder 50MB.');

  let fileToUpload = file;
  if (mediaType === 'image' && file.size > MAX_IMAGE_SIZE) {
    fileToUpload = await compressImage(file);
  }

  const supabase = createClient();
  const ext = mediaType === 'image' && fileToUpload !== file ? 'jpg' : (file.name.split('.').pop()?.toLowerCase() || 'bin');
  const path = `blog/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, fileToUpload, {
    cacheControl: '3600',
    upsert: false,
  });
  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

// ─── PROFILE UPLOADS ─────────────────────────────────────────

const PROFILE_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const DOCUMENT_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
const MAX_PROFILE_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024; // 10MB

export function validateProfileImage(file: File): string | null {
  if (!PROFILE_IMAGE_TYPES.includes(file.type)) return 'Tipo de archivo no soportado. Usa JPG, PNG o WebP.';
  // Images are auto-compressed, no size check needed
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

  // Auto-compress if needed
  let fileToUpload = file;
  if (file.size > MAX_PROFILE_IMAGE_SIZE) {
    fileToUpload = await compressImage(file);
  }

  const supabase = createClient();
  const ext = fileToUpload !== file ? 'jpg' : (file.name.split('.').pop()?.toLowerCase() || 'jpg');
  const path = `${userId}/avatars/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, fileToUpload, {
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
