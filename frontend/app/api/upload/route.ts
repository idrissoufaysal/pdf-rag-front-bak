import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || typeof file === 'string' || file.size === 0) {
      return NextResponse.json(
        { error: 'Aucun fichier reçu (champ "file" requis)' },
        { status: 400 }
      );
    }

    const backendForm = new FormData();
    backendForm.append('file', file, file.name);

    let backendRes: Response;
    try {
      backendRes = await fetch(`${BACKEND_URL}/api/upload`, {
        method: 'POST',
        body: backendForm,
      });
    } catch (error: any) {
      return NextResponse.json(
        { error: `Backend injoignable : ${error.message}` },
        { status: 502 }
      );
    }

    const data = await backendRes.json().catch(() => ({}));
    if (!backendRes.ok) {
      return NextResponse.json(
        { error: data.detail || `Erreur backend (${backendRes.status})` },
        { status: backendRes.status }
      );
    }

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      { error: `Upload failed: ${error.message}` },
      { status: 500 }
    );
  }
}
