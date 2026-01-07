# 🎬 Smart B-Roll Inserter

AI-powered semantic video editing tool that automatically inserts relevant B-roll clips into your main video based on spoken content.

![Status](https://img.shields.io/badge/status-active-success)
![License](https://img.shields.io/badge/license-MIT-blue)

## ✨ Features

- **Automatic Transcription** - Transcribes A-roll audio using Groq Whisper
- **Semantic Matching** - Uses Llama 3.3 70B to match B-roll clips with spoken content
- **Confidence Scoring** - AI-generated confidence scores (0.0-1.0) for each match
- **Timeline Generation** - Creates JSON timeline with insertion points
- **Video Rendering** - FFmpeg-based video composition with B-roll overlays
- **Modern UI** - Glassmorphism design with video preview and download

## 🛠️ Tech Stack

| Component | Technology |
|-----------|------------|
| Backend | Node.js, Express |
| Frontend | React, Vite, Tailwind CSS |
| Database | MongoDB |
| AI/LLM | Groq (Whisper + Llama 3.3) |
| Video Processing | FFmpeg |

---

## 📦 Setup Instructions

### Prerequisites

- Node.js v18+
- MongoDB (local or Atlas)
- FFmpeg (auto-installed via @ffmpeg-installer/ffmpeg)

### 1. Clone Repository

```bash
git clone https://github.com/YOUR_USERNAME/smart-broll-inserter.git
cd smart-broll-inserter
```

### 2. Install Dependencies

**Backend:**
```bash
npm install
```

**Frontend:**
```bash
cd frontend
npm install
cd ..
```

### 3. Environment Variables

Create a `.env` file in the root directory:

```env
# Server
PORT=8080

# MongoDB
MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/broll-inserter

# Groq API (Required for transcription & matching)
GROQ_API_KEY=gsk_your_groq_api_key_here

# Optional Configuration
SIMILARITY_THRESHOLD=0.45        # Minimum confidence for B-roll matches
BROLL_DURATION_SEC=5.0           # Default B-roll duration in seconds
```

#### Getting API Keys

| Service | How to Get |
|---------|------------|
| MongoDB | [MongoDB Atlas](https://cloud.mongodb.com) → Create Cluster → Connect → Get URI |
| Groq | [console.groq.com](https://console.groq.com) → API Keys → Create |

---

## 🚀 How to Run

### Start Backend

```bash
npm run dev
```
Backend runs at: `http://localhost:8080`

### Start Frontend

```bash
cd frontend
npm run dev
```
Frontend runs at: `http://localhost:5173`

### Run Both (Recommended)

Use two terminal windows:
```bash
# Terminal 1 - Backend
npm run dev

# Terminal 2 - Frontend
cd frontend && npm run dev
```

---

## 📖 Usage Guide

### 1. Upload A-Roll (Main Video)
- Click "Upload A-Roll" and select your main video file
- Supported formats: MP4, MOV, WAV

### 2. Upload B-Roll Clips
- Click "Upload B-Roll" and select a clip
- **Add a description** (e.g., "busy street food stall with cooking")
- Repeat for all B-roll clips you want in your library

### 3. Run Pipeline
- Click "Run Full Pipeline"
- This will:
  - Transcribe your A-roll
  - Segment the transcript
  - Match B-rolls semantically using AI
  - Generate a timeline

### 4. Review & Render
- Select a timeline from the dropdown
- Review matched insertions and confidence scores
- Click "Render Final Video"
- Download the rendered video

---

## 📤 Output Artifacts

### 1. Timeline Plan JSON

Located at: `GET /api/pipeline/timelines`

Example structure:
```json
{
  "aroll_id": "aroll_4ceaa7ca",
  "aroll_duration_sec": 40.02,
  "insertions": [
    {
      "start_sec": 1.28,
      "duration_sec": 5.0,
      "broll_id": "broll_39099266",
      "confidence": 0.85,
      "reason": "Semantic match: speaker discussing street food..."
    }
  ]
}
```

### 2. Rendered Video (Optional)

- Location: `exports/final_XXXXXXXX.mp4`
- Auto-deleted after 5 minutes (configurable)
- Download via frontend video player

---

## 📁 Project Structure

```
smart-broll-inserter/
├── frontend/               # React frontend
│   ├── src/
│   │   ├── App.jsx         # Main UI component
│   │   ├── index.css       # Glassmorphism styles
│   │   └── services/       # API service layer
│   └── package.json
├── services/
│   ├── transcription/      # Groq Whisper integration
│   ├── matching/           # LLM-based B-roll matching
│   └── output/             # Video rendering & timeline
├── router/
│   ├── transcribe.route.js # Upload endpoints
│   └── pipeline.route.js   # Pipeline & render endpoints
├── model/                  # MongoDB schemas
├── uploads/                # Uploaded media files
├── exports/                # Rendered videos (temp)
├── index.js                # Express server entry
└── .env                    # Environment variables
```

---

## 🔧 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/status` | Check server status |
| POST | `/api/upload/aroll` | Upload A-roll video |
| POST | `/api/upload/broll` | Upload B-roll with description |
| GET | `/api/pipeline/arolls` | List all A-rolls |
| GET | `/api/pipeline/brolls` | List all B-rolls |
| POST | `/api/pipeline/run` | Run full matching pipeline |
| GET | `/api/pipeline/timelines` | Get all generated timelines |
| POST | `/api/pipeline/render` | Render video with B-rolls |
| DELETE | `/api/pipeline/clear` | Clear all data |

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License.

---

## 🙏 Acknowledgments

- [Groq](https://groq.com) - Ultra-fast LLM inference
- [FFmpeg](https://ffmpeg.org) - Video processing
- [MongoDB](https://mongodb.com) - Database
