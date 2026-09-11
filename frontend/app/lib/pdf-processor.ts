import { index } from './pinecone';
import { createChunksFromPage } from './chunking';
import { UploadResponse } from '../types/rag';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Configuration pour les embeddings
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const embeddingModel = genAI.getGenerativeModel({ model: 'embedding-001' });

// Fonction pour générer une embedding
async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const result = await embeddingModel.embedContent(text);
    return result.embedding.values;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw new Error('Erreur lors de la génération de l\'embedding');
  }
}

export async function processTextAndVectorize(
  pdfText: string,
  fileName: string,
  fileId: string
): Promise<UploadResponse> {
  const BATCH_SIZE = 100;
  let vectors: any[] = [];
  let chunksProcessed = 0;

  try {
    // Diviser le texte en pages (basé sur le format "PAGE X:")
    const pageMatches = pdfText.match(/PAGE (\d+):/g);
    const pages = pageMatches ? pageMatches.length : 1;
    
    // Créer des chunks à partir du texte complet
    const chunks = createChunksFromPage(pdfText, 1, fileName, fileId);

    for (const chunk of chunks) {
      const embedding = await generateEmbedding(chunk.content);
      vectors.push({
        id: chunk.id,
        values: embedding,
        metadata: {
          content: chunk.content,
          page: chunk.page,
          fileName: chunk.metadata.fileName,
          fileId: chunk.metadata.fileId,
          timestamp: chunk.metadata.timestamp,
        },
      });

      // Envoyer par lot à Pinecone
      if (vectors.length >= BATCH_SIZE) {
        await index.upsert({ records: vectors });
        vectors = [];
      }
    }

    // Envoyer les vecteurs restants
    if (vectors.length > 0) {
      await index.upsert({ records: vectors });
    }

    return {
      fileId, 
      fileName, 
      success: true,
      chunks: chunks.length,
      pages: pages,
      message: `PDF traité avec succès: ${chunks.length} chunks créés.`,
    };

  } catch (error) {
    console.error('Error processing text:', error);
    return {
      fileId, 
      fileName, 
      success: false, 
      chunks: 0, 
      pages: 0,
      message: `Erreur lors du traitement: ${error}`,
    };
  }
}

export async function searchSimilarChunks(
  query: string,
  topK: number = 5,
  fileId?: string
): Promise<any[]> {
  try {
    // Générer l'embedding de la requête
    const queryEmbedding = await generateEmbedding(query);
    
    // Construire le filtre pour Pinecone
    const filter: any = {};
    if (fileId) {
      filter.fileId = { $eq: fileId };
    }
    
    // Rechercher dans Pinecone
    const searchResponse = await index.query({
      vector: queryEmbedding,
      topK,
      includeMetadata: true,
      filter: Object.keys(filter).length > 0 ? filter : undefined,
    });

    // Transformer les résultats
    return searchResponse.matches?.map(match => ({
      id: match.id,
      content: match.metadata?.content || '',
      page: match.metadata?.page || 1,
      fileName: match.metadata?.fileName || '',
      score: match.score || 0,
      startIndex: match.metadata?.startIndex || 0,
      endIndex: match.metadata?.endIndex || 0,
    })) || [];
  } catch (error) {
    console.error('Error searching chunks:', error);
    throw new Error('Erreur lors de la recherche de chunks similaires');
  }
}

export async function deleteFileChunks(fileId: string): Promise<void> {
  try {
    await index.deleteMany({
      filter: {
        fileId: { $eq: fileId }
      }
    });
  } catch (error) {
    console.error('Error deleting file chunks:', error);
    throw new Error('Erreur lors de la suppression des chunks');
  }
} 