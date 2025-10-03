/**
 * Re-ranking utility for improving retrieval quality
 * Uses cross-encoder scoring to re-rank retrieved chunks
 */

interface RetrievalCandidate {
  chunk_text: string;
  similarity: number;
  [key: string]: any;
}

/**
 * Simple BM25-like scoring for keyword relevance
 */
function calculateKeywordScore(query: string, text: string): number {
  const queryTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
  const textLower = text.toLowerCase();
  
  let score = 0;
  for (const term of queryTerms) {
    // Count occurrences
    const regex = new RegExp(term, 'gi');
    const matches = textLower.match(regex);
    if (matches) {
      score += matches.length * (1 + Math.log(1 + term.length / 5));
    }
  }
  
  return score;
}

/**
 * Calculate semantic diversity penalty
 * Penalizes chunks that are too similar to higher-ranked chunks
 */
function calculateDiversityScore(candidate: string, selectedChunks: string[]): number {
  if (selectedChunks.length === 0) return 1.0;
  
  let maxSimilarity = 0;
  for (const selected of selectedChunks) {
    // Simple Jaccard similarity on words
    const candidateWords = new Set(candidate.toLowerCase().split(/\s+/));
    const selectedWords = new Set(selected.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...candidateWords].filter(x => selectedWords.has(x)));
    const union = new Set([...candidateWords, ...selectedWords]);
    
    const similarity = intersection.size / union.size;
    maxSimilarity = Math.max(maxSimilarity, similarity);
  }
  
  return 1.0 - (maxSimilarity * 0.5); // Penalize up to 50%
}

/**
 * Re-rank chunks using hybrid scoring
 * Combines vector similarity with keyword matching and diversity
 */
export function rerankChunks<T extends RetrievalCandidate>(
  query: string,
  candidates: T[],
  topK = 5,
  diversityWeight = 0.2
): T[] {
  // Calculate keyword scores for all candidates
  const scoredCandidates = candidates.map(candidate => {
    const keywordScore = calculateKeywordScore(query, candidate.chunk_text);
    const normalizedKeywordScore = keywordScore / Math.max(1, query.split(/\s+/).length);
    
    return {
      ...candidate,
      keywordScore: normalizedKeywordScore,
    };
  });
  
  // Sort by combined score (vector similarity + keyword relevance)
  scoredCandidates.sort((a, b) => {
    const scoreA = a.similarity * 0.7 + a.keywordScore * 0.3;
    const scoreB = b.similarity * 0.7 + b.keywordScore * 0.3;
    return scoreB - scoreA;
  });
  
  // Apply MMR (Maximal Marginal Relevance) for diversity
  const reranked: T[] = [];
  const selectedTexts: string[] = [];
  
  while (reranked.length < topK && scoredCandidates.length > 0) {
    let bestIdx = 0;
    let bestScore = -Infinity;
    
    for (let i = 0; i < scoredCandidates.length; i++) {
      const candidate = scoredCandidates[i];
      const relevanceScore = candidate.similarity * 0.7 + candidate.keywordScore * 0.3;
      const diversityScore = calculateDiversityScore(candidate.chunk_text, selectedTexts);
      
      const finalScore = relevanceScore * (1 - diversityWeight) + diversityScore * diversityWeight;
      
      if (finalScore > bestScore) {
        bestScore = finalScore;
        bestIdx = i;
      }
    }
    
    const selected = scoredCandidates.splice(bestIdx, 1)[0];
    reranked.push(selected);
    selectedTexts.push(selected.chunk_text);
  }
  
  return reranked;
}
