import { NextRequest, NextResponse } from 'next/server';
import { index } from '../../lib/pinecone';
import { Source } from '../../types/rag';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('fileId');
    const page = searchParams.get('page');

    if (!fileId) {
      return NextResponse.json(
        { error: 'fileId is required' },
        { status: 400 }
      );
    }

    // Construire le filtre
    const filter: any = {
      fileId: { $eq: fileId }
    };

    if (page) {
      filter.page = { $eq: parseInt(page) };
    }

    // Récupérer tous les chunks du fichier
    const response = await index.query({
      vector: new Array(768).fill(0), // Vector vide pour récupérer tous les chunks
      topK: 1000, // Nombre élevé pour récupérer tous les chunks
      includeMetadata: true,
      filter,
    });

    const sources: Source[] = (response.matches || []).map((match: any) => ({
      id: match.id,
      content: match.metadata?.content || '',
      page: match.metadata?.page || 1,
      fileName: match.metadata?.fileName || '',
      score: match.score || 0,
      startIndex: match.metadata?.startIndex || 0,
      endIndex: match.metadata?.endIndex || 0,
    }));

    return NextResponse.json({ sources });
  } catch (error) {
    console.error('Sources error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des sources' },
      { status: 500 }
    );
  }
} 