import { v4 as uuidv4 } from "uuid";

/* -------------------- CONFIGURATION -------------------- */
const MAX_SEGMENT_DURATION = 6; // seconds - split if longer
const MIN_SEGMENT_DURATION = 2; // seconds - minimum segment length

/**
 * Split sentences into editorial segments suitable for B-roll insertion
 * Rules:
 * - If sentence duration > MAX_SEGMENT_DURATION → split by time window
 * - Each segment gets a unique segment_id
 */
export function segmentSentences(sentences) {
  const segments = [];
  let segmentIndex = 1;

  for (const sentence of sentences) {
    const duration = sentence.end_sec - sentence.start_sec;

    if (duration <= MAX_SEGMENT_DURATION) {
      // Sentence fits within limit - keep as single segment
      segments.push({
        segment_id: `seg_${String(segmentIndex++).padStart(2, '0')}`,
        start_sec: sentence.start_sec,
        end_sec: sentence.end_sec,
        text: sentence.text,
        eligible: true
      });
    } else {
      // Split long sentence into multiple segments
      const splitSegments = splitLongSentence(sentence, segmentIndex);
      segmentIndex += splitSegments.length;
      segments.push(...splitSegments);
    }
  }

  return segments;
}

/**
 * Split a long sentence into multiple segments based on time windows
 */
function splitLongSentence(sentence, startIndex) {
  const segments = [];
  const words = sentence.text.split(/\s+/);
  const duration = sentence.end_sec - sentence.start_sec;
  
  // Calculate how many segments we need
  const numSegments = Math.ceil(duration / MAX_SEGMENT_DURATION);
  const segmentDuration = duration / numSegments;
  const wordsPerSegment = Math.ceil(words.length / numSegments);

  for (let i = 0; i < numSegments; i++) {
    const startWord = i * wordsPerSegment;
    const endWord = Math.min((i + 1) * wordsPerSegment, words.length);
    const segmentWords = words.slice(startWord, endWord);

    if (segmentWords.length === 0) continue;

    const startSec = +(sentence.start_sec + (i * segmentDuration)).toFixed(2);
    const endSec = +(sentence.start_sec + ((i + 1) * segmentDuration)).toFixed(2);

    segments.push({
      segment_id: `seg_${String(startIndex + i).padStart(2, '0')}`,
      start_sec: startSec,
      end_sec: Math.min(endSec, sentence.end_sec),
      text: segmentWords.join(" "),
      eligible: true
    });
  }

  return segments;
}

/**
 * Get segment statistics
 */
export function getSegmentStats(segments) {
  const durations = segments.map(s => s.end_sec - s.start_sec);
  return {
    total: segments.length,
    avgDuration: +(durations.reduce((a, b) => a + b, 0) / durations.length).toFixed(2),
    minDuration: +Math.min(...durations).toFixed(2),
    maxDuration: +Math.max(...durations).toFixed(2)
  };
}
