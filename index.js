import express from "express"
import dotenv from "dotenv"
import cors from "cors"
import { connectDB } from "./connection.js"
import { router } from "./router/transcribe.route.js"
import { pipelineRouter } from "./router/pipeline.route.js"


dotenv.config(".env")

const PORT = process.env.PORT || 8080
const app = express()

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

