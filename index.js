import express from 'express';
import bodyParser from 'body-parser';
import axios from 'axios';
import { Client, GatewayIntentBits } from 'discord.js';

const app = express();
const PORT = process.env.PORT || 10000;
app.use(bodyParser.json());

const guildKeys = {};

// Web endpoint to receive key
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

// Discord bot setup
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

client.login(process.env.DISCORD_TOKEN);

client.once('ready', () => {
  console.log(`Bot logged in as ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guild) return;

  const apiKey = guildKeys[message.guild.id];
  if (!apiKey) {
    return message.reply("❌ API key not set for this server. Ask admin to provide one.");
  }

  try {
    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: "llama3-8b-8192",
        messages: [{ role: "user", content: message.content }],
        temperature: 0.7,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const reply = response.data.choices[0].message.content.trim();
    message.reply(reply.slice(0, 2000)); // Discord limit
  } catch (err) {
    console.error(err.response?.data || err.message);
    message.reply("❌ Error talking to Groq.");
  }
});