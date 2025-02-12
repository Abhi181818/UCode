import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const openai = new OpenAI({
  baseURL: "https://api.deepseek.com",
  apiKey: 'sk-b6f7f7c40d30425c97cea63e4b163ad9', // Ensure this is set in your .env file
});

app.post("/api/chat", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    const completion = await openai.chat.completions.create({
      model: "deepseek-chat", // Ensure this is a valid model
      messages: [
        { role: "system", content: "You are a helpful AI coding assistant." },
        { role: "user", content: message },
      ],
    });

    res.json({
      success: true,
      response: completion.choices[0].message.content,
    });
  } catch (error) {
    console.error("Error:", error);

    res.status(500).json({
      success: false,
      error: "Internal server error",
      message: error.message,
    });
  }
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
