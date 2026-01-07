# Implementation Details

This document provides a technical deep-dive into the implementation of the Smart B-Roll Inserter.

## 📁 Project Structure

```
smart-broll-inserter/
├── frontend/                   # React + Vite Frontend
│   ├── src/
│   │   ├── components/         # Reusable UI components
│   │   │   └── TranscriptViewer.jsx # Displays transcript & insertions
│   │   ├── services/           # API integration (axios)
│   │   ├── App.jsx             # Main application logic & layout
│   │   └── index.css           # Global styles (Glassmorphism)
│   └── ...
├── services/                   # Backend Business Logic
│   ├── broll/                  # B-Roll management
│   │   └── describer.js        # Vision analysis & DB operations
│   ├── matching/               # Core AI Logic
│   │   ├── embedder.js         # Text-to-Concept embedding (Groq)
│   │   └── matcher.js          # Semantic matching & scoring
│   ├── transcription/          # Audio processing
│   │   └── transcriber.js      # Whisper integration
│   ├── output/                 # Video generation
│   │   └── renderer.js         # FFmpeg rendering pipeline
│   └── pipeline.js             # Orchestrator for the full flow
├── router/                     # Express Routes
│   ├── pipeline.route.js       # Main API endpoints
│   └── transcribe.route.js     # Legacy/Helper endpoints
├── model/                      # Mongoose Schemas
│   ├── ARoll.js                # Main video schema
│   └── BRoll.js                # B-roll clip schema
├── uploads/                    # Storage for uploaded files
└── exports/                    # Storage for rendered videos
```

## 🧩 Key Components

### 1. Automated B-Roll Analysis (Vision)
- **File**: [services/broll/describer.js](file:///c:/Users/pahad/OneDrive/Desktop/Flona%20Ai/services/broll/describer.js)
- **Logic**:
    1.  **Frame Extraction**: Uses `fluent-ffmpeg` to capture a screenshot at 0.5s, 1s, or 2s (tries multiple timestamps).
    2.  **Image Processing**: Reads the extracted frame and converts it to a base64 string.
    3.  **Vision Analysis**: Sends the base64 image to Groq's `meta-llama/llama-4-scout-17b-16e-instruct` model.
    4.  **Prompt**: "Describe this image in one concise sentence focusing on the main visual subject and action..."
    5.  **Fallback**: If description is provided manually, this step is skipped.
    6.  **Regeneration**: New endpoint `/api/pipeline/regenerate-descriptions` allows re-running this process for existing B-rolls.

### 2. Semantic Matching Engine
- **File**: `services/matching/matcher.js` & [embedder.js](file:///c:/Users/pahad/OneDrive/Desktop/Flona%20Ai/services/matching/embedder.js)
- **Logic**:
    1.  **Concept Extraction**: Converts text (transcript segments or B-roll descriptions) into a list of "Semantic Concepts" (e.g., `['cooking', 'kitchen']`) using Llama 3.3.
    2.  **Matching**: Compares concepts between A-roll segments and B-roll clips.
    3.  **Scoring**: Calculates a confidence score based on the number of matching concepts.
    4.  **Allocation**: Assigns the best-matching B-roll to the segment, ensuring diversity (avoiding reuse if possible).

### 3. Video Rendering Pipeline
- **File**: [services/output/renderer.js](file:///c:/Users/pahad/OneDrive/Desktop/Flona%20Ai/services/output/renderer.js)
- **Logic**:
    1.  **Timeline Parsing**: Reads the generated JSON timeline.
    2.  **Filter Complex**: Constructs a complex FFmpeg filter graph.
        - Trims B-roll clips to the exact duration.
        - Scales them to match the A-roll resolution.
        - Overlays them at specific timestamps (`enable='between(t,start,end)'`).
    3.  **Encoding**: Outputs the final video as MP4.

### 4. Transcript Viewer (Frontend)
- **File**: [frontend/src/components/TranscriptViewer.jsx](file:///c:/Users/pahad/OneDrive/Desktop/Flona%20Ai/frontend/src/components/TranscriptViewer.jsx)
- **Logic**:
    - Receives `sentences` (A-roll transcript) and `insertions` (Timeline data) as props.
    - Renders the transcript as a scrollable list.
    - Checks for overlaps between sentence timestamps and insertion timestamps.
    - **Multiple Insertions**: Can display multiple B-roll matches within a single transcript segment.
    - Highlights matching segments and displays the B-roll ID and match reason.

## 💾 Data Models

### ARoll (Main Video)
- `aroll_id`: Unique ID
- `transcript`: Full text
- `sentences`: Array of `{ text, start, end }`
- `segments`: Array of processed segments with `embedding` (concepts)

### BRoll (Clips)
- `broll_id`: Unique ID
- `description`: Text description (Manual or AI-generated)
- `embedding`: Array of Semantic Concepts (Strings)
- `used`: Boolean flag for allocation logic

## 🔄 Data Flow

1.  **Upload**: User uploads files → Saved to `uploads/` → Metadata to MongoDB.
2.  **Pipeline Trigger**: User clicks "Run Pipeline".
3.  **Processing**:
    - `transcriber.js` → Text
    - [embedder.js](file:///c:/Users/pahad/OneDrive/Desktop/Flona%20Ai/services/matching/embedder.js) → Concepts
    - [matcher.js](file:///c:/Users/pahad/OneDrive/Desktop/Flona%20Ai/services/matching/llm_matcher.js) → Timeline JSON
4.  **Review**: Frontend fetches Timeline JSON → Displays in Viewer.
5.  **Render**: User clicks "Render" → `renderer.js` reads JSON & Files → Outputs to `exports/`.
