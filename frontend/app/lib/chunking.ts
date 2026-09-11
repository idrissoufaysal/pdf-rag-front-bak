import { Chunk } from '../types/rag';

export interface ChunkingOptions {
  chunkSize: number;
  chunkOverlap: number;
  separator: string;
}

const DEFAULT_OPTIONS: ChunkingOptions = {
  chunkSize: 1000,
  chunkOverlap: 200,
  separator: '\n\n',
};

export function splitTextIntoChunks(
  text: string,
  options: Partial<ChunkingOptions> = {}
): string[] {
  const config = { ...DEFAULT_OPTIONS, ...options };
  
  // Nettoyer le texte
  const cleanText = text.replace(/\s+/g, ' ').trim();
  
  if (cleanText.length <= config.chunkSize) {
    return [cleanText];
  }

  const chunks: string[] = [];
  let startIndex = 0;

  while (startIndex < cleanText.length) {
    const endIndex = Math.min(startIndex + config.chunkSize, cleanText.length);
    
    // Essayer de couper à un séparateur naturel
    let actualEndIndex = endIndex;
    if (endIndex < cleanText.length) {
      const lastSeparator = cleanText.lastIndexOf(config.separator, endIndex);
      if (lastSeparator > startIndex + config.chunkSize * 0.5) {
        actualEndIndex = lastSeparator;
      }
    }

    const chunk = cleanText.slice(startIndex, actualEndIndex).trim();
    if (chunk) {
      chunks.push(chunk);
    }

    // Calculer le prochain index avec overlap
    startIndex = actualEndIndex - config.chunkOverlap;
    if (startIndex >= cleanText.length) break;
  }

  return chunks;
}

export function createChunksFromPDFText(
  pdfText: string,
  fileName: string,
  fileId: string,
  options: Partial<ChunkingOptions> = {}
): Chunk[] {
  const chunks: Chunk[] = [];
  const textChunks = splitTextIntoChunks(pdfText, options);
  
  let globalIndex = 0;
  
  textChunks.forEach((chunk, chunkIndex) => {
    const chunkId = `${fileId}_chunk_${chunkIndex}`;
    const startIndex = globalIndex;
    const endIndex = globalIndex + chunk.length;
    
    // Essayer d'extraire le numéro de page du chunk
    const pageMatch = chunk.match(/PAGE (\d+):/);
    const page = pageMatch ? parseInt(pageMatch[1]) : 1;
    
    chunks.push({
      id: chunkId,
      content: chunk,
      page,
      startIndex,
      endIndex,
      metadata: {
        fileName,
        fileId,
        timestamp: new Date().toISOString(),
      },
    });
    
    globalIndex = endIndex + 1; // +1 pour le séparateur
  });
  
  return chunks;
}

export function extractPageFromChunk(chunk: Chunk): number {
  const pageMatch = chunk.content.match(/PAGE (\d+):/);
  return pageMatch ? parseInt(pageMatch[1]) : chunk.page;
}

export function createChunksFromPage(
  pageText: string,
  pageNumber: number,
  fileName: string,
  fileId: string,
  options: Partial<ChunkingOptions> = {}
): Chunk[] {
  const chunks: Chunk[] = [];
  const textChunks = splitTextIntoChunks(pageText, options);

  let globalIndex = 0;

  textChunks.forEach((chunkContent, chunkIndex) => {
    const chunkId = `${fileId}_page_${pageNumber}_chunk_${chunkIndex}`;
    const startIndex = globalIndex;
    const endIndex = globalIndex + chunkContent.length;

    chunks.push({
      id: chunkId,
      content: chunkContent,
      page: pageNumber,
      startIndex,
      endIndex,
      metadata: {
        fileName,
        fileId,
        timestamp: new Date().toISOString(),
      },
    });

    globalIndex = endIndex + 1;
  });

  return chunks;
} 