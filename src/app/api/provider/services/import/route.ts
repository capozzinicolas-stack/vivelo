import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/auth/api-auth';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { generateSlug } from '@/lib/slug';
import type { ImportResult } from '@/lib/service-import-export';
import type { ServiceCategory, ServiceStatus } from '@/types/database';

interface ServicePayload {
  title: string;
  description: string;
  subcategory: string;
  base_price: number;
  price_unit: string;
  min_guests: number;
  max_guests: number;
  min_hours?: number;
  max_hours?: number;
  base_event_hours?: number | null;
  zones: string[];
  buffer_before_minutes: number;
  buffer_after_minutes: number;
  cancellation_policy_id?: string | null;
  image_urls: string[];
  video_urls: string[];
  category_details: Record<string, unknown>;
}

interface ExtraPayload {
  service_title: string;
  name: string;
  description?: string;
  price: number;
  price_type: 'fixed' | 'per_person' | 'per_hour';
  max_quantity: number;
  depends_on_guests: boolean;
  depends_on_hours: boolean;
  image_url?: string;
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;
  const { user, profile } = auth;

  if (profile.role !== 'provider') {
    return NextResponse.json({ error: 'Solo proveedores pueden importar servicios' }, { status: 403 });
  }

  let body: { category: ServiceCategory; services: ServicePayload[]; extras: ExtraPayload[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body invalido' }, { status: 400 });
  }

  const { category, services, extras } = body;

  if (!category || !services || !Array.isArray(services)) {
    return NextResponse.json({ error: 'Faltan campos requeridos: category, services' }, { status: 400 });
  }

  if (services.length === 0) {
    return NextResponse.json({ error: 'No hay servicios para importar' }, { status: 400 });
  }

  if (services.length > 50) {
    return NextResponse.json({ error: 'Maximo 50 servicios por importacion' }, { status: 400 });
  }

  const supabaseAdmin = createAdminSupabaseClient();
  const result: ImportResult = { created: 0, failed: 0, errors: [], services: [] };

  // Check for duplicate titles with existing services
  const { data: existingServices } = await supabaseAdmin
    .from('services')
    .select('title')
    .eq('provider_id', user.id);

  const existingTitles = new Set((existingServices || []).map(s => s.title.toLowerCase()));

  // Group extras by service title
  const extrasByTitle: Record<string, ExtraPayload[]> = {};
  for (const ex of extras || []) {
    const key = ex.service_title.toLowerCase();
    if (!extrasByTitle[key]) extrasByTitle[key] = [];
    extrasByTitle[key].push(ex);
  }

  for (let i = 0; i < services.length; i++) {
    const svc = services[i];
    const rowNum = i + 2;

    try {
      // Check for duplicate title
      if (existingTitles.has(svc.title.toLowerCase())) {
        result.errors.push({
          row: rowNum,
          sheet: 'Servicios',
          field: 'titulo',
          message: `Ya existe un servicio con el titulo "${svc.title}"`,
        });
        result.failed++;
        continue;
      }

      // Generate unique slug
      let slug = generateSlug(svc.title);
      const { count: slugCount } = await supabaseAdmin
        .from('services')
        .select('id', { count: 'exact', head: true })
        .eq('slug', slug);
      if (slugCount && slugCount > 0) {
        let counter = 2;
        while (true) {
          const candidate = `${slug}-${counter}`;
          const { count: c2 } = await supabaseAdmin
            .from('services')
            .select('id', { count: 'exact', head: true })
            .eq('slug', candidate);
          if (!c2 || c2 === 0) { slug = candidate; break; }
          counter++;
          if (counter > 100) break;
        }
      }

      // Insert service
      const insertData: Record<string, unknown> = {
        provider_id: user.id,
        title: svc.title,
        slug,
        description: svc.description || '',
        category,
        subcategory: svc.subcategory || null,
        base_price: svc.base_price,
        price_unit: svc.price_unit,
        min_guests: svc.min_guests || 1,
        max_guests: svc.max_guests || 100,
        zones: svc.zones || [],
        images: [], // Images downloaded async later
        status: 'pending_review' as ServiceStatus,
      };

      const { data: newSvc, error: insertError } = await supabaseAdmin
        .from('services')
        .insert(insertData)
        .select('id')
        .single();

      if (insertError || !newSvc) {
        console.error(`[Import] Service INSERT failed for "${svc.title}":`, insertError);
        result.errors.push({
          row: rowNum,
          sheet: 'Servicios',
          field: 'general',
          message: `Error al crear servicio: ${insertError?.message || 'Error desconocido'}`,
        });
        result.failed++;
        continue;
      }

      // Update Phase 2 columns
      const phase2: Record<string, unknown> = {};
      if (svc.min_hours) phase2.min_hours = svc.min_hours;
      if (svc.max_hours) phase2.max_hours = svc.max_hours;
      if (svc.base_event_hours != null) phase2.base_event_hours = svc.base_event_hours;
      if (svc.buffer_before_minutes) phase2.buffer_before_minutes = svc.buffer_before_minutes;
      if (svc.buffer_after_minutes) phase2.buffer_after_minutes = svc.buffer_after_minutes;
      if (svc.video_urls && svc.video_urls.length > 0) phase2.videos = svc.video_urls;
      if (svc.category_details && Object.keys(svc.category_details).length > 0) {
        phase2.category_details = svc.category_details;
      }
      if (svc.cancellation_policy_id) phase2.cancellation_policy_id = svc.cancellation_policy_id;

      if (Object.keys(phase2).length > 0) {
        try {
          await supabaseAdmin.from('services').update(phase2).eq('id', newSvc.id);
        } catch {
          console.warn(`[Import] Phase 2 update skipped for "${svc.title}"`);
        }
      }

      // Insert extras for this service
      const svcExtras = extrasByTitle[svc.title.toLowerCase()] || [];
      if (svcExtras.length > 0) {
        const extrasData = svcExtras.map(e => ({
          service_id: newSvc.id,
          name: e.name,
          description: e.description || null,
          price: e.price,
          price_type: e.price_type,
          max_quantity: e.max_quantity,
        }));

        const { error: extError } = await supabaseAdmin.from('extras').insert(extrasData);
        if (extError) {
          console.error(`[Import] Extras INSERT failed for "${svc.title}":`, extError);
        }

        // Phase 2 extras columns
        try {
          for (const e of svcExtras) {
            const updates: Record<string, unknown> = {};
            if (e.depends_on_guests) updates.depends_on_guests = true;
            if (e.depends_on_hours) updates.depends_on_hours = true;
            if (e.image_url) updates.image = e.image_url;
            if (Object.keys(updates).length > 0) {
              await supabaseAdmin
                .from('extras')
                .update(updates)
                .eq('service_id', newSvc.id)
                .eq('name', e.name);
            }
          }
        } catch {
          console.warn(`[Import] Phase 2 extras update skipped for "${svc.title}"`);
        }
      }

      existingTitles.add(svc.title.toLowerCase());
      result.created++;
      result.services.push({ id: newSvc.id, title: svc.title });
    } catch (err) {
      console.error(`[Import] Unexpected error for row ${rowNum}:`, err);
      result.errors.push({
        row: rowNum,
        sheet: 'Servicios',
        field: 'general',
        message: `Error inesperado: ${err instanceof Error ? err.message : 'Error desconocido'}`,
      });
      result.failed++;
    }
  }

  return NextResponse.json(result);
}
