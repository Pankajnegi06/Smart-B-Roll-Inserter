import Groq from "groq-sdk";
import dotenv from "dotenv";

dotenv.config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Minimum confidence threshold - matches below this are filtered out
const MIN_CONFIDENCE = parseFloat(process.env.SIMILARITY_THRESHOLD) || 0.45;

/**
 * Matches A-roll segments with B-roll clips using Groq LLM
 * @param {Array} segments - List of A-roll segments
 * @param {Array} brolls - List of available B-roll clips
 * @param {String} arollId - ID of the A-roll being processed
 * @returns {Object} - Allocation results and stats
 */
export async function matchAndAllocate(segments, brolls, arollId) {
  console.log(`  🤖 Asking Groq (Llama 3) to edit ${arollId}...`);

  // 1. Prepare Context
  const segmentContext = segments
    .filter(s => s.eligible)
    .map(s => `- [${s.segment_id}] (${s.start_sec}s - ${s.end_sec}s): "${s.text}"`)
    .join("\n");

  const brollContext = brolls
    .map(b => `- [${b.broll_id}]: "${b.description}"`)
    .join("\n");

  // 2. Construct Prompt with balanced rules
  const prompt = `
You are an expert Video Editor. Your task is to insert B-roll clips into an A-roll video to make it visually engaging.

### A-Roll Segments (The Main Video)
${segmentContext}

### Available B-Roll Library
${brollContext}

### CRITICAL Rules & Constraints
1. **Semantic Relevance**: The B-roll MUST have a semantic connection to the spoken content.
   - ✅ Accept B-rolls whose description relates to topics mentioned by the speaker
   - ✅ Accept AI-generated descriptions (e.g., "A person cooking in a kitchen")
   - ❌ ONLY reject B-rolls with truly meaningless descriptions (e.g., "kuch bhi", "asdf", "test123")

2. **Confidence Scoring**: For each match, provide a confidence score from 0.0 to 1.0:
   - 0.9-1.0: Perfect match (e.g., speaker says "sunset" → B-roll shows sunset)
   - 0.7-0.89: Strong match (e.g., speaker talks about nature → B-roll shows forest)
   - 0.5-0.69: Moderate match (related but indirect connection)
   - Below 0.5: DO NOT include these matches

3. **Spacing**: Leave at least 4 seconds between insertions.
4. **Quantity**: Select 3-6 BEST insertions only. Quality over quantity.
5. **Uniqueness**: Each B-roll used only ONCE.
6. **Format**: Output ONLY valid JSON. No markdown, no explanations outside JSON.

### Output Format
{
  "allocations": [
    {
      "segment_id": "seg_01",
      "broll_id": "broll_05",
      "confidence": 0.85,
      "reason": "Clear match: Speaker mentions 'coding' while B-roll shows hands typing on keyboard."
    }
  ]
}

IMPORTANT: Prioritize using ALL available semantically-relevant B-rolls. Only reject B-rolls if the description is truly unintelligible.
`;

  // 3. Call Groq API
  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are a professional video editor AI. Be STRICT about semantic matching. Reject garbage/nonsense B-roll descriptions. Output strictly JSON with confidence scores."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.1,
      response_format: { type: "json_object" }
    });

    let result;
    try {
      result = JSON.parse(completion.choices[0].message.content);
    } catch (parseError) {
      console.error("  ❌ Failed to parse Groq JSON:", parseError);
      console.log("  Raw content:", completion.choices[0].message.content);
      return { allocations: [], stats: { totalAllocations: 0, arollsCovered: 0 } };
    }
    
    const rawAllocations = result.allocations || [];
    console.log(`  → Groq suggested ${rawAllocations.length} matches`);

    // 4. Transform and VALIDATE allocations
    const usedBrolls = new Set();
    
    const finalAllocations = rawAllocations
      .map(alloc => {
        const segment = segments.find(s => s.segment_id === alloc.segment_id);
        const broll = brolls.find(b => b.broll_id === alloc.broll_id);

        if (!segment || !broll) {
          console.warn(`  ⚠️ Skipping invalid allocation: segment=${alloc.segment_id}, broll=${alloc.broll_id}`);
          return null;
        }

        // STRICT UNIQUENESS CHECK
        if (usedBrolls.has(alloc.broll_id)) {
          console.warn(`  ⚠️ Skipping duplicate B-roll usage: ${alloc.broll_id}`);
          return null;
        }

        // Use LLM-provided confidence, default to 0.5 if missing
        const confidence = typeof alloc.confidence === 'number' 
          ? Math.min(1, Math.max(0, alloc.confidence)) 
          : 0.5;

        usedBrolls.add(alloc.broll_id);

        return {
          aroll_id: arollId,
          segment_id: alloc.segment_id,
          broll_id: alloc.broll_id,
          start_sec: segment.start_sec,
          end_sec: segment.end_sec,
          confidence: confidence,
          reason: alloc.reason || "No reason provided"
        };
      })
      .filter(Boolean)
      // Filter out low-confidence matches
      .filter(alloc => {
        if (alloc.confidence < MIN_CONFIDENCE) {
          console.log(`  ⚠ Filtered out ${alloc.broll_id}: confidence ${alloc.confidence.toFixed(2)} < ${MIN_CONFIDENCE}`);
          return false;
        }
        return true;
      })
      // Filter out matches with empty/short reasons (sign of garbage matching)
      .filter(alloc => {
        if (!alloc.reason || alloc.reason.length < 10) {
          console.log(`  ⚠ Filtered out ${alloc.broll_id}: reason too short or missing`);
          return false;
        }
        return true;
      });

    console.log(`  ✅ Final allocations after validation: ${finalAllocations.length}`);
    
    // Log confidence stats
    if (finalAllocations.length > 0) {
      const avgConf = (finalAllocations.reduce((a, b) => a + b.confidence, 0) / finalAllocations.length).toFixed(2);
      console.log(`  📊 Avg confidence: ${avgConf}`);
    }

    return {
      allocations: finalAllocations,
      stats: {
        totalAllocations: finalAllocations.length,
        arollsCovered: finalAllocations.length > 0 ? 1 : 0,
        avgConfidence: finalAllocations.length > 0 
          ? +(finalAllocations.reduce((a, b) => a + b.confidence, 0) / finalAllocations.length).toFixed(4)
          : 0
      }
    };

  } catch (error) {
    console.error("  ❌ Groq Matching Error:", error.message);
    return { allocations: [], stats: { totalAllocations: 0, arollsCovered: 0 } };
  }
}
