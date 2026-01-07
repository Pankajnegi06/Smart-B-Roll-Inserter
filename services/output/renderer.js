import ffmpeg from "fluent-ffmpeg";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";

// Set FFmpeg path
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

/**
 * Render final video by overlaying B-rolls on A-roll
 * @param {Object} timeline - The timeline object containing insertions
 * @param {Map} brollMap - Map of B-roll objects by ID
 * @param {Object} aroll - The A-roll object
 * @returns {Promise<string>} - Path to the rendered video
 */
export async function renderVideo(timeline, brollMap, aroll) {
  return new Promise((resolve, reject) => {
    const outputDir = "exports";
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }

    const outputFilename = `final_${uuidv4().slice(0, 8)}.mp4`;
    const outputPath = path.join(outputDir, outputFilename);

    console.log(`\n🎬 Starting render for ${aroll.file_name}...`);
    console.log(`📋 Timeline has ${timeline.insertions.length} insertions:`);
    timeline.insertions.forEach((ins, i) => {
      console.log(`   ${i + 1}. B-roll: ${ins.broll_id} at ${ins.start_sec}s for ${ins.duration_sec}s`);
    });
    
    const command = ffmpeg();

    // Input 0: A-roll (Base)
    const absoluteArollPath = path.resolve(aroll.file_path);
    if (!fs.existsSync(absoluteArollPath)) {
      return reject(new Error(`A-roll file not found: ${absoluteArollPath}`));
    }
    command.input(absoluteArollPath);
    console.log(`✓ A-roll input: ${absoluteArollPath}`);

    // Filter valid insertions and add inputs
    const validInsertions = [];
    const timelineInsertions = timeline.insertions;
    
    timelineInsertions.forEach(ins => {
      const broll = brollMap.get(ins.broll_id);
      if (broll) {
        const absoluteBrollPath = path.resolve(broll.file_path);
        if (fs.existsSync(absoluteBrollPath)) {
          command.input(absoluteBrollPath);
          validInsertions.push(ins); // Only keep insertions with valid files
          console.log(`✓ B-roll input ${validInsertions.length}: ${ins.broll_id} (${absoluteBrollPath})`);
        } else {
          console.warn(`⚠️ B-roll file missing: ${absoluteBrollPath} (Skipping insertion)`);
        }
      } else {
        console.warn(`⚠️ B-roll ID not found in map: ${ins.broll_id} (Skipping insertion)`);
      }
    });

    console.log(`\n🎨 Building ${validInsertions.length} overlay operations...`);

    // Build Complex Filter
    const complexFilter = [];
    let lastStream = "0:v"; // Start with A-roll video stream

    // Normalize A-roll to 1080p to ensure consistency
    complexFilter.push(`[0:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,setsar=1[base]`);
    lastStream = "base";

    // Process each B-roll: scale, format, and ADD TIME DELAY using setpts
    validInsertions.forEach((ins, index) => {
      const brollInputIdx = index + 1;
      const brollDelayed = `b${index}_delayed`;
      
      // Scale, format, and DELAY the B-roll to start at the right time
      // setpts=PTS+start_sec/TB shifts the video to start at the insertion point
      complexFilter.push(
        `[${brollInputIdx}:v]fps=30,` +
        `scale=1920:1080:force_original_aspect_ratio=decrease,` +
        `pad=1920:1080:(ow-iw)/2:(oh-ih)/2,` +
        `setsar=1,format=yuv420p,` +
        `setpts=PTS+${ins.start_sec}/TB[${brollDelayed}]`
      );
    });

    // Now overlay each B-roll - no enable needed since they're already timed
    validInsertions.forEach((ins, index) => {
      const brollDelayed = `b${index}_delayed`;
      const nextStream = `tmp${index}`;
      const endTime = ins.start_sec + ins.duration_sec;
      
      console.log(`   Overlay ${index + 1}: ${ins.broll_id} from ${ins.start_sec}s to ${endTime}s (FULL-SCREEN)`);
      
      // Overlay with eof_action=pass so it disappears when B-roll ends
      complexFilter.push(
        `[${lastStream}][${brollDelayed}]overlay=eof_action=pass:shortest=0[${nextStream}]`
      );
      
      lastStream = nextStream;
    });

    // Map the final video stream and the original A-roll audio
    command
      .complexFilter(complexFilter)
      .outputOptions([
        "-map", `[${lastStream}]`, // Final video with B-roll overlays
        "-map", "0:a",             // A-roll audio (continuous throughout)
        "-c:v", "libx264",         // Video codec
        "-c:a", "aac",             // Audio codec
        "-pix_fmt", "yuv420p",     // Pixel format for compatibility
        "-shortest"                // Stop when shortest stream ends
      ])
      .output(outputPath)
      .on("start", (cmdLine) => {
        console.log("  → FFmpeg command started");
        console.log("  Complex Filter:", JSON.stringify(complexFilter, null, 2)); // Debug logging
        // console.log("  Command:", cmdLine); 
      })
      .on("progress", (progress) => {
        if (progress.percent) {
          process.stdout.write(`  Rendering: ${Math.round(progress.percent)}% \r`);
        }
      })
      .on("end", () => {
        console.log(`\n  ✅ Render complete: ${outputPath}`);
        resolve(outputPath);
      })
      .on("error", (err) => {
        console.error("\n  ❌ Render error:", err.message);
        reject(err);
      })
      .run();
  });
}
