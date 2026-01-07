import express from "express"
import dotenv from "dotenv"
import cors from "cors"
import { connectDB } from "./connection.js"
import { router } from "./router/transcribe.route.js"
import { pipelineRouter } from "./router/pipeline.route.js"


import fs from "fs";

dotenv.config(".env")

const PORT = process.env.PORT || 8080
const app = express()

// Ensure required directories exist
const dirs = [
  "uploads",
  "uploads/aroll",
  "uploads/broll",
  "uploads/temp",
  "exports"
];

dirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Created directory: ${dir}`);
  }
});

connectDB()

app.use(cors())
app.use(express.json());

// Serve static files from exports folder
app.use('/exports', express.static('exports'));

// Routes
app.use("/api", router);
app.use("/api/pipeline", pipelineRouter);

app.get("/",(req,res)=>{
    res.send("Smart B-Roll Inserter API - Server is running")
})

app.listen(PORT,()=>{
    console.log(`Server is running on PORT : http://localhost:${PORT}`)
})

