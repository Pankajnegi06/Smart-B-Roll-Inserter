import express from "express";
import multer from "multer";
import fs from "fs";
import { transcribeVideo } from "../services/transcribe.js";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

router.post("/transcribe", upload.single("video"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    const transcript = await transcribeVideo(req.file.path);

    // Cleanup uploaded file
    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      transcript
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Transcription failed"
    });
  }
});

export { router };
