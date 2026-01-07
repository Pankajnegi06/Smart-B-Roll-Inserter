/**
 * Similarity computation module
 * Computes cosine similarity between A-roll segments and B-roll clips
 */

const SIMILARITY_THRESHOLD = parseFloat(process.env.SIMILARITY_THRESHOLD) || 0.45;

/**
 * Compute cosine similarity between two vectors
 * @param {number[]} vecA - First vector
 * @param {number[]} vecB - Second vector
 * @returns {number} - Similarity score (0-1)
 */
export function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length || vecA.length === 0) {
    return 0;
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  
  if (denominator === 0) return 0;
  
  return dotProduct / denominator;
}

/**
 * Build similarity matrix between all segments and all B-rolls
 * @param {Array} segments - A-roll segments with embeddings
 * @param {Array} brolls - B-roll clips with embeddings  
 * @param {string} aroll_id - A-roll identifier
 * @returns {Array} - Candidate matches above threshold
 */
export function buildSimilarityMatrix(segments, brolls, aroll_id) {
  const matches = [];

  for (const segment of segments) {
    if (!segment.eligible || !segment.embedding || segment.embedding.length === 0) {
      continue;
    }

    for (const broll of brolls) {
      if (!broll.embedding || broll.embedding.length === 0) {
        continue;
      }

      const similarity = cosineSimilarity(segment.embedding, broll.embedding);

      if (similarity >= SIMILARITY_THRESHOLD) {
        matches.push({
          aroll_id,
          segment_id: segment.segment_id,
          segment_text: segment.text,
          segment_start: segment.start_sec,
          segment_end: segment.end_sec,
          broll_id: broll.broll_id,
          broll_description: broll.description,
          similarity: +similarity.toFixed(4)
        });
      }
    }
  }

  return matches;
}

/**
 * Sort matches by similarity (descending)
 * @param {Array} matches - Array of match objects
 * @returns {Array} - Sorted matches
 */
export function sortMatchesBySimilarity(matches) {
  return [...matches].sort((a, b) => b.similarity - a.similarity);
}

/**
 * Get match statistics
 */
export function getMatchStats(matches) {
  if (matches.length === 0) {
    return {
      total: 0,
      avgSimilarity: 0,
      minSimilarity: 0,
      maxSimilarity: 0
    };
  }

  const similarities = matches.map(m => m.similarity);
  return {
    total: matches.length,
    avgSimilarity: +(similarities.reduce((a, b) => a + b, 0) / similarities.length).toFixed(4),
    minSimilarity: +Math.min(...similarities).toFixed(4),
    maxSimilarity: +Math.max(...similarities).toFixed(4)
  };
}
