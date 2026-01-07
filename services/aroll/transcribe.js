import "dotenv/config";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import { AssemblyAI } from "assemblyai";

/* -------------------- VALIDATION -------------------- */
if (!process.env.ASSEMBLYAI_API_KEY) {
  throw new Error("ASSEMBLYAI_API_KEY missing in .env");
}

/* -------------------- CLIENT -------------------- */
const client = new AssemblyAI({
  apiKey: process.env.ASSEMBLYAI_API_KEY,
});

/* -------------------- SENTENCE BUILDER -------------------- */
function buildSentenceTimestamps(words) {
  const sentences = [];
  let buffer = [];
  let startTime = null;
  let sentenceIndex = 1;

  for (const word of words) {
    if (startTime === null) startTime = word.start;

    buffer.push(word.text);

    // Sentence boundary detection
    if (/[.!?]/.test(word.text)) {
      sentences.push({
        sentence_id: `s${sentenceIndex++}`,
        start_sec: +(startTime / 1000).toFixed(2),
        end_sec: +(word.end / 1000).toFixed(2),
        text: buffer.join(" ").trim(),
      });

      buffer = [];
      startTime = null;
    }
  }

  // Catch leftover words (spoken language often ends without punctuation)
  if (buffer.length) {
    sentences.push({
      sentence_id: `s${sentenceIndex}`,
      start_sec: +(startTime / 1000).toFixed(2),
      end_sec: +(words[words.length - 1].end / 1000).toFixed(2),
      text: buffer.join(" ").trim(),
    });
  }

  return sentences;
}

/* -------------------- MAIN FUNCTION -------------------- */
export async function transcribeVideo(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error("File not found: " + filePath);
  }

  const transcript = await client.transcripts.transcribe({
    audio: fs.createReadStream(filePath),
    speaker_labels: true,
  });

  if (transcript.status === "error") {
    throw new Error(transcript.error);
  }

  if (!transcript.words || transcript.words.length === 0) {
    throw new Error("No word-level timestamps received");
  }

  const sentences = buildSentenceTimestamps(transcript.words);
  
  // Calculate total duration from last word
  const duration_sec = +(transcript.words[transcript.words.length - 1].end / 1000).toFixed(2);

  return {
    success: true,
    duration_sec,
    sentences,
  };
}
