const { Client, GatewayIntentBits } = require('discord.js');
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
app.use(bodyParser.json());

const PORT = process.env.PORT || 10000;

// Store API keys per guild
const guildKeys = {};

// EXPRESS ENDPOINT - to receive API key + guild ID from frontend
app.post('/api/store-key', (req, res) => {
  const { apiKey, guildId } = req.body;
  if (!apiKey || !guildId) {
    return res.status(400).send('Missing apiKey or guildId');
  }
  guildKeys[guildId] = apiKey;
  console.log(`[+] Stored Groq key for guild: ${guildId}`);
  res.send({ success: true });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

// Bot login
client.login('YOUR_DISCORD_BOT_TOKEN');

client.once('ready', () => {
  console.log(`Bot logged in as ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guild) return;

  const apiKey = guildKeys[message.guild.id];
  if (!apiKey) {
    return message.reply("❌ API key not set for this server. Ask admin to provide one via the web panel.");
  }

  // Make a request to Groq API (LLaMA 3)
  try {
    const userInput = message.content;
    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: "llama3-8b-8192",  // Assuming pre-selected
        messages: [{ role: "user", content: userInput }],
        temperature: 0.7,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const botReply = response.data.choices[0].message.content.trim();
    if (botReply) {
      message.reply(botReply.slice(0, 2000)); // Discord limit
    } else {
      message.reply("⚠️ No response from model.");
    }

  } catch (err) {
    console.error("Groq API error:", err?.response?.data || err.message);
    message.reply("❌ Error while calling Groq API.");
  }
});