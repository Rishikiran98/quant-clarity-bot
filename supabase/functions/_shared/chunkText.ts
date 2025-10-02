/**
 * Shared utility: Text chunking with overlap
 * Used by document processing to split long texts into manageable chunks
 */

export function chunkText(text: string, size = 1000, overlap = 200): string[] {
  const chunks: string[] = [];
  let i = 0;
  
  while (i < text.length) {
    const end = Math.min(i + size, text.length);
    const chunk = text.slice(i, end).trim();
    
    if (chunk.length > 0) {
      chunks.push(chunk);
    }
    
    i += size - overlap;
  }
  
  return chunks;
}

/**
 * Split text by sentences for better semantic chunking
 */
export function chunkTextBySentences(text: string, maxSize = 1000, overlap = 200): string[] {
  const sentences = text.split(/[.!?]+\s+/);
  const chunks: string[] = [];
  let currentChunk = '';
  
  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > maxSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      
      // Add overlap from previous chunk
      const words = currentChunk.split(/\s+/);
      const overlapWords = words.slice(-Math.floor(overlap / 5));
      currentChunk = overlapWords.join(' ') + ' ' + sentence;
    } else {
      currentChunk += (currentChunk ? ' ' : '') + sentence;
    }
  }
  
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks.filter(c => c.length > 50); // Filter out tiny chunks
}
