import { NextRequest, NextResponse } from 'next/server';
import { requireRole, isAuthError } from '@/lib/auth/api-auth';
import { readFile } from 'fs/promises';
import path from 'path';

export async function GET(request: NextRequest) {
  const auth = await requireRole(['admin']);
  if (isAuthError(auth)) return auth;

  const filePath = path.join(process.cwd(), 'brand-book-vivelo.html');

  try {
    const content = await readFile(filePath, 'utf-8');
    const isDownload = request.nextUrl.searchParams.get('download') === '1';

    return new NextResponse(content, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        ...(isDownload && {
          'Content-Disposition': 'attachment; filename="brand-book-vivelo.html"',
        }),
      },
    });
  } catch {
    return NextResponse.json(
      { error: 'Archivo de brand book no encontrado' },
      { status: 404 }
    );
  }
}
