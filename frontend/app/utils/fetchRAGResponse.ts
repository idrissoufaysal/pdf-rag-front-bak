import { BACKEND_URL } from './config';

export interface BackendSource {
  file: string;
  page?: number;
  snippet: string;
}

export async function uploadAndVectorizePDF(
  file: File
): Promise<{ fileId: string; success: boolean; message: string; chunksAdded: number }> {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${BACKEND_URL}/api/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || "Erreur lors de l'upload");
    }

    const data = await response.json();

    if (!data || !data.message) {
      throw new Error('Réponse inattendue du serveur');
    }

    const fileId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    return {
      fileId,
      success: true,
      message: data.message,
      chunksAdded: typeof data.chunks_added === 'number' ? data.chunks_added : 0,
    };
  } catch (error) {
    console.error('Error uploading PDF:', error);
    throw error;
  }
}

export function formatSourceForDisplay(source: BackendSource): string {
  return `Page ${source.page ?? '?'}`;
}

export function createSourceLink(source: BackendSource, fileId: string): string {
  return `#page=${source.page ?? 1}`;
}
