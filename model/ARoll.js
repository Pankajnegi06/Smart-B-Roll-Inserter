import mongoose from "mongoose";

const SentenceSchema = new mongoose.Schema({
  sentence_id: { type: String, required: true },
  start_sec: { type: Number, required: true },
  end_sec: { type: Number, required: true },
  text: { type: String, required: true }
});

const SegmentSchema = new mongoose.Schema({
  segment_id: { type: String, required: true },
  start_sec: { type: Number, required: true },
  end_sec: { type: Number, required: true },
  text: { type: String, required: true },
  eligible: { type: Boolean, default: true },
  embedding: { type: [String], default: [] }
});

const ARollSchema = new mongoose.Schema({
  aroll_id: { type: String, required: true, unique: true },
  file_path: { type: String, required: true },
  file_name: { type: String, required: true },
  duration_sec: { type: Number, default: 0 },
  sentences: { type: [SentenceSchema], default: [] },
  segments: { type: [SegmentSchema], default: [] },
  processed: { type: Boolean, default: false }
}, { timestamps: true });

export const ARoll = mongoose.model("ARoll", ARollSchema);
