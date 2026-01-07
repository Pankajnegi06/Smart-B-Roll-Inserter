import mongoose from "mongoose";

const BRollSchema = new mongoose.Schema({
  broll_id: { type: String, required: true, unique: true },
  file_path: { type: String, required: true },
  file_name: { type: String, required: true },
  description: { type: String, required: true },
  duration_sec: { type: Number, default: 2.5 },
  embedding: { type: [Number], default: [] },
  used: { type: Boolean, default: false }
}, { timestamps: true });

export const BRoll = mongoose.model("BRoll", BRollSchema);
