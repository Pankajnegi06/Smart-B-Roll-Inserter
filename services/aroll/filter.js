/**
 * Filter segments for B-roll eligibility
 * 
 * BLOCK segments containing:
 * - Conclusions (final statements)
 * - Emotional emphasis
 * - Calls to action
 * 
 * KEEP segments that are:
 * - Explanatory
 * - Descriptive  
 * - Visual concepts
 */

/* -------------------- BLOCK PATTERNS -------------------- */
const BLOCK_PATTERNS = [
  // Conclusions / Summary
  /\b(in conclusion|to summarize|finally|lastly|in summary|to wrap up|overall)\b/i,
  /\b(the bottom line|at the end of the day|all in all)\b/i,
  
  // Calls to action
  /\b(subscribe|like|comment|share|click|follow|sign up|buy now|order now)\b/i,
  /\b(don't forget to|make sure to|please|let me know|tell me)\b/i,
  /\b(link in description|check out|visit|download)\b/i,
  
  // Emotional emphasis / Personal statements
  /\b(I love|I hate|I feel|honestly|personally|to be honest)\b/i,
  /\b(amazing|incredible|unbelievable|crazy|insane|mind-blowing)\b/i,
  /\b(thank you|thanks for watching|see you|bye|goodbye)\b/i,
  
  // Questions to audience
  /\b(what do you think|do you agree|have you tried|let me know)\b/i,
  
  // Self-reference without content
  /\b(as I said|like I mentioned|I already told you)\b/i
];

/* -------------------- KEEP PATTERNS (BOOST) -------------------- */
const KEEP_PATTERNS = [
  // Descriptive / Visual
  /\b(looks like|you can see|showing|displays|appears|visible)\b/i,
  /\b(the color|the size|the shape|texture|pattern)\b/i,
  
  // Explanatory
  /\b(because|since|therefore|so that|in order to|this means)\b/i,
  /\b(for example|such as|like|including|for instance)\b/i,
  /\b(the reason|the way|how it works|the process)\b/i,
  
  // Descriptive content
  /\b(where|when|what|which|how)\b/i,
  /\b(contains|includes|features|consists of|made of)\b/i
];

/**
 * Filter segments and mark eligibility
 * @param {Array} segments - Array of segment objects
 * @returns {Array} - Segments with updated eligibility
 */
export function filterSegments(segments) {
  return segments.map(segment => {
    const eligible = isEligibleForBroll(segment.text);
    return {
      ...segment,
      eligible
    };
  });
}

/**
 * Check if a segment is eligible for B-roll insertion
 * @param {string} text - Segment text
 * @returns {boolean} - Whether segment is eligible
 */
function isEligibleForBroll(text) {
  // Check for blocking patterns
  for (const pattern of BLOCK_PATTERNS) {
    if (pattern.test(text)) {
      return false;
    }
  }
  
  // Segments that are too short are less useful
  if (text.split(/\s+/).length < 3) {
    return false;
  }
  
  return true;
}

/**
 * Get eligibility statistics
 */
export function getFilterStats(segments) {
  const eligible = segments.filter(s => s.eligible);
  const blocked = segments.filter(s => !s.eligible);
  
  return {
    total: segments.length,
    eligible: eligible.length,
    blocked: blocked.length,
    eligibilityRate: +((eligible.length / segments.length) * 100).toFixed(1)
  };
}

/**
 * Get only eligible segments
 */
export function getEligibleSegments(segments) {
  return segments.filter(s => s.eligible);
}
