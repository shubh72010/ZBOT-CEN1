const express = require("express");
const path = require("path");
const axios = require("axios");
const { Client, GatewayIntentBits } = require("discord.js");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 10000;

// ====== Discord Bot Setup ======
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

client.once("ready", () => {
  console.log(`Bot logged in as ${client.user.tag}`);
});

client.login(process.env.DISCORD_TOKEN);

// ====== Express Web Server Setup ======
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

// ====== API: Chat with Groq ======
app.post("/chat", async (req, res) => {
  const { apiKey, message } = req.body;

  if (!apiKey || !message) {
    return res.status(400).json({ error: "API key and message are required." });
  }

  try {
    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "mixtral-8x7b-32768",
        messages: [
          {
            role: "user",
            content: message
          }
        ]
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        }
      }
    );

    const reply = response.data.choices?.[0]?.message?.content || "No response";
    res.json({ reply });

  } catch (err) {
    console.error("Groq API Error:", err.response?.data || err.message);
    res.status(500).json({
      error: "Failed to get response from Groq API.",
      details: err.response?.data || err.message
    });
  }
});

// ====== Catch-All Route ======
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

// ====== Start Server ======
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});