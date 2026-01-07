/**
 * EMBEDDING SERVICE
 * 
 * Uses Groq embeddings API for semantic matching between A-roll segments and B-roll clips.
 * Generates embeddings for text and computes cosine similarity.
 */

import Groq from "groq-sdk";
import dotenv from "dotenv";

dotenv.config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Embedding model - Groq uses this for text embeddings
const EMBEDDING_MODEL = "llama-3.3-70b-versatile";

/**
 * Generate embedding for a single text using Groq
 * Falls back to simple TF-IDF style embedding if API fails
 */
export async function embedText(text) {
  try {
    // Groq doesn't have a dedicated embedding endpoint yet,
    // so we use a prompt-based approach to generate semantic representation
    const response = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are a semantic embedding generator. Output exactly 10 key semantic concepts from the input text, separated by commas. Only output the concepts, nothing else."
        },
        {
          role: "user",
          content: text
        }
      ],
      model: EMBEDDING_MODEL,
      temperature: 0,
      max_tokens: 100
    });

    const concepts = response.choices[0].message.content
      .toLowerCase()
      .split(',')
      .map(c => c.trim())
      .filter(c => c.length > 0);

    console.log(`    📝 Embedded: "${text.substring(0, 50)}..." → [${concepts.slice(0, 5).join(', ')}...]`);
    return concepts;
  } catch (error) {
    console.error("Embedding error:", error.message);
    // Fallback: return simple word tokens
    const fallback = text.toLowerCase().split(/\s+/).filter(w => w.length > 3).slice(0, 10);
    console.log(`    ⚠️ Fallback embedding: [${fallback.slice(0, 5).join(', ')}...]`);
    return fallback;
  }
}

/**
 * Generate embeddings for multiple texts
 */
export async function embedTexts(texts) {
  const results = [];
  for (const text of texts) {
    const embedding = await embedText(text);
    results.push(embedding);
  }
  return results;
}

/**
 * Embed A-roll segments
 */
export async function embedSegments(segments) {
  console.log(`  📊 Generating embeddings for ${segments.length} segments...`);
  
  const results = [];
  for (const segment of segments) {
    const embedding = await embedText(segment.text);
    
    // Safety check for Mongoose documents
    const segmentData = segment.toObject ? segment.toObject() : segment;
    results.push({
      ...segmentData,
      embedding
    });
  }
  
  console.log(`  ✓ Embedded ${results.length} segments`);
  return results;
}
/**
 * Embed B-roll descriptions
 */
export async function embedBrolls(brolls) {
  console.log(`  📊 Generating embeddings for ${brolls.length} B-rolls...`);
  
  const results = [];
  for (const broll of brolls) {
    const embedding = await embedText(broll.description);
    results.push({
      ...broll,
      embedding
    });
  }
  
  console.log(`  ✓ Embedded ${results.length} B-rolls`);
  return results;
}

/**
 * Calculate similarity between two concept lists (Jaccard-like)
 */
export function calculateSimilarity(embedding1, embedding2) {
  if (!embedding1 || !embedding2 || embedding1.length === 0 || embedding2.length === 0) {
    return 0;
  }

  const set1 = new Set(embedding1);
  const set2 = new Set(embedding2);
  
  // Count intersection
  let intersection = 0;
  for (const item of set1) {
    if (set2.has(item)) {
      intersection++;
    }
  }
  
  // Jaccard similarity
  const union = set1.size + set2.size - intersection;
  return union > 0 ? intersection / union : 0;
}

/**
 * Find best B-roll matches for each segment using embeddings
 */
export function findMatches(embeddedSegments, embeddedBrolls, arollId) {
  const matches = [];

  for (const segment of embeddedSegments) {
    if (!segment.eligible) continue;

    for (const broll of embeddedBrolls) {
      const similarity = calculateSimilarity(segment.embedding, broll.embedding);
      
      if (similarity > 0) {
        matches.push({
          aroll_id: arollId,
          segment_id: segment.segment_id,
          segment_start: segment.start_sec,
          segment_end: segment.end_sec,
          segment_text: segment.text,
          broll_id: broll.broll_id,
          broll_description: broll.description,
          similarity: similarity
        });
      }
    }
  }

  // Sort by similarity descending
  matches.sort((a, b) => b.similarity - a.similarity);
  
  console.log(`  📈 Found ${matches.length} potential matches`);
  return matches;
}
