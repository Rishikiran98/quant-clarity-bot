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
 * Helper: Split text into complete sentences
 */
function splitIntoSentences(text: string): string[] {
  // Split on sentence boundaries while preserving the punctuation
  // Handles common abbreviations like "Mr.", "Dr.", "Inc.", "U.S.", etc.
  const sentences: string[] = [];
  let current = '';
  
  const chars = text.split('');
  for (let i = 0; i < chars.length; i++) {
    current += chars[i];
    
    // Check if we're at a sentence boundary
    if (['.', '!', '?'].includes(chars[i])) {
      // Look ahead to see if this is really the end of a sentence
      const next = chars[i + 1];
      const nextNext = chars[i + 2];
      
      // If followed by space and capital letter (or end of text), it's a sentence
      if (!next || (next === ' ' && (!nextNext || /[A-Z0-9]/.test(nextNext)))) {
        sentences.push(current.trim());
        current = '';
        i++; // Skip the space
      }
      // Otherwise continue (likely an abbreviation)
    }
  }
  
  // Add any remaining text
  if (current.trim()) {
    sentences.push(current.trim());
  }
  
  return sentences.filter(s => s.length > 0);
}

/**
 * Helper: Get sentences for overlap (complete sentences only)
 */
function getOverlapSentences(text: string, maxLength: number): string {
  const sentences = splitIntoSentences(text);
  let overlap = '';
  
  // Start from the end and work backwards
  for (let i = sentences.length - 1; i >= 0; i--) {
    const testOverlap = sentences[i] + (overlap ? ' ' + overlap : '');
    if (testOverlap.length <= maxLength) {
      overlap = testOverlap;
    } else {
      break;
    }
  }
  
  return overlap;
}

/**
 * Advanced semantic chunking with paragraph preservation and sentence boundaries
 */
export function chunkTextSemantic(text: string, maxSize = 1500, minSize = 500, overlap = 300): string[] {
  // Normalize text
  const normalizedText = text
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  
  const paragraphs = normalizedText.split(/\n\n+/);
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
        
        // Add overlap using complete sentences
        const overlapText = getOverlapSentences(currentChunk, overlap);
        currentChunk = overlapText + (overlapText ? '\n\n' : '') + trimmedPara;
      } else {
        // Too small, just add the paragraph
        currentChunk += '\n\n' + trimmedPara;
      }
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + trimmedPara;
    }
    
    // If paragraph itself is very large, split it by sentences
    if (trimmedPara.length > maxSize && currentChunk.length > maxSize * 1.2) {
      const sentences = splitIntoSentences(trimmedPara);
      let tempChunk = currentChunk.replace(trimmedPara, '').trim();
      
      for (const sentence of sentences) {
        if ((tempChunk + ' ' + sentence).length > maxSize && tempChunk.length >= minSize) {
          chunks.push(tempChunk.trim());
          tempChunk = getOverlapSentences(tempChunk, overlap) + ' ' + sentence;
        } else {
          tempChunk += (tempChunk ? ' ' : '') + sentence;
        }
      }
      currentChunk = tempChunk;
    }
  }
  
  // Add final chunk if it has content
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  
  // Filter out chunks that are too small
  return chunks.filter(c => c.length >= 100);
}
