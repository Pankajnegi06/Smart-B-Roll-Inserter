import mongoose from "mongoose";

const InsertionSchema = new mongoose.Schema({
  start_sec: { type: Number, required: true },
  duration_sec: { type: Number, default: 2.5 },
  broll_id: { type: String, required: true },
  confidence: { type: Number, required: true },
  reason: { type: String, default: "" }
});

const TimelineSchema = new mongoose.Schema({
  aroll_id: { type: String, required: true, unique: true },
  aroll_duration_sec: { type: Number, required: true },
  insertions: { type: [InsertionSchema], default: [] }
}, { timestamps: true });

export const Timeline = mongoose.model("Timeline", TimelineSchema);
