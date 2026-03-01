import { NextResponse } from 'next/server';

/**
 * @deprecated Commission rates are now managed per-category via /api/admin/catalog.
 * This endpoint returns 410 Gone.
 */
export async function POST() {
  return NextResponse.json(
    {
      error: 'Este endpoint esta deprecado. Las comisiones ahora se gestionan por categoria via /api/admin/catalog.',
      migration: 'Use PUT /api/admin/catalog/{slug} con { type: "category", data: { commission_rate: 0.12 } }',
    },
    { status: 410 }
  );
}
