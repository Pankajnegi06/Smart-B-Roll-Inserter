/**
 * GLOBAL ALLOCATION ENGINE
 * The brain of the B-roll insertion system
 * 
 * Applies constraints during allocation:
 * - Max N insertions per A-roll
 * - Minimum gap between insertions (within same A-roll)
 * - B-roll used at most once globally
 * - Skip weak matches
 */

/* -------------------- CONFIGURATION -------------------- */
const MAX_INSERTIONS_PER_AROLL = parseInt(process.env.MAX_INSERTIONS_PER_AROLL) || 5;
const MIN_GAP_SECONDS = parseFloat(process.env.MIN_GAP_SECONDS) || 4;
const MIN_CONFIDENCE = parseFloat(process.env.SIMILARITY_THRESHOLD) || 0.45;

/**
 * Allocate B-rolls to A-roll segments globally
 * 
 * @param {Array} sortedMatches - Matches sorted by similarity (descending)
 * @returns {Object} - Allocation results per A-roll
 */
export function allocateBrolls(sortedMatches) {
  // Track state
  const usedBrolls = new Set();
  const arollInsertions = new Map(); // aroll_id -> [insertions]
  const allocations = [];

  for (const match of sortedMatches) {
    // Check all constraints
    if (!canAllocate(match, usedBrolls, arollInsertions)) {
      continue;
    }

    // Allocate this match
    const allocation = {
      aroll_id: match.aroll_id,
      segment_id: match.segment_id,
      start_sec: match.segment_start,
      broll_id: match.broll_id,
      broll_description: match.broll_description,
      segment_text: match.segment_text,
      confidence: match.similarity
    };

    allocations.push(allocation);
    usedBrolls.add(match.broll_id);

    // Track insertions per A-roll
    if (!arollInsertions.has(match.aroll_id)) {
      arollInsertions.set(match.aroll_id, []);
    }
    arollInsertions.get(match.aroll_id).push(allocation);
  }

  return {
    allocations,
    stats: {
      totalAllocations: allocations.length,
      brollsUsed: usedBrolls.size,
      arollsCovered: arollInsertions.size
    }
  };
}

/**
 * Check if a match can be allocated based on all constraints
 */
function canAllocate(match, usedBrolls, arollInsertions) {
  // Constraint 1: B-roll not already used
  if (usedBrolls.has(match.broll_id)) {
    return false;
  }

  // Constraint 2: Minimum confidence threshold
  if (match.similarity < MIN_CONFIDENCE) {
    return false;
  }

  const arollAllocs = arollInsertions.get(match.aroll_id) || [];

  // Constraint 3: Max insertions per A-roll
  if (arollAllocs.length >= MAX_INSERTIONS_PER_AROLL) {
    return false;
  }

  // Constraint 4: Minimum time gap within same A-roll
  for (const existing of arollAllocs) {
    const gap = Math.abs(match.segment_start - existing.start_sec);
    if (gap < MIN_GAP_SECONDS) {
      return false;
    }
  }

  return true;
}

/**
 * Group allocations by A-roll
 */
export function groupByAroll(allocations) {
  const grouped = new Map();

  for (const alloc of allocations) {
    if (!grouped.has(alloc.aroll_id)) {
      grouped.set(alloc.aroll_id, []);
    }
    grouped.get(alloc.aroll_id).push(alloc);
  }

  // Sort insertions by start time within each A-roll
  for (const [aroll_id, insertions] of grouped) {
    grouped.set(aroll_id, insertions.sort((a, b) => a.start_sec - b.start_sec));
  }

  return grouped;
}

/**
 * Get allocation statistics
 */
export function getAllocationStats(allocations) {
  if (allocations.length === 0) {
    return {
      total: 0,
      avgConfidence: 0,
      minConfidence: 0,
      maxConfidence: 0
    };
  }

  const confidences = allocations.map(a => a.confidence);
  return {
    total: allocations.length,
    avgConfidence: +(confidences.reduce((a, b) => a + b, 0) / confidences.length).toFixed(4),
    minConfidence: +Math.min(...confidences).toFixed(4),
    maxConfidence: +Math.max(...confidences).toFixed(4)
  };
}
