/**
 * MAIN PIPELINE ORCHESTRATOR
 * 
 * Flow: Upload → Transcribe → Sentences → Segments → Filter → Embed → Match → Allocate → Timeline JSON
 */

import { v4 as uuidv4 } from "uuid";
import { ARoll } from "../model/ARoll.js";
import { BRoll } from "../model/BRoll.js";

// A-Roll processing
import { transcribeVideo } from "./aroll/transcribe.js";
import { segmentSentences, getSegmentStats } from "./aroll/segmenter.js";
import { filterSegments, getFilterStats, getEligibleSegments } from "./aroll/filter.js";

// B-Roll processing
import { updateBrollEmbedding, resetBrollUsage } from "./broll/describer.js";

// Matching
import { matchAndAllocate } from "./matching/llm_matcher.js";

// Output
import { buildTimelineJson, saveTimeline } from "./output/timeline_builder.js";

/**
 * Process a single A-roll video
 * Steps: Transcribe → Segment → Filter → Store
 */
export async function processARoll(filePath, fileName) {
  console.log(`\n📹 Processing A-roll: ${fileName}`);

  // Step 1: Transcribe
  console.log("  → Transcribing...");
  const transcription = await transcribeVideo(filePath);
  console.log(`  ✓ Got ${transcription.sentences.length} sentences`);

  // Step 2: Segment
  console.log("  → Segmenting...");
  const segments = segmentSentences(transcription.sentences);
  const segStats = getSegmentStats(segments);
  console.log(`  ✓ Created ${segStats.total} segments (avg ${segStats.avgDuration}s)`);

  // Step 3: Filter
  console.log("  → Filtering for B-roll eligibility...");
  const filteredSegments = filterSegments(segments);
  const filterStats = getFilterStats(filteredSegments);
  console.log(`  ✓ ${filterStats.eligible}/${filterStats.total} eligible (${filterStats.eligibilityRate}%)`);

  // Step 4: Store in MongoDB
  const aroll_id = `aroll_${uuidv4().slice(0, 8)}`;
  
  const aroll = new ARoll({
    aroll_id,
    file_path: filePath,
    file_name: fileName,
    duration_sec: transcription.duration_sec,
    sentences: transcription.sentences,
    segments: filteredSegments,
    processed: false
  });

  await aroll.save();
  console.log(`  ✓ Saved A-roll: ${aroll_id}`);

  return {
    aroll_id,
    duration_sec: transcription.duration_sec,
    sentences: transcription.sentences.length,
    segments: segStats,
    filter: filterStats
  };
}

/**
 * Generate embeddings for segments and B-rolls
 * Uses semantic concept extraction for matching
 */
export async function generateEmbeddings() {
  console.log("\n🧠 Generating Embeddings...");

  // Import embedder
  const { embedSegments, embedBrolls, embedText } = await import("./matching/embedder.js");

  // Get unprocessed A-rolls
  const arolls = await ARoll.find({ processed: false });
  const brolls = await BRoll.find({});

  if (arolls.length === 0 && brolls.length === 0) {
    console.log("  ⚠ No items to embed");
    // Still mark any pending as processed
    await ARoll.updateMany({ processed: false }, { processed: true });
    return { arolls_embedded: 0, brolls_embedded: 0 };
  }

  let arollsEmbedded = 0;
  let brollsEmbedded = 0;

  // Embed A-roll segments
  for (const aroll of arolls) {
    console.log(`  → Embedding segments for ${aroll.aroll_id}...`);
    const embeddedSegments = await embedSegments(aroll.segments);
    aroll.segments = embeddedSegments;
    aroll.processed = true;
    await aroll.save();
    arollsEmbedded++;
  }

  // Embed B-rolls (if not already embedded)
  for (const broll of brolls) {
    if (!broll.embedding || broll.embedding.length === 0) {
      console.log(`  → Embedding B-roll ${broll.broll_id}...`);
      const embedding = await embedText(broll.description);
      // Use updateBrollEmbedding to avoid Mongoose CastError with Mixed types
      console.log(`    > Generated embedding:`, embedding);
      await updateBrollEmbedding(broll.broll_id, embedding);
      brollsEmbedded++;
    }
  }

  console.log(`  ✓ Embedded ${arollsEmbedded} A-rolls, ${brollsEmbedded} B-rolls`);
  return { arolls_embedded: arollsEmbedded, brolls_embedded: brollsEmbedded };
}

/**
 * Run the matching and allocation pipeline using Groq LLM
 */
export async function runMatchingPipeline() {
  console.log("\n🎯 Running matching pipeline (Groq Llama 3)...");

  // Get all processed A-rolls and B-rolls
  const arolls = await ARoll.find({ processed: true });
  const brolls = await BRoll.find({});

  if (arolls.length === 0) {
    throw new Error("No processed A-rolls found.");
  }

  if (brolls.length === 0) {
    throw new Error("No B-rolls found. Upload B-rolls first.");
  }

  console.log(`  → Matching ${arolls.length} A-rolls with ${brolls.length} B-rolls`);

  const allAllocations = [];
  const brollMap = new Map(brolls.map(b => [b.broll_id, b]));
  const timelines = [];

  for (const aroll of arolls) {
    // Call Groq LLM for this A-roll
    const { allocations, stats } = await matchAndAllocate(aroll.segments, brolls, aroll.aroll_id);
    allAllocations.push(...allocations);

    // Build timeline
    const timeline = buildTimelineJson(
      aroll.aroll_id,
      aroll.duration_sec,
      allocations,
      brollMap
    );

    // Save to MongoDB
    await saveTimeline(timeline);
    timelines.push(timeline);

    console.log(`  ✓ Built timeline for ${aroll.aroll_id} with ${timeline.insertions.length} insertions`);
  }

  return {
    success: true,
    matchStats: { 
      totalAllocations: allAllocations.length,
      avgConfidence: allAllocations.length > 0 
        ? +(allAllocations.reduce((a, b) => a + b.confidence, 0) / allAllocations.length).toFixed(2) 
        : 0
    },
    timelines
  };
}

/**
 * Run the full pipeline end-to-end
 */
export async function runFullPipeline() {
  console.log("\n" + "=".repeat(60));
  console.log("🚀 SMART B-ROLL INSERTER PIPELINE");
  console.log("=".repeat(60));

  // Check for pending A-rolls
  const pendingArolls = await ARoll.find({ processed: false });
  if (pendingArolls.length > 0) {
    console.log(`Found ${pendingArolls.length} unprocessed A-rolls`);
  }

  // Step 1: Generate embeddings
  const embedResult = await generateEmbeddings();

  // Step 2: Run matching
  const matchResult = await runMatchingPipeline();

  console.log("\n" + "=".repeat(60));
  console.log("✅ PIPELINE COMPLETE");
  console.log("=".repeat(60));

  return {
    embeddings: embedResult,
    matching: matchResult
  };
}

/**
 * Get pipeline status
 */
export async function getPipelineStatus() {
  const arolls = await ARoll.find({});
  const brolls = await BRoll.find({});
  const processedArolls = arolls.filter(a => a.processed);
  const embeddedBrolls = brolls.filter(b => b.embedding?.length > 0);

  return {
    arolls: {
      total: arolls.length,
      processed: processedArolls.length,
      pending: arolls.length - processedArolls.length
    },
    brolls: {
      total: brolls.length,
      embedded: embeddedBrolls.length,
      pending: brolls.length - embeddedBrolls.length
    },
    ready: processedArolls.length > 0 && brolls.length > 0
  };
}
