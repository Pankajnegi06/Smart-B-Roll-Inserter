import express from "express";
import multer from "multer";
import path from "path";
import { v4 as uuidv4 } from "uuid";

// Models
import { ARoll } from "../model/ARoll.js";
import { BRoll } from "../model/BRoll.js";
import { Timeline } from "../model/Timeline.js";

// Services
import { processARoll, generateEmbeddings, runMatchingPipeline, runFullPipeline, getPipelineStatus } from "../services/pipeline.js";
import { describeBroll, getAllBrolls } from "../services/broll/describer.js";
import { getTimeline, getAllTimelines } from "../services/output/timeline_builder.js";

export const pipelineRouter = express.Router();

/* -------------------- FILE UPLOAD CONFIG -------------------- */
const arollStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/aroll"),
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4().slice(0, 8)}_${file.originalname}`;
    cb(null, uniqueName);
  }
});

const brollStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/broll"),
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4().slice(0, 8)}_${file.originalname}`;
    cb(null, uniqueName);
  }
});

const uploadAroll = multer({ storage: arollStorage });
const uploadBroll = multer({ storage: brollStorage });

/* -------------------- A-ROLL ENDPOINTS -------------------- */

/**
 * Upload and process A-roll video
 * POST /api/pipeline/upload-aroll
 */
pipelineRouter.post("/upload-aroll", uploadAroll.single("video"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No video file uploaded" });
    }

    const result = await processARoll(req.file.path, req.file.originalname);
    
    res.json({
      success: true,
      message: "A-roll processed successfully",
      data: result
    });
  } catch (error) {
    console.error("A-roll upload error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get all A-rolls
 * GET /api/pipeline/arolls
 */
pipelineRouter.get("/arolls", async (req, res) => {
  try {
    const arolls = await ARoll.find({}).select("-segments.embedding");
    res.json({ success: true, data: arolls });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get single A-roll details
 * GET /api/pipeline/arolls/:aroll_id
 */
pipelineRouter.get("/arolls/:aroll_id", async (req, res) => {
  try {
    const aroll = await ARoll.findOne({ aroll_id: req.params.aroll_id });
    if (!aroll) {
      return res.status(404).json({ error: "A-roll not found" });
    }
    res.json({ success: true, data: aroll });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/* -------------------- B-ROLL ENDPOINTS -------------------- */

/**
 * Upload B-roll with description
 * POST /api/pipeline/upload-broll
 */
pipelineRouter.post("/upload-broll", uploadBroll.single("video"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No video file uploaded" });
    }

    const { description, duration } = req.body;

    if (!description) {
      return res.status(400).json({ error: "Description is required for B-roll" });
    }

    const result = await describeBroll({
      filePath: req.file.path,
      fileName: req.file.originalname,
      description,
      duration: parseFloat(duration) || 2.5
    });

    res.json({
      success: true,
      message: "B-roll registered successfully",
      data: result
    });
  } catch (error) {
    console.error("B-roll upload error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get all B-rolls
 * GET /api/pipeline/brolls
 */
pipelineRouter.get("/brolls", async (req, res) => {
  try {
    const brolls = await getAllBrolls();
    res.json({ success: true, data: brolls });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/* -------------------- PIPELINE ENDPOINTS -------------------- */

/**
 * Get pipeline status
 * GET /api/pipeline/status
 */
pipelineRouter.get("/status", async (req, res) => {
  try {
    const status = await getPipelineStatus();
    res.json({ success: true, data: status });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Generate embeddings for all A-rolls and B-rolls
 * POST /api/pipeline/embed
 */
pipelineRouter.post("/embed", async (req, res) => {
  try {
    const result = await generateEmbeddings();
    res.json({
      success: true,
      message: "Embeddings generated successfully",
      data: result
    });
  } catch (error) {
    console.error("Embedding error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Run matching and allocation pipeline
 * POST /api/pipeline/match
 */
pipelineRouter.post("/match", async (req, res) => {
  try {
    const result = await runMatchingPipeline();
    res.json({
      success: true,
      message: "Matching complete",
      data: result
    });
  } catch (error) {
    console.error("Matching error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Run full pipeline (embed + match)
 * POST /api/pipeline/process
 */
pipelineRouter.post("/process", async (req, res) => {
  try {
    const result = await runFullPipeline();
    console.log(JSON.stringify(result, null, 2));
    res.json({
      success: true,
      message: "Pipeline complete",
      data: result
    });
  } catch (error) {
    console.error("Pipeline error:", error);
    res.status(500).json({ 
      error: error.message,
      stack: error.stack,
      details: "Check backend terminal for more info"
    });
  }
});

/* -------------------- TIMELINE ENDPOINTS -------------------- */

/**
 * Get timeline for specific A-roll
 * GET /api/pipeline/timeline/:aroll_id
 */
pipelineRouter.get("/timeline/:aroll_id", async (req, res) => {
  try {
    const timeline = await getTimeline(req.params.aroll_id);
    if (!timeline) {
      return res.status(404).json({ error: "Timeline not found" });
    }
    res.json({ success: true, data: timeline });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get all timelines
 * GET /api/pipeline/timelines
 */
pipelineRouter.get("/timelines", async (req, res) => {
  try {
    const timelines = await getAllTimelines();
    res.json({ success: true, data: timelines });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/* -------------------- RENDER ENDPOINTS -------------------- */

/**
 * Render final video
 * POST /api/pipeline/render
 */
pipelineRouter.post("/render", async (req, res) => {
  try {
    const { aroll_id } = req.body;
    
    if (!aroll_id) {
      return res.status(400).json({ error: "aroll_id is required" });
    }

    // Fetch data
    const timeline = await getTimeline(aroll_id);
    if (!timeline) {
      return res.status(404).json({ error: "Timeline not found" });
    }

    const aroll = await ARoll.findOne({ aroll_id });
    if (!aroll) {
      return res.status(404).json({ error: "A-roll not found" });
    }

    const brolls = await getAllBrolls();
    const brollMap = new Map(brolls.map(b => [b.broll_id, b]));

    // Import dynamically to avoid circular dependency issues if any
    const { renderVideo } = await import("../services/output/renderer.js");
    const fs = await import("fs");

    const outputPath = await renderVideo(timeline, brollMap, aroll);

    // Schedule cleanup after 5 minutes (300000 ms)
    setTimeout(() => {
      try {
        if (fs.existsSync(outputPath)) {
          fs.unlinkSync(outputPath);
          console.log(`🧹 Cleaned up: ${outputPath}`);
        }
      } catch (cleanupErr) {
        console.error(`Failed to cleanup ${outputPath}:`, cleanupErr.message);
      }
    }, 5 * 60 * 1000); // 5 minutes

    res.json({
      success: true,
      message: "Video rendered successfully (will be deleted in 5 minutes)",
      data: { outputPath }
    });

  } catch (error) {
    console.error("Render error:", error);
    res.status(500).json({ error: error.message });
  }
});

/* -------------------- CLEANUP ENDPOINTS -------------------- */

/**
 * Clear all data (for testing)
 * DELETE /api/pipeline/clear
 */
pipelineRouter.delete("/clear", async (req, res) => {
  try {
    await ARoll.deleteMany({});
    await BRoll.deleteMany({});
    await Timeline.deleteMany({});

    res.json({
      success: true,
      message: "All data cleared"
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
