import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

export async function POST(request: NextRequest) {
  let question = '';
  let history: { role: string; content: string }[] = [];

  try {
    const body = await request.json();
    question = body.question || '';
    history = Array.isArray(body.history) ? body.history : [];
  } catch {
    return NextResponse.json({ error: 'Corps JSON invalide' }, { status: 400 });
  }

  if (!question) {
    return NextResponse.json({ error: 'La question est requise' }, { status: 400 });
  }

  let backendRes: Response;
  try {
    backendRes = await fetch(`${BACKEND_URL}/api/chat/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, history }),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: `Backend injoignable : ${error.message}` },
      { status: 502 }
    );
  }

  if (!backendRes.ok || !backendRes.body) {
    const text = await backendRes.text().catch(() => '');
    return NextResponse.json(
      { error: text || `Erreur backend (${backendRes.status})` },
      { status: backendRes.status }
    );
  }

  return new Response(backendRes.body, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  });
}
