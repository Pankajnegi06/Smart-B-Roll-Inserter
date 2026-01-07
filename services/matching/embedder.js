/**
 * DUMMY EMBEDDER
 * 
 * Since we switched to Groq LLM matching, embeddings are no longer used.
 * This file is kept to prevent import errors if any legacy code references it.
 */

export async function embedText(text) {
  console.warn("⚠ embedText called but embeddings are deprecated. Returning empty array.");
  return [];
}

export async function embedTexts(texts) {
  console.warn("⚠ embedTexts called but embeddings are deprecated. Returning empty array.");
  return texts.map(() => []);
}

export async function embedSegments(segments) {
  console.warn("⚠ embedSegments called but embeddings are deprecated.");
  return segments.map(s => ({ ...s, embedding: [] }));
}

export async function embedBrolls(brolls) {
  console.warn("⚠ embedBrolls called but embeddings are deprecated.");
  return brolls.map(b => ({ ...b, embedding: [] }));
}
