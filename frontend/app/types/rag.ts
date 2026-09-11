export interface Chunk {
  id: string;
  content: string;
  page: number;
  startIndex: number;
  endIndex: number;
  metadata: {
    fileName: string;
    fileId: string;
    timestamp: string;
  };
}

export interface Source {
  id: string;
  content: string;
  page: number;
  fileName: string;
  score: number;
  startIndex: number;
  endIndex: number;
}

export interface RAGResponse {
  answer: string;
  sources: Source[];
  query: string;
}

export interface UploadResponse {
  fileId: string;
  fileName: string;
  chunks: number;
  pages: number;
  success: boolean;
  message: string;
}

export interface AskRequest {
  question: string;
  fileId?: string; // Optionnel pour chercher dans tous les fichiers
  topK?: number; // Nombre de sources à récupérer
}

export interface AskResponse {
  answer: string;
  sources: Source[];
  query: string;
  fileId?: string;
} 