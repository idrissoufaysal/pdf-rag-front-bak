import { NextRequest, NextResponse } from 'next/server';
import { searchSimilarChunks } from '../../lib/pdf-processor';
import { generateResponseWithContext } from '../../lib/gemini';
import { AskRequest, AskResponse, Source } from '../../types/rag';

export async function POST(request: NextRequest) {
  try {
    const body: AskRequest = await request.json();
    const { question, fileId, topK = 5 } = body;

    if (!question) {
      return NextResponse.json(
        { error: 'Question is required' },
        { status: 400 }
      );
    }

    // 1. Rechercher les chunks les plus pertinents
    const similarChunks = await searchSimilarChunks(question, topK, fileId);

    if (similarChunks.length === 0) {
      return NextResponse.json({
        answer: "Je n'ai pas trouvé d'informations pertinentes dans les documents pour répondre à votre question.",
        sources: [],
        query: question,
        fileId,
      } as AskResponse);
    }

    // 2. Préparer le contexte et les sources
    const context = similarChunks
      .map(chunk => `Page ${chunk.page}: ${chunk.content}`)
      .join('\n\n');

    const sources: Source[] = similarChunks.map(chunk => ({
      id: chunk.id,
      content: chunk.content,
      page: chunk.page,
      fileName: chunk.fileName,
      score: chunk.score,
      startIndex: chunk.startIndex,
      endIndex: chunk.endIndex,
    }));

    // 3. Générer la réponse avec Gemini
    const answer = await generateResponseWithContext(question, context, sources);

    const response: AskResponse = {
      answer,
      sources,
      query: question,
      fileId,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Ask error:', error);
    return NextResponse.json(
      { error: 'Erreur lors du traitement de la question' },
      { status: 500 }
    );
  }
} 