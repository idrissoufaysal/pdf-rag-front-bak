import { GoogleGenerativeAI } from '@google/generative-ai';

if (!process.env.GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY is not set');
}

export const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export const model = genAI.getGenerativeModel({ 
  model: 'gemini-2.0-flash',
  generationConfig: {
    maxOutputTokens: 1024,
    temperature: 0.7,
  },
});

// Fonction pour générer une réponse avec contexte
export async function generateResponseWithContext(
  question: string,
  context: string,
  sources: any[]
): Promise<string> {
  const prompt = `
Tu es un assistant expert qui répond aux questions en se basant sur le contexte fourni.

CONTEXTE:
${context}

SOURCES UTILISÉES:
${sources.map((source, index) => 
  `${index + 1}. Page ${source.page} - ${source.content.substring(0, 200)}...`
).join('\n')}

QUESTION: ${question}

INSTRUCTIONS:
1. Réponds uniquement en te basant sur le contexte fourni
2. Si l'information n'est pas dans le contexte, dis-le clairement
3. Sois précis et concis
4. Cite les sources pertinentes dans ta réponse

RÉPONSE:`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Error generating response with Gemini:', error);
    throw new Error('Erreur lors de la génération de la réponse');
  }
} 