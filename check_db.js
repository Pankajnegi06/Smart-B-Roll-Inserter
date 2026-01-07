import mongoose from "mongoose";
import { ARoll } from "./model/ARoll.js";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";

dotenv.config();

async function checkData() {
  await mongoose.connect(process.env.DB_URI);
  
  const arolls = await ARoll.find({});
  console.log(`Found ${arolls.length} A-rolls in DB:`);
  
  arolls.forEach(a => {
    const exists = fs.existsSync(a.file_path);
    console.log(`- ID: ${a.aroll_id}`);
    console.log(`  Path: ${a.file_path}`);
    console.log(`  Exists on disk: ${exists ? "✅ YES" : "❌ NO"}`);
  });
  
  await mongoose.disconnect();
}

checkData();
