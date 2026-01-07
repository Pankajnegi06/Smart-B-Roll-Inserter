import Groq from "groq-sdk";
import dotenv from "dotenv";

dotenv.config();

console.log("Testing Groq API...");
console.log("Key present:", !!process.env.GROQ_API_KEY);
if (process.env.GROQ_API_KEY) {
    console.log("Key start:", process.env.GROQ_API_KEY.substring(0, 5));
}

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function test() {
  try {
    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: "Hello" }],
      model: "llama-3.3-70b-versatile",
    });
    console.log("Success:", completion.choices[0].message.content);
  } catch (error) {
    console.error("Error:", error);
  }
}

test();
