import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/auth/api-auth';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_CONTENT_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
const BUCKET = 'service-media';

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;
  const { user, profile } = auth;

  if (profile.role !== 'provider') {
    return NextResponse.json({ error: 'Solo proveedores pueden descargar imagenes' }, { status: 403 });
  }

  let body: { serviceId: string; imageUrls: string[]; videoUrls?: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body invalido' }, { status: 400 });
  }

  const { serviceId, imageUrls, videoUrls } = body;

  if (!serviceId || !imageUrls || !Array.isArray(imageUrls)) {
    return NextResponse.json({ error: 'Faltan campos: serviceId, imageUrls' }, { status: 400 });
  }

  const supabaseAdmin = createAdminSupabaseClient();

  // Verify service belongs to provider
  const { data: service, error: svcError } = await supabaseAdmin
    .from('services')
    .select('id, provider_id, images, videos')
    .eq('id', serviceId)
    .single();

  if (svcError || !service) {
    return NextResponse.json({ error: 'Servicio no encontrado' }, { status: 404 });
  }

  if (service.provider_id !== user.id) {
    return NextResponse.json({ error: 'No tienes permiso para este servicio' }, { status: 403 });
  }

  const downloadedImages: string[] = [...(service.images || [])];
  const downloadedVideos: string[] = [...(service.videos || [])];
  const errors: string[] = [];

  // Download images
  for (const url of imageUrls) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
      if (!response.ok) {
        errors.push(`Error descargando ${url}: HTTP ${response.status}`);
        continue;
      }

      const contentType = response.headers.get('content-type')?.split(';')[0]?.trim() || '';
      if (!ALLOWED_CONTENT_TYPES.includes(contentType)) {
        errors.push(`Tipo de archivo no soportado para ${url}: ${contentType}`);
        continue;
      }

      const arrayBuffer = await response.arrayBuffer();
      if (arrayBuffer.byteLength > MAX_IMAGE_SIZE) {
        errors.push(`Imagen muy grande (${Math.round(arrayBuffer.byteLength / 1024 / 1024)}MB): ${url}`);
        continue;
      }

      const ext = contentType === 'image/png' ? 'png' : contentType === 'image/webp' ? 'webp' : 'jpg';
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabaseAdmin.storage
        .from(BUCKET)
        .upload(path, arrayBuffer, {
          contentType,
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        errors.push(`Error subiendo ${url}: ${uploadError.message}`);
        continue;
      }

      const { data: urlData } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path);
      downloadedImages.push(urlData.publicUrl);
    } catch (err) {
      errors.push(`Error procesando ${url}: ${err instanceof Error ? err.message : 'Error desconocido'}`);
    }
  }

  // Download videos (just store URLs, no actual download for videos)
  if (videoUrls && videoUrls.length > 0) {
    for (const url of videoUrls) {
      downloadedVideos.push(url);
    }
  }

  // Update service images
  const updateData: Record<string, unknown> = {};
  if (downloadedImages.length > 0) updateData.images = downloadedImages;
  if (downloadedVideos.length > 0) updateData.videos = downloadedVideos;

  if (Object.keys(updateData).length > 0) {
    const { error: updateError } = await supabaseAdmin
      .from('services')
      .update(updateData)
      .eq('id', serviceId);

    if (updateError) {
      console.error('[DownloadImages] Update failed:', updateError);
      errors.push(`Error actualizando servicio: ${updateError.message}`);
    }
  }

  return NextResponse.json({
    images: downloadedImages,
    videos: downloadedVideos,
    errors,
  });
}
