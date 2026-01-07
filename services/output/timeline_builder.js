import { Timeline } from "../../model/Timeline.js";

/* -------------------- CONFIGURATION -------------------- */
const DEFAULT_BROLL_DURATION = parseFloat(process.env.BROLL_DURATION_SEC) || 5.0;

/**
 * Build timeline JSON for a single A-roll
 * Primary deliverable of the system
 */
export function buildTimelineJson(aroll_id, aroll_duration, allocations, brollMap) {
  const insertions = allocations.map(alloc => {
    const broll = brollMap.get(alloc.broll_id);
    const reason = generateReason(alloc.segment_text, broll?.description || alloc.broll_description);

    return {
      start_sec: alloc.start_sec,
      duration_sec: broll?.duration_sec || DEFAULT_BROLL_DURATION,
      broll_id: alloc.broll_id,
      confidence: alloc.confidence,
      reason
    };
  });

  // Sort by start time
  insertions.sort((a, b) => a.start_sec - b.start_sec);

  return {
    aroll_id,
    aroll_duration_sec: aroll_duration,
    insertions
  };
}

/**
 * Generate human-readable reason for insertion
 */
function generateReason(segmentText, brollDescription) {
  // Extract key concepts from both texts
  const segmentWords = extractKeywords(segmentText);
  const brollWords = extractKeywords(brollDescription);

  // Find common themes
  const commonWords = segmentWords.filter(w => 
    brollWords.some(bw => bw.includes(w) || w.includes(bw))
  );

  if (commonWords.length > 0) {
    return `Speaker discusses '${segmentText.slice(0, 50)}...'; matched with ${brollDescription}`;
  }

  return `Semantic match: speaker content aligned with B-roll visuals (${brollDescription})`;
}

/**
 * Extract keywords from text
 */
function extractKeywords(text) {
  if (!text) return [];
  
  const stopWords = new Set([
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'must', 'shall', 'can', 'of', 'at', 'by',
    'for', 'with', 'about', 'against', 'between', 'into', 'through',
    'during', 'before', 'after', 'above', 'below', 'to', 'from', 'up',
    'down', 'in', 'out', 'on', 'off', 'over', 'under', 'again', 'further',
    'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all',
    'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor',
    'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'and', 'but',
    'if', 'or', 'because', 'as', 'until', 'while', 'this', 'that', 'these',
    'those', 'it', 'its', 'he', 'she', 'they', 'them', 'their', 'what',
    'which', 'who', 'whom', 'me', 'him', 'her', 'us', 'i', 'you', 'we'
  ]);

  return text.toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.has(w));
}

/**
 * Save timeline to MongoDB
 */
export async function saveTimeline(timeline) {
  const existing = await Timeline.findOne({ aroll_id: timeline.aroll_id });
  
  if (existing) {
    return await Timeline.findOneAndUpdate(
      { aroll_id: timeline.aroll_id },
      timeline,
      { new: true }
    );
  }

  const newTimeline = new Timeline(timeline);
  return await newTimeline.save();
}

/**
 * Get timeline by A-roll ID
 */
export async function getTimeline(aroll_id) {
  return await Timeline.findOne({ aroll_id });
}

/**
 * Get all timelines
 */
export async function getAllTimelines() {
  return await Timeline.find({});
}

/**
 * Delete timeline
 */
export async function deleteTimeline(aroll_id) {
  return await Timeline.findOneAndDelete({ aroll_id });
}
