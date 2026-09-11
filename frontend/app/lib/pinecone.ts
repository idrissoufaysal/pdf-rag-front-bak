import { Pinecone } from '@pinecone-database/pinecone';

if (!process.env.PINECONE_API_KEY) {
  throw new Error('PINECONE_API_KEY is not set');
}

if (!process.env.PINECONE_INDEX_NAME) {
  throw new Error('PINECONE_INDEX_NAME is not set');
}

export const pinecone = new Pinecone({apiKey: process.env.PINECONE_API_KEY as string});

export const index = pinecone.index(process.env.PINECONE_INDEX_NAME);

// Configuration de l'index
export const INDEX_CONFIG = {
  dimension: 768, // Dimension des embeddings
  metric: 'cosine',
  name: process.env.PINECONE_INDEX_NAME || 'pdf-chat-index1',
};

// Fonction pour créer l'index si il n'existe pas
export async function ensureIndex() {
  try {
    const indexes = await pinecone.listIndexes();
    const indexExists = indexes.indexes?.some(idx => idx.name === INDEX_CONFIG.name);
    
    if (!indexExists) {
      await pinecone.createIndex({
        name: INDEX_CONFIG.name,
        dimension: INDEX_CONFIG.dimension,
        spec:{ serverless: { cloud: 'aws', region: 'us-east-1' }}
      });
      console.log(`Index ${INDEX_CONFIG.name} created successfully`);
    }
  } catch (error) {
    console.error('Error ensuring index:', error);
  }
} 