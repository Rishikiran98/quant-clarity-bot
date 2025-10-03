/**
 * Shared utility: Text chunking with overlap
 * Used by document processing to split long texts into manageable chunks
 */

export function chunkText(text: string, size = 1500, overlap = 300): string[] {
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
export function chunkTextBySentences(text: string, maxSize = 1500, overlap = 300): string[] {
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

/**
 * Advanced semantic chunking with paragraph preservation
 */
export function chunkTextSemantic(text: string, maxSize = 1500, minSize = 500, overlap = 300): string[] {
  const paragraphs = text.split(/\n\n+/);
  const chunks: string[] = [];
  let currentChunk = '';
  
  for (const paragraph of paragraphs) {
    const trimmedPara = paragraph.trim();
    if (!trimmedPara) continue;
    
    // If adding this paragraph exceeds max size and we have content
    if (currentChunk && (currentChunk + '\n\n' + trimmedPara).length > maxSize) {
      // Only push if we meet minimum size
      if (currentChunk.length >= minSize) {
        chunks.push(currentChunk.trim());
        
        // Add overlap: last N characters
        const overlapText = currentChunk.slice(-overlap);
        currentChunk = overlapText + '\n\n' + trimmedPara;
      } else {
        // Too small, just add the paragraph
        currentChunk += '\n\n' + trimmedPara;
      }
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + trimmedPara;
    }
    
    // If current chunk is very large, split it
    if (currentChunk.length > maxSize * 1.5) {
      chunks.push(currentChunk.trim());
      currentChunk = '';
    }
  }
  
  // Add final chunk if it meets minimum size
  if (currentChunk.trim() && currentChunk.length >= minSize) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks.filter(c => c.length >= 100);
}
