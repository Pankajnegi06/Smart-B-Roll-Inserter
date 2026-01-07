import { v4 as uuidv4 } from "uuid";
import { BRoll } from "../../model/BRoll.js";

/**
 * Register a B-roll clip with its description
 * Each B-roll must have text meaning for semantic matching
 */
export async function describeBroll({ filePath, fileName, description, duration = 2.5 }) {
  if (!description || description.trim().length < 3) {
    throw new Error("B-roll description is required for semantic matching");
  }

  const broll_id = `broll_${uuidv4().slice(0, 8)}`;

  const broll = new BRoll({
    broll_id,
    file_path: filePath,
    file_name: fileName,
    description: description.trim(),
    duration_sec: duration,
    embedding: [],
    used: false
  });

  await broll.save();

  return {
    success: true,
    broll_id,
    description: broll.description
  };
}

/**
 * Get all B-rolls
 */
export async function getAllBrolls() {
  return await BRoll.find({});
}

/**
 * Get unused B-rolls (available for allocation)
 */
export async function getAvailableBrolls() {
  return await BRoll.find({ used: false });
}

/**
 * Mark B-roll as used
 */
export async function markBrollUsed(broll_id) {
  return await BRoll.findOneAndUpdate(
    { broll_id },
    { used: true },
    { new: true }
  );
}

/**
 * Reset all B-rolls to unused state
 */
export async function resetBrollUsage() {
  return await BRoll.updateMany({}, { used: false });
}

/**
 * Update B-roll embedding
 */
export async function updateBrollEmbedding(broll_id, embedding) {
  return await BRoll.findOneAndUpdate(
    { broll_id },
    { embedding },
    { new: true }
  );
}
