import { NextResponse } from 'next/server';
import { requireRole, isAuthError } from '@/lib/auth/api-auth';
import { validateBody, AdminCreateReviewSchema, ModerateReviewSchema } from '@/lib/validations/api-schemas';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';

export async function GET(request: Request) {
  const auth = await requireRole(['admin']);
  if (isAuthError(auth)) return auth;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const serviceId = searchParams.get('serviceId');

  const supabase = createAdminSupabaseClient();

  let query = supabase
    .from('reviews')
    .select('*, client:profiles!reviews_client_id_fkey(id, full_name, email, avatar_url), service:services(id, title, images)')
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }
  if (serviceId) {
    query = query.eq('service_id', serviceId);
  }

  const { data: reviews, error } = await query;

  if (error) {
    console.error('[AdminReviews] Error fetching reviews:', error);
    return NextResponse.json({ error: 'Error al obtener reviews' }, { status: 500 });
  }

  return NextResponse.json({ reviews });
}

export async function POST(request: Request) {
  const auth = await requireRole(['admin']);
  if (isAuthError(auth)) return auth;
  const { profile } = auth;

  const { data, error } = await validateBody(request, AdminCreateReviewSchema);
  if (error || !data) {
    return NextResponse.json({ error: error || 'Datos invalidos' }, { status: 400 });
  }

  const { serviceId, rating, comment, clientName } = data;
  const supabase = createAdminSupabaseClient();

  // Verify service exists
  const { data: service, error: serviceError } = await supabase
    .from('services')
    .select('id')
    .eq('id', serviceId)
    .single();

  if (serviceError || !service) {
    return NextResponse.json({ error: 'Servicio no encontrado' }, { status: 404 });
  }

  // Create review as admin (approved, created_by_admin = true)
  const { data: review, error: insertError } = await supabase
    .from('reviews')
    .insert({
      service_id: serviceId,
      client_id: profile.id,
      rating,
      comment: comment || (clientName ? `Review de ${clientName}` : null),
      status: 'approved',
      created_by_admin: true,
      moderated_at: new Date().toISOString(),
      moderated_by: profile.id,
    })
    .select()
    .single();

  if (insertError) {
    console.error('[AdminReviews] Error creating review:', insertError);
    return NextResponse.json({ error: 'Error al crear la review' }, { status: 500 });
  }

  return NextResponse.json({ success: true, review });
}

export async function PATCH(request: Request) {
  const auth = await requireRole(['admin']);
  if (isAuthError(auth)) return auth;
  const { profile } = auth;

  const { data, error } = await validateBody(request, ModerateReviewSchema);
  if (error || !data) {
    return NextResponse.json({ error: error || 'Datos invalidos' }, { status: 400 });
  }

  const { reviewId, action, adminNotes } = data;
  const supabase = createAdminSupabaseClient();

  const newStatus = action === 'approve' ? 'approved' : 'rejected';

  const { data: review, error: updateError } = await supabase
    .from('reviews')
    .update({
      status: newStatus,
      admin_notes: adminNotes || null,
      moderated_at: new Date().toISOString(),
      moderated_by: profile.id,
    })
    .eq('id', reviewId)
    .select()
    .single();

  if (updateError) {
    console.error('[AdminReviews] Error updating review:', updateError);
    return NextResponse.json({ error: 'Error al moderar la review' }, { status: 500 });
  }

  return NextResponse.json({ success: true, review });
}
